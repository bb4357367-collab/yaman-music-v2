const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');

const commandData = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube, Spotify, etc.')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song name or URL')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('playnext')
        .setDescription('Add a song to the top of the queue')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song name or URL')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current track'),
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused track'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track'),
    new SlashCommandBuilder()
        .setName('skipto')
        .setDescription('Skip directly to a specific track in the queue')
        .addIntegerOption(option =>
            option.setName('track_number')
                .setDescription('The queue number of the track')
                .setRequired(true)
                .setMinValue(1)
        ),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing and clear the queue'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Disconnect the bot from the voice channel'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing track'),
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Change the player volume')
        .addIntegerOption(option => 
            option.setName('level')
                .setDescription('Volume level (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set the loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' },
                    { name: 'Autoplay', value: 'autoplay' }
                )
        ),
    new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay mode (automatically play related songs)'),
    new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current queue'),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear all songs from the queue'),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a specific track from the queue')
        .addIntegerOption(option =>
            option.setName('track_number')
                .setDescription('The queue number of the track to remove')
                .setRequired(true)
                .setMinValue(1)
        ),
    new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Jump to a specific timestamp in the current song')
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('Time in seconds to seek to')
                .setRequired(true)
                .setMinValue(0)
        ),
    new SlashCommandBuilder()
        .setName('filters')
        .setDescription('Toggle audio filters')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The filter to toggle')
                .setRequired(true)
                .addChoices(
                    { name: 'Bassboost', value: 'bassboost' },
                    { name: '8D', value: '8D' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Vaporwave', value: 'vaporwave' },
                    { name: 'Clear/Off', value: 'off' }
                )
        )
].map(command => command.toJSON());

