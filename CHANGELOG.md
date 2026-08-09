# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-08-09

A behaviour release rather than a bug-fix one: the button and popup now follow
the text you selected, and the "Show original" toggle is gone.

### Changed

- **The button and the popup stay with the selection while you scroll.**
  Previously the button vanished at the first scroll event and the popup simply
  stayed where it was while the text moved out from under it. Both now track the
  selection, disappear when it scrolls out of view, and come back when it
  returns. Only Escape, a click elsewhere, clearing the selection, or switching
  note, file or layout closes them.

### Removed

- **The "Show original" toggle in the result popup.** It restated text that is
  still highlighted on screen a few pixels away, and it cost a line of vertical
  space in every result.

  If you relied on it to see what the Markdown normaliser actually sent — for
  instance to explain a surprising translation — turn off *Remove Markdown
  before translating* to send the selection verbatim, or turn on *Debug logging*
  and read the request in the developer console. Reading aloud is unaffected: it
  still speaks the original text, not the translation.

### Fixed

- The trigger button no longer appears when you rename a file, folder or canvas
  in either sidebar. Renaming turns the tree item into an editable field with
  its name pre-selected, which the plugin read as an ordinary selection.
- Hovering the button or anything inside the popup no longer shows a tooltip,
  and no longer shows two stacked on top of each other. Every control keeps its
  screen-reader name.
- The button is no longer see-through on hover under the *Match Obsidian* theme,
  and no longer turns into a blank white square when a dark Obsidian theme is
  paired with the white popup.
- Releases now carry `main.js`, `manifest.json` and `styles.css` reliably: the
  workflow adopts a release that already exists instead of failing on it, can be
  re-run against an existing tag, and fails loudly if any asset is missing.
- Cleared the findings from Obsidian's automated plugin review, and added
  `eslint-plugin-obsidianmd` plus the type-aware TypeScript rules to
  `npm run lint` so the next batch is caught before submission rather than after.

## [0.1.0] — 2026-08-08

First release.

### Added

- **Selection detection across every Obsidian surface** — reading view, Live
  Preview, Source mode, PDF pages, properties (names and values), tables,
  callouts, code blocks, links, and popout windows. Three selection readers
  behind one interface cover the cases the ordinary DOM Selection API cannot:
  `<input>` elements, whose selection is measured with a mirror div, and PDF
  pages, whose highlighted text layer is read directly when Obsidian reports an
  empty selection.
- **A trigger button beside the selection**, placed by a candidate search that
  moves it aside rather than covering menus, tooltips, the PDF toolbar or the
  tab header.
- **Result popup** showing the translation, and for a single word its
  pronunciation, part of speech and alternative meanings. It opens small with a
  loading animation and grows to a measured size rather than jumping.
- **Three translation engines** — Google without a key, Google Cloud
  Translation, and DeepL. The correct DeepL server is derived from the key's
  `:fx` suffix, removing the most common DeepL integration mistake.
- **Dictionary enrichment** from Google and, for English words, the Free
  Dictionary API, so DeepL and Google Cloud can still show pronunciation.
- **Reading aloud** through the system voice offline, or through Google.
- **Vietnamese and English interface**, following Obsidian's own language by
  default.
- **Markdown normalisation** before translating, so `**Domain**
  [information](https://example.com)` is sent as `Domain information`.
- **In-memory translation cache**, never written to disk.
- **Two commands**, neither with a default hotkey, plus a configurable local
  trigger key that is refused where it would type into a note.
- **Full network-use disclosure** in the README and `docs/PRIVACY.md`.

### Security

- API keys are entered through a masked field, never logged, never included in
  an error message, and never sent anywhere but the service that issued them.
- Restoring default options deliberately preserves API keys.
- Translations are never written to `data.json`, which syncs between devices.

[Unreleased]: https://github.com/sonthicse/osidian-selection-translate/compare/0.2.0...HEAD
[0.2.0]: https://github.com/sonthicse/osidian-selection-translate/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/sonthicse/osidian-selection-translate/releases/tag/0.1.0
