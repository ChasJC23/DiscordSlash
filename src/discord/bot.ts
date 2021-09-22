import * as Discord from "discord.js";
import { ButtonHandler, CommandHandler, ComponentHandler, DiscordBotOptions, EventHandler, GlobalCommandHandler, GuildCommandHandler, HandlerBase, HandlerConstructor, LoggingOptions, SelectMenuHandler } from ".";
import { REST } from "@discordjs/rest";
import { APIApplicationCommand, Routes } from "discord-api-types/v9";
import { walkdirSync } from "../util/fsp";
import { watch } from "fs";
import * as process from "process";

export class DiscordBot<GlobalT extends GlobalCommandHandler, GuildT extends GuildCommandHandler, EventT extends EventHandler<any>, ButtonT extends ButtonHandler, SelectMenuT extends SelectMenuHandler> {

    public defaultResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    public errorResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    public defaultUpdate?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    public includeTypeScript: boolean;
    public watchCommands: boolean;
    public dynamicComponentCustomIdSplitter: string;
    public homeGuildId?: string;
    public logSettings: number;

    public readonly discordClient: Discord.Client;

    public readonly globalCommands: Discord.Collection<string, GlobalT>                     = new Discord.Collection();
    public readonly guildCommands:  Discord.Collection<string, GuildT>                      = new Discord.Collection();
    public readonly buttons:        Discord.Collection<string, ButtonT>                     = new Discord.Collection();
    public readonly selectMenus:    Discord.Collection<string, SelectMenuT>                 = new Discord.Collection();
    public readonly allEvents:      Discord.Collection<keyof Discord.ClientEvents, EventT>  = new Discord.Collection();

    public readonly clientId: string;
    private readonly rest: REST;

    constructor(discordClient: Discord.Client, rest: REST, clientId: string, options: DiscordBotOptions) {
        this.discordClient = discordClient;
        this.rest = rest;
        this.clientId = clientId;

        this.homeGuildId = options.homeGuildId;

        this.defaultResponse = options.defaultResponse;
        this.errorResponse = options.errorResponse;
        this.defaultUpdate = options.defaultUpdate;

        this.includeTypeScript = options.includeTypeScript ?? true;
        this.watchCommands = options.watchCommands ?? true;
        this.dynamicComponentCustomIdSplitter = options.dynamicComponentCustomIdSplitter ?? ":";

        this.logSettings = options.logSettings ?? 0;

        if (this.homeGuildId === undefined) {
            console.warn("[WRN] having no specified home guild means global command permissions cannot be applied.");
        }
    }