async function handleCommand(interaction, player) {
    const { commandName } = interaction;
    
    // Check if user is in a voice channel
    if (!interaction.member.voice.channel) {
        return interaction.reply({ content: 'You need to be in a voice channel to use music commands!', ephemeral: true });
    }

    // Helper to get queue
    const queue = useQueue(interaction.guild.id);

    if (commandName === 'play' || commandName === 'playnext') {
        await interaction.deferReply();
        const query = interaction.options.getString('query');
        
        try {
            const result = await player.search(query, {
                requestedBy: interaction.user
            });

            if (!result || !result.tracks.length) {
                return interaction.followUp('❌ | No results found!');
            }

            if (commandName === 'playnext' && queue) {
                queue.insertTrack(result.tracks[0], 0);
                return interaction.followUp(`⏱️ | Inserted **${result.tracks[0].title}** to the top of the queue!`);
            } else {
                const { track } = await player.play(interaction.member.voice.channel, result, {
                    nodeOptions: {
                        metadata: {
                            channel: interaction.channel
                        }
                    }
                });
                return interaction.followUp(`⏱️ | Loaded **${result.playlist ? 'playlist' : track.title}**!`);
            }
        } catch (e) {
            console.error(e);
            return interaction.followUp('❌ | Something went wrong while trying to play that song.');
        }
    }

    if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: '❌ | No music is currently being played!', ephemeral: true });
    }

    if (commandName === 'pause') {
        queue.node.setPaused(true);
        return interaction.reply('⏸️ | Paused the music.');
    }

    if (commandName === 'resume') {
        queue.node.setPaused(false);
        return interaction.reply('▶️ | Resumed the music.');
    }

    if (commandName === 'skip') {
        queue.node.skip();
        return interaction.reply('⏭️ | Skipped the current track.');
    }

    if (commandName === 'skipto') {
        const index = interaction.options.getInteger('track_number');
        if (index > queue.tracks.size) {
            return interaction.reply({ content: '❌ | Invalid track number!', ephemeral: true });
        }
        queue.node.skipTo(index - 1);
        return interaction.reply(`⏭️ | Skipped to track **#${index}**.`);
    }

    if (commandName === 'stop') {
        queue.delete();
        return interaction.reply('🛑 | Stopped the music and cleared the queue.');
    }

    if (commandName === 'leave') {
        queue.delete();
        return interaction.reply('👋 | Left the voice channel.');
    }

    if (commandName === 'volume') {
        const volume = interaction.options.getInteger('level');
        queue.node.setVolume(volume);
        return interaction.reply(`🔊 | Volume set to **${volume}%**`);
    }

    if (commandName === 'nowplaying') {
        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar();
        
        const embed = new EmbedBuilder()
            .setTitle(`Now Playing: ${track.title}`)
            .setDescription(`${progress}\n\nRequested by: ${track.requestedBy}`)
            .setURL(track.url)
            .setColor('#2F3136');
            
        if (track.thumbnail) embed.setThumbnail(track.thumbnail);
            
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'queue') {
        const tracks = queue.tracks.toArray();
        if (tracks.length === 0) {
            return interaction.reply(`🎵 | Now playing: **${queue.currentTrack.title}**\n\nThe queue is empty.`);
        }
        
        const nextSongs = tracks.length > 10 ? 10 : tracks.length;
        const queueString = tracks.slice(0, 10).map((track, i) => {
            return `**${i + 1}.** ${track.title} - ${track.requestedBy}`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle(`Server Queue`)
            .setDescription(`**Now playing:**\n${queue.currentTrack.title}\n\n**Up next:**\n${queueString}`)
            .setFooter({ text: `Total tracks: ${tracks.length}` })
            .setColor('#2F3136');
            
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'loop') {
        const mode = interaction.options.getString('mode');
        if (mode === 'off') {
            queue.setRepeatMode(QueueRepeatMode.OFF);
            return interaction.reply('🔁 | Loop mode disabled.');
        } else if (mode === 'track') {
            queue.setRepeatMode(QueueRepeatMode.TRACK);
            return interaction.reply('🔂 | Looping the current track.');
        } else if (mode === 'queue') {
            queue.setRepeatMode(QueueRepeatMode.QUEUE);
            return interaction.reply('🔁 | Looping the queue.');
        } else if (mode === 'autoplay') {
            queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
            return interaction.reply('▶️ | Autoplay enabled.');
        }
    }

    if (commandName === 'autoplay') {
        const currentMode = queue.repeatMode;
        if (currentMode === QueueRepeatMode.AUTOPLAY) {
            queue.setRepeatMode(QueueRepeatMode.OFF);
            return interaction.reply('▶️ | Autoplay disabled.');
        } else {
            queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
            return interaction.reply('▶️ | Autoplay enabled.');
        }
    }

    if (commandName === 'shuffle') {
        queue.tracks.shuffle();
        return interaction.reply('🔀 | Queue shuffled!');
    }

    if (commandName === 'clear') {
        queue.tracks.clear();
        return interaction.reply('🗑️ | Queue cleared!');
    }

    if (commandName === 'remove') {
        const index = interaction.options.getInteger('track_number');
        if (index > queue.tracks.size) {
            return interaction.reply({ content: '❌ | Invalid track number!', ephemeral: true });
        }
        const removedTrack = queue.node.remove(index - 1);
        return interaction.reply(`🗑️ | Removed **${removedTrack.title}** from the queue.`);
    }

    if (commandName === 'seek') {
        const timeInSeconds = interaction.options.getInteger('time');
        await queue.node.seek(timeInSeconds * 1000);
        return interaction.reply(`⏩ | Seeked to **${timeInSeconds}** seconds.`);
    }

    if (commandName === 'filters') {
        const filter = interaction.options.getString('type');
        
        await interaction.deferReply();
        
        if (filter === 'off') {
            queue.filters.ffmpeg.setFilters(false);
            return interaction.followUp('🎵 | Audio filters cleared.');
        }

        // Toggle the requested filter
        queue.filters.ffmpeg.toggle(filter);
        return interaction.followUp(`🎛️ | Toggled **${filter}** filter!`);
    }
}

module.exports = {
    commandData,
    handleCommand
};
