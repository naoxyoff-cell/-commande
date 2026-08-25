import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

const configPath = path.resolve("src/tasks/integrations.json");
const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Pour activer une intégration : ajoute "available": true et un handler run(channel)
// ci-dessous, uniquement si le service tiers fournit une API/webhook officiel(le)
// permettant de déclencher l'action indépendamment du client Discord.
const apiHandlers = {
  // exemple_api: async (channel) => {
  //   const res = await fetch("https://api.exemple.com/trigger", {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${process.env.EXEMPLE_API_KEY}` },
  //   });
  //   if (!res.ok) throw new Error(`API a répondu ${res.status}`);
  //   await channel.send("✅ Action déclenchée via l'API officielle.");
  // },
};

export const integrations = Object.fromEntries(
  Object.entries(rawConfig).map(([key, def]) => [
    key,
    { ...def, run: apiHandlers[key] },
  ])
);

export function isValidIntegration(name) {
  return Object.prototype.hasOwnProperty.call(integrations, name);
}

export function isAvailableIntegration(name) {
  return integrations[name]?.available === true && typeof integrations[name]?.run === "function";
}

export function getIntegrationNames() {
  return Object.keys(integrations);
}

export function getIntegrationLabel(name) {
  const def = integrations[name];
  if (!def) return name;
  return def.available ? def.label : `${def.label} (indisponible)`;
}

export async function runIntegration(name, channel) {
  const integration = integrations[name];
  if (!integration) throw new Error(`Intégration inconnue: ${name}`);
  if (!isAvailableIntegration(name)) {
    throw new Error(`Intégration '${name}' indisponible: ${integration.reason || "aucune méthode officielle."}`);
  }
  await integration.run(channel);
  logger.info(`Intégration '${name}' exécutée dans #${channel.name}.`);
}
