# Discord.js object oriented template
This TypeScript template, inspired by the recommended JavaScript template given by discord.js, is an entirely object oriented, dynamically loaded system for slash command bots.
This template is entirely generic, meaning if there are data sources you need that the template doesn't supply by default, some extra class inheritance may be used to easily add extra data sources.
## The basics
### The bot class
First of all, let's create a bot and load in our commands from a local folder:
```ts
import { REST } from "@discordjs/rest";
import * as Discord from "discord.js";
import { DiscordBot } from "./discord";
import * as path from "path";
import { token, clientId } from "./config.json";

const botClient = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] });
const rest = new REST({ version: '9' }).setToken(token);

const options = { homeGuildId: "1234567890" };
const myBot = new DiscordBot(botClient, rest, clientId, options);

botClient.login(token)
.then(async () => {
  await myBot.loadCommands(path.join(__dirname, "commands"));
  myBot.beginAwaitingInteractions();
});
```
Command loading automatically registers all commands found in the path given, applying their permissions. Subdirectories may be used for command organisation.
### Bot constructor options
There are many settings we can make use of to control how the bot will work. These settings are supplied through the `options` argument.

Option  | Type  | Default value  | Description
----|----|----|----
`homeGuildId` | `string` | `undefined` | Guild ID used when setting the permissions of global commands. If not supplied, global command permissions will not be acknowledged.
`defaultResponse` |  `InteractionResponse = string \| Discord.MessagePayload \| Discord.InteractionReplyOptions` |  `undefined` |  The default message the bot replies to a slash command interaction with whenever a command does not return a message nor replies during execution.
`errorResponse` |  `InteractionResponse = string \| Discord.MessagePayload \| Discord.InteractionReplyOptions` |  `undefined` |  The default message the bot replies to a slash command interaction with whenever an error occurs during execution of a command handler.
`defaultUpdate` | `InteractionResponse = string \| Discord.MessagePayload \| Discord.InteractionReplyOptions` |  `undefined` | The default change to a message made when an interaction from a message component is received and the handler does not return an update. Updates during execution are not detected.
`includeTypeScript` | `boolean` |  `true` | Whether to include TypeScript source files when loading handler files. Useful for those running through `ts-node`.
`watchCommands` | `boolean` | `true` | Whether to watch command source files for updates to therefore reload them when updates are made.
`dynamicComponentCustomIdSplitter` | `string` | `":"` | The character used to separate the command name / ID from the custom ID of a component handled within a command handler.
`logSettings` | `number` | `0` | A bitmask describing whether to log certain aspects of the bots execution. This has no effect on warnings or errors raised by the bot.

### Bot logging settings

Option | Bit | Description
----|----|----
INTERACTION_RECIEVE | `0b0000_0000_0001`, `1 << 0`, `0x001`, `1` | Announce the collection of an interaction
COMMAND_RECIEVE | `0b0000_0000_0010`, `1 << 1`, `0x002`, `2` | Announce the identification of an interaction as a command
COMPONENT_RECIEVE | `0b0000_0000_0100`, `1 << 2`, `0x004`, `4` | Announce the identification of an interaction as a component
DYNAMIC_COMPONENT | `0b0000_0000_1000`, `1 << 3`, `0x008`, `8` | Announce the identification of an interaction as a dynamically handled component
COMMAND_HANDLE | `0b0000_0001_0000`, `1 << 4`, `0x010`, `16` | Supply information about the handling of commands
COMPONENT_HANDLE | `0b0000_0010_0000`, `1 << 5`, `0x020`, `32` | Supply information about the handling of components
COMMAND_LOAD | `0b0000_0100_0000`, `1 << 6`, `0x040`, `64` | Announce the loading of new commands, or reloading of existing commands
COMMAND_REGISTER | `0b0000_1000_0000`, `1 << 7`, `0x080`, `128` | Announce the registration of new and / or existing commands
COMMAND_PERMISSIONS | `0b0001_0000_0000`, `1 << 8`, `0x100`, `256` | Announce the successful change in permissions for a previously loaded command
EVENT_LOAD | `0b0010_0000_0000`, `1 << 9`, `0x200`, `512` | Announce the loading of new event handlers, or reloading of existing event handlers
EVENT_START | `0b0100_0000_0000`, `1 << 10`, `0x400`, `1024` | Announce the starting of event handlers; communicating their availability of use
COMPONENT_LOAD | `0b1000_0000_0000`, `1 << 11`, `0x800`, `2048` | Announce the loading of new component handlers, or reloading of existing component handlers

