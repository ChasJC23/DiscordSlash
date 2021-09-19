import * as Discord from "discord.js";
import { HandlerBase, HandlerConstructor } from "./base";

export abstract class EventHandler<K extends keyof Discord.ClientEvents> extends HandlerBase {

    public abstract readonly eventType: K;
    public abstract readonly oneTime: boolean;

    protected abstract override ftn(... args: Discord.ClientEvents[K]): Discord.Awaited<void>;

    public start() {
        this.discordClient.on(this.eventType, (... args: Discord.ClientEvents[K]) => this.ftn(... args));
    }
}

export type EventConstructor<K extends keyof Discord.ClientEvents> = HandlerConstructor<EventHandler<K>>;