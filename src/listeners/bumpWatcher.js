import { EmbedBuilder } from "discord.js";
import { startReminderTask } from "../tasks/manager.js";
import { logger } from "../utils/logger.js";

const DISBOARD_BOT_ID = "302050872383242240";
const BUMP_INTERVAL_SECONDS = 2 * 60 * 60 + 10;

const reminderEmbed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle("🔔 C'est l'heure du bump !")
  .setDescription(
    "Le serveur peut à nouveau être remonté dans les recherches Discord.\n\n" +
    "Tape la commande `/bump` pour aider le serveur à gagner en visibilité ! 🚀"
  )
  .setFooter({ text: "Un bump toutes les 2 heures, ça fait une grande différence 💙" })
  .setTimestamp();

const REMINDER_MESSAGE = {
  content: "@everyone",
  embeds: [reminderEmbed],
  allowedMentions: { parse: ["everyone"] },
};

const SUCCESS_KEYWORDS = ["effectué", "bump done", "bump effectué", "thank you for bumping", "merci d'avoir"];

// Retient, par serveur, le salon où le premier bump a été détecté
const bumpChannelByGuild = new Map();

function isDisboardSuccessMessage(message) {
  if (message.author.id !== DISBOARD_BOT_ID) return false;
  const embed = message.embeds[0];
  if (!embed) return false;
  const text = `${embed.title || ""} ${embed.description || ""}`.toLowerCase();
  return SUCCESS_KEYWORDS.some((kw) => text.includes(kw));
}

export function registerBumpWatcher(client) {
  client.on("messageCreate", async (message) => {
    try {
      if (!message.guild) return;

      // Détection du bump réussi
      if (isDisboardSuccessMessage(message)) {
        if (!bumpChannelByGuild.has(message.guild.id)) {
          bumpChannelByGuild.set(message.guild.id, message.channel.id);
          logger.info(`Salon bump détecté et verrouillé : #${message.channel.name}`);
        }

        const result = startReminderTask(
          message.guild.id, "bump", BUMP_INTERVAL_SECONDS, message.channel, REMINDER_MESSAGE
        );
        if (result.ok) {
          logger.info(`Bump détecté dans #${message.channel.name}, rappel programmé dans 2h.`);
        } else {
          logger.info(`Bump détecté dans #${message.channel.name}, rappel déjà programmé.`);
        }
        return;
      }

      // Verrouillage : supprime tout message non-bot dans le salon bump identifié
      const lockedChannelId = bumpChannelByGuild.get(message.guild.id);
      if (lockedChannelId && message.channel.id === lockedChannelId && !message.author.bot) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      logger.error(`Erreur dans bumpWatcher: ${err.message}`);
    }
  });
}
