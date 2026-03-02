import { randomBytes, createHash } from 'crypto';
import { SHA256 } from 'crypto-js';

export function generateRandomToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}

export function sha256Hex(data: string): string {
    return SHA256(data).toString();
}

/**
 * Returns a SHA-256 hash of the normalized email for exact matching
 * without storing plaintext. Uses a server-side pepper if available.
 */
export function hashNormalizedEmail(normalizedEmail: string): string {
    const pepper = process.env.EMAIL_HASH_PEPPER ?? '';
    return createHash('sha256')
        .update(normalizedEmail + pepper)
        .digest('hex');
}
