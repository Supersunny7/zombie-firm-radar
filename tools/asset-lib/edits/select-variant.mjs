// selectVariant: keep only the named variant (Requirement 36.6). `variant` is, in this order:
//   1. a KHR_materials_variants name: each primitive gets the material mapped to it, all other
//      variants and mappings are removed;
//   2. a material name: primitives that use any other material are removed;
//   3. a texture name (or file name): primitives whose material does not use that texture are removed.
// Then unreferenced materials, textures, meshes and nodes are pruned. A second run finds nothing
// else to remove, so the edit is idempotent.
import { KHRMaterialsVariants } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { EditTargetMissing } from './errors.mjs';

function textureKeys(texture) {
  const uri = texture.getURI() || '';
  const base = uri.split(/[\\/]/).pop() || '';
  return [texture.getName(), uri, base, base.replace(/\.[^.]+$/, '')].filter((s) => s !== '');
}

function materialsUsingTexture(texture) {
  const out = new Set();
  for (const parent of texture.listParents()) {
    if (parent.propertyType === 'Material') out.add(parent);
    else if (typeof parent.listParents === 'function') {
      for (const gp of parent.listParents()) if (gp.propertyType === 'Material') out.add(gp);
    }
  }
  return out;
}

/** Remove every primitive for which `keep(prim)` is false; empty meshes go too. */
function keepPrimitives(doc, keep) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!keep(prim)) {
        mesh.removePrimitive(prim);
        prim.dispose();
      }
    }
    if (mesh.listPrimitives().length === 0) mesh.dispose();
  }
}

function applyKhrVariant(doc, ext, variant) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const list = prim.getExtension('KHR_materials_variants');
      if (!list) continue;
      const mapping = list.listMappings().find((m) => m.listVariants().includes(variant));
      if (mapping && mapping.getMaterial()) prim.setMaterial(mapping.getMaterial());
      prim.setExtension('KHR_materials_variants', null);
      for (const m of list.listMappings()) m.dispose();
      list.dispose();
    }
  }
  for (const v of ext.listVariants()) v.dispose();
  ext.dispose();
}

export async function selectVariant(doc, params, ctx = {}) {
  const name = params.variant;
  const root = doc.getRoot();

  const ext = doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === 'KHR_materials_variants');
  const khrVariant = ext instanceof KHRMaterialsVariants ? ext.listVariants().find((v) => v.getName() === name) : null;
  const material = root.listMaterials().find((m) => m.getName() === name);
  const texture = root.listTextures().find((t) => textureKeys(t).includes(name));

  if (khrVariant) applyKhrVariant(doc, ext, khrVariant);
  else if (material) keepPrimitives(doc, (p) => !p.getMaterial() || p.getMaterial() === material);
  else if (texture) {
    const users = materialsUsingTexture(texture);
    keepPrimitives(doc, (p) => !p.getMaterial() || users.has(p.getMaterial()));
  } else {
    if (ctx.strict) throw new EditTargetMissing({ pick: ctx.pick, op: 'selectVariant', target: name });
    return doc;
  }
  await doc.transform(prune());
  return doc;
}
