// Validates a data JSON file against its schema in data/schema.
// Usage: node tools/validate-data.mjs <file>
// If no argument is given, looks for a .json path in the hook payload on stdin.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = (why) => {
  console.log(`skipped: ${why}`);
  process.exit(0);
};

async function findTarget() {
  if (process.argv[2]) return process.argv[2];
  if (process.stdin.isTTY) return null;
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const hit = (v) => {
    if (typeof v === 'string') return /\.json$/i.test(v) ? v : null;
    if (v && typeof v === 'object') {
      for (const x of Object.values(v)) {
        const r = hit(x);
        if (r) return r;
      }
    }
    return null;
  };
  try {
    return hit(JSON.parse(raw));
  } catch {
    return null;
  }
}

const schemaDir = path.join(root, 'data', 'schema');
if (!existsSync(schemaDir)) skip('data/schema not found');

const target = await findTarget();
if (!target) skip('no file given');

const file = path.resolve(root, target);
const rel = path.relative(root, file).split(path.sep).join('/');
if (!rel.startsWith('data/') || rel.startsWith('data/schema/')) skip(`${rel} is not a data file`);
if (!existsSync(file)) skip(`${rel} does not exist`);

// Pick the schema by file name.
const base = path.basename(file, '.json');
let schemaName = null;
if (/(^|\/)firms\/[^/]+\.json$/.test(rel)) schemaName = 'firm';
else if (['firms_index', 'macro', 'keeper_log'].includes(base)) schemaName = `${base}`;
if (!schemaName) skip(`no schema matches ${rel}`);
const schemaFile = path.join(schemaDir, `${schemaName}.schema.json`);
if (!existsSync(schemaFile)) skip(`schema ${schemaName}.schema.json not found`);

// Load ajv from web/node_modules.
const webPkg = path.join(root, 'web', 'package.json');
const notInstalled = 'skipped: ajv not installed (run pnpm install in web)';
if (!existsSync(webPkg)) {
  console.log(notInstalled);
  process.exit(0);
}
let Ajv2020, addFormats;
try {
  const req = createRequire(webPkg);
  const a = req('ajv/dist/2020.js');
  Ajv2020 = a.default ?? a;
  const f = req('ajv-formats');
  addFormats = f.default ?? f;
} catch {
  console.log(notInstalled);
  process.exit(0);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const s of readdirSync(schemaDir).filter((n) => n.endsWith('.schema.json'))) {
  const json = JSON.parse(readFileSync(path.join(schemaDir, s), 'utf8'));
  if (s !== `${schemaName}.schema.json`) {
    try {
      ajv.addSchema(json);
    } catch {
      /* ignore duplicate or id-less schemas */
    }
  }
}
const validate = ajv.compile(JSON.parse(readFileSync(schemaFile, 'utf8')));

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`FAIL ${rel}: invalid JSON (${e.message})`);
  process.exit(1);
}
if (validate(data)) {
  console.log(`ok: ${rel} matches ${schemaName}.schema.json`);
} else {
  console.error(`FAIL ${rel} vs ${schemaName}.schema.json:`);
  for (const err of validate.errors.slice(0, 20)) {
    console.error(`  ${err.instancePath || '/'} ${err.message}`);
  }
  process.exit(1);
}
