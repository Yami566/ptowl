/**
 * Email service — sends transactional emails via Resend API.
 *
 * Requires two secrets (set via `wrangler secret put`):
 *   ADMIN_EMAIL  — destination for admin notifications (e.g. help@ptowl.com)
 *   EMAIL_API_KEY — Resend API key (re_...)
 *
 * Gracefully degrades: if EMAIL_API_KEY is missing, logs a warning
 * and returns without throwing. Registration should never fail
 * because email delivery failed.
 */

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'PTOWL <noreply@ptowl.com>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Low-level email sender via Resend.
 * Returns true on success, false on failure (never throws).
 */
async function sendEmail(apiKey: string, params: SendEmailParams): Promise<boolean> {
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      console.error('Email send failed:', res.status);
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
 * Includes a one-click approval link.
 */
export async function notifyAdminNewRegistration(
  adminEmail: string,
  apiKey: string,
  teamAlias: string,
  approvalUrl: string,
): Promise<void> {
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set — skipping notification');
    return;
  }

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
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set — skipping notification');
    return;
  }

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
export async function notifyUserDenied(
  apiKey: string,
  userEmail: string,
): Promise<void> {
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set — skipping notification');
    return;
  }

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
 * Uses help@ptowl.com as the sender for admin security codes.
 */
export async function sendAdminVerificationCode(
  apiKey: string,
  adminEmail: string,
  code: string,
): Promise<void> {
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set — skipping notification');
    return;
  }

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

  // All outbound emails use noreply@ptowl.com for consistency
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PTOWL <noreply@ptowl.com>',
        to: adminEmail,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error('Email send failed:', res.status);
    }
  } catch (err) {
    console.error('Admin verification email error:', err instanceof Error ? err.message : 'Unknown error');
  }
}

/** Basic HTML entity escaping to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
