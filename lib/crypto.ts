import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * Symmetric encryption for secrets held in the database.
 *
 * The AI provider API keys live in `app_config`, which the PRD specifies as
 * "encrypted at rest" — they were being stored in plaintext, so anyone with a
 * database dump or a read-only SQL grant had the keys.
 *
 * AES-256-GCM: authenticated, so a tampered ciphertext fails to decrypt rather
 * than silently yielding garbage that would then be sent as a bearer token.
 */

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'v1'; // lets the format change later without ambiguity
const IV_BYTES = 12; // 96 bits, the size GCM is specified for

let cachedKey: Buffer | null = null;

/**
 * Resolve the 32-byte key from CONFIG_ENCRYPTION_KEY.
 *
 * A base64 or hex value that decodes to exactly 32 bytes is used directly;
 * anything else is stretched with scrypt so an operator who pastes a passphrase
 * still gets a valid key rather than a crash. The salt is constant because the
 * derived key must be reproducible across restarts — the entropy has to come
 * from the env value itself.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'CONFIG_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to .env'
    );
  }

  for (const encoding of ['base64', 'hex'] as const) {
    try {
      const decoded = Buffer.from(raw, encoding);
      if (decoded.length === 32) {
        cachedKey = decoded;
        return cachedKey;
      }
    } catch {
      // Not valid in this encoding — fall through to derivation.
    }
  }

  cachedKey = scryptSync(raw, 'postit-ai:app-config', 32);
  return cachedKey;
}

/** True when a stored value is in this module's format. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:`);
}

/**
 * Encrypt a secret for storage.
 * Output: `v1:<iv>:<authTag>:<ciphertext>`, all base64.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a stored secret.
 *
 * Values written before encryption existed have no `v1:` prefix and are returned
 * unchanged, so an instance with plaintext rows keeps working and is upgraded
 * the next time its config is saved.
 */
export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) return stored;

  const [, ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted value in app_config');
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Render a secret for display: enough to recognise which key is configured,
 * not enough to use it. Short values are hidden entirely rather than mostly
 * revealed.
 */
export function maskSecret(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 8) return '••••••••';
  return `${plaintext.slice(0, 3)}••••••••${plaintext.slice(-4)}`;
}
