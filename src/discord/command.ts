import * as Discord from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { APIInteractionGuildMember } from "discord-api-types";
import { CommandComponentHandlerBase, HandlerConstructor, HandlerReturn } from ".";

export abstract class CommandHandler extends CommandComponentHandlerBase {

    public abstract readonly slashData: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    public abstract readonly type: "GUILD" | "GLOBAL";
    public abstract readonly permissions?: Discord.ApplicationCommandPermissionData[];

    public isGuild(): this is GuildCommandHandler {
        return this.type == "GUILD";
    }

    public isGlobal(): this is GlobalCommandHandler {
        return this.type == "GLOBAL";
    }

    public onComponentInteraction(int: Discord.MessageComponentInteraction, args: any[]) {
        if (int.isButton()) {
            const methodName = "handleButton" + (int.customId.split(":")[1] ?? int.customId);
            const longRunningName = "button" + (int.customId.split(":")[1] ?? int.customId) + "LongRunning";
            // @ts-expect-error for the string indexing. If an error comes up at runtime, it's because the user of the template is a dumb bitch
            if (this[longRunningName] as boolean) int.deferUpdate();
            // @ts-expect-error
            if (this[methodName]) return (this[methodName] as (int: Discord.ButtonInteraction, ... args: any[]) => HandlerReturn)(int, ... args);
            else {
                if (this.buttonLongRunning) int.deferUpdate();
                return this.handleButton(int, ... args);
            }
        }
        if (int.isSelectMenu()) {
            const methodName = "handleSelectMenu" + (int.customId.split(":")[1] ?? int.customId);
            const longRunningName = "selectMenu" + (int.customId.split(":")[1] ?? int.customId) + "LongRunning";
            // @ts-expect-error
            if (this[longRunningName] as boolean) int.deferUpdate();
            // @ts-expect-error
            if (this[methodName]) return (this[methodName] as (int: Discord.SelectMenuInteraction, ... args: any[]) => HandlerReturn)(int, ... args);
            else {
                if (this.selectMenuLongRunning) int.deferUpdate();
                return this.handleSelectMenu(int, ... args);
            }
        }
    }

    protected handleButton(int: Discord.ButtonInteraction, ... args: any[]): HandlerReturn {
        return;
    }
    protected readonly buttonLongRunning?: boolean;

    protected handleSelectMenu(int: Discord.SelectMenuInteraction, ... args: any[]): HandlerReturn {
        return;
    }
    protected readonly selectMenuLongRunning?: boolean;

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