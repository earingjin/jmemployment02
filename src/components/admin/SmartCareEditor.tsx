import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { loadSmartCareRows, SMARTCARE_FIELDS, SMARTCARE_IDS, SMARTCARE_LOAD_ERROR, SMARTCARE_MAX_DETAILS, SMARTCARE_MIN_DETAILS,
  type SmartCareId, type SmartCarePatchRequest, type SmartCareRow } from '../../data/smartCare';
import type { ContentValues } from '../../data/employmentPrograms';
import { addSmartCareDetail, buildSmartCarePatch, createSmartCareEditorState, editSmartCareField, failedSmartCareEditorState,
  removeSmartCareDetail, savedSmartCareEditorState, smartCareEditorDirty, smartCareEditorErrors } from './smartCareEditorState';
import { canLeaveEmploymentEditor, type EmploymentEditStatus } from './employmentEditorState';
import { SMARTCARE_AREA, SmartCareNavigation, smartCareServiceLabel, type SmartCareNavigationItem } from './SmartCareNavigation';
import { buildSmartCarePreview, smartCareFieldNotice, type SmartCarePreviewData } from './smartCarePreviewModel';
import { SmartCarePreview } from './SmartCarePreview';
import './EmploymentProgramsEditor.css';

export type SaveSmartCareContent = (request: SmartCarePatchRequest) => Promise<SmartCareRow>;

const CLEAN: EmploymentEditStatus = { dirty: false, saving: false };
// Pure leave decision shared by service switching, admin tab changes and the site-return button.
export function canLeaveSmartCareEditor(status: EmploymentEditStatus, confirm: (message: string) => boolean): boolean {
  return canLeaveEmploymentEditor([status], confirm);
}

export function SmartCareEditor({ onSave, leaveGuard, navigationTarget, load = loadSmartCareRows }: {
  onSave: SaveSmartCareContent; leaveGuard: RefObject<() => boolean>; navigationTarget: HTMLElement | null;
  load?: (signal?: AbortSignal) => Promise<SmartCareRow[]>;
}) {
  const [rows, setRows] = useState<SmartCareRow[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<SmartCareId>(SMARTCARE_IDS[0]);
  const [draft, setDraft] = useState<ContentValues | null>(null);
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState(false);
  const status = useRef<EmploymentEditStatus>(CLEAN);
  const [summary, setSummary] = useState<EmploymentEditStatus>(CLEAN);
  const reportStatus = useCallback((next: EmploymentEditStatus) => { status.current = next; setSummary(next); }, []);
  const canLeave = useCallback(() => {
    const allowed = canLeaveSmartCareEditor(status.current, message => window.confirm(message));
    // The caller immediately changes views. Avoid a second beforeunload prompt on site return.
    if (allowed) status.current = CLEAN;
    return allowed;
  }, []);
  useEffect(() => {
    leaveGuard.current = canLeave;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (status.current.dirty || status.current.saving) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { leaveGuard.current = () => true; window.removeEventListener('beforeunload', beforeUnload); };
  }, [canLeave, leaveGuard]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setError('');
    void load(controller.signal).then(result => { if (active) setRows(result); })
      .catch(() => { if (active) setError(SMARTCARE_LOAD_ERROR); });
    return () => { active = false; controller.abort(); };
  }, [attempt, load]);
  const select = (id: SmartCareId): boolean => {
    if (id === selected) return true;
    if (!canLeave()) return false;
    setSelected(id);
    setDraft(null);
    return true;
  };
  const navigationItems: SmartCareNavigationItem[] | null = rows && rows.map(row => {
    const current = row.id === selected && draft ? draft : null;
    return { id: row.id, stage: typeof current?.stage === 'string' ? current.stage : row.stage,
      title: typeof current?.title === 'string' ? current.title : row.title,
      details: Array.isArray(current?.details) ? [...current.details] : [...row.details] };
  });
  const row = rows?.find(item => item.id === selected);
  return (
    <section className="employment-cms" aria-labelledby="smartcare-cms-title">
      <h2 id="smartcare-cms-title" className="admin-card-title">SmartCare 관리</h2>
      <p className="employment-cms-note">고정된 4개 서비스의 단계명·서비스명·설명·상세 안내만 수정합니다. 저장한 내용은 고객 웹사이트에 즉시 반영되며, 이미 열린 고객 화면에서는 새로고침 후 확인해 주세요. 공개 데이터 조회에 실패하면 기존 안내가 표시됩니다.</p>
      {navigationTarget && createPortal(<SmartCareNavigation items={navigationItems} selected={selected} onSelect={select}
        saving={summary.saving} loading={!rows && !error}
        mobileExpanded={mobileMenuExpanded} onToggleMobile={() => setMobileMenuExpanded(value => !value)} />, navigationTarget)}
      {summary.saving ? <p className="employment-cms-note" role="status">저장 중에는 다른 서비스나 관리 탭으로 이동할 수 없습니다.</p>
        : summary.dirty && <p className="employment-cms-note" role="status">저장하지 않은 변경사항이 있습니다.</p>}
      {error ? <div className="admin-card"><p className="employment-cms-error" role="alert">{error}</p>
        <button type="button" className="admin-save-btn" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></div>
        : !rows || !row ? <p className="employment-cms-note" role="status">SmartCare 내용을 불러오는 중...</p>
        : <div id="smartcare-service-panel" role="region" aria-labelledby={'smartcare-tab-' + selected}>
          <SmartCareServiceForm key={selected} row={row} rows={rows} onSave={onSave} reportStatus={reportStatus} reportDraft={setDraft}
            onSaved={saved => setRows(current => current && current.map(item => item.id === saved.id ? saved : item))} />
        </div>}
    </section>
  );
}

