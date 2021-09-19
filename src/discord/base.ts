import * as Discord from "discord.js";

export type ReplyableInteraction = Discord.CommandInteraction | Discord.MessageComponentInteraction;

export abstract class HandlerBase {

    public readonly discordClient: Discord.Client;

    constructor(discordClient: Discord.Client) {
        this.discordClient = discordClient;
    }

    protected abstract ftn(... args: any[]): Discord.Awaited<any>;
}

export abstract class CommandComponentHandlerBase extends HandlerBase {

    public abstract readonly longRunning: boolean;
    public abstract readonly type: string;

    constructor(discordClient: Discord.Client) {
        super(discordClient)
    }

    public async execute(int: ReplyableInteraction, ... args: any[]) {
        if (this.longRunning) await int.deferReply();
        return await this.ftn(int, ... args);
    }

    protected abstract override ftn(int: ReplyableInteraction, ... args: any[]):
    Discord.Awaited<Discord.MessagePayload | Discord.InteractionReplyOptions | string | void>;
}

export type HandlerConstructor<T extends HandlerBase> = new (discordClient: Discord.Client, ... args: any[]) => T;