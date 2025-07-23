const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageType } = require("discord.js");
const config = require("../../config.json");
const eventSchema = require("../../schemas/eventSchema.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("event")
        .setDescription("Manage events within the main server.")
        .addSubcommand(sub => sub
            .setName("schedule")
            .setDescription("Schedule a new event.")
        )
        .addSubcommand(sub => sub
            .setName("reschedule")
            .setDescription("Reschedule an event.")
            .addStringOption(opt => opt
                .setName("event_id")
                .setDescription("The unique event identifer.")
                .setRequired(true)
            )
            .addStringOption(opt => opt
                .setName("unix")
                .setDescription("New time for the event.")
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("cancel")
            .setDescription("Cancel an event.")
            .addStringOption(opt => opt
                .setName("event_id")
                .setDescription("The unique event identifer.")
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("start")
            .setDescription("Start an event.")
            .addStringOption(opt => opt
                .setName("event_id")
                .setDescription("The unique event identifer.")
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("conclude")
            .setDescription("Conclude an event.")
            .addStringOption(opt => opt
                .setName("event_id")
                .setDescription("The unique event identifer.")
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("scheduled")
            .setDescription("View the current events.")
        ),
    async execute(interaction) {
        const options = interaction.options;
        const subCmd = options.getSubcommand();
        const regex = /<t:([^}]+):F>/g;

        const eventId = options.getString("event_id");
        const eventChannel = interaction.client.channels.cache.get(config.eventChannel); // KOG SERVER

        const authorizedGuilds = ["857445688932696104"]; // KOG SERVER
        if (!authorizedGuilds.includes(interaction.guild.id)) {
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid Permission")
                        .setDescription("You don't have permission to manage events in this server, please switch to the main guild in order to create events.")
                        .setColor("Red")
                ],
                flags: MessageFlags.Ephemeral
            });
        };

        if (!interaction.member.roles.cache.some(role => config.eventHosters.includes(role.id))) {
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid Permission")
                        .setDescription("You don't have permission to manage events.")
                        .setColor("Red")
                ],
                flags: MessageFlags.Ephemeral
            });
        };

        switch (subCmd) {
            case "schedule":
                const eventModal = new ModalBuilder()
                    .setTitle("Schedule a New Event")
                    .setCustomId("eventScheduling");

                const hostInput = new TextInputBuilder()
                    .setCustomId("host")
                    .setLabel("Event Host")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("TylersTears")
                    .setRequired(true);

                const typeInput = new TextInputBuilder()
                    .setCustomId("type")
                    .setLabel("Event Type")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Raid")
                    .setRequired(true);

                const unixInput = new TextInputBuilder()
                    .setCustomId("unix")
                    .setLabel("Event Time (Unix Timestamp)")
                    .setPlaceholder("193847494")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const gameInput = new TextInputBuilder()
                    .setCustomId("game")
                    .setLabel("Game")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("QSERF")
                    .setRequired(true);

                const noteInput = new TextInputBuilder()
                    .setCustomId("note")
                    .setLabel("Additional Notes (Optional)")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("QDF may be expected!")
                    .setRequired(false);

                const actionRow1 = new ActionRowBuilder().addComponents(hostInput);
                const actionRow2 = new ActionRowBuilder().addComponents(typeInput);
                const actionRow3 = new ActionRowBuilder().addComponents(unixInput);
                const actionRow4 = new ActionRowBuilder().addComponents(gameInput);
                const actionRow5 = new ActionRowBuilder().addComponents(noteInput);

                eventModal.addComponents(actionRow1, actionRow2, actionRow3, actionRow4, actionRow5);

                await interaction.showModal(eventModal);
                break;
            case "reschedule":
                var newUnix = options.getString("unix");
                var event = await eventSchema.findOne({ uuid: eventId });

                if (!event) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Unknown Event")
                                .setDescription(`Found no event with the Id: ${eventId}`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                if (!event.host == interaction.user.id) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Invalid Permission")
                                .setDescription(`Only the host can manage this event.`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                var oldUnix = event.unix;
                event.unix = newUnix;
                await event.save();

                if (event.messageLink) {
                    const message = await eventChannel.messages.fetch(event.messageLink);

                    const embed = message.embeds[0];
                    const description = embed.description;

                    await message.edit({
                        embeds: [
                            EmbedBuilder.from(embed)
                                .setDescription(description.replace(description.match(regex)[0], `<t:${newUnix}:F>`))
                        ]
                    });

                    await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Event Rescheduled")
                                .setDescription(`The event has been rescheduled and the new time will be at <t:${newUnix}:F> by the host: **<@${interaction.user.id}>**.`)
                                .setColor("Yellow")
                        ],
                        content: "<@&857447103097602058>, <@&896891649064575016>"
                    });
                };

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Event Postponed")
                            .setDescription(`Successfully postponed the event, and the new time will be <t:${newUnix}:F>`)
                            .setFooter({ text: `Event Id: ${eventId}` })
                            .setColor("Red")
                    ],
                    flags: MessageFlags.Ephemeral
                });

                break;
            case "cancel":
                var event = await eventSchema.findOne({ uuid: eventId });

                if (!event) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Unknown Event")
                                .setDescription(`Found no event with the Id: ${eventId}`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                if (!event.host == interaction.user.id) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Invalid Permission")
                                .setDescription(`Only the host can manage this event.`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                await eventSchema.deleteOne({ uuid: eventId });

                if (event.messageLink) {
                    const message = await eventChannel.messages.fetch(event.messageLink);

                    const embed = message.embeds[0];
                    const description = embed.description;

                    await message.edit({
                        embeds: [
                            EmbedBuilder.from(embed)
                                .setDescription(description.replace(description.match(regex)[0], `Cancelled`))
                        ]
                    });

                    await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Event Cancelled")
                                .setDescription(`The following event has been canceled by the host: **<@${interaction.user.id}>**`)
                                .setColor("Red")
                        ],
                    });
                };

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Event Cancelled")
                            .setDescription("You have successfully cancelled the event.")
                            .setFooter({ text: `Event Id: ${eventId}` })
                            .setColor("Red")
                    ],
                    flags: MessageFlags.Ephemeral
                });

                break;
            case "start":
                var event = await eventSchema.findOne({ uuid: eventId });

                if (!event) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Unknown Event")
                                .setDescription(`Found no event with the Id: ${eventId}`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                if (!event.host == interaction.user.id) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Invalid Permission")
                                .setDescription(`Only the host can manage this event.`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                var notes = options.getString("notes");
                var link = options.getString("link");

                if (notes) event.notes = notes;
                if (link) event.link = link;
                await event.save();

                if (event.messageLink) {
                    const message = await eventChannel.messages.fetch(event.messageLink);

                    await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Event Started")
                                .setDescription(`The event has been started! Hosted by **<@${interaction.user.id}>** \n\nPlease join the event if you haven't already.` +
                                    (notes ? `\n\n**Notes:** ${notes}` : "") +
                                    (link ? `\n\n[Join the event](${link})` : "")
                                )
                                .setColor("Green")
                        ],
                        content: "<@&857447103097602058>, <@&896891649064575016>"
                    });
                };

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Event Started")
                            .setDescription(`Successfully started the event.` +
                                (notes ? `\n\n ** Notes:** ${notes} ` : "") +
                                (link ? `\n\n[Join the event](${link})` : "")
                            )
                            .setFooter({ text: `Event Id: ${eventId}` })
                            .setColor("Green")
                    ],
                    flags: MessageFlags.Ephemeral
                });

                break;
            case "conclude":
                var event = await eventSchema.findOne({ uuid: eventId });

                if (!event) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Unknown Event")
                                .setDescription(`Found no event with the Id: ${eventId}`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                if (!event.host == interaction.user.id) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Invalid Permission")
                                .setDescription(`Only the host can manage this event.`)
                                .setColor("Red")
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                };

                await eventSchema.deleteOne({ uuid: eventId });

                if (event.messageLink) {
                    const message = await eventChannel.messages.fetch(event.messageLink);

                    const embed = message.embeds[0];
                    const description = embed.description;

                    await message.edit({
                        embeds: [
                            EmbedBuilder.from(embed)
                                .setDescription(description.replace(description.match(regex)[0], "Concluded"))
                        ]
                    });

                    await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Event Concluded")
                                .setDescription(`The following event has been concluded by the host: **<@${interaction.user.id}>**`)
                                .setColor("Green")
                        ],
                    });
                };

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Event Concluded")
                            .setDescription("You have successfully concluded the event.\n\nPlease ensure to log any necessary details if needed.\nThank you for hosting an event!")
                            .setFooter({ text: `Event Id: ${eventId}` })
                            .setColor("Green")
                    ],
                    flags: MessageFlags.Ephemeral
                });

                break;
            case "scheduled":
                var events = await eventSchema.find();

                events.sort((a, b) => a.unix - b.unix);
                var eventsList = events.map(event => `Host: **<@${event.host}>**\nTime: <t:${event.unix || "Unknown"}:F>\n\n[Event](https://discord.com/channels/${interaction.guild.id}/${config.eventChannel}/${event.messageLink})`);

                const pinnedMessages = await eventChannel.messages.fetchPinned();

                pinnedMessages.forEach(async msg => {
                    if (msg.author.id == interaction.client.user.id) {
                        const embed = msg.embeds[0];
                        const title = embed.title;

                        if (title == "Scheduled Events") {
                            await msg.unpin();
                            await msg.delete();
                        };
                    };
                });

                const msg = await eventChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Scheduled Events")
                            .setDescription(`${eventsList.join("\n-----------\n")}`)
                            .setColor("Green")
                    ]
                });

                const pinCreate = async (msg) => {
                    if (msg.type == MessageType.ChannelPinnedMessage)
                        await msg.delete()
                };

                interaction.client.on("messageCreate", pinCreate);

                await msg.pin();

                await interaction.reply({
                    content: "Sent events list to the event channel.",
                    flags: MessageFlags.Ephemeral
                });

                await interaction.client.off("messageCreate", pinCreate);

                break;
        }
    }
};
