export function getSiteUrl(): string {
  // Prefer explicit config (also used by metadata in existing code).
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // Vercel provides VERCEL_URL without scheme.
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, '');

  return 'http://localhost:3000';
}

