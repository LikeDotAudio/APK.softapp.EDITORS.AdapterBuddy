// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3583: the adapter's .ifc twin. Save Model writes the block and IFC4X3_ADD2 (a passive adapter an
// IfcCableFittingType TRANSITION, a powered converter an IfcCommunicationsApplianceType TRANSITIONCOMPONENT,
// its two ends nested ports with the closed vocabulary's connector words); Open Model reads it back equal;
// with APK_IFC_PYTHON=<python with ifcopenshell + ifctester> IfcOpenShell and the BIM oracle check it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IFC_GUID_RE, getPsets, ifcGuid, parseStep } from '../vendor/apk-contracts/apk-ifc.js';
import { AdapterModel } from '../js/adapterModel.js';
import { adapterFromIfc, adapterToIfc } from '../js/adapterIfc.js';
import { connectorWords } from '../js/ifcConnector.js';
import { connectAdapterHost, openAdapter, saveAdapter } from '../js/adapterHost.js';
import * as vendorIfc from '../scripts/vendor-ifc.mjs';
import * as vendorConnectors from '../scripts/vendor-connectors.mjs';
import { world } from './hostWorld.mjs';

const byType = (text, type) => parseStep(text).entities.filter((e) => e.type === type);

function passive() {
  const m = new AdapterModel('XLR-TRS-TURN', 'XLR3-F', '1/4" TRS jack');
  Object.assign(m, { partNumber: 'NA2-MPMJ', category: 'Pin Translation', passiveOrActive: 'Passive', attenuationDb: -20, bimId: 'neutrik/na2-mpmj' });
  m.pinMap = [
    { fromPin: 'Pin 1', toPin: 'Sleeve', status: 'Ground', signal: 'Shield' },
    { fromPin: 'Pin 2', toPin: 'Tip', status: 'Mapped', signal: 'Analog Audio' },
    { fromPin: 'Pin 3', toPin: 'Ring', status: 'Resistor-Drop', signal: 'Analog Audio' },
  ];
  return m;
}

/** The fixtures the census holds to the oracle: the editor's default converter, a passive pad, an unknown spelling. */
export function fixtures() {
  const odd = new AdapterModel('ODD', 'Mystery-12', '');
  odd.pinMap = [];
  return {
    'adapter-default.ifc': adapterToIfc(new AdapterModel().toBlock()),
    'adapter-passive.ifc': adapterToIfc(passive().toBlock()),
    'adapter-odd.ifc': adapterToIfc(odd.toBlock()),
  };
}

test('the vendored STEP codec and connector vocabulary are what contracts builds to today', async () => {
  for (const v of [vendorIfc, vendorConnectors]) {
    const now = await v.buildBundle();
    if (now == null) continue; // this repo on its own: the committed bundles are what there is
    assert.equal(readFileSync(v.BUNDLE, 'utf8'), now, `run node ${v === vendorIfc ? 'scripts/vendor-ifc.mjs' : 'scripts/vendor-connectors.mjs'}`);
  }
});

test('a powered converter is an IfcCommunicationsApplianceType TRANSITIONCOMPONENT, a passive adapter an IfcCableFittingType TRANSITION', () => {
  const active = adapterToIfc(new AdapterModel().toBlock());
  const [t] = byType(active, 'IFCCOMMUNICATIONSAPPLIANCETYPE');
  assert.equal(t.args[9].value, 'TRANSITIONCOMPONENT');
  assert.equal(t.args[2], 'HDMI-SDI-BALUN');
  assert.equal(t.args[7], 'adapter_hdmi_sdi_balun', 'Tag = the block id');
  assert.equal(t.args[8], 'Media Converter', 'ElementType = the category');
  assert.equal(byType(active, 'IFCCABLEFITTINGTYPE').length, 0);
  const pas = adapterToIfc(passive().toBlock());
  const [f] = byType(pas, 'IFCCABLEFITTINGTYPE');
  assert.equal(f.args[9].value, 'TRANSITION');
  assert.equal(f.args[0], ifcGuid('part', 'neutrik/na2-mpmj'), 'the BIM part the block names is the type');
  assert.equal(byType(pas, 'IFCCOMMUNICATIONSAPPLIANCETYPE').length, 0);
});

test('its two ends are ports nested on the type: active A SINK -> B SOURCE, passive both ways', () => {
  const ends = (text) => byType(text, 'IFCDISTRIBUTIONPORT').map((p) => [p.args[2], p.args[7].value, p.args[8].value]);
  assert.deepEqual(ends(adapterToIfc(new AdapterModel().toBlock())), [['A', 'SINK', 'CABLE'], ['B', 'SOURCE', 'CABLE']]);
  assert.deepEqual(ends(adapterToIfc(passive().toBlock())), [['A', 'SOURCEANDSINK', 'CABLE'], ['B', 'SOURCEANDSINK', 'CABLE']]);
  const text = adapterToIfc(passive().toBlock());
  const [nest] = byType(text, 'IFCRELNESTS');
  const [type] = byType(text, 'IFCCABLEFITTINGTYPE');
  assert.equal(nest.args[4].id, type.id);
  assert.equal(nest.args[5].length, 2);
});

