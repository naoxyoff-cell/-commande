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

function scheduleRecurring(intervalSeconds, initialDelayMs, action, onEachFire) {
  let timeoutOrIntervalId;
  let usingInterval = false;

  const fire = async () => {
    onEachFire();
    try {
      await action();
    } catch (err) {
      logger.error(`Erreur dans une tâche planifiée: ${err.message}`);
    }
  };

  timeoutOrIntervalId = setTimeout(async () => {
    await fire();
    usingInterval = true;
    timeoutOrIntervalId = setInterval(fire, intervalSeconds * 1000);
  }, initialDelayMs);

  return {
    clear() {
      if (usingInterval) clearInterval(timeoutOrIntervalId);
      else clearTimeout(timeoutOrIntervalId);
    },
  };
}

function computeDueAt(intervalSeconds) {
  return Date.now() + intervalSeconds * 1000;
}

function computeInitialDelayMs(intervalSeconds, dueAt) {
  if (!dueAt) return intervalSeconds * 1000;
  const remaining = dueAt - Date.now();
  return Math.max(remaining, 1000);
}

export function startInternalTask(guildId, taskName, intervalSeconds) {
  const key = buildKey(guildId, "internal", taskName);
  if (activeTasks.has(key)) return { ok: false, reason: "already_running" };

  const taskFn = taskRegistry[taskName];
  const handle = scheduleRecurring(
    intervalSeconds,
    intervalSeconds * 1000,
    taskFn,
    () => saveTask(key, { guildId, kind: "internal", name: taskName, intervalSeconds, dueAt: computeDueAt(intervalSeconds) })
  );

  activeTasks.set(key, handle);
  saveTask(key, { guildId, kind: "internal", name: taskName, intervalSeconds, dueAt: computeDueAt(intervalSeconds) });
  logger.info(`Tâche interne '${taskName}' démarrée (guilde ${guildId}, ${intervalSeconds}s).`);
  return { ok: true };
}

export function startIntegrationTask(guildId, integrationName, intervalSeconds, channel) {
  const key = buildKey(guildId, "integration", integrationName);
  if (activeTasks.has(key)) return { ok: false, reason: "already_running" };

  const handle = scheduleRecurring(
    intervalSeconds,
    intervalSeconds * 1000,
    () => runIntegration(integrationName, channel),
    () => saveTask(key, { guildId, kind: "integration", name: integrationName, intervalSeconds, channelId: channel.id, dueAt: computeDueAt(intervalSeconds) })
  );

  activeTasks.set(key, handle);
  saveTask(key, { guildId, kind: "integration", name: integrationName, intervalSeconds, channelId: channel.id, dueAt: computeDueAt(intervalSeconds) });
  logger.info(`Intégration '${integrationName}' démarrée (guilde ${guildId}, ${intervalSeconds}s).`);
  return { ok: true };
}

export function startReminderTask(guildId, name, intervalSeconds, channel, payload) {
  const key = buildKey(guildId, "reminder", name);

  // Si une tâche existe déjà (ex: restaurée au démarrage), on la remplace
  // entièrement pour repartir sur un dueAt frais (évite qu'un vrai bump
  // soit ignoré parce qu'un ancien timer tournait déjà).
  const existing = activeTasks.get(key);
  if (existing) {
    existing.clear();
    activeTasks.delete(key);
  }

  const handle = scheduleRecurring(
    intervalSeconds,
    intervalSeconds * 1000,
    () => channel.send(payload),
    () => saveTask(key, { guildId, kind: "reminder", name, intervalSeconds, channelId: channel.id, payload, dueAt: computeDueAt(intervalSeconds) })
  );

  activeTasks.set(key, handle);
  saveTask(key, { guildId, kind: "reminder", name, intervalSeconds, channelId: channel.id, payload, dueAt: computeDueAt(intervalSeconds) });
  logger.info(`Rappel '${name}' ${existing ? "réinitialisé" : "démarré"} (guilde ${guildId}, ${intervalSeconds}s, salon #${channel.name}).`);
  return { ok: true, reset: !!existing };
}

export function stopTask(guildId, kind, name) {
  const key = buildKey(guildId, kind, name);
  const handle = activeTasks.get(key);
  if (!handle) return { ok: false, reason: "not_running" };
  handle.clear();
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
      const initialDelayMs = computeInitialDelayMs(task.intervalSeconds, task.dueAt);

      if (task.kind === "internal") {
        const taskFn = taskRegistry[task.name];
        const handle = scheduleRecurring(
          task.intervalSeconds,
          initialDelayMs,
          taskFn,
          () => saveTask(key, { ...task, dueAt: computeDueAt(task.intervalSeconds) })
        );
        activeTasks.set(key, handle);
        restored++;
      } else if (task.kind === "integration") {
        const channel = await client.channels.fetch(task.channelId);
        const handle = scheduleRecurring(
          task.intervalSeconds,
          initialDelayMs,
          () => runIntegration(task.name, channel),
          () => saveTask(key, { ...task, dueAt: computeDueAt(task.intervalSeconds) })
        );
        activeTasks.set(key, handle);
        restored++;
      } else if (task.kind === "reminder") {
        const channel = await client.channels.fetch(task.channelId);
        const handle = scheduleRecurring(
          task.intervalSeconds,
          initialDelayMs,
          () => channel.send(task.payload),
          () => saveTask(key, { ...task, dueAt: computeDueAt(task.intervalSeconds) })
        );
        activeTasks.set(key, handle);
        restored++;
      }

      logger.info(`Tâche '${key}' restaurée, prochaine exécution dans ${Math.round(initialDelayMs / 1000)}s.`);
    } catch (err) {
      logger.error(`Impossible de restaurer la tâche '${key}': ${err.message}. Suppression.`);
      removeTask(key);
    }
  }

  logger.info(`${restored} tâche(s) restaurée(s) après redémarrage.`);
}

export function stopAllTasks() {
  for (const handle of activeTasks.values()) handle.clear();
  activeTasks.clear();
}
