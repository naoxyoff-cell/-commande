import { EmbedBuilder } from "discord.js";
import { startReminderTask } from "../tasks/manager.js";
import { logger } from "../utils/logger.js";

const DISBOARD_BOT_ID = "302050872383242240";
const BUMP_INTERVAL_SECONDS = 2 * 60 * 60 + 10;

function buildSuccessEmbed(userMention) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚡ Bump effectué avec succès !")
    .setDescription(
      `Merci ${userMention} d'avoir pris le temps de faire remonter le serveur ! 🎉 ` +
      "Grâce à toi, notre communauté gagne en visibilité dans les recherches Discord " +
      "et de nouveaux membres pourront plus facilement nous trouver.\n\n" +
      "🔔 Pulse te préviendra dans **2 heures** pour le prochain bump — reste connecté !\n\n" +
      "*Chaque bump compte, merci de faire vivre le serveur* 💙"
    )
    .setFooter({ text: "Pulse • Gardien du bump" })
    .setTimestamp();
}

const reminderEmbed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle("🔔 C'est reparti pour un bump !")
  .setDescription(
    "Le serveur peut à nouveau être boosté dans les résultats de recherche Discord — " +
    "chaque bump aide de nouveaux membres à nous trouver plus facilement. 🌟\n\n" +
    "👉 Tape simplement `/bump` où que tu sois sur le serveur.\n\n" +
    "🔁 Prochain rappel automatique dans 2 heures"
  )
  .setFooter({ text: "Propulsé par l'équipe Seeding Studios 🔥" })
  .setTimestamp();

const REMINDER_MESSAGE = {
  content: "@everyone",
  embeds: [reminderEmbed],
  allowedMentions: { parse: ["everyone"] },
};

const SUCCESS_KEYWORDS = ["effectué", "bump done", "bump effectué", "thank you for bumping", "merci d'avoir"];

const bumpChannelByGuild = new Map();
const lastBumperByGuild = new Map();
const processedMessageIds = new Set();

function alreadyProcessed(messageId) {
  if (processedMessageIds.has(messageId)) return true;
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > 500) {
    const oldest = processedMessageIds.values().next().value;
    processedMessageIds.delete(oldest);
  }
  return false;
}

function isDisboardSuccessMessage(message) {
  if (message.author.id !== DISBOARD_BOT_ID) return false;
  const embed = message.embeds[0];
  if (!embed) return false;
  const text = `${embed.title || ""} ${embed.description || ""}`.toLowerCase();
  return SUCCESS_KEYWORDS.some((kw) => text.includes(kw));
}

export function registerBumpWatcher(client) {
  client.on("interactionCreate", (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === "bump") {
      lastBumperByGuild.set(interaction.guildId, interaction.user.id);
    }
  });

  client.on("messageCreate", async (message) => {
    try {
      if (!message.guild) return;

      if (isDisboardSuccessMessage(message)) {
        if (alreadyProcessed(message.id)) return;

        if (!bumpChannelByGuild.has(message.guild.id)) {
          bumpChannelByGuild.set(message.guild.id, message.channel.id);
          logger.info(`Salon bump détecté et verrouillé : #${message.channel.name}`);
        }

        const bumperUser = message.interactionMetadata?.user ?? message.interaction?.user;
        const userMention = bumperUser ? `<@${bumperUser.id}>` : "Quelqu'un";

        await message.delete().catch(() => {});
        await message.channel.send({ embeds: [buildSuccessEmbed(userMention)] }).catch(() => {});

        const result = startReminderTask(
          message.guild.id, "bump", BUMP_INTERVAL_SECONDS, message.channel, REMINDER_MESSAGE
        );
        logger.info(
          `Bump détecté dans #${message.channel.name}, rappel ${result.reset ? "réinitialisé" : "programmé"} dans 2h.`
        );
        return;
      }

      const lockedChannelId = bumpChannelByGuild.get(message.guild.id);
      if (lockedChannelId && message.channel.id === lockedChannelId && !message.author.bot) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      logger.error(`Erreur dans bumpWatcher: ${err.message}`);
    }
  });
}
