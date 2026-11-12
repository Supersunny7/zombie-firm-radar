export type ToolStatus = 'v1' | 'extension';

export interface ToolParamSpec {
  readonly key: string;
  readonly min: number;
  readonly max: number;
}

export interface ToolSpec {
  readonly name: string;
  readonly status: ToolStatus;
  readonly params: readonly ToolParamSpec[];
  /** Position in Canonical_Order. */
  readonly order: number;
}

function freezeSpec(spec: ToolSpec): ToolSpec {
  const params = spec.params.map((p) => Object.freeze({ ...p }));
  return Object.freeze({ ...spec, params: Object.freeze(params) });
}

/** Frozen constant: v1 tools plus extension points, in Canonical_Order. */
export const TOOL_REGISTRY: readonly ToolSpec[] = Object.freeze(
  [
    { name: 'cut_costs', status: 'v1', params: [{ key: 'c', min: 0, max: 0.08 }], order: 0 },
    { name: 'sell_assets', status: 'v1', params: [{ key: 's', min: 0, max: 0.3 }], order: 1 },
    { name: 'debt_for_equity', status: 'v1', params: [{ key: 'w', min: 0, max: 0.6 }], order: 2 },
    { name: 'refinance', status: 'v1', params: [], order: 3 },
    {
      name: 'issue_equity',
      status: 'extension',
      params: [{ key: 'k', min: 0, max: 0.25 }],
      order: 4,
    },
    { name: 'chapter_11', status: 'extension', params: [], order: 5 },
    { name: 'liquidate', status: 'extension', params: [], order: 6 },
  ].map((s) => freezeSpec(s as ToolSpec)),
);
