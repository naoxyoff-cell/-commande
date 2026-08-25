import { logger } from "../utils/logger.js";
export const taskRegistry = {
  ping: async () => { logger.info("Tâche 'ping' exécutée : pong."); },
  status: async () => {
    const uptime = process.uptime().toFixed(0);
    logger.info(`Tâche 'status' exécutée : uptime=${uptime}s`);
  },
  backup: async () => { logger.info("Tâche 'backup' exécutée (placeholder)."); },
};
export function isValidTask(name) {
  return Object.prototype.hasOwnProperty.call(taskRegistry, name);
}
export function getTaskNames() { return Object.keys(taskRegistry); }
