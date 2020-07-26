const path = require("path");
const sqlite = require("sqlite");
const Extensions = require("./ext");
Extensions.addAll();


const Commando = require("discord.js-commando");
const config = require("../config");


const client = new Commando.Client({
    commandPrefix: config.defaultPrefix,
    owner: config.owner,
    fetchAllMembers: config.fetchAllMembers || false,
    description: config.description,
    invite: config.invite,
    github: config.github,
    messageCacheMaxSize: 10,
    restTimeOffset: 100,
    presence: {
        status: "online",
        activity: {
            name: `${config.defaultPrefix}help for help`
        }
    }
});


client.registry.registerGroups([
    ["botadmin", "Bot Admin"],
    ["meta", "Meta"],
    ["moderation", "Moderation"],
    ["levels", "Levels"],
]);

client.registry.registerDefaultTypes();
client.registry.registerDefaultGroups();
client.registry.registerDefaultCommands({
    prefix: false,
    help: false, 
    ping: false,
    eval: false,
    unknownCommand: false
});

client.registry.registerCommandsIn(path.join(__dirname, "commands"));

client.setProvider(sqlite.open(path.join(__dirname, "..", "settings.sqlite3")).then(db => new Commando.SQLiteProvider(db))).catch(console.error);

client.login(config.token);