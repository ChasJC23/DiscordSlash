import { SlashCommandBuilder } from "@discordjs/builders";
import * as Discord from "discord.js";
import { GlobalCommandHandler } from "../discord";

export default class ColourCommand extends GlobalCommandHandler {

    public readonly longRunning = false;
    public readonly permissions = [];

    public readonly slashData = new SlashCommandBuilder()
    .setName("colour")
    .setDescription("Tell the bot your favourite colour!")
    .addStringOption(option => 
        option.setName("colour")
        .setDescription("Your favourite colour")
        .setRequired(true)
        .addChoices([
            ["Red", "RED"],
            ["Yellow", "YELLOW"],
            ["Green", "GREEN"],
            ["Blue", "BLUE"],
        ])
    )
    .addIntegerOption(option => 
        option.setName("index")
        .setDescription("Which favourite colour it is")
        .setRequired(false)
        .addChoices([
            ["First", 1],
            ["Second", 2],
            ["Third", 3],
            ["Fourth", 4],
            ["Fifth", 5],
            ["Sixth", 6],
            ["Seventh", 7],
            ["Eighth", 8],
            ["Ninth", 9],
            ["Tenth", 10]
        ])
    )

    public override async ftn(int: Discord.CommandInteraction) {

        const colour = int.options.getString("colour", true) as "RED" | "YELLOW" | "GREEN" | "BLUE";
        const index = int.options.getInteger("index", false);

        const replyEmbed = new Discord.MessageEmbed();
        if (index) {
            replyEmbed.setDescription(`Your number ${index} favourite colour is ${colour}!`);
        }
        else {
            replyEmbed.setDescription(`You said your favourite colour is ${colour}!`);
        }
        replyEmbed.setColor(colour);
        
        await int.reply({ embeds: [replyEmbed] });
    }
}