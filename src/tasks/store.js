import { createClient } from "@libsql/client";
import { logger } from "../utils/logger.js";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initPromise = null;
function ensureInit() {
  if (!initPromise) {
    initPromise = client.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
  }
  return initPromise;
}

export async function saveTask(key, taskData) {
  try {
    await ensureInit();
    await client.execute({
      sql: "INSERT INTO tasks (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data",
      args: [key, JSON.stringify(taskData)],
    });
  } catch (err) {
    logger.error(`Impossible d'enregistrer la tâche '${key}' dans Turso: ${err.message}`);
  }
}

export async function removeTask(key) {
  try {
    await ensureInit();
    await client.execute({ sql: "DELETE FROM tasks WHERE key = ?", args: [key] });
  } catch (err) {
    logger.error(`Impossible de supprimer la tâche '${key}' dans Turso: ${err.message}`);
  }
}

export async function loadAllTasks() {
  try {
    await ensureInit();
    const result = await client.execute("SELECT key, data FROM tasks");
    const tasks = {};
    for (const row of result.rows) {
      tasks[row.key] = JSON.parse(row.data);
    }
    return tasks;
  } catch (err) {
    logger.error(`Impossible de charger les tâches depuis Turso: ${err.message}`);
    return {};
  }
}
