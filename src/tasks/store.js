import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

const storePath = path.resolve("src/data/tasks.json");

function readStore() {
  if (!fs.existsSync(storePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(storePath, "utf-8"));
  } catch (err) {
    logger.error(`Impossible de lire le fichier de tâches: ${err.message}`);
    return {};
  }
}

function writeStore(data) {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error(`Impossible d'écrire le fichier de tâches: ${err.message}`);
  }
}

export function saveTask(key, taskData) {
  const data = readStore();
  data[key] = taskData;
  writeStore(data);
}

export function removeTask(key) {
  const data = readStore();
  delete data[key];
  writeStore(data);
}

export function loadAllTasks() {
  return readStore();
}
