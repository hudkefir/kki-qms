import { appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "..", "logs");
mkdirSync(LOG_DIR, { recursive: true });

function pad(n) { return String(n).padStart(2, "0"); }

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logFile() {
  const d = new Date();
  return join(LOG_DIR, `qms-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.log`);
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  const orig = res.end;
  res.end = function (...args) {
    const ms = Date.now() - start;
    const line = `[${stamp()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ${req.ip || "-"}\n`;
    try { appendFileSync(logFile(), line); } catch {}
    return orig.apply(this, args);
  };
  next();
}