    public async loadCommands(commandPath: string, ... constructorArgs: any[]) {

        this.globalCommands.clear();
        this.guildCommands.clear();

        const handlerUpdate = this.watchCommands ? (obj: this, handler: CommandHandler) => {
            let id: string | undefined;
            if (handler.isGlobal()) {
                id = obj.globalCommands.findKey((cmd) => cmd.slashData.name == handler.slashData.name);
                if (!id) return;
                if (Date.now() - (obj.globalCommands.get(id)?.creationTime.getTime() ?? 0) < 1000) return;
                obj.globalCommands.set(id, handler as GlobalT);
            }
            if (handler.isGuild()) {
                id = obj.guildCommands.findKey((cmd) => cmd.slashData.name == handler.slashData.name); 
                if (!id) return;
                if (Date.now() - (obj.guildCommands.get(id)?.creationTime.getTime() ?? 0) < 1000) return;
                obj.guildCommands.set(id, handler as GuildT);
            }
            if (!id) return;
            obj.updateCommand(id);
        } : undefined;

        const commands = this.loadDir<CommandHandler>(commandPath, constructorArgs, handlerUpdate);

        if (this.logSettings & LoggingOptions.COMMAND_LOAD) {
            console.log(`[LOG] Commands in directory ${commandPath} have been loaded`);
        }

        const globalCommandsJSON = commands.filter((cmd) => cmd.isGlobal()).map((cmd) => cmd.slashData.toJSON());
        const response = await this.rest.put(Routes.applicationCommands(this.clientId), { body: globalCommandsJSON }) as APIApplicationCommand[];
        if (this.logSettings & LoggingOptions.COMMAND_REGISTER) {
            console.log(`[LOG] Global commands have been registered`);
        }
        response.forEach(async (cmdResponse) => {
            
            const localCmd = commands.find((currentSearch) => currentSearch.slashData.name == cmdResponse.name);
            this.globalCommands.set(cmdResponse.id, localCmd as GlobalT);

            if (this.homeGuildId) {
                const commandInfo = new Discord.ApplicationCommand(this.discordClient, cmdResponse, undefined, this.homeGuildId);
                if (!localCmd?.permissions) return;
                await commandInfo.permissions.set({ permissions: localCmd.permissions });
                if (this.logSettings & LoggingOptions.COMMAND_PERMISSIONS) {
                    console.log(`[LOG] Permissions for global command ${commandInfo.name} have been set`);
                }
            }
        });

        // we need to group the guild commands by their guilds before putting them up
        const allGuildIds: string[] = [];
        commands.forEach((v) => {
            if (!v.isGuild()) return;
            if (typeof v.guildId == "string") {
                if (!allGuildIds.includes(v.guildId)) allGuildIds.push(v.guildId);
            }
            else {
                v.guildId.forEach((id) => {
                    if (!allGuildIds.includes(id)) allGuildIds.push(id);
                });
            }
        });
        allGuildIds.forEach(async (guildId) => {

            const filtered = commands.filter((cmd) => cmd.isGuild() && (cmd.guildId == guildId || cmd.guildId.includes(guildId)));
            const filteredJSON = filtered.map((command) => command.slashData.toJSON());

            if (filteredJSON.length > 0) {
                const response = await this.rest.put(Routes.applicationGuildCommands(this.clientId, guildId), { body: filteredJSON }) as Array<APIApplicationCommand>;
                if (this.logSettings & LoggingOptions.COMMAND_REGISTER) {
                    console.log(`[LOG] Guild commands for guild ID ${guildId} have been registered`);
                }

                // use the response for each command to apply their permissions
                response.forEach(async (cmdResponse) => {

                    const localCmd = filtered.find((v) => v.slashData.name == cmdResponse.name);
                    this.guildCommands.set(cmdResponse.id, localCmd as GuildT);

                    const commandInfo = new Discord.ApplicationCommand(this.discordClient, cmdResponse, undefined, guildId);
                    if (!localCmd || !localCmd.permissions) return;
                    await commandInfo.permissions.set({ permissions: localCmd.permissions });
                    if (this.logSettings & LoggingOptions.COMMAND_PERMISSIONS) {
                        console.log(`[LOG] Permissions for guild command ${commandInfo.name} in guild ID ${guildId} have been set`);
                    }
                });
            }
        });
    }

    public loadEvents(eventPath: string, ... constructorArgs: any[]) {
        this.allEvents.forEach((v, k) => this.discordClient.removeAllListeners(k));
        this.allEvents.clear();

        const handlerUpdate = (obj: this, handler: EventT) => {
            if (obj.logSettings & LoggingOptions.EVENT_LOAD) {
                console.log(`[LOG] Event ${handler.eventType} handler has been reloaded due to an update`);
            }
            obj.discordClient.removeAllListeners(handler.eventType);
            handler.start();
            obj.allEvents.set(handler.eventType, handler);
            if (obj.logSettings & LoggingOptions.EVENT_START) {
                console.log(`[LOG] Event ${handler.eventType} handler has been started`);
            }
        }

        const eventHandlers = this.loadDir<EventT>(eventPath, constructorArgs, handlerUpdate);
        if (this.logSettings & LoggingOptions.EVENT_LOAD) {
            console.log(`[LOG] Event handlers in directory ${eventPath} have been loaded`);
        }
        eventHandlers.forEach((handler) => {
            handler.start();
            this.allEvents.set(handler.eventType, handler);
            if (this.logSettings & LoggingOptions.EVENT_START) {
                console.log(`[LOG] Event ${handler.eventType} handler has been started`);
            }
        });
    }

