require('dotenv').config();
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

// Force FFmpeg path and make sure it has execution permissions on Linux (Render)
process.env.FFMPEG_PATH = ffmpegPath;
try {
    fs.chmodSync(ffmpegPath, 0o755);
} catch (e) {
    console.log('Could not set ffmpeg permissions (might already be set).');
}

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const commands = require('./commands');

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ],
});

// Create discord-player instance
const player = new Player(client);

// This will load default extractors like YouTube, Spotify, SoundCloud, etc.
player.extractors.loadMulti(DefaultExtractors);
player.extractors.defaultConfig = {
    YouTubeExtractor: {
        bridgeProvider: 'SoundCloudExtractor'
    }
};

// Setup player events
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`🎵 | Now playing **${track.title}**!`);
});

player.events.on('error', (queue, error) => {
    console.log(`[Error generated from queue] ${error.message}`);
    queue.metadata.channel.send(`❌ | Queue error: ${error.message}`);
});

player.events.on('playerError', (queue, error) => {
    console.log(`[Error generated from connection] ${error.message}`);
    queue.metadata.channel.send(`❌ | Audio connection error (Is FFmpeg installed?): ${error.message}`);
});

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Register Slash Commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands.commandData,
        });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        await commands.handleCommand(interaction, player);
    } catch (e) {
        console.error(e);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
