import { Collection } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from "./utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadCommands() {
  const commands = new Collection();
  const commandsPath = path.join(__dirname, "commands");

  if (!fs.existsSync(commandsPath)) return commands;

  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const filePath = pathToFileURL(path.join(commandsPath, file)).href;
    const command = await import(filePath);
    if (command.data && command.execute) {
      commands.set(command.data.name, command);
    } else {
      logger.error(`Commande invalide ignorée: ${file}`);
    }
  }

  return commands;
}