### Basics of creating commands
In order to create a command, you must create a class that extends from either the `GlobalCommandHandler` or `GuildCommandHander` class in some way. This must then be set as the default export of the file:
```ts
export default class FooCommand extends GlobalCommandHandler
```
This newly extended class must then give values to the following attributes, and override the following methods, in some way:
```ts
export default class FooCommand extends GlobalCommandHandler {
  public readonly longRunning: boolean = false; // a value indicating whether the execution time of the command is expected to exceed 3 seconds
  public readonly permissions?: Discord.ApplicationCommandPermissionData[] = []; // the permissions for the command
  public readonly slashData: Discord.SlashCommandBuilder = new Discord.SlashCommandBuilder(); // the underlying data sent to Discord during registration. BetterSlashCommandBuilder may also be used.
  protected ftn(int: Discord.CommandInteraction): HandlerReturn { 
    // the code run when the command interaction is received
  }
}
```
The Discord client is set as an attribute of the command class on loading, and will therefore be accessible in command execution through `this.discordClient`.

When creating a guild command, you must also give a value to the `guildId` attribute, as this indicates which guild, or guilds, the command is available to.
```ts
export default class BarCommand extends GuildCommandHandler {
  // ...
  public readonly guildId: string | string[];
  // ...
}
```

### Basics of creating event handlers
The process for creating event handlers is very similar in nature. You create a class that extends from the generic `EventHandler` class. This newly created class must then be set as the default export of the file with the following attributes assigned to:
```ts
export default class JoinGuildEventHandler extends EventHandler<"guildCreate"> {
  public readonly eventType = "guildCreate"; // must be set to the value given in the type argument
  public readonly oneTime: boolean = false; // determines whether this event handler is run using .on or .once
  protected ftn(newGuild: Discord.Guild): void | PromiseLike<void> {
    // the arguments this function receives are reliant on the event type.
  }
}
```

### Basics of handling message components
There are two ways of handling message components. You can either write a handler like you would a command or event by creating a class extending from the `ButtonHandler` or `SelectMenuHandler` class, depending on the component you wish to handle. You create the component as you usually would, giving it a custom ID. If the bot receives an interaction with that custom ID, it sends the interaction to the associating handler you've created.
```ts
export default class PingBtnHandler extends ButtonHandler {
  public readonly customId: string = "ping"; // the custom ID of the component to handle
  protected override ftn(int: Discord.ButtonInteraction): HandlerReturn {
    // the code run when an interaction of this type is received
  }
}
```
The other option, which may be cleaner and more useful at times, is to have the component be handled within a command class. In order to achieve this, the custom ID of the component sent must be in the format `<command name | command id>:<custom id>`. *Note: the character used to separate the command name from the custom name, by default `:`, may be changed using the `dynamicComponentCustomIdSplitter` setting. A good character choice would be one not available for use in command names as the code for distinguishing the command name / id from the custom id only considers the first instance of the separator character found.*

