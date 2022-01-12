import * as Discord from "discord.js";
import { GuildCommandHandler } from "../discord";
import { SlashCommandBuilder } from "@discordjs/builders";

function makeButton() {
    return new Discord.MessageButton({ customId: "ping:MyBtn", style: "PRIMARY", label: Math.random().toString() });
}

export default class PingCommand extends GuildCommandHandler {

    public readonly guildId = "707713916578300065";

    public readonly longRunning = false;
    public readonly permissions: Discord.ApplicationCommandPermissionData[] = [
        {
            id: "774018907937308673",
            type: "ROLE",
            permission: true
        }
    ];
    public readonly slashData = new SlashCommandBuilder()
    .setDefaultPermission(false)
    .setName("ping")
    .setDescription("EXCLUSIVE ping pong!")

    public override async ftn(int: Discord.CommandInteraction) {
        const myBtn = makeButton();
        await int.reply({ content: "pong!", components: [new Discord.MessageActionRow({ components: [myBtn] })] });
    }

    public async handleButtonMyBtn(int: Discord.ButtonInteraction) {
        const myBtn = makeButton();
        return { components: [new Discord.MessageActionRow({ components: [myBtn] })] };
    }
}