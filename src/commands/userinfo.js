import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Affiche les informations d'un membre")
  .addUserOption((option) =>
    option.setName("membre").setDescription("Le membre à inspecter").setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser("membre") || interaction.user;
  const member = interaction.guild.members.cache.get(target.id);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`👤 ${target.username}`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "Compte créé le", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`, inline: true },
      { name: "A rejoint le", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Inconnu", inline: true },
      { name: "Rôles", value: member ? `${member.roles.cache.size - 1}` : "0", inline: true }
    )
    .setFooter({ text: "Pulse" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
