import { useEffect, useRef, useState, type RefObject } from 'react';
import { CONSULTATION_IDS, consultationUrl, loadConsultationSettings, openConsultationForm, validFormUrl, validateSettings, type ConsultationSettings } from '../../data/consultation';
export type SaveConsultation = (settings: ConsultationSettings) => Promise<ConsultationSettings>;
const labels = ['공통 상담 신청 URL', '국민취업지원제도', '청년일자리도약장려금', '미래내일 일경험', '시니어인턴십', 'SmartCare'];
export function ConsultationEditor({ onSave, leaveGuard }: { onSave: SaveConsultation; leaveGuard: RefObject<() => boolean> }) {
  const [baseline, setBaseline] = useState<ConsultationSettings | null>(null);
  const [draft, setDraft] = useState<ConsultationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(baseline);
  const status = useRef({ dirty, saving });
  status.current = { dirty, saving };
  useEffect(() => {
    leaveGuard.current = () => {
      if (pending.current) { window.alert('저장 중입니다. 완료 후 이동해주세요.'); return false; }
      const allowed = !status.current.dirty || window.confirm('저장하지 않은 상담 URL 변경사항을 취소하고 이동하시겠습니까?');
      if (allowed) status.current.dirty = false;
      return allowed;
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (status.current.dirty || pending.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', unload);
    const popstate = (event: PopStateEvent) => {
      if (window.location.pathname !== '/admin' && !leaveGuard.current()) {
        event.stopImmediatePropagation();
        window.history.pushState({}, '', '/admin');
      }
    };
    window.addEventListener('popstate', popstate, true);
    return () => { leaveGuard.current = () => true; window.removeEventListener('beforeunload', unload); window.removeEventListener('popstate', popstate, true); };
  }, [leaveGuard]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let active = true;
    setError('');
    void loadConsultationSettings(controller.signal).then(result => {
      if (!active) return;
      if (result.source === 'invalid') throw new Error('저장된 URL이 올바르지 않습니다. DB 설정을 확인해주세요.');
      setBaseline(result.settings); setDraft(result.settings);
      if (result.source === 'missing') setMessage('등록된 설정이 없어 기존 기본 URL을 표시합니다. DB 마이그레이션을 확인해주세요.');
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '설정을 조회하지 못했습니다.'); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [attempt]);
  const save = async () => {
    if (!draft || !dirty || pending.current) return;
    setError(''); setMessage('');
    let values: ConsultationSettings;
    try { values = validateSettings(draft); }
    catch { setError('공통 URL은 필수이며, HTTPS 구글 폼 주소만 입력할 수 있습니다.'); return; }
    pending.current = true; setSaving(true);
    try {
      const saved = await onSave(values);
      setBaseline(saved); setDraft(saved); setMessage('상담 신청 URL 변경사항을 저장했습니다.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.'); }
    finally { pending.current = false; setSaving(false); }
  };
  return <section className="admin-card" aria-busy={saving}>
    <h3 className="admin-card-title">상담 신청서 관리</h3>
    {!draft && !error && <p role="status">상담 신청 URL을 불러오는 중...</p>}
    {draft && CONSULTATION_IDS.map((id, index) => <div className="admin-consultation-field" key={id}>
      <label className="admin-field-label" htmlFor={`consultation-${id}`}>{labels[index]}</label>
      <input className="admin-input" id={`consultation-${id}`} type="url" maxLength={2048} required={id === 'default'}
        value={draft[id]} disabled={saving} onChange={event => { setDraft({ ...draft, [id]: event.target.value }); setMessage(''); }} />
      <p className="admin-management-description">{id === 'default' ? '메인페이지 및 공통 상담 신청 버튼에 사용되는 주소' : '미등록 시 공통 URL을 사용합니다.'}</p>
      <p className="admin-management-description admin-consultation-current">현재 등록된 URL: {baseline?.[id] || '미등록 (공통 URL 사용)'}</p>
      <button type="button" className="admin-save-btn" disabled={!validFormUrl(draft[id].trim() || (id !== 'default' ? draft.default.trim() : ''))}
        onClick={() => openConsultationForm(consultationUrl({ ...draft, [id]: draft[id].trim(), default: draft.default.trim() }, id))}>신청서 확인</button>
    </div>)}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!draft && error && <button className="admin-save-btn" onClick={() => setAttempt(value => value + 1)}>다시 조회</button>}
    <div className="admin-consultation-actions">
      <button type="button" className="admin-save-btn" disabled={!dirty || saving} onClick={() => { void save(); }}>{saving ? '저장 중...' : '변경사항 저장'}</button>
      <button type="button" className="admin-save-btn" disabled={!dirty || saving} onClick={() => { setDraft(baseline); setError(''); setMessage('입력을 취소했습니다.'); }}>입력 취소</button>
    </div>
  </section>;
}
