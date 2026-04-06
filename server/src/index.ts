import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", ".env.local") });
import { startScheduledGymCalls } from "./scheduledGymCalls.js";
import {
  deletePreferences,
  getPreferences,
  setPreferences,
} from "./store.js";

const orderedSlotIdsByDateSchema = z.record(z.string(), z.array(z.string()));

const putBodySchema = z.object({
  orderedSlotIdsByDate: orderedSlotIdsByDateSchema,
});

const residentIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/i);

const app = express();
const port = Number(process.env.PORT ?? 8787);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
  })
);
app.use(express.json({ limit: "512kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/preferences/:residentId", (req, res) => {
  const parsed = residentIdSchema.safeParse(req.params.residentId);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid resident id" });
    return;
  }
  const row = getPreferences(parsed.data);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    residentId: parsed.data,
    orderedSlotIdsByDate: row.orderedSlotIdsByDate,
    updatedAt: row.updatedAt,
  });
});

app.put("/api/preferences/:residentId", (req, res) => {
  const parsedId = residentIdSchema.safeParse(req.params.residentId);
  if (!parsedId.success) {
    res.status(400).json({ error: "Invalid resident id" });
    return;
  }
  const parsedBody = putBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid body", details: parsedBody.error.flatten() });
    return;
  }
  const updated = setPreferences(
    parsedId.data,
    parsedBody.data.orderedSlotIdsByDate
  );
  res.json({
    residentId: parsedId.data,
    orderedSlotIdsByDate: updated.orderedSlotIdsByDate,
    updatedAt: updated.updatedAt,
  });
});

app.delete("/api/preferences/:residentId", (req, res) => {
  const parsed = residentIdSchema.safeParse(req.params.residentId);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid resident id" });
    return;
  }
  deletePreferences(parsed.data);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Golf sim preferences API listening on http://127.0.0.1:${port}`);
  console.log(`CORS origin: ${corsOrigin}`);
  startScheduledGymCalls();
});
