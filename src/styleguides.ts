import { LaraApiError } from "./errors";
import type { LaraClient } from "./net/lara";

export interface Styleguide {
    id: string;
    name: string;
    content?: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export class Styleguides {
    private readonly client: LaraClient;

    constructor(client: LaraClient) {
        this.client = client;
    }

    async list(): Promise<Styleguide[]> {
        return await this.client.get<Styleguide[]>("/v2/styleguides");
    }

    async get(id: string): Promise<Styleguide | null> {
        try {
            return await this.client.get<Styleguide>(`/v2/styleguides/${id}`);
        } catch (e) {
            if (e instanceof LaraApiError && e.statusCode === 404) {
                return null;
            }
            throw e;
        }
    }
}
