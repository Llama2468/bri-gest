#!/usr/bin/env node
// Extracts the inline <script> block from each tool's HTML file and checks it
// for JS syntax errors. A syntax error anywhere in the script kills the whole
// page silently (header/footer still render, everything else does nothing) --
// see BACKLOG.md item 1 for the v5.8 defect this exists to catch.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILES = ['index.html', 'gm/index.html', 'endo/index.html'];
const repoRoot = path.resolve(__dirname, '..', '..');

let failed = false;

for (const rel of FILES) {
  const fullPath = path.join(repoRoot, rel);
  const html = fs.readFileSync(fullPath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    console.error(`[FAIL] ${rel}: no <script> block found`);
    failed = true;
    continue;
  }
  const tmpFile = path.join(os.tmpdir(), `syntax-check-${rel.replace(/[\\/]/g, '_')}.js`);
  fs.writeFileSync(tmpFile, match[1]);
  try {
    execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'pipe' });
    console.log(`[OK]   ${rel}`);
  } catch (err) {
    console.error(`[FAIL] ${rel}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    failed = true;
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

process.exit(failed ? 1 : 0);
