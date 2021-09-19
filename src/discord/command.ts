import * as Discord from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { APIInteractionGuildMember } from "discord-api-types";
import { CommandComponentHandlerBase, HandlerConstructor } from "./base";

export abstract class CommandHandler extends CommandComponentHandlerBase {
    
    public abstract readonly slashData: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    public abstract readonly type: "GUILD" | "GLOBAL";
    public abstract readonly permissions: Discord.ApplicationCommandPermissionData[];

    public isGuild(): this is GuildCommandHandler {
        return this.type == "GUILD";
    }

    public isGlobal(): this is GlobalCommandHandler {
        return this.type == "GLOBAL";
    }

    protected abstract override ftn(int: Discord.CommandInteraction, ...args: any[]):
    Discord.Awaited<Discord.MessagePayload | Discord.InteractionReplyOptions | string | void>;
}

export abstract class GlobalCommandHandler extends CommandHandler {
    public readonly type: "GLOBAL" = "GLOBAL";
}

export abstract class GuildCommandHandler extends CommandHandler {
    public readonly type: "GUILD" = "GUILD";
    public abstract readonly guildId: string | string[];
    protected abstract override ftn(int: Discord.CommandInteraction & { guildId: string, member: Discord.GuildMember | APIInteractionGuildMember }, ... args: any[]):
    Discord.Awaited<Discord.MessagePayload | Discord.InteractionReplyOptions | string | void>;
}

export type CommandConstructor = HandlerConstructor<CommandHandler>;