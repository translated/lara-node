import type { LaraClient } from "./net/lara";
import type { MultiPartFile } from "./net/lara/client";
import type { LaraStream } from "./net/s3/laraStream";
import type { NGGlossaryMatch, NGMemoryMatch, TranslationStyle } from "./translator";

export type ImageParagraph = {
    readonly text: string;
    readonly translation: string;
    readonly adaptedToMatches?: NGMemoryMatch[];
    readonly glossariesMatches?: NGGlossaryMatch[];
};

export type ImageTextResult = {
    readonly sourceLanguage: string;
    readonly adaptedTo?: string[];
    readonly glossaries?: string[];
    readonly paragraphs: ImageParagraph[];
};

export type ImageTextTranslationOptions = {
    adaptTo?: string[];
    glossaries?: string[];
    style?: TranslationStyle;
    noTrace?: boolean;
    verbose?: boolean;
};

export type ImageTranslationOptions = Omit<
    ImageTextTranslationOptions & {
        textRemoval?: "overlay" | "inpainting";
    },
    "verbose"
>;

export class ImageTranslator {
    private readonly client: LaraClient;

    constructor(client: LaraClient) {
        this.client = client;
    }

    public async translate(
        file: MultiPartFile,
        source: string | null,
        target: string,
        options?: ImageTranslationOptions
    ): Promise<LaraStream> {
        const headers: Record<string, string> = options?.noTrace ? { "X-No-Trace": "true" } : {};
        headers["Content-Type"] = "multipart/form-data";

        return this.client.post<LaraStream>(
            `/v2/images/translate`,
            {
                source,
                target,
                adapt_to: JSON.stringify(options?.adaptTo),
                glossaries: JSON.stringify(options?.glossaries),
                style: options?.style,
                text_removal: options?.textRemoval
            },
            {
                image: file
            },
            headers,
            true
        );
    }

    public async translateText(
        file: MultiPartFile,
        source: string | null,
        target: string,
        options?: ImageTextTranslationOptions
    ): Promise<ImageTextResult> {
        const headers: Record<string, string> = options?.noTrace ? { "X-No-Trace": "true" } : {};
        headers["Content-Type"] = "multipart/form-data";

        return this.client.post<ImageTextResult>(
            `/v2/images/translate-text`,
            {
                source,
                target,
                adapt_to: JSON.stringify(options?.adaptTo),
                glossaries: JSON.stringify(options?.glossaries),
                style: options?.style,
                verbose: JSON.stringify(options?.verbose)
            },
            {
                image: file
            },
            headers
        );
    }
}
