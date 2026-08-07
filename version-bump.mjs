/*
 * Keeps package.json, manifest.json and versions.json in lockstep.
 *
 * Run indirectly through `npm version <patch|minor|major>`: npm rewrites
 * package.json first, then runs the "version" script, so by the time this file
 * executes the new number is already on disk and is the single source of truth.
 *
 * versions.json maps every published plugin version to the minimum Obsidian
 * version it needs, which is how older Obsidian installs know to offer an older
 * release instead of one they cannot run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const targetVersion = process.env.npm_package_version ?? readJson('package.json').version;

if (!/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error(
    `Refusing to bump: "${targetVersion}" is not a plain x.y.z version. ` +
      'Obsidian release tags carry no "v" prefix and no pre-release suffix.'
  );
  process.exit(1);
}

const manifest = readJson('manifest.json');
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeJson('manifest.json', manifest);

const versions = readJson('versions.json');
versions[targetVersion] = minAppVersion;
writeJson('versions.json', versions);

console.log(`Bumped to ${targetVersion} (requires Obsidian >= ${minAppVersion}).`);
console.log(`Next: git push && git push --tags   # tag must be "${targetVersion}", not "v${targetVersion}"`);
