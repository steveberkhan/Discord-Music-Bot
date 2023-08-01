const { Player, QueryType, useQueue } = require("discord-player");
DP_FORCE_YTDL_MOD = "@distube/ytdl-core"
const config = require("./config.json");
const { Client, Partials, Collection, GatewayIntentBits, GuildMember } = require('discord.js');
const { useMainPlayer } = require("./node_modules/discord-player/dist/index");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction
  ],
  presence: {
    activities: [{
      name: "Flashen1's Bot",
      type: 0
    }],
    status: 'dnd'
  }
});

var messageDict =
{
    "ping": "pong!"
};

(async () => {
    const player = new Player(client);
    await player.extractors.loadDefault();
})();

client.once('ready', async () => {
 console.log('Ready!');
});

client.on("error", console.error);
client.on("warn", console.warn);

client.on("messageCreate", (message) =>
{
    if (message.author.id == client.user.id) return;

    for (var key in messageDict)
    {
        if (message.content.toLowerCase().startsWith(key)) {
            message.channel.send(messageDict[key]);
        }
    }
});

const player = useMainPlayer();

player.events.on("error", (queue, error) => {
    console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`);
});
player.events.on("playerError", (queue, error) => {
    console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
});

player.events.on("playerStart", (queue, track) => {
    const channel = queue.metadata;
    channel.send(`🎶 | Started playing: **${track.title}** in **${channel.name}**!`);
});

player.events.on("audioTrackAdd", (queue, track) => {
    queue.metadata.send(`🎶 | Track **${track.title}** queued!`);
});

player.events.on("disconnect", (queue) => {
    queue.metadata.send("❌ | I was manually disconnected from the voice channel, clearing queue!");
});

player.events.on("emptyChannel", (queue) => {
    queue.metadata.send("❌ | Nobody is in the voice channel, leaving...");
});

player.events.on("emptyQueue", (queue) => {
    queue.metadata.send("✅ | Queue finished!");
});

client.on("messageCreate", async (message) => {
		if (message.author.bot || !message.guild) return;
    if (!client.application?.owner) await client.application?.fetch();
});

client.on("messageCreate", async (message) => {
		if (message.content === "!deploy" && message.author.id === client.application?.owner?.id) {
        await message.guild.commands.set([
            {
                name: "play",
                description: "Plays a song from youtube",
                options: [
                    {
                        name: "query",
                        type: 3,
                        description: "The song you want to play",
                        required: true
                    }
                ]
            },
            {
                name: "skip",
                description: "Skip to the current song"
            },
            {
                name: "queue",
                description: "See the queue"
            },
            {
                name: "stop",
                description: "Stop the player"
            },
        ]);

        await message.reply("Deployed!");
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() || !interaction.guildId) return;

    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", ephemeral: true });
    }



    if (interaction.commandName === "play") {
        await interaction.deferReply();

        const query = interaction.options.getString("query", true);
        const channel = interaction.member.voice.channel;
        const searchResult = await player.search(query, { requestedBy: interaction.user });

        if (!searchResult || !searchResult.hasTracks()) return void interaction.followUp({ content: "No results were found!" });


        try {
            await player.play(channel, searchResult, {
                nodeOptions: {
                    metadata: interaction.channel
                },
            });
            await interaction.editReply(`⏱ | Loading your ${searchResult.playlist ? "playlist" : "track"}...`);
        } catch (e) {
            // let's return error if something failed
            return console.log(`Something went wrong: ${e}`);
        }


    } else if (interaction.commandName === "skip") {
        await interaction.deferReply();
        const queue = player.nodes.get(interaction.guildId);
        if (!queue || !queue.playing) return void interaction.followUp({ content: "❌ | No music is being played!" });
        const currentTrack = queue.currentTrack;
        const success = queue.skip();
        return void interaction.followUp({
            content: success ? `✅ | Skipped **${currentTrack}**!` : "❌ | Something went wrong!"
        });
    } else if (interaction.commandName === "stop") {
        await interaction.deferReply();
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) return void interaction.followUp({ content: "❌ | No music is being played!" });
        queue.delete();
        return void interaction.followUp({ content: "🛑 | Stopped the player!" });
    } else {
        interaction.reply({
            content: "Unknown command!",
            ephemeral: true
        });
    }
});

const token = config.token;
client.login(token);
