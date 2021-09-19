import * as Discord from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { APIInteractionGuildMember } from "discord-api-types";
import { CommandComponentHandlerBase, HandlerConstructor, HandlerReturn } from ".";

export abstract class CommandHandler extends CommandComponentHandlerBase {

    [k: string]: any;
    
    public abstract readonly slashData: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    public abstract readonly type: "GUILD" | "GLOBAL";
    public abstract readonly permissions?: Discord.ApplicationCommandPermissionData[];

    public isGuild(): this is GuildCommandHandler {
        return this.type == "GUILD";
    }

    public isGlobal(): this is GlobalCommandHandler {
        return this.type == "GLOBAL";
    }

    public onButtonInteraction(int: Discord.ButtonInteraction, args: any[]) {
        const methodName = "handleButton" + (int.customId.split(":")[1] ?? int.customId);
        if (this[methodName]) return (this[methodName] as (int: Discord.ButtonInteraction, ... args: any[]) => HandlerReturn)(int, ... args);
        else if (this.handleButton) return this.handleButton(int, ... args);
    }

    public onSelectMenuInteraction(int: Discord.SelectMenuInteraction, args: any[]) {
        const methodName = "handleSelectMenu" + (int.customId.split(":")[1] ?? int.customId);
        if (this[methodName]) return (this[methodName] as (int: Discord.SelectMenuInteraction, ... args: any[]) => HandlerReturn)(int, ... args);
        else if (this.handleSelectMenu) return this.handleSelectMenu(int, ... args);
    }

    protected abstract handleButton?(int: Discord.ButtonInteraction, ... args: any[]): HandlerReturn;

    protected abstract handleSelectMenu?(int: Discord.SelectMenuInteraction, ... args: any[]): HandlerReturn;

    protected abstract override ftn(int: Discord.CommandInteraction, ...args: any[]): HandlerReturn;
}

export abstract class GlobalCommandHandler extends CommandHandler {
    public readonly type: "GLOBAL" = "GLOBAL";
}

export abstract class GuildCommandHandler extends CommandHandler {
    public readonly type: "GUILD" = "GUILD";
    public abstract readonly guildId: string | string[];
    protected abstract override ftn(int: Discord.CommandInteraction & { guildId: string, member: Discord.GuildMember | APIInteractionGuildMember }, ... args: any[]): HandlerReturn;
}

export type CommandConstructor = HandlerConstructor<CommandHandler>;