import type { Credentials } from "./credentials";
import { Documents } from "./documents";
import { Glossaries } from "./glossaries";
import { Memories } from "./memories";
import createClient, { type LaraClient } from "./net";

export type TranslatorOptions = {
    serverUrl?: string;
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

export interface TextBlock {
    readonly text: string;
    readonly translatable?: boolean;
}

export interface TextResult<T extends string | string[] | TextBlock[]> {
    readonly contentType: string;
    readonly sourceLanguage: string;
    readonly translation: T;
    readonly adaptedTo?: string[];
    readonly glossaries?: string[];
    readonly adaptedToMatches?: NGMemoryMatch[] | NGMemoryMatch[][];
    readonly glossariesMatches?: NGGlossaryMatch[] | NGGlossaryMatch[][];
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
};

export type TranslationStyle = "faithful" | "fluid" | "creative";

export interface DetectResult {
    language: string;
    contentType: string;
}

export class Translator {
    protected readonly client: LaraClient;
    public readonly memories: Memories;
    public readonly documents: Documents;
    public readonly glossaries: Glossaries;

    constructor(credentials: Credentials, options?: TranslatorOptions) {
        this.client = createClient(
            credentials.accessKeyId,
            credentials.accessKeySecret,
            options?.serverUrl,
            options?.keepAlive
        );
        this.memories = new Memories(this.client);
        this.documents = new Documents(this.client);
        this.glossaries = new Glossaries(this.client);
    }

    async getLanguages(): Promise<string[]> {
        return await this.client.get<string[]>("/languages");
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
                reasoning: options?.reasoning
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
        return await this.client.post<DetectResult>("/detect", {
            q: text,
            hint,
            passlist
        });
    }
}
