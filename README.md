# Golf simulator booking (mockup)

Personal UI: pick a resident, select 1-hour slots over the next 7 bookable days (from tomorrow), and rank preferences **per day**. The UI caches choices in the browser and syncs to a small **Node API** when you save, switch resident, or clear.

## Frontend

```bash
npm install
npm run dev
```

Vite proxies `/api` and `/health` to `http://127.0.0.1:8787` so the app can call the API without CORS issues during development.

## Backend (persistence API)

```bash
cd server && npm install
npm run dev
```

Or from the repo root: `npm run dev:server`

**Test the scheduled Retell call once (no cron wait):** from repo root `npm run schedule:once`, or `cd server && npm run schedule:once`. Loads `server/.env.local`, reads the same SQLite DB as the API, and runs `runScheduledGymOutboundCalls()` (logs to the terminal; requires Retell env vars unless you only want to see “skip” messages).

- **Port:** `8787` (override with `PORT`)
- **Database:** `server/data/preferences.sqlite` (SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3); WAL mode enabled)
- **Data dir:** override with `DATA_DIR` (absolute or relative path)
- **DB path:** override with `DATABASE_PATH` (full path to the `.sqlite` file)

**Schema:** table `resident_preferences` — one row per resident: **`resident_id`** (primary key), **`ordered_slot_ids_by_date`** (JSON text: map of `YYYY-MM-DD` → ordered `TimeSlotId` strings), **`updated_at`**. Slots are not stored as separate rows (no per-slot primary key).

If an older DB still has the normalized **`preference_slots`** table, it is folded back into this shape on startup and **`preference_slots`** is dropped. Legacy **`preferences.json`** is imported when the table is empty.

`better-sqlite3` ships a native addon: on Raspberry Pi or minimal Linux images, install build tools before `npm install` (e.g. `build-essential`, `python3`). Prebuilt binaries exist for common platforms when possible.

### Environment

| Variable         | Default                    | Purpose                                      |
| ---------------- | -------------------------- | -------------------------------------------- |
| `PORT`           | `8787`                     | HTTP listen port                             |
| `CORS_ORIGIN`    | `http://localhost:5173`  | Allowed browser origin (`*` for any)         |
| `DATA_DIR`       | `server/data`            | Directory for the default SQLite file        |
| `DATABASE_PATH`  | `{DATA_DIR}/preferences.sqlite` | SQLite database file path             |

### API

- `GET /health` — liveness
- `GET /api/preferences/:residentId` — load `{ orderedSlotIdsByDate, updatedAt }` or `404`
- `PUT /api/preferences/:residentId` — body `{ orderedSlotIdsByDate }`
- `DELETE /api/preferences/:residentId` — remove stored prefs for that resident

### Retell: scheduled outbound call ([Create Phone Call](https://docs.retellai.com/api-references/create-phone-call))

On server start, a **cron** runs (unless `SCHEDULE_GYM_CALLS=false`):

- **Mon–Fri 6:00** and **Sat–Sun 8:30** in `SCHEDULE_TZ` (default `America/New_York`) — **30 minutes after** gym open on weekdays (5:30 AM) and weekends (8:00 AM).

For each resident in **`RETELL_SCHEDULE_RESIDENT_IDS`** (default `terry,bryan`) that has **saved slot preferences**, the server calls **`POST https://api.retellai.com/v2/create-phone-call`** with:

- `from_number` — **`RETELL_FROM_NUMBER`** (E.164, your Retell-owned number)
- `to_number` — **`RETELL_TO_NUMBER`** or **`GYM_FRONT_DESK_PHONE`** (E.164; placeholders like `123-456-7890` are normalized to `+11234567890` when possible)
- `retell_llm_dynamic_variables` — `preferred_time`, `other_preferences` (same as your agent prompt)
- `metadata` — `resident_id`, `source`, `scheduled_at`
- `override_agent_id` — optional **`RETELL_OVERRIDE_AGENT_ID`**

Also set **`RETELL_API_KEY`** in **`server/.env.local`** (gitignored).

| Variable | Purpose |
| -------- | ------- |
| `RETELL_API_KEY` | Bearer token for Retell |
| `RETELL_FROM_NUMBER` | Your Retell / imported caller ID (E.164) |
| `RETELL_TO_NUMBER` or `GYM_FRONT_DESK_PHONE` | Front desk / destination (E.164) |
| `RETELL_OVERRIDE_AGENT_ID` | Optional per-call agent override |
| `RETELL_SCHEDULE_RESIDENT_IDS` | Comma list, e.g. `terry,bryan` |
| `SCHEDULE_TZ` | IANA timezone for cron |
| `SCHEDULE_GYM_CALLS` | Set `false` to disable cron |

**Agent prompt variables** (define in Retell with the same names): `{{preferred_time}}`, `{{other_preferences}}`.

### Production / Pi

1. Build the UI: `npm run build` and serve `dist/` with any static host.
2. Build the server: `npm run build:server`, then `cd server && NODE_ENV=production node dist/index.js`.
3. Set `CORS_ORIGIN` to your UI origin (or `*` on a trusted LAN only).
4. If the UI is on another host/port, set `VITE_API_BASE` at **build** time to the API base URL (e.g. `http://192.168.1.50:8787`).

There is no authentication; bind to localhost or protect the port on your network.

## Scripts

- `npm run dev` — Vite dev server (use with `npm run dev:server` in another terminal)
- `npm run dev:server` — preferences API with hot reload (`tsx watch`)
- `npm run build` — production frontend build
- `npm run build:server` — compile server to `server/dist`
- `npm run lint` — ESLint

## Stack

React, Vite, TypeScript, Tailwind CSS; Express + SQLite (`better-sqlite3`) + `node-cron` + Retell Create Phone Call on the server.
