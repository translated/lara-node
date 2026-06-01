import { LaraApiError } from "./errors";
import type { LaraClient } from "./net/lara";

export interface Styleguide {
    id: string;
    name: string;
    content?: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    isPersonal: boolean;
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

    async create(name: string, content: string): Promise<Styleguide> {
        return await this.client.post<Styleguide>("/v2/styleguides", { name, content });
    }

    async update(id: string, name: string | undefined, content?: string): Promise<Styleguide> {
        return await this.client.put<Styleguide>(`/v2/styleguides/${id}`, { name, content });
    }

    async delete(id: string): Promise<Styleguide> {
        return await this.client.delete<Styleguide>(`/v2/styleguides/${id}`);
    }
}
