import * as Discord from "discord.js";
import { HandlerBase, HandlerConstructor } from ".";

export abstract class EventHandler<K extends keyof Discord.ClientEvents> extends HandlerBase {

    public abstract readonly eventType: K;
    public abstract readonly oneTime: boolean;

    protected abstract override ftn(... args: Discord.ClientEvents[K]): Discord.Awaitable<void>;

    public start() {
        if (this.oneTime) this.discordClient.once(this.eventType, (... args: Discord.ClientEvents[K]) => this.ftn(... args))
        else this.discordClient.on(this.eventType, (... args: Discord.ClientEvents[K]) => this.ftn(... args));
    }
}

export type EventConstructor<K extends keyof Discord.ClientEvents> = HandlerConstructor<EventHandler<K>>;