import * as Discord from "discord.js";
import {CommandHandler, GlobalCommandHandler, GuildCommandHandler} from "./command";
import { REST } from "@discordjs/rest";
import { APIApplicationCommand, Routes } from "discord-api-types/v9";
import { walkdirSync } from "../util/fsp";
import { EventHandler } from "./event";
import { ButtonHandler, ComponentHandler, SelectMenuHandler } from "./component";
import { CommandComponentHandlerBase, HandlerBase, HandlerConstructor, ReplyableInteraction } from "./base";

export class DiscordBot<GlobalT extends GlobalCommandHandler, GuildT extends GuildCommandHandler, EventT extends EventHandler<any>, ButtonT extends ButtonHandler, SelectMenuT extends SelectMenuHandler> {

    public defaultResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    public errorResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions;

    public readonly discordClient: Discord.Client;

    public readonly globalCommands: Discord.Collection<string, GlobalT>     = new Discord.Collection();
    public readonly guildCommands:  Discord.Collection<string, GuildT>      = new Discord.Collection();
    public readonly buttons:        Discord.Collection<string, ButtonT>     = new Discord.Collection();
    public readonly selectMenus:    Discord.Collection<string, SelectMenuT> = new Discord.Collection();
    
    private _allEvents: EventT[] = [];
    
    public get allEvents() : EventT[] {
        return this._allEvents;
    }
    
    private set allEvents(v : EventT[]) {
        this._allEvents = v;
    }
    
    
    public readonly clientId: string;
    private readonly rest: REST;

    constructor(discordClient: Discord.Client, rest: REST, clientId: string,
        defaultResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions,
        errorResponse?: string | Discord.MessagePayload | Discord.InteractionReplyOptions
    ) {
        this.discordClient = discordClient;
        this.rest = rest;
        this.clientId = clientId;
        this.defaultResponse = defaultResponse;
        this.errorResponse = errorResponse;
    }

    public loadCommands(commandPath: string, ... constructorArgs: any[]) {
        this.globalCommands.clear();
        this.guildCommands.clear();
        this.load<CommandHandler>(commandPath, constructorArgs, (obj, value) => {
            if (value.isGlobal()) {
                obj.globalCommands.set(value.slashData.name, value as GlobalT);
            }
            if (value.isGuild()) {
                obj.guildCommands.set(value.slashData.name, value as GuildT);
            }
        })
    }

    public loadEvents(eventPath: string, ... constructorArgs: any[]) {
        this.allEvents = [];
        this.load<EventHandler<any>>(eventPath, constructorArgs, (obj, value) => {
            obj.allEvents.push(value as EventT);
        })
    }

    public loadComponents(componentPath: string, ... constructorArgs: any[]) {
        this.buttons.clear();
        this.selectMenus.clear();
        this.load<ComponentHandler>(componentPath, constructorArgs, (obj, value) => {
            if (!value.component.customId) throw new Error("Components must have a custom ID");
            if (value.isButton()) {
                obj.buttons.set(value.component.customId, value as ButtonT);
            }
            if (value.isSelectMenu()) {
                obj.selectMenus.set(value.component.customId, value as SelectMenuT);
            }
        })
    }

    private load<T extends HandlerBase>(handlerPath: string, constructorArgs: any[], setter: (obj: this, value: T) => void) {
        const handlerFiles = walkdirSync(handlerPath).filter(file => file.endsWith('.js'));
        for (const file of handlerFiles) {
            const HandlerClass = require(file).default as HandlerConstructor<T>;
            const handler = new HandlerClass(this.discordClient, ... constructorArgs);
            setter(this, handler);
        }
    }

    public async registerCommands() {
        const globalCommandsJSON = this.globalCommands.map((command) => command.slashData.toJSON());

        await this.rest.put(Routes.applicationCommands(this.clientId), { body: globalCommandsJSON });
        
        // we need to group the guild commands by their guilds before putting them up
        const allGuildIds: string[] = [];
        this.guildCommands.forEach((v) => {
            if (typeof v.guildId == "string") {
                if (!allGuildIds.includes(v.guildId)) allGuildIds.push(v.guildId);
            }
            else {
                v.guildId.forEach((id) => {
                    if (!allGuildIds.includes(id)) allGuildIds.push(id);
                });
            }
        });
        for (const guildId of allGuildIds) {
            const filtered = this.guildCommands.filter((cmd) => cmd.guildId == guildId || cmd.guildId.includes(guildId));
            const filteredJSON = filtered.map((command) => command.slashData.toJSON());
            if (filteredJSON.length > 0) {
                const response = await this.rest.put(Routes.applicationGuildCommands(this.clientId, guildId), { body: filteredJSON }) as Array<APIApplicationCommand>;

                // use the response for each command to apply their permissions
                response.forEach((cmdResponse) => {
                    const commandInfo = new Discord.ApplicationCommand(this.discordClient, cmdResponse, undefined, guildId);
                    const myCommand = this.guildCommands.find((v) => v.slashData.name == commandInfo.name);
                    if (!myCommand) return;
                    commandInfo.permissions.set({ permissions: myCommand.permissions });
                });
            }
        }
    }

    public beginAwaitingInteractions(... args: any[]) {
        this.discordClient.on("interactionCreate", async (int) => await this.onInteractionCreate(int, ... args));
    }

    public beginAwaitingEvents() {
        this.allEvents.forEach((eventhandler) => {
            eventhandler.start();
        });
    }

    private async onInteractionCreate(interaction: Discord.Interaction, ... args: any[]) {

        if (interaction.isCommand()) {
            const { commandName } = interaction;
            this.interactionHandle<string, CommandHandler>(interaction, args, commandName, this.guildCommands, this.globalCommands);
        }
        if (interaction.isButton()) {
            const { customId } = interaction;
            this.interactionHandle(interaction, args, customId, this.buttons);
        }
        if (interaction.isSelectMenu()) {
            const { customId } = interaction;
            this.interactionHandle(interaction, args, customId, this.selectMenus);
        }
    }

    private async interactionHandle<K, V extends CommandComponentHandlerBase>(interaction: ReplyableInteraction, args: any[], key: K, ... collections: Discord.Collection<K, V>[]) {

        const handler = collections.map((v) => v.get(key)).reduce((a, b) => a ?? b);
        if (!handler) return;

        let response;

        try {
            response = await handler.execute(interaction, ... args);
        }
        catch (err) {
            console.error(err);
            response = this.errorResponse;
        }

        try {
            if (response) await interaction.reply(response);
        }
        catch (err) {
            console.error(err);
        }
    }
}