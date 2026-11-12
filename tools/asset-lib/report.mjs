// Console output and exit code for a fetch run (Requirement 17.4, 17.5, 14.5, 14.9, 18.9).
// Pure: no I/O. The CLI prints what formatRunReport returns.
import { formatReport as formatBudgetReport } from './budgets.mjs';

/** Exit code: 1 on any failed, refused or missing-manual pick, exceeded budget or unreadable size. */
export function exitCodeFor(result) {
  const budgets = result.budgets;
  const budgetBad = budgets ? budgets.exitCode === 1 || (budgets.exceeded?.length ?? 0) > 0 || (budgets.unreadable?.length ?? 0) > 0 : false;
  return result.failed.length > 0 || result.refused.length > 0 || (result.missing?.length ?? 0) > 0 || budgetBad ? 1 : 0;
}

/** Human-readable run report, one string, no trailing newline. */
export function formatRunReport(result, { dryRun = false } = {}) {
  const lines = [];
  if (dryRun) lines.push('dry run: nothing was written');
  for (const p of result.plan ?? []) lines.push(`plan: ${p.id}: ${p.action}`);
  for (const w of result.written) lines.push(`written: ${w}`);
  for (const s of result.skipped) lines.push(`unchanged: ${s}`);
  const pr = result.pruned;
  if (pr) {
    const tag = dryRun ? 'would prune' : 'pruned';
    for (const f of pr.folders) lines.push(`${tag}: folder ${f}/`);
    for (const f of pr.files) lines.push(`${tag}: file ${f}`);
    for (const k of pr.manifestKeys) lines.push(`${tag}: manifest entry ${k}`);
    for (const r of pr.creditRows) lines.push(`${tag}: credits row ${r}`);
  }
  for (const r of result.refused) lines.push(`refused: ${r.name}: ${r.reason}`);
  for (const m of result.missing ?? []) lines.push(`missing manual file: ${m.message}`);
  for (const f of result.failed) lines.push(`failed: ${f.name}: ${f.cause}`);
  for (const w of result.warnings ?? []) lines.push(`warning: ${w}`);
  if (result.budgets) lines.push(formatBudgetReport(result.budgets));
  lines.push(
    `summary: ${result.written.length} written, ${result.skipped.length} unchanged, ` +
      `${result.refused.length} refused, ${(result.missing ?? []).length} missing, ${result.failed.length} failed` +
      `${pr && !dryRun && pr.files.length > 0 ? `, ${pr.files.length} pruned` : ''}; exit ${result.exitCode}`,
  );
  return lines.join('\n');
}
