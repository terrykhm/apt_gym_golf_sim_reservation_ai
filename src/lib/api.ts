import type { OrderedSlotsByDate, ResidentId } from "../types";

/**
 * Base URL for the preferences API (no trailing slash).
 * Leave unset to use same-origin `/api/...` (Vite dev proxy → server).
 */
function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE;
  if (raw === undefined || raw === "") return "";
  return raw.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${p}` : p;
}

export async function fetchPreferences(
  residentId: ResidentId
): Promise<{ orderedSlotIdsByDate: OrderedSlotsByDate; updatedAt: string } | null> {
  const res = await fetch(
    apiUrl(`/api/preferences/${encodeURIComponent(residentId)}`)
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /api/preferences failed: ${res.status}`);
  }
  return res.json() as Promise<{
    orderedSlotIdsByDate: OrderedSlotsByDate;
    updatedAt: string;
  }>;
}

export async function putPreferences(
  residentId: ResidentId,
  orderedSlotIdsByDate: OrderedSlotsByDate
): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/preferences/${encodeURIComponent(residentId)}`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedSlotIdsByDate }),
    }
  );
  if (!res.ok) {
    throw new Error(`PUT /api/preferences failed: ${res.status}`);
  }
}
