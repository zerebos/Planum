import type {Client} from "discord.js";


export default {
    name: "ready",
    once: true,
    async execute(client: Client) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
        client.cpuUsage = process.cpuUsage();
    },
};