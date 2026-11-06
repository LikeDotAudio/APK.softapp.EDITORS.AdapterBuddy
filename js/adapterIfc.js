// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* adapterIfc.js — THE ADAPTER'S .IFC TWIN (ROAD-3583). Save Model writes the native adapter block (toBlock)
   AND this IFC4X3_ADD2 file through APKSoftapp.saveModel; Open Model reads it back to the same block.

     IfcProject 'adapter' ─ IfcRelDeclares ─ the adapter, a TYPE (a part: one kind of adapter, not a placed unit)
       passive   IfcCableFittingType TRANSITION             a gender changer, barrel, balun, pad, pin translation
       active    IfcCommunicationsApplianceType             a powered media converter: it changes the transmission
                 TRANSITIONCOMPONENT                        medium (contracts/ifc/mapping.json: the same two rules)
                 Name = the adapter, Tag = its block id, ElementType = its category,
                 Pset_ManufacturerTypeInformation ModelReference (part number) / ModelLabel,
                 APK_Adapter Category / Architecture / Attenuation (dB) and the pin map's PinStatus / PinSignal,
                 APK_Part.PartId and GlobalId part/<id> when the block names its BIM part (bimId)
     its ends    two IfcDistributionPort nested on the type (IfcRelNests 'Terminals'), A = the input connector,
                 B = the output; active: A SINK, B SOURCE; passive: both SOURCEANDSINK (it works either way)
                 Pset_DistributionPortTypeCable from the connector by the closed vocabulary (js/ifcConnector.js),
                 Pset_DistributionPortCommon.PortNumber 1 / 2, APK_Terminal TerminalId (A | B), Side, PinCount,
                 Pinout = the pin map's From pins on A and its To pins on B, in row order
   Row i of the pin map is Pinout[i] on A, Pinout[i] on B, PinStatus[i] and PinSignal[i]. */

import { IfcWriter, enumv, flat, ident, ifcGuid, int, label, num, readIfc, real, schemaOf, stemOf, str, strings, systemTypeOf, typed } from './ifcSpine.js';
import { cableProps, connectorFromPsets, connectorWords } from './ifcConnector.js';

export { schemaOf };

const isActive = (b) => /^active/i.test(str(b.passiveOrActive));
const slug = (s) => String(s || 'adapter').toLowerCase().replace(/[^a-z0-9]/g, '_');

/** The adapter block (AdapterModel.toBlock) as IFC4X3_ADD2 STEP text. `name` is the file stem. */
export function adapterToIfc(block, { name } = {}) {
  const b = block || {};
  const id = str(b.id) || `adapter_${slug(b.name)}`;
  const stem = stemOf(name, `adapter_${b.name || 'adapter'}`);
  const W = new IfcWriter({
    projectGid: ifcGuid('adapter', id), name: str(b.name) || stem,
    description: 'Adapter Buddy: one adapter, balun or media converter', editor: 'EDITORS.AdapterBuddy', appName: 'adapter editor',
  });
  const active = isActive(b);
  const pins = Array.isArray(b.pinMap) ? b.pinMap : [];
  const partId = str(b.bimId);
  const typeGid = partId ? ifcGuid('part', partId) : W.gid('type');
  const col = (k) => pins.map((p) => label(str(p && p[k])));
  const att = num(b.attenuationDb);

  const typeSets = [
    W.pset('Pset_ManufacturerTypeInformation', typeGid, [
      W.prop('ModelReference', b.partNumber ? label(b.partNumber) : null),
      W.prop('ModelLabel', b.name ? label(b.name) : null),
    ]),
    W.pset('APK_Adapter', typeGid, [
      W.prop('Category', b.category ? label(b.category) : null),
      W.prop('Architecture', label(active ? 'active' : 'passive')),
      W.prop('Attenuation', att != null ? typed('IFCREAL', real(att)) : null),
      W.listProp('PinStatus', col('status')),
      W.listProp('PinSignal', col('signal')),
    ]),
    partId ? W.pset('APK_Part', typeGid, [W.prop('PartId', ident(partId))]) : null,
  ].filter(Boolean);
  const description = `${str(b.inFormat) || '?'} → ${str(b.outFormat) || '?'}`;
  const type = active
    ? W.add('IFCCOMMUNICATIONSAPPLIANCETYPE', typeGid, W.oh, str(b.name) || stem, description, null, typeSets, null, id, b.category ? str(b.category) : null, enumv('TRANSITIONCOMPONENT'))
    : W.add('IFCCABLEFITTINGTYPE', typeGid, W.oh, str(b.name) || stem, description, null, typeSets, null, id, b.category ? str(b.category) : null, enumv('TRANSITION'));
  W.declare([type]);

  const signals = pins.map((p) => str(p && p.signal)).join(' ');
  const ends = [
    { end: 'A', format: b.inFormat, side: active ? 'input' : 'connection', flow: active ? 'SINK' : 'SOURCEANDSINK', pinout: col('fromPin') },
    { end: 'B', format: b.outFormat, side: active ? 'output' : 'connection', flow: active ? 'SOURCE' : 'SOURCEANDSINK', pinout: col('toPin') },
  ];
  const ports = ends.map((e, i) => {
    const gid = W.gid('port', e.end);
    const words = connectorWords(e.format);
    let sys = systemTypeOf(e.format);
    if (sys === 'SIGNAL' && signals.trim()) sys = systemTypeOf(signals);
    const port = W.add('IFCDISTRIBUTIONPORT', gid, W.oh, e.end, null, null, null, null,
      enumv(e.flow), enumv(words ? 'CABLE' : 'NOTDEFINED'), enumv(words ? sys : 'NOTDEFINED'));
    if (words) W.pset('Pset_DistributionPortTypeCable', gid, cableProps(W, words), [port]);
    W.pset('Pset_DistributionPortCommon', gid, [W.prop('PortNumber', int(i + 1))], [port]);
    W.pset('APK_Terminal', gid, [
      W.prop('TerminalId', ident(e.end)),
      W.prop('Side', label(e.side)),
      words && words.asDeclared ? W.prop('ConnectorAsDeclared', label(words.asDeclared)) : null,
      words && words.pins != null ? W.prop('PinCount', int(words.pins)) : null,
      W.listProp('Pinout', e.pinout),
    ], [port]);
    return port;
  });
  W.nest(type, typeGid, ports, 'Terminals');
  return W.finish(stem);
}

