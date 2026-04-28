import type { Env } from '../types/env.js';
import { decryptEmail, hashEmail } from '../crypto/email-cipher.js';
import { signUnsubscribeToken } from '../crypto/unsubscribe-token.js';
import { clinicLocalToUTC } from './timezone.js';

/**
 * Email-reminder service. Two pieces:
 *
 *   1. findAndEnqueueDueReminders(env)  — called from the 15-min cron
 *      Scans for appointments due in the next 24h-window or 1h-window
 *      and enqueues a Queue message per eligible patient. Marks
 *      reminder_*_sent_at to prevent re-enqueue.
 *
 *   2. processReminderMessage(env, msg) — called from the queue handler
 *      Resolves subscription preferences (unsubscribed / digest mode)
 *      and sends via MailChannels if appropriate.
 *
 * Notes:
 *   - Cron has 15-minute granularity, so the lookup window is centered
 *     on the target offset ±7.5 minutes. Idempotency markers prevent
 *     double-send if a single appointment crosses two cron windows.
 *   - Time math is done in UTC: appointment_date + appointment_time are
 *     stored as floating local strings; we compare them as UTC. Clinics
 *     in non-UTC timezones get reminders skewed by their UTC offset
 *     (TODO: store clinic timezone on profile).
 *   - Digest mode (email_subscriptions.digest_mode = 1) ack's the
 *     individual message without sending. A follow-up daily cron
 *     aggregates and dispatches the digest. Not yet implemented.
 */

export type ReminderType = '24h' | '1h';

export interface ReminderMessage {
  appointmentId: string;
  scheduleId: string;
  type: ReminderType;
  emailHash: string; // SHA-256 hex of normalized email
  email: string; // plaintext, kept only inside the queue payload
  patientLabel: string; // alias, no PII
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  clinicName: string;
}

interface DueRow {
  appointment_id: string;
  schedule_id: string;
  appointment_date: string;
  appointment_time: string;
  patient_initials: string;
  patient_alias: string;
  patient_email_encrypted: string | null;
  clinic_name: string | null;
  clinic_timezone: string | null;
}

/**
 * Cron entry point. Scans for due 24h + 1h reminders and enqueues each
 * one. Uses a 15-minute window centered on the target offset.
 */
export async function findAndEnqueueDueReminders(env: Env): Promise<{ enqueued: number }> {
  if (!env.EMAIL_QUEUE) return { enqueued: 0 };

  let enqueued = 0;
  for (const type of ['24h', '1h'] as const) {
    enqueued += await scanAndEnqueueOne(env, type);
  }
  return { enqueued };
}

async function scanAndEnqueueOne(env: Env, type: ReminderType): Promise<number> {
  const offsetMs = (type === '24h' ? 24 : 1) * 60 * 60 * 1000;
  // 15-min half-window = 30-min full window. Cron runs every 15 min, so a
  // 30-min tolerance guarantees every appointment falls in at least one
  // tick's window even if the scheduler runs up to ~7 min late. Idempotency
  // markers + WHERE-clause guards prevent double-send.
  const halfWindowMs = 15 * 60 * 1000;
  const center = Date.now() + offsetMs;

  // Widen the SQL window by ±14h to cover the worst-case clinic UTC
  // offset. We then re-check each candidate with the clinic's actual
  // timezone in JS — see clinicLocalToUTC. Without this widening, a
  // clinic in Pacific time misses its window when the server is UTC.
  const widenMs = 14 * 60 * 60 * 1000;
  const widenedStart = new Date(center - halfWindowMs - widenMs).toISOString();
  const widenedEnd = new Date(center + halfWindowMs + widenMs).toISOString();

  const sentColumn = type === '24h' ? 'reminder_24h_sent_at' : 'reminder_1h_sent_at';

  // Patient email comes from the schedule's encrypted column. The
  // legacy `linked_patient_email` lookup against patient_schedules was
  // dropped with the patient portal removal.
  const sql = `
    SELECT
      a.id AS appointment_id,
      a.schedule_id,
      a.appointment_date,
      a.appointment_time,
      s.patient_initials,
      s.patient_alias,
      s.patient_email_encrypted,
      p.clinic_name,
      p.timezone AS clinic_timezone
    FROM appointments a
    JOIN schedules s ON s.id = a.schedule_id
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.reminders_enabled = 1
      AND a.${sentColumn} IS NULL
      AND datetime(a.appointment_date || 'T' || a.appointment_time) BETWEEN ? AND ?
  `;

  const rows = await env.DB.prepare(sql).bind(widenedStart, widenedEnd).all<DueRow>();
  if (!rows.results.length) return 0;

  let count = 0;
  for (const row of rows.results) {
    // Tighten window using clinic's actual timezone. Without an inferred
    // timezone we fall back to UTC math (the SQL widening still allows
    // the row through; this check just makes it consistent).
    const tz = row.clinic_timezone || 'UTC';
    const apptUtc = clinicLocalToUTC(row.appointment_date, row.appointment_time, tz);
    const targetUtc = center;
    const drift = Math.abs(apptUtc.getTime() - targetUtc);
    if (drift > halfWindowMs) continue;

    // Decrypt the clinic-entered patient email.
    let email: string | null = null;
    if (row.patient_email_encrypted) {
      try {
        email = await decryptEmail(row.patient_email_encrypted, env.EMAIL_ENCRYPTION_KEY);
      } catch {
        email = null;
      }
    }

    if (!email) {
      // No email available — skip but DO mark sent to prevent re-scan.
      await env.DB.prepare(`UPDATE appointments SET ${sentColumn} = datetime('now') WHERE id = ?`)
        .bind(row.appointment_id)
        .run();
      continue;
    }

    const emailHash = await hashEmail(email);

    // Atomic claim: UPDATE ... WHERE column IS NULL returns rowcount 0
    // if a concurrent cron tick already claimed this appointment.
    // We check meta.changes before enqueueing so we never double-send.
    const claim = await env.DB.prepare(
      `UPDATE appointments SET ${sentColumn} = datetime('now') WHERE id = ? AND ${sentColumn} IS NULL`,
    )
      .bind(row.appointment_id)
      .run();

    if (!claim.meta.changes) {
      // Another cron tick won the claim; skip.
      continue;
    }

    const message: ReminderMessage = {
      appointmentId: row.appointment_id,
      scheduleId: row.schedule_id,
      type,
      emailHash,
      email,
      patientLabel: row.patient_alias || row.patient_initials,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      clinicName: row.clinic_name || 'PT Appointment',
    };

    await env.EMAIL_QUEUE!.send(message);
    count++;
  }
  return count;
}

