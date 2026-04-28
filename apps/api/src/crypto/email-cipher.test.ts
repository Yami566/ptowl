import { describe, it, expect } from 'vitest';
import { encryptEmail, decryptEmail, hashEmail } from './email-cipher.js';

const TEST_KEY = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='; // 32 bytes, deterministic

describe('encryptEmail / decryptEmail', () => {
  it('round-trips a normal email', async () => {
    const enc = await encryptEmail('alice@example.com', TEST_KEY);
    const dec = await decryptEmail(enc, TEST_KEY);
    expect(dec).toBe('alice@example.com');
  });

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const a = await encryptEmail('alice@example.com', TEST_KEY);
    const b = await encryptEmail('alice@example.com', TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('format is iv-base64 . ciphertext-base64', async () => {
    const enc = await encryptEmail('alice@example.com', TEST_KEY);
    const parts = enc.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('rejects a wrong key', async () => {
    const enc = await encryptEmail('alice@example.com', TEST_KEY);
    const otherKey = 'IB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEA';
    await expect(decryptEmail(enc, otherKey)).rejects.toThrow();
  });

  it('rejects malformed ciphertext', async () => {
    await expect(decryptEmail('not-valid', TEST_KEY)).rejects.toThrow();
  });

  it('rejects a key of the wrong size', async () => {
    const shortKey = btoa('short');
    await expect(encryptEmail('a@b.com', shortKey)).rejects.toThrow(/32 bytes/);
  });
});

describe('hashEmail', () => {
  it('is stable for the same input', async () => {
    const a = await hashEmail('alice@example.com');
    const b = await hashEmail('alice@example.com');
    expect(a).toBe(b);
  });

  it('normalizes case + whitespace', async () => {
    const a = await hashEmail('Alice@Example.com');
    const b = await hashEmail('  alice@example.com  ');
    const c = await hashEmail('alice@example.com');
    expect(a).toBe(c);
    expect(b).toBe(c);
  });

  it('produces 64 hex characters (SHA-256)', async () => {
    const h = await hashEmail('alice@example.com');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different emails yield different hashes', async () => {
    const a = await hashEmail('alice@example.com');
    const b = await hashEmail('bob@example.com');
    expect(a).not.toBe(b);
  });
});
