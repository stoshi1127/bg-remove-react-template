import crypto from 'crypto';

export function generateRandomToken(bytes = 32): string {
  // base64url is safe for URLs and cookies
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256Hex(input: string): string {
  // Optional pepper so leaked DB hashes are less useful.
  // Keep AUTH_SECRET stable across deployments.
  const pepper = process.env.AUTH_SECRET ?? '';
  return crypto.createHash('sha256').update(`${pepper}:${input}`).digest('hex');
}

