/* eslint-disable no-console -- this file is a CLI diagnostic command. */

import fs from 'node:fs';
import path from 'node:path';

type PackageManifest = {
  devDependencies?: Record<string, string>;
};

const backendDir = process.cwd();
const rootDir = path.resolve(backendDir, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'),
) as PackageManifest;
const expectedNodeMajor = fs
  .readFileSync(path.join(rootDir, '.nvmrc'), 'utf8')
  .trim()
  .replace(/^v/, '')
  .split('.')[0];
const expectedVitest = manifest.devDependencies?.vitest;
const vitestManifestPath = [
  path.join(backendDir, 'node_modules', 'vitest', 'package.json'),
  path.join(rootDir, 'node_modules', 'vitest', 'package.json'),
].find((candidate) => fs.existsSync(candidate));

if (!vitestManifestPath) {
  console.error('Backend test runtime check failed: Vitest is not installed. Run npm ci from the repository root.');
  process.exit(1);
}

const installedVitest = JSON.parse(
  fs.readFileSync(vitestManifestPath, 'utf8'),
) as { version: string };

const problems: string[] = [];
const actualNodeMajor = process.versions.node.split('.')[0];

if (expectedNodeMajor && actualNodeMajor !== expectedNodeMajor) {
  problems.push(
    `Node.js ${process.versions.node} is running; this repository supports Node.js ${expectedNodeMajor}.x (from .nvmrc and CI).`,
  );
}

if (expectedVitest && installedVitest.version !== expectedVitest) {
  problems.push(
    `Vitest ${installedVitest.version} is installed; backend tests require Vitest ${expectedVitest}.`,
  );
}

if (problems.length > 0) {
  console.error('Backend test runtime check failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error('Use the repository .nvmrc or the Node.js version configured by CI, then run npm ci.');
  process.exit(1);
}

console.log(
  `Backend test runtime: Node.js ${process.versions.node}, Vitest ${installedVitest.version}`,
);