/**
 * Queue consumer entry point — process one reminder message.
 * Returns true on success, false if the consumer should retry.
 */
export async function processReminderMessage(env: Env, msg: ReminderMessage): Promise<boolean> {
  // Subscription gate: respect unsubscribed and digest_mode flags.
  const sub = await env.DB.prepare(
    'SELECT unsubscribed, digest_mode FROM email_subscriptions WHERE email_hash = ?',
  )
    .bind(msg.emailHash)
    .first<{ unsubscribed: number; digest_mode: number }>();

  if (sub?.unsubscribed === 1) return true; // ack — patient opted out
  if (sub?.digest_mode === 1) return true; // ack — daily digest cron will batch (TODO)

  const unsubscribeToken = await signUnsubscribeToken(msg.emailHash, env.JWT_SECRET);
  const unsubscribeUrl = `${env.FRONTEND_URL}/api/v1/reminders/unsubscribe/${unsubscribeToken}`;

  const ok = await sendReminderEmail(env, msg, unsubscribeUrl);
  return ok;
}

async function sendReminderEmail(
  env: Env,
  msg: ReminderMessage,
  unsubscribeUrl: string,
): Promise<boolean> {
  if (!env.EMAIL_API_KEY) return true; // no key = silently skip in dev

  const when = msg.type === '24h' ? 'tomorrow' : 'in 1 hour';
  const subject = `Reminder — your PT appointment ${when} (${formatDate(msg.appointmentDate)})`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #1B5E20; margin-bottom: 1rem;">Appointment Reminder</h2>
      <p style="color: #333; line-height: 1.6;">
        Hi ${escapeHtml(msg.patientLabel)} — this is a reminder of your physical therapy appointment ${when}.
      </p>
      <div style="margin: 1rem 0; padding: 1rem; background: #F5F5F5; border-radius: 8px;">
        <strong>${escapeHtml(formatDate(msg.appointmentDate))} at ${escapeHtml(formatTime(msg.appointmentTime))}</strong><br/>
        ${escapeHtml(msg.clinicName)}
      </div>
      <p style="color: #666; font-size: 0.85rem;">
        Need to reschedule? Contact your clinic directly.
      </p>
      <p style="color: #999; font-size: 0.75rem; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
        You're receiving this because your clinic added you to a recurring PT schedule.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #999;">Unsubscribe from all PTOWL reminders</a>.
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.EMAIL_API_KEY },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.email }] }],
        from: { email: 'noreply@ptowl.com', name: 'PTOWL' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!response.ok) {
      console.error('Reminder send failed:', response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Reminder send error:', err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}

function formatDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
