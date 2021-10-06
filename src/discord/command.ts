import * as Discord from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { APIInteractionGuildMember } from "discord-api-types";
import { CommandComponentHandlerBase, HandlerConstructor, HandlerReturn } from ".";

type handleButtonFtnName = `handleButton${string}`;
type handleSelectMenuFtnName = `handleSelectMenu${string}`;

type buttonLongRunningConstName = `button${string}LongRunning`;
type selectMenuLongRunningConstName = `selectMenu${string}LongRunning`;

export abstract class CommandHandler extends CommandComponentHandlerBase {

    [x: handleButtonFtnName]: (int: Discord.ButtonInteraction, ... args: any[]) => HandlerReturn;
    [x: handleSelectMenuFtnName]: (int: Discord.SelectMenuInteraction, ... args: any[]) => HandlerReturn;
    [x: buttonLongRunningConstName | selectMenuLongRunningConstName]: boolean | undefined;

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
            const methodName: handleButtonFtnName = `handleButton${int.customId.split(":")[1] ?? int.customId}`;
            const longRunningName: buttonLongRunningConstName = `button${int.customId.split(":")[1] ?? int.customId}LongRunning`;
            if (this[longRunningName]) int.deferUpdate();
            if (this[methodName]) return this[methodName](int, ... args);
            else {
                if (this.buttonLongRunning) int.deferUpdate();
                return this.handleButton(int, ... args);
            }
        }
        if (int.isSelectMenu()) {
            const methodName: handleSelectMenuFtnName = `handleSelectMenu${int.customId.split(":")[1] ?? int.customId}`;
            const longRunningName: selectMenuLongRunningConstName = `selectMenu${int.customId.split(":")[1] ?? int.customId}LongRunning`;
            if (this[longRunningName]) int.deferUpdate();
            if (this[methodName]) return this[methodName](int, ... args);
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