import { REST } from "@discordjs/rest";
import { Client, Intents } from "discord.js";
import { DiscordBot } from "./discord";
import * as path from "path";
import { token, clientId } from "./config.json";

const botClient = new Client({ intents: [Intents.FLAGS.GUILDS] });
const rest = new REST({ version: '9' }).setToken(token);

const myBot = new DiscordBot(botClient, rest, clientId, {
    defaultResponse: "success!",
    errorResponse: "failure...",
    homeGuildId: "707713916578300065",
    logSettings: 0xfff,
});

myBot.loadEvents(path.join(__dirname, "events"));

botClient.login(token)
.then(async () => {
    await myBot.loadCommands(path.join(__dirname, "commands"));
    myBot.beginAwaitingInteractions();
});