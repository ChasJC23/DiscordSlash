import { REST } from "@discordjs/rest";
import { Client, Intents } from "discord.js";
import { DiscordBot } from "./discord";
import * as path from "path";
import { token, clientId } from "./config.json";

const botClient = new Client({ intents: [Intents.FLAGS.GUILDS] });
const rest = new REST({ version: '9' }).setToken(token);

const myBot = new DiscordBot(botClient, rest, clientId);

myBot.loadCommands(path.join(__dirname, "commands"));
myBot.loadEvents(path.join(__dirname, "events"));
myBot.beginAwaitingEvents();

botClient.login(token)
.then(async () => {
    await myBot.registerCommands();
    myBot.beginAwaitingInteractions();
});