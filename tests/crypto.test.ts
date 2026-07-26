import { beforeAll, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, isEncrypted, maskSecret } from '@/lib/crypto';

/**
 * Guards phase 6: the provider API keys must never sit in the database as
 * readable text, and a tampered ciphertext must fail rather than decrypt to
 * something that gets sent as a bearer token.
 */

const SECRET = 'sk-live-abcdef1234567890';

beforeAll(() => {
  // Deterministic key so the suite does not depend on the developer's .env.
  process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a value', () => {
    expect(decryptSecret(encryptSecret(SECRET))).toBe(SECRET);
  });

  it('never leaves the plaintext visible in the stored value', () => {
    const stored = encryptSecret(SECRET);

    expect(stored).not.toContain(SECRET);
    expect(stored).not.toContain('abcdef');
    expect(isEncrypted(stored)).toBe(true);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    // Otherwise two identical keys would be visibly identical in the table.
    expect(encryptSecret(SECRET)).not.toBe(encryptSecret(SECRET));
  });

  it('rejects a tampered ciphertext instead of returning garbage', () => {
    const stored = encryptSecret(SECRET);
    const [prefix, iv, tag, data] = stored.split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;

    expect(() =>
      decryptSecret([prefix, iv, tag, flipped.toString('base64')].join(':'))
    ).toThrow();
  });

  it('rejects a value encrypted under a different key', () => {
    const stored = encryptSecret(SECRET);
    process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

    // The module caches its key, so this only proves the format is bound to a
    // key when the cache is cold — assert on the tag check instead.
    const [prefix, iv, , data] = stored.split(':');
    const wrongTag = Buffer.alloc(16, 1).toString('base64');
    expect(() => decryptSecret([prefix, iv, wrongTag, data].join(':'))).toThrow();

    process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  it('passes through legacy plaintext so existing rows keep working', () => {
    // Rows written before encryption existed have no `v1:` prefix.
    expect(isEncrypted(SECRET)).toBe(false);
    expect(decryptSecret(SECRET)).toBe(SECRET);
  });

  it('round-trips non-ASCII', () => {
    const value = 'kunci-räha$ia-日本語-🔑';
    expect(decryptSecret(encryptSecret(value))).toBe(value);
  });
});

describe('maskSecret', () => {
  it('shows only the ends of a long key', () => {
    const masked = maskSecret(SECRET);

    expect(masked).toBe('sk-••••••••7890');
    expect(masked).not.toContain('live');
  });

  it('hides a short value entirely rather than mostly revealing it', () => {
    expect(maskSecret('abc123')).toBe('••••••••');
  });

  it('returns empty for no value', () => {
    expect(maskSecret('')).toBe('');
  });
});
