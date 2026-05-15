import type { Env } from '../types/env.js';
import { signJWT } from '../crypto/jwt.js';

/**
 * Outbound-email service. Centralizes the five-template policy locked
 * in docs/AUTH-LIFECYCLE.md §5:
 *
 *   1. patient_welcome        — once, on patient self-signup
 *   2. patient_cancellation   — when clinic cancels an appointment
 *   3. founder_approval_pending — to founder on new clinic signup
 *   4. clinic_approved        — to clinic when founder approves
 *   5. clinic_denied          — to clinic when founder denies
 *
 * Reminders are NOT routed through here — they have their own opt-in
 * flow in services/reminders.ts. This service is for the auth/admin
 * surface only.
 *
 * Every send checks env.ENVIRONMENT. Dev / staging log to console and
 * return { skipped: true } so test runs and preview deploys don't
 * spray real emails. Production calls MailChannels.
 *
 * All primitives are off-the-shelf:
 *   • MailChannels HTTP API     — 🟢 (same endpoint reminders.ts uses)
 *   • jose JWT signing          — 🟢 (already in deps)
 *   • TextEncoder + crypto      — 🟡 stdlib
 */

const SENDER = { email: 'noreply@ptowl.com', name: 'PTOwl' };

type SendResult = { sent: true; upstream_status: number } | { skipped: true } | { failed: string };

async function sendViaMailChannels(
  env: Env,
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  if (env.ENVIRONMENT !== 'production') {
    console.log(`[notifications:skip-dev] would send '${subject}' to ${to}`);
    return { skipped: true };
  }

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.EMAIL_API_KEY },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: SENDER,
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        `notifications: MailChannels ${response.status} for '${subject}':`,
        body.slice(0, 200),
      );
      return { failed: `mailchannels_${response.status}` };
    }
    return { sent: true, upstream_status: response.status };
  } catch (err) {
    console.error(
      'notifications: network failure:',
      err instanceof Error ? err.message : 'unknown',
    );
    return { failed: 'network' };
  }
}

/**
 * Email 1 — patient welcome. Sent once when a patient signs up for
 * their own PTOwl account (cf. docs/AUTH-LIFECYCLE.md §7, patient
 * portal Stage D). Minimal-by-policy: tells the patient we'll only
 * email about cancellations.
 */
export async function sendPatientWelcome(env: Env, patientEmail: string): Promise<SendResult> {
  return sendViaMailChannels(
    env,
    patientEmail,
    '🦉 Welcome to PTOwl',
    `We'll only email you about cancellations.\nNothing else.\n\n— PTOwl team\n`,
  );
}

/**
 * Email 2 — appointment cancellation. Sent when a clinic cancels a
 * future appointment. clinicReason is optional; if empty, the
 * "Reason:" line is omitted.
 */
export async function sendPatientCancellation(
  env: Env,
  patientEmail: string,
  args: {
    clinicName: string;
    clinicPhone: string;
    dayOfWeek: string;
    date: string;
    time: string;
    reason?: string;
    scheduleToken: string;
  },
): Promise<SendResult> {
  const lines: string[] = [
    `${args.clinicName} cancelled this appointment:`,
    '',
    `  ${args.dayOfWeek} ${args.date}, ${args.time}`,
    '',
  ];
  if (args.reason && args.reason.trim()) {
    lines.push(`Reason: ${args.reason.trim()}`, '');
  }
  lines.push(
    'For questions, contact:',
    `  ${args.clinicName}`,
    `  ${args.clinicPhone}`,
    '',
    'View your updated schedule:',
    `  https://ptowl.com/p/${args.scheduleToken}`,
    '',
    '— PTOwl team',
    '',
  );
  return sendViaMailChannels(
    env,
    patientEmail,
    `Appointment cancelled — ${args.clinicName}`,
    lines.join('\n'),
  );
}

/**
 * Email 3 — founder approval-needed heads-up. Sent on every new
 * clinic signup. Contains two magic links (approve / deny) signed
 * with JWT_SECRET; each works once and expires in 7 days.
 *
 * Heads-up only until the provision-flip ships — once status defaults
 * to 'pending' the founder's click is what unblocks the new clinic.
 */
export async function sendFounderApprovalPending(
  env: Env,
  args: { newUserId: string; clinicEmail: string; clinicName: string },
): Promise<SendResult> {
  const expiresIn = 7 * 24 * 60 * 60; // 7 days
  const approveToken = await signJWT(
    { sub: args.newUserId, email: args.clinicEmail, role: 'admin_decide', tier: 'free' },
    env.JWT_SECRET,
    expiresIn,
  );
  const denyToken = await signJWT(
    { sub: args.newUserId, email: args.clinicEmail, role: 'admin_decide', tier: 'free' },
    env.JWT_SECRET,
    expiresIn,
  );
  const approveLink = `https://ptowl.com/admin/decide?token=${encodeURIComponent(approveToken)}&decision=approve`;
  const denyLink = `https://ptowl.com/admin/decide?token=${encodeURIComponent(denyToken)}&decision=deny`;

  const lines = [
    'A new clinic just signed up for PTOwl:',
    '',
    `  Email:        ${args.clinicEmail}`,
    `  Clinic name:  ${args.clinicName || '(not set)'}`,
    `  Signed up:    ${new Date().toISOString()}`,
    '',
    'Approve or deny with one click. Each link works once and',
    'expires in 7 days.',
    '',
    `  [Approve]  ${approveLink}`,
    `  [Deny]     ${denyLink}`,
    '',
    '— PTOwl team',
    '',
  ];

  return sendViaMailChannels(
    env,
    env.ADMIN_EMAIL,
    `🦉 New PTOwl signup awaiting approval (${args.clinicEmail})`,
    lines.join('\n'),
  );
}

/**
 * Email 4 — clinic approved. Sent to the clinic when the founder
 * clicks the approve magic link.
 */
export async function sendClinicApproved(env: Env, clinicEmail: string): Promise<SendResult> {
  return sendViaMailChannels(
    env,
    clinicEmail,
    'Your PTOwl account is approved',
    `You're in. Sign in at https://ptowl.com/login.\n\n— PTOwl team\n`,
  );
}

/**
 * Email 5 — clinic denied. Sent to the clinic when the founder
 * clicks the deny magic link. Gentle copy on purpose.
 */
export async function sendClinicDenied(env: Env, clinicEmail: string): Promise<SendResult> {
  return sendViaMailChannels(
    env,
    clinicEmail,
    'PTOwl account update',
    `We can't approve this account at the moment.\nReply if you think this is a mistake.\n\n— PTOwl team\n`,
  );
}
