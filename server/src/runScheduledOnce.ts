/**
 * One-shot run of the same logic as the daily cron (Create Phone Call per resident).
 * Load env before any module that reads process.env at import time (e.g. store).
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", ".env.local") });

const { runScheduledGymOutboundCalls } = await import("./scheduledGymCalls.js");

await runScheduledGymOutboundCalls();
