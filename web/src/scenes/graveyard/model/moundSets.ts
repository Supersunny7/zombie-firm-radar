/**
 * Which firms draw a closed or a torn mound right now (pure, no React or three imports).
 * Requirements 7.1, 7.4, 7.5, 7.6.
 *
 * `plan.torn` holds firm indices. A firm whose Risen_Zombie is still rising or lowering keeps
 * its torn mound even when it is no longer torn by the shock (`tornMoundSet`). The torn mound
 * appears on the frame after the shock changes (well within 1 s); it is removed only when the
 * firm is neither torn nor active, so within 2 s of the character finishing lowering.
 */
import { tornMoundSet } from './tornMound';

export interface MoundSetPlan {
  readonly torn: readonly number[];
  readonly closed: readonly number[];
}

export interface MoundSets {
  /** Firm indices with a closed mound, ascending. */
  readonly closed: readonly number[];
  /** Firm indices with a torn mound, ascending. */
  readonly torn: readonly number[];
}

export function moundSets(
  firms: readonly { readonly cik: string }[],
  plan: MoundSetPlan,
  activeCiks: ReadonlySet<string>,
): MoundSets {
  const set = tornMoundSet(
    plan.torn.map((i) => firms[i]?.cik ?? ''),
    activeCiks,
  );
  const closed: number[] = [];
  const torn: number[] = [];
  // plan.torn and plan.closed partition the firms; walk both in index order via a merge.
  let a = 0;
  let b = 0;
  while (a < plan.torn.length || b < plan.closed.length) {
    const takeTorn =
      b >= plan.closed.length || (a < plan.torn.length && plan.torn[a]! < plan.closed[b]!);
    const i = takeTorn ? plan.torn[a++]! : plan.closed[b++]!;
    (set.has(firms[i]?.cik ?? '') ? torn : closed).push(i);
  }
  return { closed, torn };
}
