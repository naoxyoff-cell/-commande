import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("uptime")
  .setDescription("Affiche depuis combien de temps le bot est en ligne");

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export async function execute(interaction) {
  const uptime = formatUptime(process.uptime());
  await interaction.reply(`⏱️ Pulse est en ligne depuis **${uptime}**`);
}
