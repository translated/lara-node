/**
 * Recursively parses API response content:
 * - Converts ISO date strings to Date objects
 * - Converts snake_case keys to camelCase
 */
export function parseContent(content: any): any {
    if (content === undefined || content === null) return content;
    if (Array.isArray(content)) return content.map(parseContent);

    if (typeof content === "string") {
        // Test if it's an ISO date string
        if (content.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.[0-9]{3}Z$/)) {
            return new Date(content);
        }
        return content;
    }

    if (typeof content === "object") {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(content)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = parseContent(value);
        }
        return result;
    }

    return content;
}
