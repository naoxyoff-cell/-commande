import { taskRegistry } from "./registry.js";
import { runIntegration } from "./integrations.js";
import { saveTask, removeTask, loadAllTasks } from "./store.js";
import { logger } from "../utils/logger.js";

const activeTasks = new Map();

export const MIN_INTERVAL = 10;
export const MAX_INTERVAL = 86400;

export function isValidInterval(seconds) {
  return Number.isInteger(seconds) && seconds >= MIN_INTERVAL && seconds <= MAX_INTERVAL;
}

function buildKey(guildId, kind, name) {
  return `${guildId}:${kind}:${name}`;
}

function scheduleInternal(taskName, intervalSeconds) {
  const taskFn = taskRegistry[taskName];
  return setInterval(async () => {
    try { await taskFn(); }
    catch (err) { logger.error(`Erreur dans la tâche '${taskName}': ${err.message}`); }
  }, intervalSeconds * 1000);
}

function scheduleIntegration(integrationName, intervalSeconds, channel) {
  return setInterval(async () => {
    try { await runIntegration(integrationName, channel); }
    catch (err) { logger.error(`Erreur dans l'intégration '${integrationName}': ${err.message}`); }
  }, intervalSeconds * 1000);
}

function scheduleReminder(payload, intervalSeconds, channel) {
  return setInterval(async () => {
    try { await channel.send(payload); }
    catch (err) { logger.error(`Erreur d'envoi de rappel: ${err.message}`); }
  }, intervalSeconds * 1000);
}

export function startInternalTask(guildId, taskName, intervalSeconds) {
  const key = buildKey(guildId, "internal", taskName);
  if (activeTasks.has(key)) return { ok: false, reason: "already_running" };

  activeTasks.set(key, scheduleInternal(taskName, intervalSeconds));
  saveTask(key, { guildId, kind: "internal", name: taskName, intervalSeconds });
  logger.info(`Tâche interne '${taskName}' démarrée (guilde ${guildId}, ${intervalSeconds}s).`);
  return { ok: true };
}

export function startIntegrationTask(guildId, integrationName, intervalSeconds, channel) {
  const key = buildKey(guildId, "integration", integrationName);
  if (activeTasks.has(key)) return { ok: false, reason: "already_running" };

  activeTasks.set(key, scheduleIntegration(integrationName, intervalSeconds, channel));
  saveTask(key, { guildId, kind: "integration", name: integrationName, intervalSeconds, channelId: channel.id });
  logger.info(`Intégration '${integrationName}' démarrée (guilde ${guildId}, ${intervalSeconds}s).`);
  return { ok: true };
}

export function startReminderTask(guildId, name, intervalSeconds, channel, payload) {
  const key = buildKey(guildId, "reminder", name);
  if (activeTasks.has(key)) return { ok: false, reason: "already_running" };

  activeTasks.set(key, scheduleReminder(payload, intervalSeconds, channel));
  saveTask(key, { guildId, kind: "reminder", name, intervalSeconds, channelId: channel.id, payload });
  logger.info(`Rappel '${name}' démarré (guilde ${guildId}, ${intervalSeconds}s, salon #${channel.name}).`);
  return { ok: true };
}

export function stopTask(guildId, kind, name) {
  const key = buildKey(guildId, kind, name);
  const intervalId = activeTasks.get(key);
  if (!intervalId) return { ok: false, reason: "not_running" };
  clearInterval(intervalId);
  activeTasks.delete(key);
  removeTask(key);
  logger.info(`Tâche '${name}' (${kind}) arrêtée (guilde ${guildId}).`);
  return { ok: true };
}

export function listTasks(guildId) {
  return [...activeTasks.keys()]
    .filter((k) => k.startsWith(`${guildId}:`))
    .map((k) => { const [, kind, name] = k.split(":"); return { kind, name }; });
}

export async function restoreTasks(client) {
  const stored = await loadAllTasks();
  let restored = 0;

  for (const [key, task] of Object.entries(stored)) {
    if (activeTasks.has(key)) continue;

    try {
      if (task.kind === "internal") {
        activeTasks.set(key, scheduleInternal(task.name, task.intervalSeconds));
        restored++;
      } else if (task.kind === "integration") {
        const channel = await client.channels.fetch(task.channelId);
        activeTasks.set(key, scheduleIntegration(task.name, task.intervalSeconds, channel));
        restored++;
      } else if (task.kind === "reminder") {
        const channel = await client.channels.fetch(task.channelId);
        activeTasks.set(key, scheduleReminder(task.payload, task.intervalSeconds, channel));
        restored++;
      }
    } catch (err) {
      logger.error(`Impossible de restaurer la tâche '${key}': ${err.message}. Suppression.`);
      removeTask(key);
    }
  }

  logger.info(`${restored} tâche(s) restaurée(s) après redémarrage.`);
}

export function stopAllTasks() {
  for (const intervalId of activeTasks.values()) clearInterval(intervalId);
  activeTasks.clear();
}
