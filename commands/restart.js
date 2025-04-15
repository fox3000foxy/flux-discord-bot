const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restarts the bot and the weights-api!'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Danger);

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(cancel, confirm);

        const response = await interaction.editReply({
            content: 'Une image peut être en train de se générer, êtes vous sure de vouloir redémarrer ?',
            components: [row],
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            if (confirmation.customId === 'confirm') {
                await confirmation.update({ content: 'Restarting...', components: [] });

                exec('pm2 restart weights-api && pm2 restart flux-bot', (error, stdout, stderr) => {
                    if (error) {
                        console.error(`exec error: ${error}`);
                        interaction.editReply(`Restart failed with error: ${error}`);
                        return;
                    }
                    console.log(`stdout: ${stdout}`);
                    console.error(`stderr: ${stderr}`);
                    interaction.editReply('Bot and weights-api restarted successfully!');
                });
            } else if (confirmation.customId === 'cancel') {
                await confirmation.update({ content: 'Restart cancelled!', components: [] });
            }
        } catch (e) {
            await interaction.editReply({
                content: 'Confirmation not received within 1 minute, cancelling',
                components: [],
            });
        }
    },
};