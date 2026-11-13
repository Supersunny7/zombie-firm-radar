// removeAnimations: dispose every animation clip, then prune the orphaned samplers and
// accessors. Skins and meshes stay. A second run finds no clips, so it is idempotent.
import { prune } from '@gltf-transform/functions';

export async function removeAnimations(doc) {
  for (const clip of doc.getRoot().listAnimations()) clip.dispose();
  await doc.transform(prune());
  return doc;
}
