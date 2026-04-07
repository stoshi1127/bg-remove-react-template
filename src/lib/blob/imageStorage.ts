import { del, list, put } from '@vercel/blob';

export const INPUT_BLOB_PREFIX = 'uploads/inputs';
export const PROCESSED_BLOB_PREFIX = 'processed';
export const INPUT_BLOB_RETENTION_HOURS = 24;
export const INPUT_BLOB_RETENTION_MS = INPUT_BLOB_RETENTION_HOURS * 60 * 60 * 1000;
export const PROCESSED_BLOB_RETENTION_HOURS = 72;
export const PROCESSED_BLOB_RETENTION_MS = PROCESSED_BLOB_RETENTION_HOURS * 60 * 60 * 1000;

function toUtcDateFolder(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sanitizeName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '');
  return normalized.length > 0 ? normalized : 'image';
}

function extFromContentType(contentType: string): string {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif')) return '.gif';
  return '.bin';
}

function buildFileName(baseName: string, contentType: string): string {
  const sanitizedBase = sanitizeName(baseName).replace(/\.[^.]+$/, '');
  return `${sanitizedBase || 'image'}${extFromContentType(contentType)}`;
}

export function buildInputUploadPath(fileName: string, now = new Date()): string {
  const safeName = sanitizeName(fileName);
  return `${INPUT_BLOB_PREFIX}/${toUtcDateFolder(now)}/${crypto.randomUUID()}-${safeName}`;
}

export function buildProcessedUploadPath(kind: string, fileName: string, contentType: string, now = new Date()): string {
  const safeKind = sanitizeName(kind).replace(/\.[^.]+$/, '') || 'image';
  const safeFileName = buildFileName(fileName, contentType);
  return `${PROCESSED_BLOB_PREFIX}/${toUtcDateFolder(now)}/${safeKind}/${crypto.randomUUID()}-${safeFileName}`;
}

export async function uploadProcessedImage(args: {
  pathname: string;
  body: Blob | ArrayBuffer;
  contentType: string;
}) {
  return put(args.pathname, args.body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: args.contentType,
  });
}

async function deleteExpiredBlobsByPrefix(args: {
  prefix: string;
  retentionMs: number;
  now?: Date;
  dryRun?: boolean;
}) {
  const now = args.now ?? new Date();
  const threshold = now.getTime() - args.retentionMs;
  const deletions: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      cursor,
      limit: 1000,
      prefix: `${args.prefix}/`,
    });

    for (const blob of page.blobs) {
      if (blob.uploadedAt.getTime() <= threshold) {
        deletions.push(blob.url);
      }
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (!args.dryRun && deletions.length > 0) {
    await del(deletions);
  }

  return {
    dryRun: Boolean(args.dryRun),
    deletedCount: args.dryRun ? 0 : deletions.length,
    matchedCount: deletions.length,
    deletedUrls: deletions,
  };
}

export async function deleteExpiredInputBlobs(args: {
  now?: Date;
  dryRun?: boolean;
}) {
  return deleteExpiredBlobsByPrefix({
    prefix: INPUT_BLOB_PREFIX,
    retentionMs: INPUT_BLOB_RETENTION_MS,
    now: args.now,
    dryRun: args.dryRun,
  });
}

export async function deleteExpiredProcessedBlobs(args: {
  now?: Date;
  dryRun?: boolean;
}) {
  return deleteExpiredBlobsByPrefix({
    prefix: PROCESSED_BLOB_PREFIX,
    retentionMs: PROCESSED_BLOB_RETENTION_MS,
    now: args.now,
    dryRun: args.dryRun,
  });
}
