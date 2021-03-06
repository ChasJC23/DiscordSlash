import * as Discord from "discord.js";

export type ReplyableInteraction = Discord.CommandInteraction | Discord.MessageComponentInteraction;

export abstract class HandlerBase {

    public readonly discordClient: Discord.Client;
    public creationTime: Date;

    constructor(discordClient: Discord.Client) {
        this.discordClient = discordClient;
        this.creationTime = new Date();
    }

    protected abstract ftn(... args: any[]): Discord.Awaitable<any>;
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

    protected abstract override ftn(int: ReplyableInteraction, ... args: any[]): HandlerReturn;
}

export type HandlerConstructor<T extends HandlerBase> = new (discordClient: Discord.Client, ... args: any[]) => T;
export type InteractionResponse = Discord.MessagePayload | Discord.InteractionReplyOptions | string;
export type HandlerReturn = Discord.Awaitable<InteractionResponse | void>;