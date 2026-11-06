// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* ifcConnector.js — A PORT'S CONNECTOR AS ISO 16739 WORDS, BY THE CLOSED VOCABULARY (contracts/ifc/connectors.json,
   vendored as vendor/apk-contracts/apk-connectors.js by scripts/vendor-connectors.mjs). The same bytes in
   EDITORS.AdapterBuddy and EDITORS.PortBuddy: change them together.

   A spelling the vocabulary resolves is written as its canonical id's words (DATABASE.server.BIM bim/ifc.py
   connector_words does the same): Pset_DistributionPortTypeCable ElectricalConnectionType / ConnectionSubtype
   / ConnectionGender (/ ConductorFunction), APK_Terminal.PinCount. When those words do not name the editor's
   spelling back on their own (an alias, not the id), APK_Terminal.ConnectorAsDeclared keeps it. A spelling
   the vocabulary does not know is kept as said in ConnectionSubtype with no ElectricalConnectionType — never
   silently OTHER. */

import { connectorById, IFC_CONNECTORS, resolveConnectors } from '../vendor/apk-contracts/apk-connectors.js';
import { flat, ident, label, str, strings } from './ifcSpine.js';

export { connectorById, resolveConnectors };

/** The canonical id(s) a set of port words names, joined ' / ' (a combo), or '' when they name none uniquely. */
export function idsFromWords({ subtype, types, genders }) {
  if (!types.length) return '';
  const subs = new Set(str(subtype).split(' / '));
  const ids = [];
  for (let i = 0; i < types.length; i++) {
    const hit = IFC_CONNECTORS.connectors.filter((e) => subs.has(e.subtype) && e.ElectricalConnectionType === types[i]
      && e.ConnectionGender === (genders[i] || 'NOTKNOWN'));
    if (hit.length !== 1) return '';
    ids.push(hit[0].id);
  }
  return ids.join(' / ');
}

/** A connector spelling → its port words; null for no connector at all. */
export function connectorWords(text) {
  const said = str(text).trim();
  if (!said) return null;
  const hits = resolveConnectors(said);
  if (!hits.length) return { said, ids: [], subtype: said, types: [], genders: [], conductors: [], pins: null, asDeclared: null };
  const words = {
    said,
    ids: hits.map((h) => h.id),
    subtype: [...new Set(hits.map((h) => h.subtype))].join(' / '),
    types: hits.map((h) => h.ElectricalConnectionType),
    genders: hits.map((h) => h.ConnectionGender),
    conductors: hits.map((h) => h.ConductorFunction).filter(Boolean),
    pins: hits.length === 1 && Number.isInteger(hits[0].pins) ? hits[0].pins : null,
  };
  words.asDeclared = idsFromWords(words) === said ? null : said;
  return words;
}

/** The Pset_DistributionPortTypeCable properties of a port with these words (W: an IfcWriter). */
export function cableProps(W, words, protocols = []) {
  return [
    W.enumProp('ElectricalConnectionType', words.types),
    W.prop('ConnectionSubtype', label(words.subtype)),
    W.enumProp('ConnectionGender', words.genders),
    W.enumProp('ConductorFunction', words.conductors),
    W.listProp('Protocols', protocols.map(ident)),
  ];
}

/** Back from a port's sets: ConnectorAsDeclared, else the ids its words name, else ConnectionSubtype as said. */
export function connectorFromPsets(ps) {
  const declared = str(flat(ps.APK_Terminal?.ConnectorAsDeclared));
  if (declared) return declared;
  const cable = ps.Pset_DistributionPortTypeCable || {};
  const subtype = str(flat(cable.ConnectionSubtype));
  return idsFromWords({ subtype, types: strings(cable.ElectricalConnectionType), genders: strings(cable.ConnectionGender) }) || subtype;
}
