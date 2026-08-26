import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { loadCommands } from "./commandLoader.js";

dotenv.config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  const commands = await loadCommands();
  const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());

  logger.info(`Enregistrement de ${commandData.length} commande(s) slash...`);
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandData });
  logger.info("Commandes enregistrées avec succès.");
} catch (err) {
  logger.error(`Erreur lors de l'enregistrement: ${err.message}`);
  process.exit(1);
}
