// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3487: the adapter block round trip over cad.like.audio/host@1, driven
// through the real vendored apk-softapp.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, ORIGIN, PROTOCOL } from './hostWorld.mjs';
import { AdapterModel } from '../js/adapterModel.js';
import { connectAdapterHost, interfaceFamilies, BLOCK_TYPE } from '../js/adapterHost.js';

test('in the CAD: editorReady at our origin, load fills the model, request saves the edited block', () => {
  const { S, toParent, fire } = world();
  const model = new AdapterModel();
  let loaded = 0;
  const host = connectAdapterHost(S, model, { onLoaded: () => loaded++, notice: false });
  assert.equal(host.embedded, true);
  assert.deepEqual(toParent[0], { m: { protocol: PROTOCOL, type: 'editorReady', editor: 'Adapter Buddy', blockType: BLOCK_TYPE }, o: ORIGIN });

  const fromCad = new AdapterModel('XLR-TRS', 'XLR-F-3PIN', '1/4-TRS').toBlock();
  fire({ protocol: PROTOCOL, type: 'load', block: fromCad, meta: { blockName: 'XLR-TRS' } });
  assert.equal(loaded, 1);
  assert.equal(model.name, 'XLR-TRS');
  assert.equal(model.outFormat, '1/4-TRS');

  model.addPinMapping({ fromPin: 'Tip', toPin: 'Pin 2', status: 'Mapped', signal: 'Analog' });
  fire({ protocol: PROTOCOL, type: 'request' });
  const save = toParent.at(-1);
  assert.equal(save.o, ORIGIN, 'never "*"');
  assert.equal(save.m.type, 'blockSave');
  assert.equal(save.m.blockType, BLOCK_TYPE);
  assert.deepEqual(save.m.block, model.toBlock());
  assert.equal(save.m.block.pinMap.length, 5);
  assert.equal(save.m.meta.blockName, 'XLR-TRS');
  assert.ok(toParent.every((x) => x.o === ORIGIN));
});

test('a load from another origin, or not from window.parent, is ignored', () => {
  const { S, fire, win } = world();
  const model = new AdapterModel();
  connectAdapterHost(S, model, { notice: false });
  const block = new AdapterModel('EVIL').toBlock();
  fire({ protocol: PROTOCOL, type: 'load', block }, { origin: 'http://elsewhere' });
  fire({ protocol: PROTOCOL, type: 'load', block }, { source: win });
  fire({ type: 'LOAD_BLOCK', block });   // the old private message, no protocol
  assert.equal(model.name, 'HDMI-SDI-BALUN');
});

test('standalone: Save downloads the block as adapter_<name>.json, once', () => {
  const { S, toParent, downloads } = world({ framed: false });
  const model = new AdapterModel('DANTE-AVIO', 'RJ45-Dante', 'XLR-M-Analog');
  const host = connectAdapterHost(S, model, { notice: false });
  assert.equal(host.embedded, false);
  assert.equal(host.save(model.toBlock(), { filename: 'adapter_DANTE-AVIO' }), 'download');
  assert.equal(toParent.length, 0);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, 'adapter_DANTE-AVIO.json');
  const back = new AdapterModel();
  back.fromBlock(JSON.parse(downloads[0].text));
  assert.equal(back.inFormat, 'RJ45-Dante');
});

test('format suggestions are the Interfaces table families, read through APKSoftapp.interfacesTable', () => {
  const { S } = world({ framed: false });
  // The OcaBin shape of OS/Interfaces/<host>/Interfaces.json (Interface Map → blocks → Interfaces).
  const doc = { 'Interface Map': { type: 'OcaBin', blocks: { Interfaces: { type: 'OcaTable',
    headers: ['interface', 'kind', 'family', 'domain'],
    data: [
      { interface: 'enp12s0', kind: 'ethernet', family: '1 Network — physical', domain: 'network' },
      { interface: 'enp5s0f0', kind: 'ethernet', family: '1 Network — physical', domain: 'network' },
      { interface: 'HD-Audio Generic', kind: 'HDA-Intel', family: '3 Audio', domain: 'audio' },
      { interface: '/dev/ttyS0', kind: '16550A', family: '5 Serial', domain: 'serial' },
    ] } } } };
  const t = S.interfacesTable(doc);
  assert.deepEqual(interfaceFamilies(t.rows), ['Network — physical', 'Audio', 'Serial']);
  assert.deepEqual(interfaceFamilies(null), []);
});
