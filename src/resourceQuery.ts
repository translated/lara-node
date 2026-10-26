export interface ResourceQueryOptions {
    /** Filter resources by their name. */
    search?: string;
    /** Page number (1-based). Enables pagination when provided. */
    page?: number;
    /** Page size (1-200). Enables pagination when provided. */
    size?: number;
}
