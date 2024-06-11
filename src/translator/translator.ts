import {Credentials} from "../credentials";
import createClient, {LaraClient} from "../net";
import {Memory} from "./models";

export type TranslatorOptions = {
    serverUrl?: string,
}

export class Memories {

    private readonly client: LaraClient;

    constructor(client: LaraClient) {
        this.client = client;
    }

    async list(): Promise<Memory[]> {
        return (await this.client.get<Memory>("/memories")) as Memory[];
    }

    async create(name: string, externalId?: string): Promise<Memory> {
        return (await this.client.post<Memory>("/memories", {
            name, external_id: externalId
        })) as Memory;
    }
}

export class Translator {

    private readonly client: LaraClient;
    public readonly memories: Memories;

    constructor(credentials: Credentials, options?: TranslatorOptions) {
        this.client = createClient(credentials.accessKeyId, credentials.accessKeySecret, options?.serverUrl);
        this.memories = new Memories(this.client);
    }

}