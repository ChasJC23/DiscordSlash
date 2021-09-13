import * as Discord from "discord.js";
import { BetterSlashCommandBuilder } from "../discord/builders";
import { GlobalCommand } from "../discord/command";


export default class PingCommand extends GlobalCommand {

    public readonly longRunning = false;
    public readonly permissions: Discord.ApplicationCommandPermissionData[] = [
        {
            id: "369865089903230986",
            type: "USER",
            permission: true
        }
    ];
    public readonly slashData = new BetterSlashCommandBuilder()
    .setDefaultPerms(false)
    .setName("ping")
    .setDescription("EXCLUSIVE ping pong!")

    public override ftn(int: Discord.CommandInteraction) {
        int.reply("pong!");
    }
}