    public loadComponents(componentPath: string, ... constructorArgs: any[]) {
        this.buttons.clear();
        this.selectMenus.clear();

        const handlerUpdate = (obj: this, handler: ComponentHandler) => {
            if (obj.logSettings & LoggingOptions.COMPONENT_LOAD) {
                console.log(`[LOG] Component ${handler.component.customId} handler has been reloaded due to an update`);
            }
            if (!handler.component.customId) {
                console.error(`[ERR] all components must have a custom ID`);
                return;
            }
            if (handler.isButton()) obj.buttons.set(handler.component.customId, handler as ButtonT);
            if (handler.isSelectMenu()) obj.selectMenus.set(handler.component.customId, handler as SelectMenuT);
        }

        const componentHandlers = this.loadDir<ComponentHandler>(componentPath, constructorArgs, handlerUpdate);
        if (this.logSettings & LoggingOptions.COMPONENT_LOAD) {
            console.log(`[LOG] Component handlers in directory ${componentPath} have been loaded`);
        }

        componentHandlers.forEach((handler) => {
            if (!handler.component.customId) {
                console.error(`[ERR] all components must have a custom ID`);
                return;
            }
            if (handler.isButton()) this.buttons.set(handler.component.customId, handler as ButtonT);
            if (handler.isSelectMenu()) this.selectMenus.set(handler.component.customId, handler as SelectMenuT);
        })
    }

    private loadDir<T extends HandlerBase>(handlerPath: string, constructorArgs: any[], handlerUpdate?: (obj: this, handler: T) => void) {
        // we support typescript source files for those testing using ts-node
        const handlerFiles = walkdirSync(handlerPath).filter(file => file.endsWith('.js') || this.includeTypeScript && file.endsWith('.ts'));
        const handlers: T[] = [];
        for (const file of handlerFiles) {
            handlers.push(this.loadHandler(file, constructorArgs));
            if (handlerUpdate) watch(file, "utf-8", (event) => this.onHandlerUpdate<T>(event, file, constructorArgs, handlerUpdate));
        }
        return handlers;
    }

    private loadHandler<T extends HandlerBase>(handlerPath: string, constructorArgs: any[]) {
        const HandlerClass = require(handlerPath).default as HandlerConstructor<T>;
        const handler = new HandlerClass(this.discordClient, ... constructorArgs);
        return handler;
    }

    private onHandlerUpdate<T extends HandlerBase>(eventType: "rename" | "change", filename: string, constructorArgs: any[], handlerUpdate: (obj: this, handler: T) => void) {
        if (eventType == "change") {
            const handler = this.loadHandler<T>(filename, constructorArgs);
            handlerUpdate(this, handler);
        }
    }

    private async updateCommand(commandId: string) {
        const command = this.guildCommands.get(commandId) ?? this.globalCommands.get(commandId);
        if (!command) return;
        if (this.logSettings & LoggingOptions.COMMAND_LOAD) {
            console.log(`[LOG] Command ${command.slashData.name} has been reloaded due to an update`);
        }
        const commandJSON = command.slashData.toJSON();
        if (command.isGlobal()) {
            const response = await this.rest.patch(Routes.applicationCommand(this.clientId, commandId), { body: commandJSON }) as APIApplicationCommand;
            if (this.logSettings & LoggingOptions.COMMAND_REGISTER) {
                console.log(`[LOG] Global command ${command.slashData.name} has been registered`);
            }
            if (this.homeGuildId) {
                const commandInfo = new Discord.ApplicationCommand(this.discordClient, response, undefined, this.homeGuildId);
                if (!command.permissions) return;
                await commandInfo.permissions.set({ permissions: command.permissions });
                if (this.logSettings & LoggingOptions.COMMAND_PERMISSIONS) {
                    console.log(`[LOG] Permissions for global command ${commandInfo.name} have been set`);
                }
            }
        }
        if (command.isGuild()) {
            const guildIds = typeof command.guildId == "string" ? [command.guildId] : command.guildId;
            guildIds.forEach(async (guildId) => {
                const response = await this.rest.patch(Routes.applicationGuildCommand(this.clientId, guildId, commandId), { body: commandJSON }) as APIApplicationCommand;
                if (this.logSettings & LoggingOptions.COMMAND_REGISTER) {
                    console.log(`[LOG] Guild command ${command.slashData.name} has been registered in guild ID ${guildId}`);
                }
                const commandInfo = new Discord.ApplicationCommand(this.discordClient, response, undefined, guildId);
                if (!command.permissions) return;
                await commandInfo.permissions.set({ permissions: command.permissions });
                if (this.logSettings & LoggingOptions.COMMAND_PERMISSIONS) {
                    console.log(`[LOG] Permissions for guild command ${commandInfo.name} have been set in guild ID ${guildId}`);
                }
            });
        }
    }

    public beginAwaitingInteractions(... args: any[]) {
        this.discordClient.removeAllListeners("interactionCreate");
        this.discordClient.on("interactionCreate", async (int) => await this.onInteractionCreate(int, args));
    }

