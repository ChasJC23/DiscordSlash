import * as Discord from "discord.js";
import {Command, GlobalCommand, GuildCommand, CommandConstructor} from "./command";
import { REST } from "@discordjs/rest";
import { APIApplicationCommand, Routes } from "discord-api-types/v9";
import { walkdirSync } from "../util/fsp";
import { EventConstructor, EventHandler } from "./event";

export default class DiscordBot<GlobalT extends GlobalCommand, GuildT extends GuildCommand, EventT extends EventHandler<any>> {

    public defaultResponse: string | Discord.MessagePayload | Discord.InteractionReplyOptions;
    public errorResponse: string | Discord.MessagePayload | Discord.InteractionReplyOptions;

    public readonly discordClient: Discord.Client;
    public readonly globalCommands: Discord.Collection<string, GlobalT>;
    public readonly guildCommands: Discord.Collection<string, GuildT>;
    public readonly allCommands: Discord.Collection<string, Command>;
    public readonly allEvents: EventT[];
    public readonly clientId: string;
    private readonly rest: REST;

    constructor(discordClient: Discord.Client, rest: REST, clientId: string,
        defaultResponse: string | Discord.MessagePayload | Discord.InteractionReplyOptions = "command completed successfully!",
        errorResponse: string | Discord.MessagePayload | Discord.InteractionReplyOptions = "an error occurred running that command"
    ) {
        this.discordClient = discordClient;
        this.rest = rest;
        this.globalCommands = new Discord.Collection();
        this.guildCommands = new Discord.Collection();
        this.allCommands = new Discord.Collection();
        this.allEvents = [];
        this.clientId = clientId;
        this.defaultResponse = defaultResponse;
        this.errorResponse = errorResponse;
    }

    public loadCommands(commandPath: string, ... constructorArgs: any[]) {
        this.globalCommands.clear();
        this.guildCommands.clear();
        this.allCommands.clear();
        const commandFiles = walkdirSync(commandPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const CommandClass = require(file).default as CommandConstructor;
            const command = new CommandClass(this.discordClient, ... constructorArgs);
            if (command.isGlobal()) {
                this.globalCommands.set(command.slashData.name, command as GlobalT);
            }
            if (command.isGuild()) {
                this.guildCommands.set(command.slashData.name, command as GuildT);
            }
            this.allCommands.set(command.slashData.name, command);
        }
    }

    public loadEvents(eventPath: string, ... constructorArgs: any[]) {
        const eventFiles = walkdirSync(eventPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const EventClass = require(file).default as EventConstructor<any>;
            const event = new EventClass(this.discordClient, ... constructorArgs);
            this.allEvents.push(event as EventT);
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

    public beginAwaitingCommands(... args: any[]) {
        this.discordClient.on("interactionCreate", async (int) => await this.onInteractionCreate(int, ... args));
    }

    public beginAwaitingEvents() {
        this.allEvents.forEach((eventhandler) => {
            eventhandler.start();
        });
    }

    private async onInteractionCreate(interaction: Discord.Interaction, ... args: any[]) {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;
        const command = this.allCommands.get(commandName);

        if (!command) return;

        let response;

        try {
            response = await command.execute(interaction, ... args);
            if (!response) response = this.defaultResponse;
        }
        catch (err) {
            console.error(err);
            response = this.errorResponse;
        }

        try {
            await interaction.reply(response);
        }
        catch (err) {
            console.error(err);
        }
    }
}