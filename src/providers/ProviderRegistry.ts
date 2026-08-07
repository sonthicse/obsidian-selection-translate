import type { ProviderId } from '../types';
import type { SelectionTranslateSettings } from '../settings/settings';
import { DeepLProvider } from './DeepLProvider';
import { GoogleCloudProvider } from './GoogleCloudProvider';
import { GoogleFreeProvider } from './GoogleFreeProvider';
import {
	FreeDictionaryProvider,
	GtxDictionaryProvider,
	type DictionaryProvider,
} from './DictionaryProvider';
import type { TranslationProvider } from './TranslationProvider';

/**
 * Hands out provider instances according to the current settings.
 *
 * Instances are built once and reused: they hold no request state, and reading
 * the API key through a getter rather than a constructor value means changing
 * the key in settings takes effect on the next lookup with nothing to rebuild.
 */
export class ProviderRegistry {
	private readonly translators: Record<ProviderId, TranslationProvider>;
	private readonly gtxDictionary = new GtxDictionaryProvider();
	private readonly freeDictionary = new FreeDictionaryProvider();

	constructor(private readonly getSettings: () => SelectionTranslateSettings) {
		this.translators = {
			'google-free': new GoogleFreeProvider(),
			'google-cloud': new GoogleCloudProvider(() => this.getSettings().googleCloudApiKey),
			deepl: new DeepLProvider(() => this.getSettings().deeplApiKey),
		};
	}

	/** The engine the user chose. */
	getTranslator(): TranslationProvider {
		return this.translators[this.getSettings().provider];
	}

	/** Any engine by id, for the settings tab's per-engine test buttons. */
	getTranslatorById(id: ProviderId): TranslationProvider {
		return this.translators[id];
	}

	/**
	 * Dictionary sources to consult for a word, in order, or an empty list.
	 *
	 * The ordering encodes what each source is actually good at. The free
	 * Google endpoint knows every language and supplies the parts of speech and
	 * alternative meanings, so it comes first. The Free Dictionary API is
	 * English-only but has real IPA, which Google routinely omits for
	 * English-to-Vietnamese — the plugin's most common pair. Consulting both and
	 * merging is what makes the popup complete for English words without
	 * a second request for every other language.
	 */
	getDictionaries(detectedLang: string): DictionaryProvider[] {
		const settings = this.getSettings();
		if (!settings.dictionaryEnrichment || settings.dictionarySource === 'off') return [];

		const sources: DictionaryProvider[] = [];
		const wanted = settings.dictionarySource;

		if (wanted === 'auto' || wanted === 'gtx') {
			// Redundant when the free endpoint already did the translating; the
			// orchestrator skips the call when the data is in hand.
			sources.push(this.gtxDictionary);
		}
		if ((wanted === 'auto' || wanted === 'dictionaryapi') && this.freeDictionary.supports(detectedLang)) {
			sources.push(this.freeDictionary);
		}

		return sources;
	}
}
