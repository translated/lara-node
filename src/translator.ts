import { AudioTranslator } from "./audioTranslator";
import type { AccessKey, AuthToken } from "./credentials";
import { Documents } from "./documents";
import { Glossaries } from "./glossaries";
import { ImageTranslator } from "./imageTranslator";
import { Memories } from "./memories";
import createClient, { HttpClient, type LaraClient } from "./net/lara";
import { Styleguides } from "./styleguides";
import { DEFAULT_BASE_URL } from "./utils/defaultBaseUrl";
import { version } from "./utils/sdk-version";

export type TranslatorOptions = {
    serverUrl?: string;
    connectionTimeoutMs?: number;
    keepAlive?: boolean;
};

export interface NGMemoryMatch {
    memory: string;
    tuid?: string;
    language: [string, string];
    sentence: string;
    translation: string;
    score: number;
}

export interface NGGlossaryMatch {
    glossary: string;
    language: [string, string];
    term: string;
    translation: string;
}

export interface ProfanityDetectResult {
    maskedText: string;
    profanities: {
        text: string;
        startCharIndex: number;
        endCharIndex: number;
        score: number;
    }[];
}

export interface TextBlock {
    readonly text: string;
    readonly translatable?: boolean;
}

export type StyleguideChange = {
    id?: string;
    originalTranslation: string;
    refinedTranslation: string;
    explanation: string;
};

export type StyleguideResults<T extends string | string[] | TextBlock[]> = {
    originalTranslation: T;
    changes: StyleguideChange[];
};

export interface TextResult<T extends string | string[] | TextBlock[]> {
    readonly contentType: string;
    readonly sourceLanguage: string;
    readonly translation: T;
    readonly adaptedTo?: string[];
    readonly glossaries?: string[];
    readonly adaptedToMatches?: NGMemoryMatch[] | NGMemoryMatch[][];
    readonly glossariesMatches?: NGGlossaryMatch[] | NGGlossaryMatch[][];
    readonly profanities?: ProfanityDetectResult | ProfanityDetectResult[];
    readonly styleguideResults?: StyleguideResults<T>;
}

export type TranslateOptions = {
    sourceHint?: string;
    adaptTo?: string[];
    instructions?: string[];
    glossaries?: string[];
    contentType?: string;
    multiline?: boolean;
    timeoutInMillis?: number;
    priority?: "normal" | "background";
    useCache?: boolean | "overwrite";
    cacheTTLSeconds?: number;
    noTrace?: boolean;
    verbose?: boolean;
    headers?: Record<string, string>;
    style?: TranslationStyle;
    reasoning?: boolean;
    metadata?: string | Record<string, unknown>;
    profanityFilter?: ProfanityFilter;
    styleguideId?: string;
    styleguideReasoning?: boolean;
    styleguideExplanationLanguage?: string;
};

export type TranslationStyle = "faithful" | "fluid" | "creative";

export type ProfanityFilter = "detect" | "avoid" | "hide";
export interface QualityEstimationResult {
    score: number;
}

export interface DetectResult {
    language: string;
    contentType: string;
    predictions: {
        language: string;
        confidence: number;
    }[];
}

export class Translator {
    protected readonly client: LaraClient;
    public readonly memories: Memories;
    public readonly documents: Documents;
    public readonly glossaries: Glossaries;
    public readonly styleguides: Styleguides;
    public readonly audio: AudioTranslator;
    public readonly images: ImageTranslator;

    constructor(auth: AccessKey | AuthToken, options?: TranslatorOptions) {
        this.client = createClient(auth, options?.serverUrl, options?.keepAlive, options?.connectionTimeoutMs);
        this.memories = new Memories(this.client);
        this.documents = new Documents(this.client);
        this.glossaries = new Glossaries(this.client);
        this.styleguides = new Styleguides(this.client);
        this.audio = new AudioTranslator(this.client);
        this.images = new ImageTranslator(this.client);
    }

    get version(): string {
        return version;
    }

    async getLanguages(): Promise<string[]> {
        return await this.client.get<string[]>("/v2/languages");
    }

    async translate<T extends string | string[] | TextBlock[]>(
        text: T,
        source: string | null,
        target: string,
        options?: TranslateOptions,
        callback?: (partialResult: TextResult<T>) => void
    ): Promise<TextResult<T>> {
        const headers: Record<string, string> = {};

        if (options?.headers) {
            for (const [name, value] of Object.entries(options.headers)) {
                headers[name] = value;
            }
        }

        if (options?.noTrace) {
            headers["X-No-Trace"] = "true";
        }

        const response = this.client.postAndGetStream<TextResult<T>>(
            "/translate",
            {
                q: text,
                source,
                target,
                source_hint: options?.sourceHint,
                content_type: options?.contentType,
                multiline: options?.multiline !== false,
                adapt_to: options?.adaptTo,
                glossaries: options?.glossaries,
                instructions: options?.instructions,
                timeout: options?.timeoutInMillis,
                priority: options?.priority,
                use_cache: options?.useCache,
                cache_ttl: options?.cacheTTLSeconds,
                verbose: options?.verbose,
                style: options?.style,
                reasoning: options?.reasoning,
                metadata: options?.metadata,
                profanity_filter: options?.profanityFilter,
                styleguide_id: options?.styleguideId,
                styleguide_reasoning: options?.styleguideReasoning,
                styleguide_explanation_language: options?.styleguideExplanationLanguage
            },
            undefined,
            headers
        );

        let lastResult: TextResult<T> | undefined;
        for await (const partial of response) {
            if (options?.reasoning && callback) callback(partial);
            lastResult = partial;
        }

        if (!lastResult) throw new Error("No translation result received.");

        return lastResult;
    }

    async detect(text: string | string[], hint?: string, passlist?: string[]): Promise<DetectResult> {
        return await this.client.post<DetectResult>("/v2/detect/language", {
            q: text,
            hint,
            passlist
        });
    }

    async detectProfanities(text: string, language: string, contentType: string): Promise<ProfanityDetectResult> {
        return await this.client.post<ProfanityDetectResult>("/v2/detect/profanities", {
            text,
            language,
            content_type: contentType
        });
    }

    async qualityEstimation(
        source: string,
        target: string,
        sentence: string | string[],
        translation: string | string[]
    ): Promise<QualityEstimationResult | QualityEstimationResult[]> {
        return await this.client.post<QualityEstimationResult | QualityEstimationResult[]>(
            "/v2/detect/quality-estimation",
            {
                source,
                target,
                sentence,
                translation
            }
        );
    }

    static async getLoginUrl(serverUrl?: string): Promise<string> {
        if (!serverUrl) serverUrl = DEFAULT_BASE_URL;
        const { body } = await HttpClient.get(`${serverUrl.replace(/\/+$/, "")}/v2/auth/login-page`);
        return body;
    }
}