test('connectors are the closed vocabulary\'s canonical words; a spelling it does not know is kept as said', () => {
  const file = parseStep(adapterToIfc(passive().toBlock()));
  const [a, b] = file.entities.filter((e) => e.type === 'IFCDISTRIBUTIONPORT').map((p) => getPsets(file, p));
  assert.deepEqual(a.Pset_DistributionPortTypeCable, { ElectricalConnectionType: ['XLR'], ConnectionSubtype: 'XLR-3', ConnectionGender: ['FEMALE'] });
  assert.equal(a.APK_Terminal.ConnectorAsDeclared, undefined, 'the canonical id needs no spelling of its own');
  assert.equal(a.APK_Terminal.PinCount, 3);
  assert.deepEqual(a.APK_Terminal.Pinout, ['Pin 1', 'Pin 2', 'Pin 3']);
  assert.deepEqual(b.Pset_DistributionPortTypeCable.ElectricalConnectionType, ['TRS']);
  assert.equal(b.APK_Terminal.ConnectorAsDeclared, '1/4" TRS jack', 'an alias keeps the editor\'s spelling');
  assert.deepEqual(connectorWords('Mystery-12'), { said: 'Mystery-12', ids: [], subtype: 'Mystery-12', types: [], genders: [], conductors: [], pins: null, asDeclared: null });
  const odd = parseStep(fixtures()['adapter-odd.ifc']);
  const [x, y] = odd.entities.filter((e) => e.type === 'IFCDISTRIBUTIONPORT');
  assert.deepEqual(getPsets(odd, x).Pset_DistributionPortTypeCable, { ConnectionSubtype: 'Mystery-12' }, 'never silently OTHER');
  assert.equal(y.args[8].value, 'NOTDEFINED', 'no connector, no cable port');
});

test('Open Model reads the twin back to the same block; the file is byte-deterministic with valid GlobalIds', () => {
  for (const m of [new AdapterModel(), passive(), new AdapterModel('DANTE-AVIO', 'RJ45', 'XLR-M')]) {
    const block = m.toBlock();
    const text = adapterToIfc(block);
    assert.deepEqual(adapterFromIfc(text), block);
    assert.equal(adapterToIfc(block), text);
    const rooted = parseStep(text).entities.filter((e) => /^IFC(PROJECT|REL|PROPERTYSET$|DISTRIBUTIONPORT$|.*TYPE$)/.test(e.type));
    assert.ok(rooted.length > 10);
    for (const e of rooted) assert.match(e.args[0], IFC_GUID_RE, e.type);
    assert.equal(new Set(rooted.map((e) => e.args[0])).size, rooted.length, 'no GlobalId twice');
  }
  const empty = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4X3_ADD2'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n";
  assert.throws(() => adapterFromIfc(empty), /no adapter/);
});

test('standalone Save writes adapter_<name>.json AND its .ifc; Open takes either back', async () => {
  const { S, downloads } = world({ framed: false });
  const model = passive();
  const host = connectAdapterHost(S, model, { notice: false });
  const r = await saveAdapter(S, host, model);
  assert.equal(r.ok, true);
  assert.deepEqual(downloads.map((d) => d.name), ['adapter_XLR-TRS-TURN.ifc', 'adapter_XLR-TRS-TURN.json']);
  assert.deepEqual(adapterFromIfc(downloads[0].text), JSON.parse(downloads[1].text));

  const back = new AdapterModel();
  const o = await openAdapter(S, back, { file: { name: 'adapter_XLR-TRS-TURN.ifc', text: async () => downloads[0].text } });
  assert.equal(o.kind, 'ifc');
  assert.deepEqual(back.toBlock(), model.toBlock());
  const j = new AdapterModel();
  await openAdapter(S, j, { file: { name: 'adapter_XLR-TRS-TURN.json', text: async () => downloads[1].text } });
  assert.deepEqual(j.toBlock(), model.toBlock());
});

test('inside the CAD Save is Save & Return: the block goes to the drawing, no files', async () => {
  const { S, toParent, downloads } = world();
  const model = new AdapterModel();
  const host = connectAdapterHost(S, model, { notice: false });
  const r = await saveAdapter(S, host, model);
  assert.equal(r.via, 'host');
  assert.equal(toParent.at(-1).m.type, 'blockSave');
  assert.equal(downloads.length, 0);
});

// IfcOpenShell (LGPL, test-only, never vendored) when the environment has it: APK_IFC_PYTHON=<python with ifcopenshell + ifctester>
test('IfcOpenShell: 0 schema + EXPRESS statements, every set declared (oracle), ports SOURCE -> SINK', { skip: !process.env.APK_IFC_PYTHON && 'set APK_IFC_PYTHON to a python with ifcopenshell + ifctester' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'adapterbuddy-ifc-'));
  const files = fixtures();
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  const script = new URL('../scripts/validate-ifc.py', import.meta.url).pathname;
  const run = spawnSync(process.env.APK_IFC_PYTHON, ['-I', script, ...Object.keys(files).map((n) => join(dir, n))], { cwd: tmpdir(), encoding: 'utf8' });
  const rows = run.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(rows.length, Object.keys(files).length, run.stderr);
  for (const r of rows) {
    assert.equal(r.schema, 'IFC4X3_ADD2', r.file);
    assert.equal(r.statements, 0, `${r.file}: ${r.first.join(' | ')}`);
    assert.deepEqual(r.pset_problems, [], r.file);
    assert.deepEqual(r.connections, [], r.file);
    assert.ok(r.ports.every((p) => p.host === 'IfcCableFittingType' || p.host === 'IfcCommunicationsApplianceType'), r.file);
  }
  assert.equal(run.status, 0, run.stderr);
});
