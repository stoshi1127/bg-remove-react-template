export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Minimal validation: prevent obvious garbage and header injection vectors.
  if (email.length < 3 || email.length > 254) return false;
  if (email.includes('\r') || email.includes('\n')) return false;
  // Simple RFC-ish check (not perfect, but good enough for login).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

