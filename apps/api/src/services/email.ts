/**
 * Email service — sends transactional emails via MailChannels API
 * (Cloudflare-Workers-native, no SDK needed, no Node dependencies).
 *
 * MailChannels migration notes:
 *   - Replaces the Resend SDK. Same env var (EMAIL_API_KEY) is reused —
 *     just swap the secret value via `wrangler secret put EMAIL_API_KEY`.
 *   - Production deliverability requires DKIM TXT records and an SPF
 *     record on ptowl.com. See docs/EMAIL.md.
 *   - As of 2024, MailChannels requires a paid plan + API key. Free
 *     "Workers can send for free" pitch is no longer accurate.
 *
 * Gracefully degrades: if EMAIL_API_KEY is missing, logs a warning
 * and returns without throwing. Registration should never fail
 * because email delivery failed.
 */

const MAILCHANNELS_URL = 'https://api.mailchannels.net/tx/v1/send';
const FROM_NAME = 'PTOWL';
const FROM_EMAIL = 'noreply@ptowl.com';

/**
 * Low-level email sender. Posts to MailChannels' transactional API.
 * Returns true on success, false on failure (never throws).
 */
async function sendEmail(
  apiKey: string,
  params: { to: string; subject: string; html: string },
): Promise<boolean> {
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set — skipping email');
    return false;
  }

  try {
    const response = await fetch(MAILCHANNELS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: params.subject,
        content: [{ type: 'text/html', value: params.html }],
      }),
    });

    if (!response.ok) {
      console.error('Email send failed:', response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send error:', err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}

/**
 * Notify admin that a new user registered and needs approval.
 * Uses the user's championship team alias for PII protection.
 */
export async function notifyAdminNewRegistration(
  adminEmail: string,
  apiKey: string,
  teamAlias: string,
  approvalUrl: string,
): Promise<void> {
  const subject = `[PTOWL] New signup: ${teamAlias}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #1B5E20; margin-bottom: 1rem;">New User Registration</h2>
      <p style="color: #333; font-size: 1rem; margin-bottom: 1.5rem;">
        <strong>${escapeHtml(teamAlias)}</strong> wants to join PtOwl.
      </p>
      <a href="${escapeHtml(approvalUrl)}"
         style="display: inline-block; padding: 1rem 2rem; background: #4CAF50; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 1.1rem;">
        Approve ${escapeHtml(teamAlias)}
      </a>
      <p style="color: #999; font-size: 0.8rem; margin-top: 2rem;">
        Tap the button above to approve this user instantly.
        <br/>Or open the <a href="https://ptowl.com/admin" style="color: #4CAF50;">Admin Panel</a> to review all users.
      </p>
      <p style="color: #999; font-size: 0.75rem; margin-top: 1rem;">
        Sent by PTOWL &middot; <a href="https://ptowl.com" style="color: #999;">ptowl.com</a>
      </p>
    </div>
  `;

  await sendEmail(apiKey, { to: adminEmail, subject, html });
}

/**
 * Notify a user that their account has been approved.
 */
export async function notifyUserApproved(
  apiKey: string,
  userEmail: string,
  displayName: string,
): Promise<void> {
  const name = displayName || 'there';
  const subject = 'Your PTOWL account has been approved!';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #1B5E20; margin-bottom: 1rem;">You're In! 🦉</h2>
      <p style="color: #333; line-height: 1.6;">
        Hey ${escapeHtml(name)}, your PTOWL account has been approved.
        You can now log in and start generating schedules.
      </p>
      <a href="https://ptowl.com/login"
         style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #4CAF50; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Log In Now
      </a>
      <p style="color: #999; font-size: 0.8rem; margin-top: 2rem;">
        Sent by PTOWL &middot; <a href="https://ptowl.com" style="color: #999;">ptowl.com</a>
      </p>
    </div>
  `;

  await sendEmail(apiKey, { to: userEmail, subject, html });
}

/**
 * Notify a user that their account has been denied.
 */
export async function notifyUserDenied(apiKey: string, userEmail: string): Promise<void> {
  const subject = 'PTOWL account update';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #333; margin-bottom: 1rem;">Account Update</h2>
      <p style="color: #333; line-height: 1.6;">
        Your PTOWL account request was not approved at this time.
        If you believe this is an error, please contact us at
        <a href="mailto:help@ptowl.com" style="color: #4CAF50;">help@ptowl.com</a>.
      </p>
      <p style="color: #999; font-size: 0.8rem; margin-top: 2rem;">
        Sent by PTOWL &middot; <a href="https://ptowl.com" style="color: #999;">ptowl.com</a>
      </p>
    </div>
  `;

  await sendEmail(apiKey, { to: userEmail, subject, html });
}

/**
 * Send admin verification code via email.
 */
export async function sendAdminVerificationCode(
  apiKey: string,
  adminEmail: string,
  code: string,
): Promise<void> {
  const subject = '[PTOWL] Your admin verification code';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #1B5E20; margin-bottom: 1rem;">Admin Verification Code</h2>
      <p style="color: #333; line-height: 1.6;">
        Use the code below to access the PTOWL admin panel.
        This code expires in <strong>5 minutes</strong>.
      </p>
      <div style="margin: 1.5rem 0; padding: 1.25rem; background: #F5F5F5; border-radius: 8px; text-align: center;">
        <span style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 2rem; font-weight: 700; letter-spacing: 0.5rem; color: #1B5E20;">
          ${escapeHtml(code)}
        </span>
      </div>
      <p style="color: #666; font-size: 0.85rem; line-height: 1.5;">
        If you didn't request this code, someone may be trying to access the admin panel.
        Change your password immediately.
      </p>
      <p style="color: #999; font-size: 0.8rem; margin-top: 2rem;">
        Sent by PTOWL &middot; <a href="https://ptowl.com" style="color: #999;">ptowl.com</a>
      </p>
    </div>
  `;

  await sendEmail(apiKey, { to: adminEmail, subject, html });
}

/**
 * Send a patient code via email so the patient can link their schedule.
 * Includes both the code and a direct link.
 */
export async function sendPatientCode(
  apiKey: string,
  patientEmail: string,
  code: string,
  clinicName: string,
): Promise<boolean> {
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set — skipping patient code email');
    return false;
  }

  const linkCode = code.replace('PTOWL-', '');
  const subject = `Your PT schedule is ready — ${clinicName || 'Patient Owl'}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #1B5E20; margin-bottom: 1rem;">Your Schedule is Ready! 🦉</h2>
      <p style="color: #333; line-height: 1.6;">
        ${escapeHtml(clinicName || 'Your PT clinic')} has shared a schedule with you on Patient Owl.
      </p>
      <p style="color: #333; line-height: 1.6;">
        <strong>Option 1:</strong> Click the button below to view your schedule instantly:
      </p>
      <a href="https://ptowl.com/link/${escapeHtml(linkCode)}"
         style="display: inline-block; margin: 1rem 0; padding: 0.875rem 2rem; background: #4CAF50; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 1.05rem;">
        View My Schedule
      </a>
      <p style="color: #333; line-height: 1.6;">
        <strong>Option 2:</strong> Go to <a href="https://ptowl.com" style="color: #4CAF50;">ptowl.com</a>,
        sign up as a patient, and enter this code:
      </p>
      <div style="margin: 1rem 0; padding: 1rem; background: #F5F5F5; border-radius: 8px; text-align: center;">
        <span style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 1.75rem; font-weight: 700; letter-spacing: 0.15rem; color: #1B5E20;">
          ${escapeHtml(code)}
        </span>
      </div>
      <p style="color: #999; font-size: 0.8rem; margin-top: 2rem;">
        This code expires in 7 days.
        <br/>Sent by Patient Owl &middot; <a href="https://ptowl.com" style="color: #999;">ptowl.com</a>
      </p>
    </div>
  `;

  return sendEmail(apiKey, { to: patientEmail, subject, html });
}

/** Basic HTML entity escaping to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
