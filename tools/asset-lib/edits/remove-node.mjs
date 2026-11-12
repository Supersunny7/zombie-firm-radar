// removeNode: remove a named node (with descendants) or a named mesh, then prune (Requirement 36.4).
import { prune } from '@gltf-transform/functions';
import { EditTargetMissing } from './errors.mjs';

function disposeTree(node) {
  for (const child of node.listChildren()) disposeTree(child);
  node.dispose();
}

export async function removeNode(doc, params, ctx = {}) {
  const root = doc.getRoot();
  const byNode = typeof params.node === 'string';
  const name = byNode ? params.node : params.mesh;
  const found = byNode
    ? root.listNodes().filter((n) => n.getName() === name)
    : root.listMeshes().filter((m) => m.getName() === name);
  if (found.length === 0) {
    if (ctx.strict) throw new EditTargetMissing({ pick: ctx.pick, op: 'removeNode', target: name });
    return doc;
  }
  for (const item of found) {
    if (byNode) disposeTree(item);
    else item.dispose(); // nodes that pointed at the mesh become empty; prune drops empty leaves
  }
  await doc.transform(prune());
  return doc;
}
