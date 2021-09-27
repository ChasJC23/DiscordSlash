import * as Discord from "discord.js";
import { CommandComponentHandlerBase, HandlerConstructor, HandlerReturn } from ".";

export abstract class ComponentHandler extends CommandComponentHandlerBase {

    public abstract readonly customId: string;
    public abstract readonly type: "BUTTON" | "SELECT_MENU";

    public isButton(): this is ButtonHandler {
        return this.type == "BUTTON";
    }

    public isSelectMenu(): this is SelectMenuHandler {
        return this.type == "SELECT_MENU";
    }

    protected abstract override ftn(int: Discord.MessageComponentInteraction, ... args: any[]): HandlerReturn;
}

export abstract class ButtonHandler extends ComponentHandler {

    public readonly type = "BUTTON";

    protected abstract override ftn(int: Discord.ButtonInteraction, ... args: any[]): HandlerReturn;
}

export abstract class SelectMenuHandler extends ComponentHandler {

    public readonly type = "SELECT_MENU";

    protected abstract override ftn(int: Discord.SelectMenuInteraction, ... args: any[]): HandlerReturn;
}

export type ComponentConstructor = HandlerConstructor<ComponentHandler>;