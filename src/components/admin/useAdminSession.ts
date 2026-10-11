import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AdminSessionError, getSupabaseAuthClient, loginAdmin, requestFixedAdminSession, type FixedAdminSession } from '../../lib/supabase';
import { AdminSessionOperationGate, ADMIN_SESSION_STORAGE_KEY, canRenewAdminSession, persistAdminSession,
  renewVerifiedAdminSession, SESSION_RENEWAL_FAILED, SESSION_RENEWAL_SUCCESS, sessionRemaining } from './adminSessionRenewal';

const STORAGE_KEY = ADMIN_SESSION_STORAGE_KEY;
const SERVICE_ERROR = '로그인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
const EXPIRED = '관리자 세션이 만료되었습니다. 다시 로그인해주세요.';

export function useAdminSession() {
  const [client] = useState(() => {
    try { return getSupabaseAuthClient(); } catch { return null; }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [fixedSession, setFixedSession] = useState<FixedAdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [renewing, setRenewing] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState('');
  const [operations] = useState(() => new AdminSessionOperationGate());
  const fixedRef = useRef<FixedAdminSession | null>(null);
  const authRef = useRef<Session | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const signingIn = useRef(false);
  const ending = useRef<Promise<void> | null>(null);
  const checking = useRef(false);

  const logout = useCallback((message = ''): Promise<void> => {
    if (ending.current) return ending.current;
    generation.current++;
    const id = fixedRef.current?.id;
    fixedRef.current = null;
    authRef.current = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* access still ends in memory */ }
    setFixedSession(null);
    setSession(null);
    setLoading(true);
    setServiceError(message);
    setRenewalMessage('');
    const task = (async () => {
      try {
        if (id) await requestFixedAdminSession('DELETE', id);
      } catch { /* server revocation failure must not prevent local sign-out */ }
      try {
        await client?.auth.signOut({ scope: 'local' });
      } catch { /* keep the editor closed even if sign-out cannot complete */ }
      finally {
        if (mounted.current) {
          setSession(null);
          setFixedSession(null);
          setLoading(false);
        }
      }
    })();
    ending.current = task;
    void task.finally(() => { if (ending.current === task) ending.current = null; });
    return task;
  }, [client]);

  const restore = useCallback(async (auth: Session) => {
    await operations.waitForRenewal();
    if (!mounted.current || ending.current) return;
    const operation = ++generation.current;
    setLoading(true);
    try {
      const id = localStorage.getItem(STORAGE_KEY);
      if (!id) throw new AdminSessionError('관리자 세션이 없습니다.');
      const verified = await requestFixedAdminSession('GET', id);
      if (!mounted.current || operation !== generation.current) return;
      if (!verified || Date.parse(verified.expires_at) <= Date.now()) throw new AdminSessionError('관리자 세션 만료');
      fixedRef.current = verified;
      authRef.current = auth;
      setFixedSession(verified);
      setSession(auth);
      setServiceError('');
      setLoading(false);
    } catch {
      if (mounted.current && operation === generation.current) await logout(EXPIRED);
    }
  }, [logout, operations]);

  const validate = useCallback(async () => {
    const fixed = fixedRef.current;
    if (!fixed || checking.current || signingIn.current || ending.current || operations.renewing) return;
    checking.current = true;
    const operation = generation.current;
    try {
      const verified = await requestFixedAdminSession('GET', fixed.id);
      if (!mounted.current || operation !== generation.current) return;
      if (!verified || Date.parse(verified.expires_at) <= Date.now()) throw new AdminSessionError('관리자 세션 만료');
      fixedRef.current = verified;
      setFixedSession(verified);
    } catch {
      if (mounted.current && operation === generation.current) await logout(EXPIRED);
    } finally { checking.current = false; }
  }, [logout, operations]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let initializing = true;
    const initialGeneration = generation.current;
    if (!client) {
      setServiceError(SERVICE_ERROR);
      setLoading(false);
      return () => { mounted.current = false; };
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      authRef.current = next;
      if (signingIn.current || ending.current) return;
      if (initializing && event !== 'SIGNED_OUT') return;
      if (!next) {
        generation.current++;
        fixedRef.current = null;
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setFixedSession(null);
        setLoading(false);
      } else if (fixedRef.current) {
        setSession(next);
        // Defer SDK calls outside its auth-event callback to avoid its internal lock.
        if (event === 'TOKEN_REFRESHED') queueMicrotask(() => { if (active) void validate(); });
      } else {
        queueMicrotask(() => { if (active) void restore(next); });
      }
    });
    void client.auth.getSession().then(async ({ data, error }) => {
      if (!active || initialGeneration !== generation.current) return;
      if (error) await logout(EXPIRED);
      else if (data.session) await restore(data.session);
      else {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      }
    }).catch(async () => { if (active) await logout(SERVICE_ERROR); })
      .finally(() => { initializing = false; });
    return () => {
      active = false;
      mounted.current = false;
      generation.current++;
      subscription.unsubscribe();
    };
  }, [client, logout, restore, validate]);

  useEffect(() => {
    if (!fixedSession) return;
    const tick = () => {
      const current = fixedRef.current;
      if (!current) return;
      const seconds = sessionRemaining(current);
      setRemaining(seconds);
      if (seconds === 0) void logout(EXPIRED);
    };
    const onFocus = () => { tick(); void validate(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
    tick();
    const timer = window.setInterval(tick, 1000);
    const verification = window.setInterval(() => { void validate(); }, 60000);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(verification);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fixedSession, logout, validate]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (signingIn.current || ending.current) return;
      if (authRef.current) void restore(authRef.current);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [restore]);

  const login = async (username: string, password: string) => {
    if (!client || signingIn.current || ending.current || operations.renewing) throw new AdminSessionError(SERVICE_ERROR);
    const operation = ++generation.current;
    signingIn.current = true;
    let authSucceeded = false;
    setServiceError('');
    try {
      await loginAdmin(username, password);
      authSucceeded = true;
      setLoading(true);
      const fixed = await requestFixedAdminSession('POST');
      if (!fixed) throw new AdminSessionError(SERVICE_ERROR);
      if (!mounted.current || operation !== generation.current) {
        await requestFixedAdminSession('DELETE', fixed.id);
        throw new AdminSessionError(SERVICE_ERROR);
      }
      fixedRef.current = fixed;
      localStorage.setItem(STORAGE_KEY, fixed.id);
      const { data, error } = await client.auth.getSession();
      if (!mounted.current || operation !== generation.current || error || !data.session || Date.parse(fixed.expires_at) <= Date.now()) throw new AdminSessionError(SERVICE_ERROR);
      authRef.current = data.session;
      setSession(data.session);
      setFixedSession(fixed);
      setLoading(false);
    } catch (cause) {
      if (authSucceeded) {
        await logout(SERVICE_ERROR);
        throw new AdminSessionError(SERVICE_ERROR);
      }
      throw cause;
    } finally { signingIn.current = false; }
  };

  const getSaveAuthorization = async () => {
    await operations.waitForRenewal();
    const operation = generation.current;
    const fixed = fixedRef.current;
    const expired = () => new AdminSessionError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
    try {
      if (!client || !mounted.current || ending.current || signingIn.current || !fixed ||
        Date.parse(fixed.expires_at) <= Date.now()) throw expired();
      // This is an additional check immediately before PATCH, never a new POST window.
      const verified = await requestFixedAdminSession('GET', fixed.id);
      const { data, error } = await client.auth.getSession();
      if (!mounted.current || operation !== generation.current || ending.current || error || !data.session ||
        !verified || fixedRef.current?.id !== verified.id || Date.parse(verified.expires_at) <= Date.now() ||
        data.session.user.id !== authRef.current?.user.id) throw expired();
      return { accessToken: data.session.access_token, adminSessionId: verified.id };
    } catch {
      if (mounted.current && operation === generation.current) await logout(expired().message);
      throw expired();
    }
  };

  const renewSession = async () => {
    const previous = fixedRef.current;
    if (!client || !mounted.current || signingIn.current || ending.current || !canRenewAdminSession(previous)) return;
    if (operations.saving) { setRenewalMessage('저장 작업이 끝난 후 세션을 연장해주세요.'); return; }
    const task = operations.renew(async () => {
      const operation = ++generation.current;
      const isCurrent = () => mounted.current && operation === generation.current && !ending.current;
      const candidate: { session: FixedAdminSession | null } = { session: null };
      let applied = false;
      setRenewing(true);
      setRenewalMessage('');
      try {
        const result = await renewVerifiedAdminSession(previous!, requestFixedAdminSession, isCurrent,
          next => { candidate.session = next; });
        if (!isCurrent()) return;
        // Persist first: if browser storage is unavailable, do not leave an un-restorable new session active.
        persistAdminSession(result.session, localStorage);
        fixedRef.current = result.session;
        setFixedSession(result.session);
        setRemaining(sessionRemaining(result.session));
        applied = result.renewed;
        setRenewalMessage(result.renewed ? SESSION_RENEWAL_SUCCESS : SESSION_RENEWAL_FAILED);
      } catch {
        if (isCurrent()) await logout(EXPIRED);
      } finally {
        if (candidate.session && !applied) {
          try { await requestFixedAdminSession('DELETE', candidate.session.id); } catch { /* never restore an uncertain session */ }
        }
        if (mounted.current) setRenewing(false);
      }
    });
    if (task) await task;
  };

  const withSaveAuthorization = <T,>(save: (authorization: Awaited<ReturnType<typeof getSaveAuthorization>>) => Promise<T>) =>
    operations.save(async () => save(await getSaveAuthorization()));

  return { session, fixedSession, loading, serviceError, remaining, available: !!client, login, logout, getSaveAuthorization,
    renewing, renewalMessage, renewSession, withSaveAuthorization };
}
