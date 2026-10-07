import type { FixedAdminSession } from '../../lib/supabase';

export const SESSION_RENEWAL_WINDOW_SECONDS = 30 * 60;
export const SESSION_RENEWAL_FAILED = '세션을 연장하지 못했습니다. 잠시 후 다시 시도해주세요.';
export const SESSION_RENEWAL_SUCCESS = '보안을 위한 관리자 세션이 2시간 연장되었습니다.';
export const ADMIN_SESSION_STORAGE_KEY = 'jmcareer_admin_session_id';

export function sessionRemaining(session: FixedAdminSession, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(session.expires_at) - now) / 1000));
}

export function canRenewAdminSession(session: FixedAdminSession | null, now = Date.now()) {
  if (!session) return false;
  const remaining = sessionRemaining(session, now);
  return remaining > 0 && remaining <= SESSION_RENEWAL_WINDOW_SECONDS;
}

// Keep the whole authenticated write (not only its GET) separate from session replacement.
export class AdminSessionOperationGate {
  private renewal: Promise<unknown> | null = null;
  private writes = 0;
  get renewing() { return this.renewal !== null; }
  get saving() { return this.writes > 0; }

  async waitForRenewal() { await this.renewal; }

  renew<T>(operation: () => Promise<T>): Promise<T> | null {
    if (this.renewal || this.writes) return null;
    const task = Promise.resolve().then(operation).finally(() => {
      if (this.renewal === task) this.renewal = null;
    });
    this.renewal = task;
    return task;
  }

  async save<T>(operation: () => Promise<T>): Promise<T> {
    while (this.renewal) await this.renewal;
    this.writes++;
    try { return await operation(); }
    finally { this.writes--; }
  }
}

type SessionRequest = (method: 'POST' | 'GET' | 'DELETE', id?: string) => Promise<FixedAdminSession | null>;

export async function renewVerifiedAdminSession(
  current: FixedAdminSession,
  request: SessionRequest,
  isCurrent: () => boolean,
  onCreated: (session: FixedAdminSession) => void,
  now: () => number = Date.now,
): Promise<{ session: FixedAdminSession; renewed: boolean }> {
  const verify = async (id: string) => {
    const session = await request('GET', id);
    if (!session || session.id !== id || sessionRemaining(session, now()) <= 0) throw new Error('Invalid session');
    return session;
  };
  try {
    const verified = await verify(current.id);
    if (!isCurrent() || !canRenewAdminSession(verified, now())) throw new Error('Renewal unavailable');
    const created = await request('POST');
    if (!created) throw new Error('Invalid session');
    onCreated(created);
    const next = await verify(created.id);
    if (!isCurrent()) throw new Error('Session changed');
    return { session: next, renewed: true };
  } catch {
    // POST revokes before inserting. A timeout/failure cannot be assumed to leave the old ID valid.
    return { session: await verify(current.id), renewed: false };
  }
}

export function persistAdminSession(session: FixedAdminSession, storage: Pick<Storage, 'setItem'>) {
  storage.setItem(ADMIN_SESSION_STORAGE_KEY, session.id);
}
