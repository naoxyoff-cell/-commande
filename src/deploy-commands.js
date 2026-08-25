import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";

dotenv.config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  logger.info("Suppression de toutes les commandes slash...");
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
  logger.info("Commandes supprimées avec succès.");
} catch (err) {
  logger.error(`Erreur lors de la suppression: ${err.message}`);
  process.exit(1);
}
