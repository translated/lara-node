import { LaraApiError } from "./errors";
import type { LaraClient } from "./net/lara";
import type { PermissionMask } from "./permissions";

export interface Styleguide {
    id: string;
    name: string;
    content?: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    sharedAt: Date;
    /**
     * Effective combined mask in GET list and detail responses; the selected share's stored mask
     * on the resource embedded in GET /shares responses. Omitted from non-GET responses.
     */
    permissionMask?: PermissionMask;
}

export interface StyleguideShareEntry {
    readonly id: string;
    readonly name: string;
    readonly shareName: string;
    readonly sharedAt: Date;
    /** The permissions stored on this share. */
    readonly permissionMask: PermissionMask;
}

export interface StyleguideShares {
    readonly styleguide: Styleguide;
    readonly account: StyleguideShareEntry | null;
    readonly groups: StyleguideShareEntry[];
    readonly users: StyleguideShareEntry[];
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

    async getShares(id: string): Promise<StyleguideShares> {
        return await this.client.get<StyleguideShares>(`/v2/styleguides/${id}/shares`);
    }

    async addAccountShare(id: string, name?: string): Promise<Styleguide> {
        return await this.client.post<Styleguide>(`/v2/styleguides/${id}/shares`, { name });
    }

    async revokeAccountShare(id: string): Promise<Styleguide> {
        return await this.client.delete<Styleguide>(`/v2/styleguides/${id}/shares`);
    }

    async renameAccountShare(id: string, name: string): Promise<Styleguide> {
        return await this.client.put<Styleguide>(`/v2/styleguides/${id}/shares`, { name });
    }

    async addGroupShare(id: string, groupId: string, name?: string): Promise<Styleguide> {
        return await this.client.post<Styleguide>(`/v2/styleguides/${id}/shares/groups/${groupId}`, { name });
    }

    async revokeGroupShare(id: string, groupId: string): Promise<Styleguide> {
        return await this.client.delete<Styleguide>(`/v2/styleguides/${id}/shares/groups/${groupId}`);
    }

    async renameGroupShare(id: string, groupId: string, name: string): Promise<Styleguide> {
        return await this.client.put<Styleguide>(`/v2/styleguides/${id}/shares/groups/${groupId}`, { name });
    }
}
