// Bip01 skeleton check for Rocketbox avatars and animations (Req 34.3, 34.4).
// Pure: operates on joint names or a gltf-transform Document. No file or process access.

export const BIP01_PATTERN_SOURCE = '^Bip01([ _]|$)';
const BIP01_RE = new RegExp(BIP01_PATTERN_SOURCE);

/**
 * Accepts a non-empty list where every name matches ^Bip01([ _]|$).
 * @param {string[]} joints
 * @returns {{ ok: true } | { ok: false, offending: string, expected: string }}
 */
export function checkBip01(joints) {
  if (!Array.isArray(joints) || joints.length === 0) {
    return { ok: false, offending: 'no joints', expected: BIP01_PATTERN_SOURCE };
  }
  for (const name of joints) {
    if (typeof name !== 'string' || !BIP01_RE.test(name)) {
      return { ok: false, offending: String(name), expected: BIP01_PATTERN_SOURCE };
    }
  }
  return { ok: true };
}

/**
 * Joint names of every skin in the document. Nodes outside all skins
 * (for example a scene root) are not joints and are not returned.
 * @param {import('@gltf-transform/core').Document} document
 * @returns {string[]}
 */
export function collectJointNames(document) {
  const names = [];
  for (const skin of document.getRoot().listSkins()) {
    for (const joint of skin.listJoints()) names.push(joint.getName());
  }
  return names;
}

/** Failure message required by the design. */
export function bip01Message(id, offending, expected = BIP01_PATTERN_SOURCE) {
  return (
    `${id}: skeleton is not Bip01-named (first offending joint: "${offending}", ` +
    `expected ${expected}). Rocketbox animations need the Bip01 skeleton; conversion stopped.`
  );
}

/**
 * Checks the document and throws with the design message on failure.
 * @returns {{ ok: true, bip01: true }}
 */
export function assertBip01(document, id) {
  const result = checkBip01(collectJointNames(document));
  if (!result.ok) throw new Error(bip01Message(id, result.offending, result.expected));
  return { ok: true, bip01: true };
}
