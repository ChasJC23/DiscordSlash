import { SlashCommandBuilder } from "@discordjs/builders";
import { APIApplicationCommandOption } from "discord-api-types";

export class BetterSlashCommandBuilder extends SlashCommandBuilder {
    
    public defaultPermission?: boolean;

    public setDefaultPerms(b: boolean): this {
        this.defaultPermission = b;
        return this;
    }

    public override toJSON() {
        let result = super.toJSON() as {
            name: string;
            description: string;
            options: APIApplicationCommandOption[];
            default_permission?: boolean;
        };
        result.default_permission = this.defaultPermission;
        return result;
    }
}