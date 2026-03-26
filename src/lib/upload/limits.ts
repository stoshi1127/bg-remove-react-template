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

/** ブラウザが type を空にしたり非対応 MIME にしたりする場合の補正（/api/upload/blob の検証と一致させる） */
export function normalizeClientImageMime(blob: Blob, fileName: string): string {
  const t = blob.type?.trim();
  if (t && ALLOWED_IMAGE_TYPES.has(t)) return t;
  if (t === 'image/jpg' || t === 'image/pjpeg') return 'image/jpeg';

  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic') return 'image/heic';
  if (ext === '.heif') return 'image/heif';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/jpeg';
}
