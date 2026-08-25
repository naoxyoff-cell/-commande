import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { logger, banner } from "./utils/logger.js";
import { restoreTasks, stopAllTasks } from "./tasks/manager.js";
import { registerBumpWatcher } from "./listeners/bumpWatcher.js";

dotenv.config({ quiet: true });

for (const key of ["DISCORD_TOKEN", "CLIENT_ID"]) {
  if (!process.env[key]) { logger.error(`Variable manquante: ${key}`); process.exit(1); }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let shuttingDown = false;

client.once("clientReady", async () => {
  banner(client);
  await restoreTasks(client);
});

registerBumpWatcher(client);

client.on("error", (err) => logger.error(`Erreur client Discord: ${err.message}`));
client.on("shardDisconnect", (event, id) => {
  if (shuttingDown) return;
  logger.warn(`Connexion perdue (shard ${id}, code ${event.code}), reconnexion...`);
});
client.on("shardResume", (id) => logger.info(`Connexion rétablie (shard ${id}).`));

process.on("unhandledRejection", (err) => logger.error(`Rejet non géré: ${err?.message || err}`));
process.on("uncaughtException", (err) => logger.error(`Exception non capturée: ${err.message}`));

async function shutdown(signal) {
  shuttingDown = true;
  logger.info(`Arrêt en cours (${signal})...`);
  stopAllTasks();
  await client.destroy();
  logger.info("Bot arrêté.");
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error(`Échec de connexion à Discord: ${err.message}`);
  process.exit(1);
});

import http from "http";
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end("Bot en ligne")).listen(PORT, () => {
  console.log(`Serveur HTTP factice actif sur le port ${PORT}`);
});
