import { Awaited, Client, ClientEvents } from "discord.js";

export abstract class EventHandler<K extends keyof ClientEvents> {

    constructor(discordClient: Client) {
        this.discordClient = discordClient;
    }

    public abstract readonly eventType: K;
    public abstract readonly oneTime: boolean;

    public readonly discordClient: Client;

    public abstract ftn(... args: ClientEvents[K]): Awaited<void>;

    public start() {
        this.discordClient.on(this.eventType, this.ftn);
    }
}

export type EventConstructor<K extends keyof ClientEvents> = new (discordClient: Client, ... args: any[]) => EventHandler<K>;