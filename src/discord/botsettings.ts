import * as Discord from "discord.js";

export type DiscordBotOptions = {
    defaultResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    errorResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    defaultUpdate?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    includeTypeScript?: boolean;
    watchCommands?: boolean;
    dynamicComponentCustomIdSplitter?: string;
    homeGuildId?: string;
    logSettings?: number;
}

export enum LoggingOptions {
    INTERACTION_RECIEVE = 1 << 0,
    COMMAND_RECIEVE     = 1 << 1,
    COMPONENT_RECIEVE   = 1 << 2,
    DYNAMIC_COMPONENT   = 1 << 3,
    COMMAND_HANDLE      = 1 << 4,
    COMPONENT_HANDLE    = 1 << 5,
    COMMAND_LOAD        = 1 << 6,
    COMMAND_REGISTER    = 1 << 7,
    COMMAND_PERMISSIONS = 1 << 8,
    EVENT_LOAD          = 1 << 9,
    EVENT_START         = 1 << 10,
    COMPONENT_LOAD      = 1 << 11,
}