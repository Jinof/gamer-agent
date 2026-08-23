'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const roots = ['src', 'scripts', 'test'];

function collectJavaScriptFiles(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return [];

  const stats = fs.statSync(absolutePath);
  if (stats.isFile()) return absolutePath.endsWith('.js') ? [absolutePath] : [];

  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    return collectJavaScriptFiles(path.join(relativePath, entry.name));
  });
}

const files = roots.flatMap(collectJavaScriptFiles).sort();
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr);
  }
}

if (failed) process.exitCode = 1;
else process.stdout.write(`Syntax check passed for ${files.length} JavaScript files.\n`);
