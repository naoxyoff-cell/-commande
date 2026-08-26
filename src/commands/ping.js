import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Affiche la latence du bot");

export async function execute(interaction) {
  const sent = await interaction.reply({ content: "Calcul en cours...", fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`🏓 Pong ! Latence : **${latency}ms** | API Discord : **${Math.round(interaction.client.ws.ping)}ms**`);
}
