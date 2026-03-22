import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { requireAuth, requireCSRF, requireClinic } from '../middleware/auth.js';

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

export const profileRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

profileRoutes.use('*', requireAuth, requireClinic);

// GET / - Get profile
profileRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const profile = await c.env.DB.prepare('SELECT id, user_id, clinic_name, clinic_address, clinic_phone, clinic_email, logo_url, updated_at FROM profiles WHERE user_id = ?').bind(user.id).first();
    return c.json({ ok: true, data: profile });
  } catch (err) {
    console.error('Get profile error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } }, 500);
  }
});

// PUT / - Update profile
profileRoutes.put('/', requireCSRF, async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json<{
      clinic_name?: string;
      clinic_address?: string;
      clinic_phone?: string;
      clinic_email?: string;
    }>();

    const updates: string[] = [];
    const values: (string)[] = [];

    if (body.clinic_name !== undefined) { updates.push('clinic_name = ?'); values.push(body.clinic_name.replace(/<[^>]*>/g, '').trim().slice(0, 200)); }
    if (body.clinic_address !== undefined) { updates.push('clinic_address = ?'); values.push(body.clinic_address.replace(/<[^>]*>/g, '').trim().slice(0, 500)); }
    if (body.clinic_phone !== undefined) { updates.push('clinic_phone = ?'); values.push(body.clinic_phone.slice(0, 20)); }
    if (body.clinic_email !== undefined) {
      // Validate clinic email if provided
      if (body.clinic_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.clinic_email)) {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid clinic email' } }, 400);
      }
      updates.push('clinic_email = ?');
      values.push(body.clinic_email.slice(0, 254));
    }

    if (updates.length === 0) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'No fields to update' } }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(user.id);

    await c.env.DB.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT id, user_id, clinic_name, clinic_address, clinic_phone, clinic_email, logo_url, updated_at FROM profiles WHERE user_id = ?').bind(user.id).first();
    return c.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Update profile error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } }, 500);
  }
});

// POST /logo - Upload clinic logo (base64)
profileRoutes.post('/logo', requireCSRF, async (c) => {
  try {
    const user = c.get('user')!;
    const body = await c.req.json<{ logo: string }>();

    if (!body.logo) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Logo data required' } }, 400);
    }

    // Validate size (max 500KB base64 ~ 666KB string)
    if (body.logo.length > 700_000) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Logo must be under 500KB' } }, 400);
    }

    // M7 FIX: Strict MIME validation with magic byte verification
    const pngPattern = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
    const jpegPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
    if (!pngPattern.test(body.logo) && !jpegPattern.test(body.logo)) {
      return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Logo must be a valid PNG or JPEG' } }, 400);
    }

    // Validate magic bytes to prevent polyglot file attacks
    const base64Data = body.logo.split(',')[1];
    if (base64Data) {
      try {
        const binary = atob(base64Data.slice(0, 16));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
        const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        if (!isPng && !isJpeg) {
          return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid image data' } }, 400);
        }
      } catch {
        return c.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid image data' } }, 400);
      }
    }

    await c.env.DB.prepare("UPDATE profiles SET logo_url = ?, updated_at = datetime('now') WHERE user_id = ?")
      .bind(body.logo, user.id)
      .run();

    return c.json({ ok: true, data: { message: 'Logo uploaded' } });
  } catch (err) {
    console.error('Upload logo error:', err instanceof Error ? err.message : 'Unknown error');
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload logo' } }, 500);
  }
});
