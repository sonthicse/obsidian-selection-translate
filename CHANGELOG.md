# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/sonthicse/selection-translate/compare/0.1.0...HEAD
[0.1.0]: https://github.com/sonthicse/selection-translate/releases/tag/0.1.0
