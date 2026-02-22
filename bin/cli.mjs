#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

execFileSync(
  join(root, 'node_modules', '.bin', 'tsx'),
  [join(root, 'src', 'stdio.ts')],
  { stdio: 'inherit', env: { ...process.env } }
);
