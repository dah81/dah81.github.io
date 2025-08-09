#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Files to normalize (extend as needed)
const files = [
  'src/components/UI/OrientationGate.tsx',
  'src/utils/paths.ts'
];

let changed = 0;
for (const f of files) {
  const p = resolve(process.cwd(), f);
  try {
    const raw = readFileSync(p, 'utf8');
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalized !== raw) {
      writeFileSync(p, normalized, 'utf8');
      changed++;
      console.log('Normalized LF:', f);
    } else {
      console.log('Already LF:', f);
    }
  } catch (e) {
    console.warn('Skip (missing?):', f, e.message);
  }
}

if (!changed) {
  console.log('No line ending changes.');
} else {
  console.log(`Updated ${changed} file(s).`);
}
