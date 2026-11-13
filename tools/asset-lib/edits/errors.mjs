// Typed errors of the edit framework (design: "Edit operations", Requirements 36.8, 37.3).

/** An edit names a node, mesh, material, texture or variant that is not in the model (36.8). */
export class EditTargetMissing extends Error {
  constructor({ pick, op, target }) {
    super(`pick ${pick ?? '(unknown)'}: edit ${op}: target "${target}" does not exist in the model`);
    this.name = 'EditTargetMissing';
    this.pick = pick ?? null;
    this.op = op;
    this.target = target;
  }
}

/** The recipe names an op that is valid in the table but has no implementation registered yet. */
export class EditNotImplemented extends Error {
  constructor({ pick, op }) {
    super(`pick ${pick ?? '(unknown)'}: edit ${op} is not implemented`);
    this.name = 'EditNotImplemented';
    this.pick = pick ?? null;
    this.op = op;
  }
}

/** splitMesh cannot divide the mesh as asked with gltf-transform alone; the agent asks the user (37.3). */
export class SplitImpossible extends Error {
  constructor({ pick, mesh, reason }) {
    super(
      `pick ${pick ?? '(unknown)'}: edit splitMesh: cannot split mesh "${mesh}": ${reason}. ` +
        'Options: choose other component numbers, split by node, or supply a model whose parts are separate; Blender is not used.',
    );
    this.name = 'SplitImpossible';
    this.pick = pick ?? null;
    this.mesh = mesh;
    this.reason = reason;
  }
}

/** The written GLB declares an extension the pick forbids (pick.forbidExtensions). */
export class ForbiddenExtension extends Error {
  constructor({ pick, extension }) {
    super(`pick ${pick ?? '(unknown)'}: the converted model still uses forbidden extension ${extension}`);
    this.name = 'ForbiddenExtension';
    this.pick = pick ?? null;
    this.extension = extension;
  }
}

/** decimate could not reach the target within the fixed 5-step error search. */
export class DecimateUnreachable extends Error {
  constructor({ pick, target, reached }) {
    super(`pick ${pick ?? '(unknown)'}: edit decimate: reached ${reached} triangles, target is ${target}; no Blender, ask the user`);
    this.name = 'DecimateUnreachable';
    this.pick = pick ?? null;
    this.target = target;
    this.reached = reached;
  }
}
