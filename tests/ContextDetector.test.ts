import { describe, expect, it } from 'vitest';
import {
	detectContext,
	hasTagName,
	isContextEnabled,
	isEditableContext,
	isTextEntryElement,
} from '../src/core/ContextDetector';
import { DEFAULT_SETTINGS } from '../src/settings/settings';

/**
 * Minimal stand-in for an Element.
 *
 * `detectContext` only ever calls `closest()`, `contains()` and reads
 * `tagName`, so a fake driven by a list of "selectors this element is inside"
 * exercises the real ordering logic without a DOM. `closest` matches by
 * splitting the query on commas, which is exactly what the production selectors
 * need, and returns a distinct object per matched selector so the container and
 * the content element can be told apart.
 */
function fakeElement(options: {
	tagName?: string;
	ancestors?: string[];
	container?: unknown;
	/** Ancestors resolved to their own object, keyed by the selector matching them. */
	named?: Record<string, unknown>;
}): Element {
	const ancestors = new Set(options.ancestors ?? []);
	const named = options.named ?? {};

	const el = {
		nodeType: 1, // Node.ELEMENT_NODE
		tagName: options.tagName ?? 'DIV',
		closest(query: string): unknown {
			const parts = query.split(',').map((part) => part.trim());
			for (const part of parts) {
				if (!ancestors.has(part)) continue;
				// Container queries must hand back something usable as the
				// boundary element; surface queries only need truthiness.
				return named[part] ?? options.container ?? el;
			}
			return null;
		},
	};

	return el as unknown as Element;
}

/** A resolved ancestor: something `closest` can return and `contains` can answer for. */
function fakeAncestor(id: string, encloses: unknown[] = []): HTMLElement {
	const el = {
		id,
		contains(other: unknown): boolean {
			return other === el || encloses.includes(other);
		},
	};

	return el as unknown as HTMLElement;
}

const FALLBACK = fakeAncestor('body');

describe('hasTagName', () => {
	it('matches by tag name rather than instanceof', () => {
		// The point of the helper: an <input> from an Obsidian popout window is
		// not an instanceof the main window's HTMLInputElement, so identity
		// checks silently fail there.
		expect(hasTagName(fakeElement({ tagName: 'INPUT' }), 'INPUT', 'TEXTAREA')).toBe(true);
		expect(hasTagName(fakeElement({ tagName: 'DIV' }), 'INPUT')).toBe(false);
		expect(hasTagName(null, 'INPUT')).toBe(false);
	});
});

describe('isTextEntryElement', () => {
	it('recognises the elements getSelection cannot read', () => {
		expect(isTextEntryElement(fakeElement({ tagName: 'INPUT' }))).toBe(true);
		expect(isTextEntryElement(fakeElement({ tagName: 'TEXTAREA' }))).toBe(true);
		expect(isTextEntryElement(fakeElement({ tagName: 'DIV' }))).toBe(false);
	});
});

describe('detectContext', () => {
	it('returns null for a node with no element', () => {
		expect(detectContext(null, FALLBACK)).toBeNull();
	});

	it('detects the CodeMirror editor, covering both Live Preview and Source mode', () => {
		const info = detectContext(fakeElement({ ancestors: ['.cm-content'] }), FALLBACK);
		expect(info?.context).toBe('md-edit');
		expect(info?.inProperties).toBe(false);
	});

	it('detects reading view', () => {
		const info = detectContext(fakeElement({ ancestors: ['.markdown-reading-view'] }), FALLBACK);
		expect(info?.context).toBe('md-read');
	});

	it('detects a PDF page', () => {
		const info = detectContext(fakeElement({ ancestors: ['.pdf-viewer'] }), FALLBACK);
		expect(info?.context).toBe('pdf');
	});

	it('treats a property key input as an input surface and flags properties', () => {
		const info = detectContext(
			fakeElement({
				tagName: 'INPUT',
				ancestors: ['.metadata-property-key-input', '.metadata-container'],
			}),
			FALLBACK
		);
		expect(info?.context).toBe('input');
		expect(info?.inProperties).toBe(true);
	});

	it('treats a property value as editable and flags properties', () => {
		// A property value is a contenteditable, so typing inserts text there
		// just as it would in the editor — but it must still obey its own scope
		// toggle, which is what the separate flag is for.
		const info = detectContext(
			fakeElement({ ancestors: ['.metadata-property-value', '.metadata-container'] }),
			FALLBACK
		);
		expect(info?.context).toBe('md-edit');
		expect(info?.inProperties).toBe(true);
	});

	it('prefers the input surface when an input sits inside the editor', () => {
		// Ordering guard: an <input> needs a different selection reader no
		// matter which surface encloses it.
		const info = detectContext(
			fakeElement({ tagName: 'INPUT', ancestors: ['.cm-content'] }),
			FALLBACK
		);
		expect(info?.context).toBe('input');
	});

	it('prefers PDF when a PDF view is embedded in a reading view', () => {
		const info = detectContext(
			fakeElement({ ancestors: ['.pdf-viewer', '.markdown-reading-view'] }),
			FALLBACK
		);
		expect(info?.context).toBe('pdf');
	});

	it('prefers the editor over reading view, since Live Preview nests both', () => {
		const info = detectContext(
			fakeElement({ ancestors: ['.cm-content', '.markdown-reading-view'] }),
			FALLBACK
		);
		expect(info?.context).toBe('md-edit');
	});

	it('falls back to "other" for unrecognised surfaces', () => {
		expect(detectContext(fakeElement({}), FALLBACK)?.context).toBe('other');
	});

	it('uses the leaf as the boundary container, or the fallback when there is none', () => {
		const leaf = fakeAncestor('leaf');
		const withLeaf = detectContext(
			fakeElement({ ancestors: ['.cm-content', '.workspace-leaf-content'], container: leaf }),
			FALLBACK
		);
		expect(withLeaf?.containerEl).toBe(leaf);

		const withoutLeaf = detectContext(fakeElement({ ancestors: ['.cm-content'] }), FALLBACK);
		expect(withoutLeaf?.containerEl).toBe(FALLBACK);
	});
});

