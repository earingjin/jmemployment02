import { useRef, useState, type FormEvent } from 'react';
import { changeAdminPassword, PasswordChangeError } from '../../lib/supabase';
import './AdminPasswordChange.css';

export function AdminPasswordChange({ onChanged }: { onChanged: () => Promise<void> }) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="admin-account-actions">
      <PasswordChangePanel key={resetKey} onClose={() => setResetKey(key => key + 1)} onChanged={onChanged} />
    </div>
  );
}

function PasswordChangePanel({ onClose, onChanged }: { onClose: () => void; onChanged: () => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    if (!currentPassword) { setError('현재 비밀번호를 입력해주세요.'); return; }
    if (newPassword.length < 10) { setError('새 비밀번호는 최소 10자 이상이어야 합니다.'); return; }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('새 비밀번호에 영문과 숫자를 각각 1개 이상 포함해주세요.'); return;
    }
    if (newPassword !== confirmation) { setError('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.'); return; }

    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      const changed = await changeAdminPassword(currentPassword, newPassword, () =>
        window.confirm('비밀번호를 변경하면 즉시 로그아웃됩니다. 변경하시겠습니까?')
      );
      if (changed) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmation('');
        await onChanged();
      }
    } catch (cause) {
      setError(cause instanceof PasswordChangeError ? cause.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setCurrentPassword('');
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section id="admin-password-panel" className="admin-card admin-password-panel" aria-labelledby="admin-password-title">
      <h2 id="admin-password-title">비밀번호 변경</h2>
      <p>보안을 위해 비밀번호를 변경하면 현재 관리자 로그인이 즉시 종료됩니다. 변경한 새 비밀번호로 다시 로그인해 주세요.</p>
      <form onSubmit={submit} aria-busy={submitting} noValidate>
        <label htmlFor="admin-current-password">현재 비밀번호</label>
        <input id="admin-current-password" className="admin-input" type="password" autoComplete="current-password"
          autoFocus value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={submitting} />
        <label htmlFor="admin-new-password">새 비밀번호</label>
        <input id="admin-new-password" className="admin-input" type="password" autoComplete="new-password" aria-describedby="admin-password-policy"
          value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={submitting} />
        <p id="admin-password-policy">최소 10자, 영문과 숫자를 각각 1개 이상 포함해야 합니다.</p>
        <label htmlFor="admin-confirm-password">새 비밀번호 확인</label>
        <input id="admin-confirm-password" className="admin-input" type="password" autoComplete="new-password"
          value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={submitting} />
        {error && <p className="admin-password-error" role="alert">{error}</p>}
        <div className="admin-password-buttons">
          <button type="button" className="admin-password-cancel" onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" className="admin-save-btn" disabled={submitting}>{submitting ? '변경 중...' : '변경하기'}</button>
        </div>
      </form>
    </section>
  );
}
