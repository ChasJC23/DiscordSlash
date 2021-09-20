import * as Discord from "discord.js";
import { BetterSlashCommandBuilder } from "../discord/builders";
import { GuildCommandHandler } from "../discord/command";


export default class PingCommand extends GuildCommandHandler {

    public readonly guildId = "707713916578300065";

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

    public override async ftn(int: Discord.CommandInteraction) {
        const myBtn = new Discord.MessageButton({ customId: "ping:MyBtn", style: "PRIMARY", label: Math.random().toString() });
        await int.reply({ content: "pong!", components: [new Discord.MessageActionRow({ components: [myBtn] })] });
    }

    public async handleButtonMyBtn(int: Discord.ButtonInteraction) {
        const myBtn = new Discord.MessageButton({ customId: "ping:MyBtn", style: "PRIMARY", label: Math.random().toString() });
        return { components: [new Discord.MessageActionRow({ components: [myBtn] })] };
    }
}