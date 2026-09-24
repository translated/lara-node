import type { LaraClient } from "./net/lara";
import type { MultiPartFile } from "./net/lara/client";
import type { LaraStream } from "./net/s3/laraStream";
import type { NGGlossaryMatch, NGMemoryMatch, TranslationStyle } from "./translator";
import toSnakeCase from "./utils/to-snake-case";

type ClassicModels = "overlay" | "inpainting";
type GenerativeModels = "generative" | "generative_fast";

export type ImageTranslationModel = ClassicModels | GenerativeModels;

/**
 * Shared options for image translation and text extraction.
 */
type ImageBaseTranslationOptions = {
    adaptTo?: string[];
    glossaries?: string[];
    style?: TranslationStyle;
    noTrace?: boolean;
};

export type ImageTextTranslationOptions = ImageBaseTranslationOptions & {
    /** Include memory and glossary matches in each paragraph. */
    verbose?: boolean;
    /** Include layout metadata for rendering in every returned paragraph. */
    includeLayout?: boolean;
};

export type ImageTranslationOptions = ImageBaseTranslationOptions & {
    /** @deprecated Use `model` instead. */
    textRemoval?: ClassicModels;
    model?: ImageTranslationModel;
};

/** Text fields present in every translated image paragraph. */
export type ImageParagraphContent = {
    readonly text: string;
    readonly translation: string;
};

export type ImageParagraph = ImageParagraphContent & {
    readonly adaptedToMatches?: NGMemoryMatch[];
    readonly glossariesMatches?: NGGlossaryMatch[];
};

export type ImageBBox = {
    readonly topLeft: [number, number];
    readonly topRight: [number, number];
    readonly bottomRight: [number, number];
    readonly bottomLeft: [number, number];
};

export type ImageTextInfo = {
    readonly direction: "ltr" | "rtl" | "ttb";
    readonly textColor: string;
    readonly backgroundColor: string;
};

/** Layout metadata required by the overlay and inpainting models. */
export type ImageParagraphLayout = {
    readonly bbox: ImageBBox;
    readonly linesBboxes: ImageBBox[];
    readonly textInfo: ImageTextInfo;
    readonly alignment: "left" | "center" | "right";
};

export type ImageLayoutParagraph = ImageParagraph & ImageParagraphLayout;

/** Including layout returns complete rendering metadata for every paragraph. */
type ImageParagraphForOptions<
    Options extends ImageTextTranslationOptions | undefined,
    IncludeLayout = Options extends ImageTextTranslationOptions ? Options["includeLayout"] : undefined
> = IncludeLayout extends true ? ImageLayoutParagraph : ImageParagraph;

/** Defaults to the legacy response; specialized results remain assignable to it. */
export type ImageTextResult<Paragraph extends ImageParagraph = ImageParagraph> = {
    readonly sourceLanguage: string;
    readonly adaptedTo?: string[];
    readonly glossaries?: string[];
    readonly paragraphs: Paragraph[];
};

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
                model: options?.model ?? options?.textRemoval
            },
            {
                image: file
            },
            headers,
            true
        );
    }

    public translateText<Options extends ImageTextTranslationOptions | undefined>(
        file: MultiPartFile,
        source: string | null,
        target: string,
        options: Options
    ): Promise<ImageTextResult<ImageParagraphForOptions<Options>>>;
    public translateText(
        file: MultiPartFile,
        source: string | null,
        target: string,
        options?: ImageTextTranslationOptions
    ): Promise<ImageTextResult>;
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
                verbose: JSON.stringify(options?.verbose),
                include_layout: JSON.stringify(options?.includeLayout)
            },
            {
                image: file
            },
            headers
        );
    }

    /**
     * Render supplied translations onto the original image.
     * Pass null for source to omit it. Omitting model uses the API default, generative_fast.
     * Overlay and inpainting require complete layout metadata on every paragraph.
     * Generative models also accept text-only paragraphs. The API validates layout completeness.
     */
    public renderTranslated(
        file: MultiPartFile,
        source: string | null,
        target: string,
        paragraphs: (ImageParagraphContent & ImageParagraphLayout)[],
        model?: ImageTranslationModel,
        noTrace?: boolean
    ): Promise<LaraStream>;
    public renderTranslated(
        file: MultiPartFile,
        source: string | null,
        target: string,
        paragraphs: (ImageParagraphContent | (ImageParagraphContent & ImageParagraphLayout))[],
        model?: GenerativeModels,
        noTrace?: boolean
    ): Promise<LaraStream>;
    public async renderTranslated(
        file: MultiPartFile,
        source: string | null,
        target: string,
        paragraphs: (ImageParagraphContent & Partial<ImageParagraphLayout>)[],
        model?: ImageTranslationModel,
        noTrace?: boolean
    ): Promise<LaraStream> {
        // Select rendering fields so verbose translation matches are not sent back to the API.
        const renderParagraphs = paragraphs.map((paragraph) => ({
            text: paragraph.text,
            translation: paragraph.translation,
            bbox: toSnakeCase(paragraph.bbox),
            lines_bboxes: toSnakeCase(paragraph.linesBboxes),
            text_info: toSnakeCase(paragraph.textInfo),
            alignment: paragraph.alignment
        }));

        return this.client.post<LaraStream>(
            "/v2/images/render-translated",
            {
                source,
                target,
                paragraphs: JSON.stringify(renderParagraphs),
                model
            },
            { image: file },
            {
                "Content-Type": "multipart/form-data",
                ...(noTrace ? { "X-No-Trace": "true" } : {})
            },
            true
        );
    }
}
