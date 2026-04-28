import type { Env } from '../types/env.js';

/**
 * Cloudflare Workers AI based timezone inference.
 *
 * Given a US-format clinic_address, prompts Llama-3.1-8b for the IANA
 * timezone string. Validates the result against Intl.DateTimeFormat
 * before returning. Used by routes/profile.ts on address change to
 * cache the timezone on profiles.timezone, which the reminder cron
 * then reads to compute correct 24h / 1h send windows.
 *
 * Cost: ~$0.011 per million tokens at 8B; one inference per profile
 * update. Pennies per year for a single clinic.
 *
 * Failure modes:
 *   - AI binding missing: returns null (caller should leave timezone NULL,
 *     falling back to UTC math).
 *   - AI returns garbage: returns null. We validate with
 *     Intl.DateTimeFormat which throws RangeError for unknown tz names.
 *   - AI returns multiple sentences / extra commentary: we strip to the
 *     first whitespace-delimited token, then validate.
 */

const SYSTEM_PROMPT = `You are a timezone classification assistant. Given a postal address, respond with ONLY the IANA timezone identifier for that location and nothing else. Examples:
"123 Main St, Seattle, WA 98101" -> America/Los_Angeles
"500 5th Ave, New York, NY 10018" -> America/New_York
"77 Massachusetts Ave, Cambridge, MA 02139" -> America/New_York
Output the timezone identifier ONLY. No prose, no quotes, no punctuation.`;

export async function inferTimezoneFromAddress(env: Env, address: string): Promise<string | null> {
  if (!env.AI) return null;
  if (!address || address.trim().length < 5) return null;

  try {
    // Llama-3.1-8b-instruct: cheap, fast, plenty of capability for one-token
    // tz extraction. Cast through `unknown` because the workers-types
    // AiModels union typically lags Workers AI's actual catalog.
    const ai = env.AI as unknown as {
      run: (model: string, input: unknown) => Promise<{ response?: string }>;
    };
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: address.trim() },
      ],
      max_tokens: 32,
    });

    const raw = (response.response || '').trim();
    // Pick the first whitespace-delimited token; strip trailing punctuation.
    const candidate = raw.split(/\s+/)[0]?.replace(/[^A-Za-z_/+-]/g, '') || '';
    if (!isValidTimezone(candidate)) return null;
    return candidate;
  } catch (err) {
    console.error('Timezone inference failed:', err instanceof Error ? err.message : 'Unknown');
    return null;
  }
}

/**
 * Validate a string against the host runtime's IANA timezone database.
 * Intl.DateTimeFormat throws RangeError for unknown tz names.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a clinic-local wall-clock date+time (floating, no tz info)
 * into the absolute UTC instant it represents in the given IANA tz.
 *
 * Used by reminder cron: appointment_date 'YYYY-MM-DD' + appointment_time
 * 'HH:MM' is the clinic-local wall clock, e.g. "9:00 AM Eastern".
 * To compute when 24h-before fires in real time, we need the UTC instant.
 *
 * Approach: pretend the date+time is UTC, ask Intl what offset the target
 * tz has at that wall-clock moment, subtract the offset.
 */
export function clinicLocalToUTC(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  const asIfUtc = new Date(Date.UTC(y, m - 1, d, h, min, 0));

  if (!isValidTimezone(tz)) return asIfUtc; // fallback: treat as UTC

  // Compute the offset of `tz` at the asIfUtc wall-clock moment.
  // The trick: format the asIfUtc moment in the target tz and parse the
  // hour fields to derive the offset.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(asIfUtc);
  const got: Record<string, string> = {};
  for (const p of parts) got[p.type] = p.value;

  const tzWall = Date.UTC(
    parseInt(got.year!, 10),
    parseInt(got.month!, 10) - 1,
    parseInt(got.day!, 10),
    parseInt(got.hour!, 10) === 24 ? 0 : parseInt(got.hour!, 10),
    parseInt(got.minute!, 10),
    parseInt(got.second!, 10),
  );

  // offset_minutes = (asIfUtc - tzWall) is the tz's UTC offset at this moment.
  const offsetMinutes = (asIfUtc.getTime() - tzWall) / 60000;

  // The clinic-local wall clock 'date time' actually maps to:
  //   UTC instant = asIfUtc + offset_minutes
  return new Date(asIfUtc.getTime() + offsetMinutes * 60000);
}
