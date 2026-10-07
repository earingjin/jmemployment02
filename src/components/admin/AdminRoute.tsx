import { lazy, Suspense, useRef, useState, type ComponentProps, type FormEvent } from 'react';
import type { AdminPage as AdminPageComponent, BranchPatch } from './AdminPage';
import { BranchSaveAuthError, saveAuthenticatedBranch, uploadBranchImage, deleteBranchImage, saveBranchImageSettings, type BranchImageSlot, type BranchImageSettings, type BranchImageRow, type BranchDirectoryRow } from '../../data/branchDirectory';
import { AdminSessionError } from '../../lib/supabase';
import { useAdminSession } from './useAdminSession';
import { AdminPasswordChange } from './AdminPasswordChange';
import './AdminLogin.css';

const AdminPage = lazy(() => import('./AdminPage').then(module => ({ default: module.AdminPage })));
const LOGIN_ERROR = '아이디 또는 비밀번호를 확인해주세요.';
const SERVICE_ERROR = '로그인 서비스를 사용할 수 없습니다. 관리자에게 문의해주세요.';

export function AdminRoute(props: Omit<ComponentProps<typeof AdminPageComponent>, 'accountActions' | 'onSaveBranch' | 'onUploadImage' | 'onDeleteImage' | 'onSaveImageSettings'> & {
  onBranchSaved: (saved: BranchDirectoryRow) => void;
  onBranchImageSaved: (saved: BranchImageRow, slot: BranchImageSlot) => void;
}) {
  const { session, fixedSession, loading, serviceError, remaining, available, login, logout, getSaveAuthorization } = useAdminSession();
  const [notice, setNotice] = useState('');
  const pendingBranchSaves = useRef(new Set<string>());
  const saveBranch = async (slug: string, patch: BranchPatch): Promise<void> => {
    if ([1, 2].some(slot => pendingImages.current.has(slug + ':' + slot)) || pendingBranchSaves.current.has(slug)) throw new Error('지사 정보를 처리 중입니다. 잠시 기다려주세요.');
    pendingBranchSaves.current.add(slug);
    try {
      const authorization = await getSaveAuthorization();
      const saved = await saveAuthenticatedBranch(slug, patch, authorization);
      props.onBranchSaved(saved);
    } catch (cause) {
      if (cause instanceof BranchSaveAuthError) await logout(cause.message);
      throw cause;
    } finally { pendingBranchSaves.current.delete(slug); }
  };
  const pendingImages = useRef(new Set<string>());
  const changeImage = async (slug: string, slot: BranchImageSlot, operation: 'upload' | 'delete' | 'settings', value?: File | BranchImageSettings): Promise<void> => {
    const key = slug + ':' + slot;
    if (pendingImages.current.has(key) || pendingBranchSaves.current.has(slug)) throw new Error('사진을 처리 중입니다. 잠시 기다려주세요.');
    pendingImages.current.add(key);
    try {
      const authorization = await getSaveAuthorization();
      const saved = operation === 'upload' ? await uploadBranchImage(slug, slot, value as File, authorization)
        : operation === 'settings' ? await saveBranchImageSettings(slug, slot, value as BranchImageSettings, authorization)
        : await deleteBranchImage(slug, slot, authorization);
      props.onBranchImageSaved(saved, slot);
    } catch (cause) {
      if (cause instanceof BranchSaveAuthError) await logout(cause.message);
      throw cause;
    } finally { pendingImages.current.delete(key); }
  };
  const onPasswordChanged = async () => {
    setNotice('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.');
    await logout();
  };
  const time = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60]
    .map(part => String(part).padStart(2, '0')).join(':');

  if (loading) return <div className="admin-login-shell" role="status">인증 상태를 확인하는 중...</div>;
  if (!session || !fixedSession) return <AdminLogin serviceError={serviceError} available={available} notice={notice} onLogin={login} onLoggedIn={() => setNotice('')} />;

  return (
    <Suspense fallback={<div className="admin-login-shell" role="status">관리자 화면을 불러오는 중...</div>}>
      <AdminPage {...props} onSaveBranch={saveBranch} onUploadImage={(slug, slot, file) => changeImage(slug, slot, 'upload', file)} onDeleteImage={(slug, slot) => changeImage(slug, slot, 'delete')} onSaveImageSettings={(slug, slot, settings) => changeImage(slug, slot, 'settings', settings)} accountActions={<>
        <div className="admin-session-toolbar">
          <span role="timer" aria-label="세션 남은 시간">세션 남은 시간 {time}</span>
          <button type="button" className="admin-save-btn" onClick={() => { setNotice(''); void logout(); }}>로그아웃</button>
        </div>
        <AdminPasswordChange onChanged={onPasswordChanged} />
      </>} />
    </Suspense>
  );
}

function AdminLogin({ serviceError, available, notice, onLogin, onLoggedIn }: {
  serviceError: string;
  available: boolean;
  notice: string;
  onLoggedIn: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
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
      await onLogin(username.trim(), enteredPassword);
      onLoggedIn();
    } catch (cause) {
      setError(cause instanceof AdminSessionError ? SERVICE_ERROR : LOGIN_ERROR);
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
