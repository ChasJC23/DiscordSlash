import * as Discord from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { APIInteractionGuildMember } from "discord-api-types";

export abstract class Command {

    constructor(discordClient: Discord.Client) {
        this.discordClient = discordClient;
    }

    protected abstract ftn(int: Discord.CommandInteraction, ... args: any[]):
    Promise<Discord.MessagePayload | Discord.InteractionReplyOptions | string | void> | Discord.MessagePayload | Discord.InteractionReplyOptions | string | void;
    
    public abstract readonly longRunning: boolean;
    public abstract readonly slashData: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    public abstract readonly type: "GUILD" | "GLOBAL";
    public abstract readonly permissions: Discord.ApplicationCommandPermissionData[];

    public readonly discordClient: Discord.Client;

    // in order to perform any preprocessing
    public async execute(int: Discord.CommandInteraction, ... args: any[]) {
        if (this.longRunning) await int.deferReply();
        return await this.ftn(int, ... args);
    }

    public isGuild(): this is GuildCommand {
        return this.type == "GUILD";
    }

    public isGlobal(): this is GlobalCommand {
        return this.type == "GLOBAL";
    }
}

export abstract class GlobalCommand extends Command {
    public readonly type: "GLOBAL" = "GLOBAL";
}

export abstract class GuildCommand extends Command {
    public readonly type: "GUILD" = "GUILD";
    public abstract readonly guildId: string | string[];
    protected abstract override ftn(int: Discord.CommandInteraction & { guildId: string, member: Discord.GuildMember | APIInteractionGuildMember }, ... args: any[]):
    Promise<Discord.MessagePayload | Discord.InteractionReplyOptions | string | void> | Discord.MessagePayload | Discord.InteractionReplyOptions | string | void;
}

export type CommandConstructor = new (discordClient: Discord.Client, ... args: any[]) => Command;