/* ───────────────────────── reading it back ───────────────────────── */

const ADAPTER_TYPES = ['IFCCABLEFITTINGTYPE', 'IFCCOMMUNICATIONSAPPLIANCETYPE'];

/**
 * An IFC model → the adapter block. The adapter is the first type carrying APK_Adapter, else the first
 * IfcCableFittingType / IfcCommunicationsApplianceType TRANSITION(COMPONENT) with ports (a BIM part file);
 * throws a sentence when the file holds none.
 */
export function adapterFromIfc(text) {
  const R = readIfc(text);
  const candidates = ADAPTER_TYPES.flatMap((t) => R.byType(t));
  const typeOf = candidates.find((e) => R.psets(e).APK_Adapter)
    || candidates.find((e) => /TRANSITION/.test(str(flat(e.args[9]))) && R.portsOn(e).length)
    || candidates.find((e) => R.portsOn(e).length);
  if (!typeOf) throw new TypeError('no adapter in this IFC: it has no IfcCableFittingType or IfcCommunicationsApplianceType with ports');
  const ps = R.psets(typeOf);
  const info = ps.APK_Adapter || {};
  const maker = ps.Pset_ManufacturerTypeInformation || {};
  const ports = R.portsOn(typeOf);
  const [a, z] = ports;
  const pa = a ? R.psets(a) : {};
  const pz = z ? R.psets(z) : {};
  const from = strings(pa.APK_Terminal?.Pinout);
  const to = strings(pz.APK_Terminal?.Pinout);
  const status = strings(info.PinStatus);
  const signal = strings(info.PinSignal);
  const rows = Math.max(from.length, to.length, status.length, signal.length);
  const pinMap = [];
  for (let i = 0; i < rows; i++) pinMap.push({ fromPin: from[i] ?? '', toPin: to[i] ?? '', status: status[i] ?? '', signal: signal[i] ?? '' });
  const arch = str(flat(info.Architecture));
  const att = num(flat(info.Attenuation));
  const block = {
    type: 'adapter',
    id: str(typeOf.args[7]),
    name: str(typeOf.args[2]),
    partNumber: str(flat(maker.ModelReference)),
    category: str(flat(info.Category)) || str(typeOf.args[8]),
    passiveOrActive: arch ? (arch === 'active' ? 'Active' : 'Passive') : (typeOf.type === 'IFCCOMMUNICATIONSAPPLIANCETYPE' ? 'Active' : 'Passive'),
    inFormat: a ? connectorFromPsets(pa) : '',
    outFormat: z ? connectorFromPsets(pz) : '',
    attenuationDb: att ?? 0,
    pinMap,
  };
  const partId = str(flat(ps.APK_Part?.PartId));
  if (partId) block.bimId = partId;
  return block;
}
