// keepAnimations { names }: keep only the named animation clips, dispose the rest, then prune
// the orphaned samplers and accessors. Strict mode throws EditTargetMissing for a clip that is
// not in the model; tolerant mode ignores it. Running it twice changes nothing (idempotent).
import { prune } from '@gltf-transform/functions';
import { EditTargetMissing } from './errors.mjs';

export async function keepAnimations(doc, params, ctx = {}) {
  const names = Array.isArray(params?.names) ? params.names : [];
  const clips = doc.getRoot().listAnimations();
  const present = new Set(clips.map((a) => a.getName()));
  if (ctx.strict) {
    for (const name of names) {
      if (!present.has(name)) throw new EditTargetMissing({ pick: ctx.pick, op: 'keepAnimations', target: name });
    }
  }
  const keep = new Set(names);
  for (const clip of clips) {
    if (!keep.has(clip.getName())) clip.dispose();
  }
  await doc.transform(prune());
  return doc;
}
