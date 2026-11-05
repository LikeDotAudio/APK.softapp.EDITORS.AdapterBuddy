// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// The adapter block in and out of the CAD over cad.like.audio/host@1, through
// the vendored APKSoftapp client (vendor/apk-softapp/). No DOM here: the tests
// drive it with the real client in a stub window.

export const EDITOR = 'Adapter Buddy';
export const BLOCK_TYPE = 'adapter';

/** What Save sends along: the CAD names the block, standalone it is the file name. */
export function saveMeta(model) {
  return { blockName: model.name, filename: `adapter_${model.name}` };
}

/** One host@1 link for one AdapterModel. onLoaded(block, meta) runs after the model took the CAD's block. */
export function connectAdapterHost(S, model, { onLoaded, notice } = {}) {
  return S.connectHost({
    editor: EDITOR,
    blockType: BLOCK_TYPE,
    block: model.toBlock(),
    notice,
    onLoad: (block, meta) => {
      model.fromBlock(block);
      if (onLoaded) onLoaded(block, meta);
    },
    onRequest: () => ({ block: model.toBlock(), meta: saveMeta(model) }),
  });
}

/** Format suggestions: the Interfaces table's families ("3 Audio" → "Audio"), unique, in table order. */
export function interfaceFamilies(rows) {
  const out = [];
  for (const r of rows || []) {
    const f = String((r && r.family) || '').replace(/^\s*\d+\s+/, '').trim();
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
}
