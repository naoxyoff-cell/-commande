import fs from "fs";
import path from "path";

const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

const levelColor = { INFO: colors.cyan, WARN: colors.yellow, ERROR: colors.red };

function write(level, message) {
  const timestamp = new Date().toLocaleTimeString("fr-FR", { hour12: false });
  const color = levelColor[level] || colors.reset;
  const consoleLine = `${colors.dim}${timestamp}${colors.reset} ${color}${level.padEnd(5)}${colors.reset} ${message}`;
  const fileLine = `[${new Date().toISOString()}] [${level}] ${message}`;

  console.log(consoleLine);
  fs.appendFileSync(path.join(logDir, "bot.log"), fileLine + "\n");
}

export const logger = {
  info: (msg) => write("INFO", msg),
  warn: (msg) => write("WARN", msg),
  error: (msg) => write("ERROR", msg),
};

export function banner(client) {
  const line = "─".repeat(42);
  console.log(`\n${colors.bold}${colors.green}${line}${colors.reset}`);
  console.log(`${colors.bold}  ✅  ${client.user.tag}${colors.reset}`);
  console.log(`  ${colors.dim}Serveurs :${colors.reset} ${client.guilds.cache.size}`);
  console.log(`  ${colors.dim}Statut   :${colors.reset} ${colors.green}en ligne${colors.reset}`);
  console.log(`${colors.bold}${colors.green}${line}${colors.reset}\n`);
}
