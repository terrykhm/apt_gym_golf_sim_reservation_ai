const RETELL_API_BASE = "https://api.retellai.com";

/** Normalize to E.164-ish for Retell (digits + leading +). */
export function normalizePhoneToE164(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("+")) {
    const rest = t.slice(1).replace(/\D/g, "");
    return rest ? `+${rest}` : "";
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return "";
}

export interface CreatePhoneCallBody {
  from_number: string;
  to_number: string;
  retell_llm_dynamic_variables?: Record<string, string>;
  metadata?: Record<string, unknown>;
  override_agent_id?: string;
}

/**
 * POST /v2/create-phone-call
 * @see https://docs.retellai.com/api-references/create-phone-call
 */
export async function createRetellPhoneCall(
  apiKey: string,
  body: CreatePhoneCallBody
): Promise<unknown> {
  const res = await fetch(`${RETELL_API_BASE}/v2/create-phone-call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Retell create-phone-call ${res.status}: ${text.slice(0, 800)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
