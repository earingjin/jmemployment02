import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AdminPage as AdminPageComponent } from './AdminPage';
import { getSupabaseAuthClient, loginAdmin } from '../../lib/supabase';
import { AdminPasswordChange } from './AdminPasswordChange';
import './AdminLogin.css';

const AdminPage = lazy(() => import('./AdminPage').then(module => ({ default: module.AdminPage })));
const LOGIN_ERROR = '아이디 또는 비밀번호를 확인해주세요.';
const SERVICE_ERROR = '로그인 서비스를 사용할 수 없습니다. 관리자에게 문의해주세요.';

export function AdminRoute(props: Omit<ComponentProps<typeof AdminPageComponent>, 'accountActions'>) {
  const [client] = useState(() => {
    try { return getSupabaseAuthClient(); } catch { return null; }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState('');
  const [notice, setNotice] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const finishingPasswordChange = useRef(false);

  useEffect(() => {
    if (!client) {
      setServiceError(SERVICE_ERROR);
      setLoading(false);
      return;
    }

    let active = true;
    let authChanged = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active || finishingPasswordChange.current) return;
      authChanged = true;
      setSession(nextSession);
      setServiceError('');
      setLoading(false);
    });

    // Ignore a stale initial result if a newer auth event has already arrived.
    client.auth.getSession().then(({ data, error }) => {
      if (!active || authChanged) return;
      setSession(error ? null : data.session);
      setServiceError(error ? SERVICE_ERROR : '');
      setLoading(false);
    }).catch(() => {
      if (!active || authChanged) return;
      setSession(null);
      setServiceError(SERVICE_ERROR);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const onPasswordChanged = async () => {
    // Hide the editor immediately and prevent auth events during sign-out from reopening it.
    finishingPasswordChange.current = true;
    setLoggingOut(true);
    setSession(null);
    setNotice('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.');
    try {
      await client?.auth.signOut({ scope: 'local' });
    } finally {
      setSession(null);
      setLoggingOut(false);
      finishingPasswordChange.current = false;
    }
  };

  if (loading) return <div className="admin-login-shell" role="status">인증 상태를 확인하는 중...</div>;
  if (!session) return <AdminLogin serviceError={serviceError} available={!!client && !loggingOut} notice={notice} onLoggedIn={() => setNotice('')} />;

  return (
    <Suspense fallback={<div className="admin-login-shell" role="status">관리자 화면을 불러오는 중...</div>}>
      <AdminPage {...props} accountActions={<AdminPasswordChange onChanged={onPasswordChanged} />} />
    </Suspense>
  );
}

function AdminLogin({ serviceError, available, notice, onLoggedIn }: {
  serviceError: string;
  available: boolean;
  notice: string;
  onLoggedIn: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !available) return;
    pending.current = true;
    setSubmitting(true);
    setError('');
    const enteredPassword = password;
    setPassword('');
    try {
      await loginAdmin(username.trim(), enteredPassword);
      onLoggedIn();
    } catch {
      setError(LOGIN_ERROR);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <form className="admin-login-card" onSubmit={submit} aria-busy={submitting}>
        <h1>관리자 로그인</h1>
        {notice && <p className="admin-login-notice" role="status">{notice}</p>}
        <label htmlFor="admin-username">아이디</label>
        <input id="admin-username" name="username" autoComplete="username" required
          value={username} onChange={event => setUsername(event.target.value)} disabled={submitting} />
        <label htmlFor="admin-password">비밀번호</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required
          value={password} onChange={event => setPassword(event.target.value)} disabled={submitting} />
        {(error || serviceError) && <p className="admin-login-error" role="alert">{error || serviceError}</p>}
        <button type="submit" disabled={submitting || !available}>{submitting ? '로그인 중...' : '로그인'}</button>
      </form>
    </main>
  );
}
