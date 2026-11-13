// specGlossToMetalRough: convert KHR_materials_pbrSpecularGlossiness materials to metal/rough
// with gltf-transform's metalRough(). When the extension is not used the edit is a no-op, so a
// second run (extension already gone) changes nothing (idempotent).
import { metalRough } from '@gltf-transform/functions';

const SPEC_GLOSS = 'KHR_materials_pbrSpecularGlossiness';

export async function specGlossToMetalRough(doc) {
  const used = doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === SPEC_GLOSS);
  if (!used) return doc;
  await doc.transform(metalRough());
  return doc;
}
