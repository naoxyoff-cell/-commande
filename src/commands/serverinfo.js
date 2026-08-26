import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Affiche les informations du serveur");

export async function execute(interaction) {
  const guild = interaction.guild;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📊 ${guild.name}`)
    .setThumbnail(guild.iconURL() || null)
    .addFields(
      { name: "Membres", value: `${guild.memberCount}`, inline: true },
      { name: "Créé le", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: "Propriétaire", value: `<@${guild.ownerId}>`, inline: true },
      { name: "Salons", value: `${guild.channels.cache.size}`, inline: true },
      { name: "Rôles", value: `${guild.roles.cache.size}`, inline: true },
      { name: "Boosts", value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
    )
    .setFooter({ text: "Pulse" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
