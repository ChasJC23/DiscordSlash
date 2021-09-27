import * as Discord from "discord.js";
import { EventHandler } from "../discord/event";

export default class JoinGuildHandler extends EventHandler<"guildCreate"> {

    public readonly eventType = "guildCreate";
    public readonly oneTime = false;

    protected override ftn(newGuild: Discord.Guild) {
        newGuild.systemChannel?.send("Hello world!");
    }
}