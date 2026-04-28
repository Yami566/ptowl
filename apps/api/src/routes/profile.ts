import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireClinic } from '../middleware/auth.js';
import { inferTimezoneFromAddress } from '../services/timezone.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const profileRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

profileRoutes.use('*', requireAuth, requireClinic);

// GET / - Get profile
profileRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const profile = await c.env.DB.prepare(
      'SELECT id, user_id, clinic_name, clinic_address, clinic_phone, clinic_email, logo_url, updated_at FROM profiles WHERE user_id = ?',
    )
      .bind(user.id)
      .first();
    return c.json({ ok: true, data: profile });
  } catch (err) {
    console.error('Get profile error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } },
      500,
    );
  }
});

// PUT / - Update profile
profileRoutes.put('/', async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json<{
      clinic_name?: string;
      clinic_address?: string;
      clinic_phone?: string;
      clinic_email?: string;
    }>();

    const updates: string[] = [];
    const values: string[] = [];

    if (body.clinic_name !== undefined) {
      updates.push('clinic_name = ?');
      values.push(
        body.clinic_name
          .replace(/<[^>]*>/g, '')
          .trim()
          .slice(0, 200),
      );
    }
    if (body.clinic_address !== undefined) {
      updates.push('clinic_address = ?');
      values.push(
        body.clinic_address
          .replace(/<[^>]*>/g, '')
          .trim()
          .slice(0, 500),
      );
    }
    if (body.clinic_phone !== undefined) {
      updates.push('clinic_phone = ?');
      values.push(body.clinic_phone.slice(0, 20));
    }
    if (body.clinic_email !== undefined) {
      // Validate clinic email if provided
      if (body.clinic_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.clinic_email)) {
        return c.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid clinic email' } },
          400,
        );
      }
      updates.push('clinic_email = ?');
      values.push(body.clinic_email.slice(0, 254));
    }

    if (updates.length === 0) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'No fields to update' } },
        400,
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(user.id);

    // If clinic_address changed, kick off async timezone inference via
    // Workers AI. The reminder cron uses profiles.timezone to compute
    // accurate 24h/1h send windows. Fire-and-forget — inference takes
    // ~1s and we don't block the profile-save response on it.
    if (body.clinic_address && c.env.AI) {
      c.executionCtx.waitUntil(
        (async () => {
          const tz = await inferTimezoneFromAddress(c.env, body.clinic_address!);
          if (tz) {
            await c.env.DB.prepare('UPDATE profiles SET timezone = ? WHERE user_id = ?')
              .bind(tz, user.id)
              .run();
          }
        })().catch((err) =>
          console.error(
            'Timezone inference failed:',
            err instanceof Error ? err.message : 'Unknown',
          ),
        ),
      );
    }

    await c.env.DB.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare(
      'SELECT id, user_id, clinic_name, clinic_address, clinic_phone, clinic_email, logo_url, updated_at FROM profiles WHERE user_id = ?',
    )
      .bind(user.id)
      .first();
    return c.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Update profile error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } },
      500,
    );
  }
});

// POST /logo - Upload clinic logo (base64)
profileRoutes.post('/logo', async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json<{ logo: string }>();

    if (!body.logo) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Logo data required' } },
        400,
      );
    }

    // Validate size (max 500KB base64 ~ 666KB string)
    if (body.logo.length > 700_000) {
      return c.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Logo must be under 500KB' } },
        400,
      );
    }

    // M7 FIX: Strict MIME validation with magic byte verification
    const pngPattern = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
    const jpegPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
    if (!pngPattern.test(body.logo) && !jpegPattern.test(body.logo)) {
      return c.json(
        {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Logo must be a valid PNG or JPEG' },
        },
        400,
      );
    }

    // Validate magic bytes to prevent polyglot file attacks
    const base64Data = body.logo.split(',')[1];
    if (base64Data) {
      try {
        const binary = atob(base64Data.slice(0, 16));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const isPng =
          bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        if (!isPng && !isJpeg) {
          return c.json(
            { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid image data' } },
            400,
          );
        }
      } catch {
        return c.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid image data' } },
          400,
        );
      }
    }

    // Decode the base64 payload once — used for R2 + magic-byte check.
    const base64Payload = body.logo.split(',')[1] || '';
    const isPng = pngPattern.test(body.logo);
    const contentType = isPng ? 'image/png' : 'image/jpeg';

    let logoR2Key: string | null = null;

    if (c.env.LOGOS) {
      try {
        const binary = atob(base64Payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const ext = isPng ? 'png' : 'jpg';
        // Per-user object key; overwrites on re-upload (idempotent).
        logoR2Key = `logos/${user.id}/clinic.${ext}`;
        await c.env.LOGOS.put(logoR2Key, bytes, {
          httpMetadata: { contentType, cacheControl: 'public, max-age=86400' },
        });
      } catch (err) {
        // R2 failure should not block the upload — fall back to base64 only.
        console.error('R2 put failed:', err instanceof Error ? err.message : 'Unknown error');
        logoR2Key = null;
      }
    }

    await c.env.DB.prepare(
      "UPDATE profiles SET logo_url = ?, logo_r2_key = ?, updated_at = datetime('now') WHERE user_id = ?",
    )
      .bind(body.logo, logoR2Key, user.id)
      .run();

    return c.json({ ok: true, data: { message: 'Logo uploaded', r2: !!logoR2Key } });
  } catch (err) {
    console.error('Upload logo error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload logo' } },
      500,
    );
  }
});
