const toSnakeCase = (content: any): any => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(toSnakeCase);

    if (typeof content === 'object' && content !== null) {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(content)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            result[snakeKey] = toSnakeCase(value);
        }
        return result;
    }

    return content;
}

export default toSnakeCase;