    private async onInteractionCreate(interaction: Discord.Interaction, args: any[]) {

        if (this.logSettings & LoggingOptions.INTERACTION_RECIEVE) {
            console.log(`[LOG] new interaction: from ${interaction.user.tag}`);
        }

        if (interaction.isCommand()) {

            const { commandId, commandName } = interaction;

            if (this.logSettings & LoggingOptions.COMMAND_RECIEVE) {
                console.log(`[LOG] new interaction: command ${commandName} with ID ${commandId}`);
            }

            const handler = this.guildCommands.get(commandId) ?? this.globalCommands.get(commandId);
            if (!handler) {
                console.error(`[ERR] recieved command interaction ${commandName} with ID ${commandId} could not be identified.`);
                return;
            }
            if (handler.longRunning) interaction.deferReply();

            if (this.logSettings & LoggingOptions.COMMAND_HANDLE) {
                console.log(`[LOG] command ${commandName} with ID ${commandId} successfully found`);
            }

            let response;
            try {
                response = await handler.execute(interaction, ... args) || this.defaultResponse;
                if (this.logSettings & LoggingOptions.COMMAND_HANDLE) {
                    console.log(`[LOG] command ${commandName} with ID ${commandId} successfully executed`);
                }
            }
            catch (err) {
                console.error(`[ERR] an error occurred when executing command ${commandName} with ID ${commandId}:\n      ${err}`);
                response = this.errorResponse;
            }

            try {
                if (response && !interaction.replied) {
                    await interaction.reply(response);
                    if (this.logSettings & LoggingOptions.COMMAND_HANDLE) {
                        console.log(`[LOG] command ${commandName} with ID ${commandId} successfully replied`);
                    }
                }
                else if (!interaction.replied) console.error(`[ERR] command ${interaction.commandName} did not reply to the message and no default response was supplied.`);
            }
            catch (err) {
                console.error(`[ERR] an error occurred when sending response to command ${commandName} with ID ${commandId}:\n      ${err}`);
            }
        }
        if (interaction.isMessageComponent()) {

            const { customId } = interaction;
            let response;

            if (this.logSettings & LoggingOptions.COMPONENT_RECIEVE) {
                console.log(`[LOG] new interaction: component ${customId}`);
            }

            let command;
            // this means we handle the component inside the command
            if (customId.includes(this.dynamicComponentCustomIdSplitter)) {

                // you can use the command name or the command id if you know it
                const [commandName] = customId.split(this.dynamicComponentCustomIdSplitter);
                command = this.guildCommands.get(commandName)
                ?? this.globalCommands.get(commandName)
                ?? this.guildCommands.find((cmd) => cmd.slashData.name == commandName)
                ?? this.globalCommands.find((cmd) => cmd.slashData.name == commandName);
                // worth it for the short circuiting? Would otherwise be a job for .reduce to look nicer
            }

            if (command) {
                if (this.logSettings & LoggingOptions.DYNAMIC_COMPONENT) {
                    console.log(`[LOG] identified dynamic component ${customId}`);
                }
                try {
                    response = await command.onComponentInteraction(interaction, args);
                    if (this.logSettings & LoggingOptions.COMPONENT_HANDLE) {
                        console.log(`[LOG] component ${customId} successfully executed`);
                    }
                }
                catch (err) {
                    console.error(`[ERR] an error occurred when executing component handler ${customId}:\n      ${err}`);
                    response = this.errorResponse;
                }
            }
            else {

                let handler;
                if (interaction.isButton()) handler = this.buttons.get(customId);
                if (interaction.isSelectMenu()) handler = this.selectMenus.get(customId);
                if (!handler) return;
                if (handler.longRunning) interaction.deferUpdate();

                try {
                    response = await handler.execute(interaction, ... args) ?? this.defaultUpdate;
                    if (this.logSettings & LoggingOptions.COMPONENT_HANDLE) {
                        console.log(`[LOG] component ${customId} successfully executed`);
                    }
                }
                catch (err) {
                    console.error(`[ERR] an error occurred when executing component handler ${customId}:\n      ${err}`);
                    response = this.errorResponse;
                }
            }
            try {
                if (response) await interaction.update(response);
                else console.warn(`[WRN] component handler ${customId} did not return an update, and no default update was supplied. Message updated in the handler?`);
            }
            catch (err) {
                console.error(`[ERR] an error occurred when sending response to component interaction ${customId}:\n      ${err}`);
            }
        }
    }
}