describe('detectContext, the content element', () => {
	/** One row of the container → content map, wired up as a fake tree. */
	function resolve(containerSelector: string, contentSelector: string, extra: string[] = []) {
		const content = fakeAncestor('content');
		const container = fakeAncestor('container', [content]);

		const info = detectContext(
			fakeElement({
				ancestors: [containerSelector, contentSelector, ...extra],
				named: { [containerSelector]: container, [contentSelector]: content },
			}),
			FALLBACK
		);

		return { info, container, content };
	}

	it('maps a leaf to its view content, which is the whole point of the split', () => {
		// `.workspace-leaf-content` includes `.view-header`. Measuring the
		// boundary from the leaf is what let the popup paint over the row with
		// the back button, so the two must not resolve to the same element.
		const { info, container, content } = resolve('.workspace-leaf-content', '.view-content');

		expect(info?.containerEl).toBe(container);
		expect(info?.contentEl).toBe(content);
		expect(info?.contentEl).not.toBe(info?.containerEl);
	});

	it('maps a bare workspace leaf to its view content as well', () => {
		const { info, content } = resolve('.workspace-leaf', '.view-content');
		expect(info?.contentEl).toBe(content);
	});

	it('maps an embedded note to the embed content, not to the enclosing leaf', () => {
		const { info, content } = resolve('.markdown-embed', '.markdown-embed-content');
		expect(info?.contentEl).toBe(content);
	});

	it('maps a hover preview to the popover body', () => {
		const { info, content } = resolve('.popover', '.hover-popover');
		expect(info?.contentEl).toBe(content);
	});

	it('falls back to the container when it holds no content element', () => {
		const container = fakeAncestor('container');
		const info = detectContext(
			fakeElement({
				ancestors: ['.workspace-leaf-content', '.cm-content'],
				named: { '.workspace-leaf-content': container },
			}),
			FALLBACK
		);

		expect(info?.contentEl).toBe(container);
	});

	it('refuses a content element the container does not enclose', () => {
		// A container with no content box of its own would otherwise borrow the
		// one belonging to whatever encloses it — a boundary far too large.
		const outsider = fakeAncestor('outside');
		const container = fakeAncestor('container');

		const info = detectContext(
			fakeElement({
				ancestors: ['.popover', '.view-content'],
				named: { '.popover': container, '.view-content': outsider },
			}),
			FALLBACK
		);

		expect(info?.contentEl).toBe(container);
	});

	it('falls back to the document body when there is no container at all', () => {
		const info = detectContext(fakeElement({ ancestors: ['.cm-content'] }), FALLBACK);
		expect(info?.contentEl).toBe(FALLBACK);
	});
});

describe('isEditableContext', () => {
	it('flags exactly the surfaces where a bare keystroke would type into content', () => {
		expect(isEditableContext('md-edit')).toBe(true);
		expect(isEditableContext('input')).toBe(true);
		expect(isEditableContext('md-read')).toBe(false);
		expect(isEditableContext('pdf')).toBe(false);
		expect(isEditableContext('other')).toBe(false);
	});
});

describe('isContextEnabled', () => {
	const info = (context: 'md-edit' | 'md-read' | 'pdf' | 'input' | 'other', inProperties = false) => ({
		context,
		inProperties,
		containerEl: FALLBACK,
		contentEl: FALLBACK,
	});

	it('honours each scope toggle', () => {
		expect(isContextEnabled(info('md-read'), { ...DEFAULT_SETTINGS, enableInReading: false })).toBe(false);
		expect(isContextEnabled(info('md-edit'), { ...DEFAULT_SETTINGS, enableInEditing: false })).toBe(false);
		expect(isContextEnabled(info('input'), { ...DEFAULT_SETTINGS, enableInEditing: false })).toBe(false);
		expect(isContextEnabled(info('pdf'), { ...DEFAULT_SETTINGS, enableInPdf: false })).toBe(false);
	});

	it('lets the properties toggle win over the surface toggle', () => {
		// A property value reports as 'md-edit'; disabling properties must
		// silence it even while the editor stays enabled.
		const settings = { ...DEFAULT_SETTINGS, enableInEditing: true, enableInProperties: false };
		expect(isContextEnabled(info('md-edit', true), settings)).toBe(false);
		expect(isContextEnabled(info('md-edit', false), settings)).toBe(true);
	});

	it('leaves the catch-all surface enabled', () => {
		expect(isContextEnabled(info('other'), DEFAULT_SETTINGS)).toBe(true);
	});

	it('enables everything with the shipped defaults', () => {
		for (const context of ['md-edit', 'md-read', 'pdf', 'input', 'other'] as const) {
			expect(isContextEnabled(info(context), DEFAULT_SETTINGS)).toBe(true);
		}
	});
});
