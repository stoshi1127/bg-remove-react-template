import crypto from 'crypto';

import { sha256Hex } from '@/lib/auth/crypto';

type EncodedEmail = string;

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? '';
  if (!secret) {
    // Avoid silent insecure operation in production.
    throw new Error('AUTH_SECRET is required for PendingCheckout email encryption');
  }
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function hashNormalizedEmail(email: string): string {
  // Pepper is included in sha256Hex via AUTH_SECRET, so this is resistant to rainbow tables.
  return sha256Hex(email);
}

export function encryptEmail(email: string): EncodedEmail {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // v1.<iv>.<tag>.<ciphertext>
  return `v1.${b64url(iv)}.${b64url(tag)}.${b64url(ciphertext)}`;
}

export function decryptEmail(encoded: EncodedEmail): string {
  if (!encoded.startsWith('v1.')) throw new Error('Invalid encrypted email format');
  const parts = encoded.split('.');
  if (parts.length !== 4) throw new Error('Invalid encrypted email format');
  const [, ivB64, tagB64, ctB64] = parts;

  const key = getKey();
  const iv = fromB64url(ivB64);
  const tag = fromB64url(tagB64);
  const ciphertext = fromB64url(ctB64);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

