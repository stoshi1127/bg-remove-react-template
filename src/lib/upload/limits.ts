const MB = 1024 * 1024;

function numFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Pro の上限は `BgRemover.tsx` と同一ソースにする（`NEXT_PUBLIC_*` のみ + 既定）。
 * サーバーだけに `PRO_MAX_MP=8` 等が残っていると、クライアントは 90 既定で通過し `/api/upload/blob` だけ 400 になる。
 */
function numFromNextPublic(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `image/jpeg; charset=binary` 等を `image/jpeg` に */
export function stripMimeParameters(mime: string): string {
  return mime.split(';')[0].trim();
}

export const EDGE_SAFE_UPLOAD_BYTES = 4 * MB;
export const FREE_TARGET_BYTES = Math.floor(3.5 * MB);
export const FREE_MAX_MP = numFromEnv('FREE_MAX_MP', 8);

export const PRO_MAX_UPLOAD_BYTES = numFromNextPublic('NEXT_PUBLIC_PRO_MAX_UPLOAD_MB', 25) * MB;
export const PRO_MAX_MP = numFromNextPublic('NEXT_PUBLIC_PRO_MAX_MP', 90);
export const PRO_MAX_SIDE = numFromNextPublic('NEXT_PUBLIC_PRO_MAX_SIDE_PX', 10000);

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
  const raw = blob.type?.trim();
  const t = raw ? stripMimeParameters(raw) : '';
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