```ts
export default class FooCommand extends GlobalCommandHandler {
  // ...
  public readonly slashData = new BetterSlashCommandBuilder()
    .setDefaultPerms(false)
    .setName("foo")
    .setDescription("example command")
  
  protected override ftn(int: Discord.CommandInteraction): HandlerReturn { 
    const yesBtn = new Discord.MessageButton({ customId: "foo:Yes", style: "SUCCESS", label: "yes" });
    const noBtn = new Discord.MessageButton({ customId: "foo:No", style: "DANGER", label: "no" });
    const infoBtn = new Discord.MessageButton({ customId: "foo:Info", style: "LINK", label: "info", url: "https://discord.com" });
    return { components: new Discord.MessageActionRow({ components: [ yesBtn, noBtn, infoBtn ] }) }
  }

  protected override handleButton(int: Discord.ButtonInteraction): HandlerReturn {
      // runs if a button interaction is received and is not handled elsewhere
  }

  private handleButtonYes(int: Discord.ButtonInteraction): HandlerReturn {
    // runs if a button with custom ID foo:Yes is received
  }

  private handleButtonNo(int: Discord.ButtonInteraction): HandlerReturn {
    // runs if a button with custom ID foo:No is received
  }

  protected override handleSelectMenu(int: Discord.SelectMenuInteraction, ... args: any[]): HandlerReturn {
    // runs if a select menu is received and is not handled elsewhere
  }
}
```
## The power of generics
The bot class, written out fully, is a massive mess of generics:
```ts
class DiscordBot<GlobalT extends GlobalCommandHandler, GuildT extends GuildCommandHandler, EventT extends EventHandler<any>, ButtonT extends ButtonHandler, SelectMenuT extends SelectMenuHandler>;
```
The reason for all these generics is to allow for handlers to have greater access to data, either supplied through their constructors or in some cases, as an argument given into the method responsible for handling the received interaction.
### Extra constructor arguments
If you want to include additonal arguments to the constructors of your handlers, you should create classes that extend them like so:
```ts
abstract class MyGlobalCommandHandler extends GlobalCommandHandler {
  myAttr: any;
  constructor(discordClient: Discord.Client, myAttr: any) {
    super(discordClient);
    this.myAttr = myAttr;
  }
}
```
To be complete, you'll need to extend `GlobalCommandHandler`, `GuildCommandHandler`, `EventHandler<K extends keyof Discord.ClientEvents>`, `ButtonHandler`, & `SelectMenuHandler`. The necessary code to give them extra constructor arguments is identical. **The `discordClient` must be the first argument in the constructor.**
In order to make the bot make use of these additional arguments for the constructor, you can supply them to the `loadCommands`, `loadEvents` and `loadComponents` methods where appropriate, or extend the bot yourself:
```ts
class MyBot extends DiscordBot<MyGlobalCommandHandler, MyGuildCommandHandler, MyEventHandler<any>, MyButtonHandler, MySelectMenuHandler> {
  myAttr: any;
  constructor(discordClient: Discord.Client, rest: REST, clientId: string, myAttr: any, options: DiscordBotOptions) {
    super(discordClient, rest, clientId, options);
    this.myAttr = myAttr;
  }

  public override loadCommands(commandPath: string) {
    super.loadCommands(commandPath, this.myAttr);
  }

  public override loadEvents(eventPath: string) {
    super.loadEvents(eventPath, this.myAttr);
  }

  public override loadComponents(componentPath: string) {
    super.loadComponents(componentPath, this.myAttr)
  }
}
```
### Extra handler arguments
If instead you wish to have extra data be inputted to the method used for the handler's execution, you can extend the appropriate classes in a similar way
```ts
abstract class MyGlobalCommandHandler extends GlobalCommandHandler {
  protected abstract override ftn(int: Discord.CommandInteraction, myArg: any);
}
```
And of course, make the bot use them:
```ts
class MyBot extends DiscordBot<MyGlobalCommandHandler, MyGuildCommandHandler, EventHandler<any>, MyButtonHandler, MySelectMenuHandler> {
  myAttr: any;
  constructor(discordClient: Discord.Client, rest: REST, clientId: string, myAttr: any, options: DiscordBotOptions) {
    super(discordClient, rest, clientId, options);
    this.myAttr = myAttr;
  }
  public override beginAwaitingInteractions() {
    super.beginAwaitingInteractions(this.myAttr);
  }
}
```
**This approach is not supported for event handlers.** *As the methods you override in these examples all have an `... args: any[]` argument by default; it is, although recommended, not necessary to extend these classes in some cases.*