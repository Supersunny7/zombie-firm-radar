// PreToolUse guard. Asks the user before: writes under pipeline/, adding .kiro to
// .gitignore, or writing a .env file. Reads the hook payload (JSON) from stdin.
let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let payload = {};
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const input = payload.tool_input ?? payload.toolInput ?? payload.input ?? payload.args ?? {};
const norm = (s) => String(s ?? '').replace(/\\/g, '/');
const paths = ['path', 'targetFile', 'file', 'filePath', 'sourcePath', 'destinationPath']
  .map((k) => norm(input[k]))
  .filter(Boolean);
const command = norm(input.command);
const content = [input.text, input.newStr, input.oldStr].filter(Boolean).join('\n');
const writeVerb = />|Set-Content|Add-Content|Out-File|New-Item|Copy-Item|Move-Item|Remove-Item|\btee\b|\becho\b|\bsed\b|git\s+(add|mv|rm)/i;

const reasons = [];

for (const p of paths) {
  if (/(^|\/)pipeline\//.test(p)) reasons.push(`writes under pipeline/ (${p}), which the partner owns`);
  if (/(^|\/)\.env(\.(?!example$)[^/]*)?$/i.test(p)) reasons.push(`writes a .env file (${p})`);
  if (/(^|\/)\.gitignore$/.test(p) && /^\s*\/?\.kiro\b/m.test(content)) {
    reasons.push('adds .kiro to .gitignore');
  }
}
if (command) {
  if (/(^|[\s'"=/])pipeline\//.test(command) && writeVerb.test(command)) {
    reasons.push('shell command changes files under pipeline/, which the partner owns');
  }
  if (/\.env(?!\.example)(\.\w+)?(?![\w/])/i.test(command) && writeVerb.test(command)) {
    reasons.push('shell command writes a .env file');
  }
  if (/\.gitignore/.test(command) && /(^|[^!])\.kiro/.test(command.replace(/!\.kiro/g, ''))) {
    reasons.push('shell command would add .kiro to .gitignore');
  }
}

if (reasons.length) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        permissionDecision: 'ask',
        permissionDecisionReason: `guard-ownership: ${[...new Set(reasons)].join('; ')}. Confirm first.`,
      },
    }),
  );
}
process.exit(0);
