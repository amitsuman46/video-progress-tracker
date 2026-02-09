/** In-memory store for short-lived stream tokens. Token -> { driveFileId, expiresAt }. */
const store = new Map<
  string,
  { driveFileId: string; expiresAt: number }
>();

const TTL_MS = 60 * 60 * 1000; // 1 hour

export function createStreamToken(driveFileId: string): string {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  store.set(token, { driveFileId, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getDriveFileIdByToken(token: string): string | null {
  const entry = store.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  return entry.driveFileId;
}
