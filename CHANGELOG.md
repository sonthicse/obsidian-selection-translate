# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-08-12

Two things you can see. The popup no longer draws over Obsidian's own chrome,
and the plugin no longer keeps a keyboard shortcut of its own — Obsidian's
hotkeys page was always the better place for one, and now it is the only place.

### Removed

- **The plugin's own trigger key is gone.** It was a key you set in these
  options and that worked for the few seconds the button was on screen. Keyboard
  shortcuts belong in one place, and that place is Settings → Hotkeys, where
  *Selection Translate: Translate selection* has been available all along — bind
  whatever you like to it and it works everywhere, not only while the button is
  up. The options page now has a button that takes you straight there. If you
  had a trigger key set, it is dropped when the plugin loads.

### Changed

- **The plugin's two commands are now always named in English** in Obsidian's
  hotkeys page and command palette — "Translate selection" and "Toggle
  translate on selection". They used to follow the plugin's interface language,
  but only from the next restart, so the names on that page were regularly not
  the language you had chosen. Vietnamese users will notice the change; nothing
  about the commands themselves, their hotkeys or their behaviour is affected.

### Fixed

- **Obsidian's own shortcuts keep working while a translation is on screen.**
  The command palette, in particular, did nothing at all as long as a popup was
  open — the plugin was holding the keyboard rather than passing on the keys it
  had no use for.
- **The popup and the trigger icon no longer paint over the row of tabs.**
  Scroll far enough and the selection leaves the note, and what floats beside
  it used to keep going — sliding up over the header with the back button and
  the note title, still fully drawn, still on top of Obsidian's own controls.
  It now slides *under* that row and disappears the moment the last of it
  leaves the text area, then comes back whole, with the same translation, when
  you scroll back. In a PDF it stops at the toolbar rather than under it.
- **Nothing spills into the note beside it in a split.** With two notes side by
  side, a popup wider than the half it belongs to used to be drawn over its
  neighbour. It is now cut off at the edge of its own note, on both sides.

## [0.2.3] — 2026-08-12

Housekeeping. Nothing here changes what the plugin does, with one small
exception noted below — the work was an audit of why an earlier submission to
the community store failed, and a restructuring of the four largest files so
the features planned next do not each have to do it themselves.

### Fixed

- **A sideways wheel gesture in page mode no longer scrolls by the wrong
  amount.** It was measured against the window's height instead of its width.
  Rare — it needs a mouse driver or desktop that reports page-sized deltas for
  a horizontal gesture — but wrong by a third on a typical window.

### Changed

- The options page now leads with the choice of translation engine, and says
  plainly that the default one runs on an endpoint Google does not document,
  support, or publish terms for. Whether that suits you is your call to make;
  DeepL and Google Cloud are one dropdown away. Also spelled out in README and
  `docs/PRIVACY.md`.

### Internal

Not user-visible, but recorded because the next few releases build on it:

- `UiController`, `TranslatePopup`, `SettingTab` and `SelectionManager` were
  split along the seams they already had. Deciding whether to draw the floating
  UI and deciding how much of it to clip are now one call rather than three
  separate ones — which is what was letting the popup paint over the tab header.
- The selection rules — what makes a selection worth reacting to, and in what
  order — became a pure function with 17 tests. 297 tests become 314.
- `npm run verify` gained four gates: the layer boundary between UI and
  providers, i18n placeholder parity, README's host list against the hosts the
  code actually contacts, and dead links in `docs/`. Each was confirmed to fail
  on a real violation before being committed.
- Four unreachable methods and two unused UI strings removed.
- `docs/REVIEW-FINDINGS.md` and `docs/CODE-REVIEW.md` record the investigation
  and the review that argued for all of the above.

## [0.2.2] — 2026-08-11

### Fixed

- **The wheel scrolls the note again while the pointer is over the popup.**
  The popup opens directly under the pointer, and scrolling with it there did
  nothing at all — in the editor, in reading view and on a PDF page alike. A
  result too long to fit still scrolls inside the popup first, and only carries
  on scrolling the note once it reaches its end. Ctrl+wheel still zooms.
- **The button and the popup now leave the top edge of a tab the way they leave
  the bottom one.** Scrolling up used to make them disappear outright the moment
  the selected text passed under the tab header, while the popup itself was
  still sitting in plain sight in the middle of the note. They now stay on
  screen until they reach the edge themselves, slide under the header rather
  than over it, and come back the same way.

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

[Unreleased]: https://github.com/sonthicse/obsidian-selection-translate/compare/0.3.0...HEAD
[0.3.0]: https://github.com/sonthicse/obsidian-selection-translate/compare/0.2.3...0.3.0
[0.2.3]: https://github.com/sonthicse/obsidian-selection-translate/compare/0.2.2...0.2.3
[0.2.2]: https://github.com/sonthicse/obsidian-selection-translate/compare/0.2.0...0.2.2
[0.2.0]: https://github.com/sonthicse/obsidian-selection-translate/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/sonthicse/obsidian-selection-translate/releases/tag/0.1.0
