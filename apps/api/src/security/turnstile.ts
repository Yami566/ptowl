/**
 * Cloudflare Turnstile server-side verification
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes': string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 * Returns true if the token is valid, false otherwise.
 */
export async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp?: string,
  environment?: string,
): Promise<{ success: boolean; errorCodes: string[] }> {
  // C2 FIX: Fail closed in production when secret key is missing
  if (!secretKey) {
    if (environment === 'production') {
      console.error('CRITICAL: TURNSTILE_SECRET_KEY missing in production');
      return { success: false, errorCodes: ['missing-secret-key'] };
    }
    return { success: true, errorCodes: [] };
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return { success: false, errorCodes: ['api-error'] };
    }

    const data: TurnstileVerifyResponse = await response.json();
    return {
      success: data.success,
      errorCodes: data['error-codes'] || [],
    };
  } catch {
    return { success: false, errorCodes: ['network-error'] };
  }
}
