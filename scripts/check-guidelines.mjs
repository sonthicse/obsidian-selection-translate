/*
 * Obsidian's plugin guidelines, as an executable check.
 *
 * These are the rules a submission is rejected for, and every one of them is
 * the kind of thing that survives code review and is caught by a reviewer
 * instead. Running them in CI means the answer is known before the pull request
 * is opened rather than a week later.
 *
 * Some overlap with the ESLint config on purpose: ESLint sees TypeScript,
 * this sees the whole repository, including manifest.json and styles.css.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import process from 'node:process';

const failures = [];
const notes = [];

function fail(rule, detail) {
	failures.push(`${rule}\n    ${detail}`);
}

/** Every file under a directory, recursively. */
function walk(dir, extensions) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			out.push(...walk(path, extensions));
		} else if (extensions.includes(extname(path))) {
			out.push(path);
		}
	}
	return out;
}

const sourceFiles = walk('src', ['.ts']);

/* ── DOM must be built, never parsed from markup ──────────────────────────── */

for (const file of sourceFiles) {
	const text = readFileSync(file, 'utf8');
	for (const banned of ['innerHTML', 'outerHTML', 'insertAdjacentHTML']) {
		if (text.includes(banned)) {
			fail('No HTML string assignment', `${file} mentions ${banned}`);
		}
	}
}

/* ── The app is reached through this.app, never a global ──────────────────── */

for (const file of sourceFiles) {
	const text = readFileSync(file, 'utf8');
	if (/(^|[^.\w])window\.app\b/.test(text)) {
		fail('No global app', `${file} uses window.app`);
	}
}

/* ── Console output goes through the one logging gate ─────────────────────── */

for (const file of sourceFiles) {
	if (file.replace(/\\/g, '/') === 'src/utils/log.ts') continue;

	const text = readFileSync(file, 'utf8');
	if (text.includes('console.log')) {
		fail('No stray console output', `${file} calls console.log directly`);
	}
}

/* ── No leftovers from the sample plugin ──────────────────────────────────── */

for (const file of [...sourceFiles, 'manifest.json', 'package.json', 'README.md'].filter(exists)) {
	const text = readFileSync(file, 'utf8');
	for (const name of ['MyPlugin', 'SampleSettingTab', 'Sample Plugin', 'sample-plugin']) {
		if (text.includes(name)) fail('No sample-plugin leftovers', `${file} contains "${name}"`);
	}
}

/* ── Commands must not claim a hotkey ─────────────────────────────────────── */

for (const file of sourceFiles) {
	const text = readFileSync(file, 'utf8');
	if (/hotkeys\s*:/.test(text)) {
		fail('No default hotkeys', `${file} assigns a default hotkey to a command`);
	}
}

/* ── manifest.json, which the submission bot validates ────────────────────── */

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

if (manifest.description.length > 250) {
	fail('Description length', `manifest description is ${manifest.description.length} characters, max 250`);
}
if (!/^[A-Z][a-z]+\b/.test(manifest.description)) {
	fail('Description opening', 'manifest description should start with a verb');
}
if (!manifest.description.endsWith('.')) {
	fail('Description punctuation', 'manifest description must end with a full stop');
}
if (/\p{Extended_Pictographic}/u.test(manifest.description)) {
	fail('Description content', 'manifest description must not contain emoji');
}
if (/obsidian/i.test(manifest.name)) {
	fail('Plugin name', 'the plugin name must not contain "Obsidian"');
}
if (manifest.id !== 'selection-translate') {
	fail('Plugin id', `unexpected id "${manifest.id}"`);
}

/* ── Version files stay in step ───────────────────────────────────────────── */

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));

if (pkg.version !== manifest.version) {
	fail('Version sync', `package.json is ${pkg.version} but manifest.json is ${manifest.version}`);
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	fail(
		'Version sync',
		`versions.json has no entry mapping ${manifest.version} to ${manifest.minAppVersion}`
	);
}

/* ── Runtime dependencies ─────────────────────────────────────────────────── */

const runtimeDeps = Object.keys(pkg.dependencies ?? {});
if (runtimeDeps.length > 0) {
	notes.push(`Runtime dependencies present: ${runtimeDeps.join(', ')}`);
}

/* ── Colours live in the token block ──────────────────────────────────────── */

const css = readFileSync('styles.css', 'utf8');
const colourLines = css
	.split('\n')
	.map((line, index) => ({ line: line.trim(), number: index + 1 }))
	.filter(({ line }) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line));

for (const { line, number } of colourLines) {
	// Only the --st-* token declarations may carry a literal colour; every
	// other rule has to go through var().
	if (!/^--st-[a-z-]+:/.test(line)) {
		fail('Hardcoded colour', `styles.css:${number} has a literal colour outside the token block`);
	}
}

/* ── Locales stay in step ─────────────────────────────────────────────────── */

const enKeys = keysOf('src/i18n/en.ts');
const viKeys = keysOf('src/i18n/vi.ts');

for (const key of enKeys) {
	if (!viKeys.includes(key)) fail('Missing translation', `vi.ts has no "${key}"`);
}
for (const key of viKeys) {
	if (!enKeys.includes(key)) fail('Extra translation', `vi.ts has "${key}", which en.ts does not`);
}

function keysOf(file) {
	const text = readFileSync(file, 'utf8');
	return [...text.matchAll(/^\t'([^']+)':/gm)].map((match) => match[1]);
}

function exists(path) {
	try {
		statSync(path);
		return true;
	} catch {
		return false;
	}
}

/* ── Report ───────────────────────────────────────────────────────────────── */

for (const note of notes) console.log(`note: ${note}`);

if (failures.length > 0) {
	console.error(`\n${failures.length} guideline check(s) failed:\n`);
	for (const failure of failures) console.error(`  ✗ ${failure}\n`);
	process.exit(1);
}

console.log(`All guideline checks passed (${sourceFiles.length} source files, ${enKeys.length} UI strings).`);
