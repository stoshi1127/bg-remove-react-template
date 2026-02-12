const MB = 1024 * 1024;

function numFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const EDGE_SAFE_UPLOAD_BYTES = 4 * MB;
export const FREE_TARGET_BYTES = Math.floor(3.5 * MB);
export const FREE_MAX_MP = numFromEnv('FREE_MAX_MP', 8);

export const PRO_MAX_UPLOAD_BYTES = numFromEnv('PRO_MAX_UPLOAD_MB', 25) * MB;
export const PRO_MAX_MP = numFromEnv('PRO_MAX_MP', 90);
export const PRO_MAX_SIDE = numFromEnv('PRO_MAX_SIDE_PX', 10000);

export const UPLOAD_DIRECT_ENABLED =
  process.env.UPLOAD_DIRECT_ENABLED === undefined ||
  process.env.UPLOAD_DIRECT_ENABLED === '1' ||
  process.env.UPLOAD_DIRECT_ENABLED?.toLowerCase() === 'true';

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