function SmartCareServiceForm({ row, rows, onSave, onSaved, reportStatus, reportDraft }: {
  row: SmartCareRow; rows: SmartCareRow[]; onSave: SaveSmartCareContent; onSaved: (row: SmartCareRow) => void;
  reportStatus: (status: EmploymentEditStatus) => void; reportDraft: (draft: ContentValues | null) => void;
}) {
  const [state, setState] = useState(() => createSmartCareEditorState(row));
  const [preview, setPreview] = useState<SmartCarePreviewData | null>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const dirty = smartCareEditorDirty(state);
  const errors = smartCareEditorErrors(state);
  const invalid = Object.keys(errors).length > 0;
  useEffect(() => { reportDraft(state.draft); }, [state.draft, reportDraft]);
  useEffect(() => { reportStatus({ dirty, saving: state.saving }); }, [dirty, state.saving, reportStatus]);
  useEffect(() => () => { reportStatus(CLEAN); reportDraft(null); }, [reportStatus, reportDraft]);
  const save = async () => {
    if (pending.current || !dirty || invalid) return;
    pending.current = true;
    reportStatus({ dirty: true, saving: true });
    setState(current => ({ ...current, saving: true, error: '', notice: '' }));
    try {
      const result = await onSave(buildSmartCarePatch(row.id, state));
      setState(savedSmartCareEditorState(result));
      reportStatus(CLEAN);
      onSaved(result);
    } catch {
      setState(current => failedSmartCareEditorState(current));
      reportStatus({ dirty: true, saving: false });
    } finally { pending.current = false; }
  };
  const field = (name: string) => SMARTCARE_FIELDS.find(item => item.name === name)!;
  const textInput = (name: string, multiline = false) => {
    const { label, max } = field(name);
    const id = 'smartcare-field-' + name;
    const shared = { id, className: 'admin-input', value: state.draft[name] as string, maxLength: max, disabled: state.saving,
      'aria-describedby': id + '-notice', 'aria-invalid': dirty && !!errors[name] || undefined,
      onChange: (event: { target: { value: string } }) => setState(current => editSmartCareField(current, name, event.target.value)) };
    return <div className={multiline ? 'employment-cms-field employment-cms-field-wide' : 'employment-cms-field'}>
      <label className="admin-field-label" htmlFor={id}>{label} ({(state.draft[name] as string).length}/{max})</label>
      {multiline ? <textarea {...shared} rows={3} /> : <input {...shared} type="text" />}
      <p id={id + '-notice'} className="employment-cms-note">{smartCareFieldNotice(name)}</p>
    </div>;
  };
  const details = state.draft.details as string[];
  const detailsMax = field('details').max;
  return (
    <form className="employment-cms" aria-labelledby="smartcare-service-heading" aria-busy={state.saving}
      onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="employment-cms-preview-toolbar">
        <h3 id="smartcare-service-heading" className="employment-cms-program-name">{smartCareServiceLabel({ stage: state.draft.stage as string, title: state.draft.title as string })}</h3>
        <button ref={previewButton} type="button" className="employment-cms-line-button"
          onClick={() => setPreview(buildSmartCarePreview(rows, row.id, state.draft))}>고객 화면 미리보기</button>
      </div>
      <section id={SMARTCARE_AREA.basic} tabIndex={-1} className="admin-card employment-cms-card employment-navigation-target" aria-labelledby="smartcare-basic-heading">
        <h4 id="smartcare-basic-heading" className="admin-card-title">단계명 · 서비스명</h4>
        <div className="employment-cms-fields">{textInput('stage')}{textInput('title')}</div>
      </section>
      <section id={SMARTCARE_AREA.description} tabIndex={-1} className="admin-card employment-cms-card employment-navigation-target" aria-labelledby="smartcare-description-heading">
        <h4 id="smartcare-description-heading" className="admin-card-title">설명</h4>
        <div className="employment-cms-fields">{textInput('description', true)}</div>
      </section>
      <section id={SMARTCARE_AREA.details} tabIndex={-1} className="admin-card employment-cms-card employment-navigation-target" aria-labelledby="smartcare-details-heading">
        <h4 id="smartcare-details-heading" className="admin-card-title">상세 안내</h4>
        <p className="employment-cms-note">{smartCareFieldNotice('details')}</p>
        {details.map((item, index) => {
          const id = 'smartcare-field-details-' + index;
          return <div key={index} id={SMARTCARE_AREA.detail(index)} tabIndex={-1} className="employment-cms-input-wrap employment-navigation-target">
            <label className="admin-field-label" htmlFor={id}>상세 안내 {index + 1} ({item.length}/{detailsMax})</label>
            <div className="employment-cms-line-row">
              <input id={id} className="admin-input" type="text" value={item} maxLength={detailsMax} disabled={state.saving}
                onChange={event => setState(current => editSmartCareField(current, 'details', event.target.value, index))} />
              <button type="button" className="employment-cms-line-button" aria-label={`상세 안내 ${index + 1} 삭제`}
                disabled={state.saving || details.length <= SMARTCARE_MIN_DETAILS}
                onClick={() => setState(current => removeSmartCareDetail(current, index))}>삭제</button>
            </div>
          </div>;
        })}
        <div className="employment-cms-line-actions">
          <button type="button" className="employment-cms-line-button" disabled={state.saving || details.length >= SMARTCARE_MAX_DETAILS}
            onClick={() => setState(current => addSmartCareDetail(current))}>+ 상세 안내 추가</button>
          <span className="employment-cms-note">상세 안내 {details.length}/{SMARTCARE_MAX_DETAILS} · 최소 {SMARTCARE_MIN_DETAILS}개 유지</span>
        </div>
      </section>
      <div className="admin-card employment-cms-card">
        <div className="employment-cms-save-row">
          <span className="employment-cms-note">{dirty ? '수정됨 · 저장 필요' : '변경 없음'}</span>
          <button type="submit" className="admin-save-btn" disabled={!dirty || state.saving || invalid}>{state.saving ? '저장 중...' : '이 서비스 저장'}</button>
        </div>
        <p className="employment-cms-note">저장 전 고객 화면 미리보기에서 변경 위치와 변경 전후 내용을 확인해 주세요.</p>
        {dirty && invalid && <ul className="employment-cms-error" role="alert">{Object.values(errors).map(message => <li key={message}>{message}</li>)}</ul>}
        {state.notice && <p className="employment-cms-success" role="status">{state.notice}</p>}
        {state.error && <p className="employment-cms-error" role="alert">{state.error}</p>}
      </div>
      {preview && <SmartCarePreview data={preview} serviceLabel={smartCareServiceLabel(row)} onClose={() => setPreview(null)} returnFocus={previewButton} />}
    </form>
  );
}
