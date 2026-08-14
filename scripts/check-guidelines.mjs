/*
 * Obsidian's plugin guidelines, as an executable check.
 *
 * These are the rules a submission is rejected for, and every one of them is
 * the kind of thing that survives code review and is caught by a reviewer
 * instead. Running them in CI means the answer is known before the plugin is
 * submitted, rather than a week later — and under the current submission flow
 * that matters more than it used to, since fixing a rejected submission means
 * publishing a whole new release rather than pushing to a branch.
 *
 * Some overlap with the ESLint config on purpose: ESLint sees TypeScript,
 * this sees the whole repository, including manifest.json and styles.css.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
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

/* ── manifest.json, which the community directory validates on submission ── */

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
// The directory rejects this outright: everything listed there is an Obsidian
// plugin, so saying so in the description is noise. Missing from this file
// until 0.3.0 was submitted and turned down for exactly it — the name and id
// were checked, the description was not.
if (/obsidian/i.test(manifest.description)) {
	fail('Description content', 'manifest description must not contain "Obsidian"');
}
// Reviewed as a warning rather than an error, but it is the same class of
// mistake: the description has one job, which is to say what the thing does.
if (/\b(this|a|the)\s+plugin\b/i.test(manifest.description)) {
	fail('Description content', 'manifest description must not refer to itself as a plugin');
}
if (/obsidian/i.test(manifest.name)) {
	fail('Plugin name', 'the plugin name must not contain "Obsidian"');
}
// The community directory rejects an id containing "obsidian" outright, which
// is a separate rule from the one about the display name.
if (/obsidian/i.test(manifest.id)) {
	fail('Plugin id', 'the plugin id must not contain "obsidian"');
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

/*
 * Every catalogue beside English, found rather than listed.
 *
 * A hand-written list here is the one place a new locale could be added and
 * silently go unchecked, which is precisely the failure this section exists to
 * prevent.
 */
const localeFiles = walk('src/i18n', ['.ts']).filter(
	(file) => !/[/\\](index|en)\.ts$/.test(file)
);

const enKeys = keysOf('src/i18n/en.ts');
const enPlaceholders = placeholdersOf('src/i18n/en.ts');

for (const file of localeFiles) {
	const keys = keysOf(file);

	for (const key of enKeys) {
		if (!keys.includes(key)) fail('Missing translation', `${file} has no "${key}"`);
	}
	for (const key of keys) {
		if (!enKeys.includes(key)) {
			fail('Extra translation', `${file} has "${key}", which en.ts does not`);
		}
	}

	/*
	 * Placeholders too, not just key names.
	 *
	 * A catalogue can have every key and still be broken: `{ms}` misspelled in
	 * one language renders the braces to the user. English is the source of
	 * truth, so every other catalogue has to substitute exactly the same names.
	 */
	const placeholders = placeholdersOf(file);

	for (const [key, names] of enPlaceholders) {
		const theirs = placeholders.get(key);
		if (theirs == null) continue;
		if (names.join(',') !== theirs.join(',')) {
			fail(
				'Placeholder mismatch',
				`"${key}" substitutes {${names.join('}, {')}} in en.ts but {${theirs.join('}, {')}} in ${file}`
			);
		}
	}
}

/* ── The README's host list matches the hosts the code actually calls ─────── */

/*
 * The one reviewers catch most often, and the one that goes stale most easily:
 * a new provider adds a host in constants.ts and README keeps yesterday's
 * table. Both directions are checked — an undeclared host is a disclosure
 * failure, and a declared host that nothing calls is a claim about the plugin
 * that is not true.
 */
const readme = readFileSync('README.md', 'utf8');
const declaredHosts = new Set(
	[...readme.matchAll(/^\| `([a-z0-9.-]+\.[a-z]{2,})`/gm)].map((match) => match[1])
);

const calledHosts = new Set();
for (const file of sourceFiles) {
	for (const [, host] of readFileSync(file, 'utf8').matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/g)) {
		// example.com lives in a comment showing what a markdown link looks like.
		if (host === 'example.com') continue;
		calledHosts.add(host);
	}
}

for (const host of calledHosts) {
	if (!declaredHosts.has(host)) {
		fail('Undeclared network host', `src/ contacts ${host}, which README's Network use table omits`);
	}
}
for (const host of declaredHosts) {
	if (!calledHosts.has(host)) {
		fail('Stale network host', `README declares ${host}, which nothing in src/ contacts`);
	}
}

/* ── Documentation links point at files that exist ────────────────────────── */

const markdownFiles = ['README.md', 'README.vi.md', ...walk('docs', ['.md'])];

for (const file of markdownFiles) {
	const text = readFileSync(file, 'utf8');
	const from = dirname(file);

	for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
		if (/^(https?:|mailto:|#)/.test(target)) continue;

		// Strip any anchor: the file has to exist, the heading is not checked.
		const path = join(from, target.split('#')[0]);
		if (path.length === 0 || exists(path)) continue;

		fail('Dead documentation link', `${file} links to ${target}, which does not exist`);
	}
}

function placeholdersOf(file) {
	const text = readFileSync(file, 'utf8');
	const out = new Map();

	for (const [, key, value] of text.matchAll(/^\t'([^']+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'/gm)) {
		out.set(key, [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort());
	}
	return out;
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

console.log(
	`All guideline checks passed (${sourceFiles.length} source files, ${enKeys.length} UI strings ` +
		`× ${localeFiles.length + 1} locales).`
);
