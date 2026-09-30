// Corre test/*.test.ts con el test runner de Node + tsx (TypeScript y alias @/).
// Lista los archivos acá porque Node 20 no expande globs en --test.

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => path.join(dir, f));

const { status } = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...files],
  { stdio: 'inherit' }
);
process.exit(status ?? 1);
