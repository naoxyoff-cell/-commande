import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Affiche la liste des commandes de Pulse");

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚡ Pulse — Centre d'aide")
    .setDescription("Voici toutes les commandes disponibles :")
    .addFields(
      { name: "🏓 /ping", value: "Affiche la latence du bot", inline: false },
      { name: "⏱️ /uptime", value: "Depuis combien de temps Pulse est en ligne", inline: false },
      { name: "📊 /serverinfo", value: "Informations sur le serveur", inline: false },
      { name: "👤 /userinfo", value: "Informations sur un membre", inline: false },
      { name: "❓ /help", value: "Affiche ce message", inline: false }
    )
    .setFooter({ text: "Pulse • Ce message n'est visible que par toi" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
