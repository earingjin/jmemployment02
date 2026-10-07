import { useCallback, useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { BENEFIT_CONTENT_FIELDS, loadEmploymentProgram,
  POLICY_SOURCE_FIELDS, PROGRAM_CONTENT_FIELDS, PROGRAM_LOAD_ERROR, SECTION_CONTENT_FIELDS,
  type ContentField, type ContentValues, type EmploymentContentRow, type EmploymentPatchRequest, type EmploymentProgramData,
  type EmploymentProgramId, type EmploymentSelector } from '../../data/employmentPrograms';
import { addEmploymentSectionLine, deleteEmploymentSectionLine, SECTION_MIN_LINES, SECTION_MAX_LINES, sectionLinesError,
  buildEmploymentPatch, canLeaveEmploymentEditor, createEmploymentEditorState,
  editEmploymentField, employmentEditorDirty, failedEmploymentEditorState, savedEmploymentEditorState,
  type EmploymentEditStatus } from './employmentEditorState';
import './EmploymentProgramsEditor.css';
import { buildEmploymentPreview, type EmploymentPreviewData } from './employmentPreview';
import { EmploymentProgramPreview } from './EmploymentProgramPreview';
import { EmploymentProgramNavigation, EmploymentQuickNavigation, selectEmploymentProgram } from './EmploymentProgramNavigation';

export type SaveEmploymentContent = (request: EmploymentPatchRequest) => Promise<EmploymentContentRow>;

export function EmploymentProgramsEditor({ onSave, leaveGuard, navigationTarget }: {
  onSave: SaveEmploymentContent; leaveGuard: RefObject<() => boolean>; navigationTarget: HTMLElement | null;
}) {
  const [selected, setSelected] = useState<EmploymentProgramId>('employment-support');
  const statuses = useRef(new Map<string, EmploymentEditStatus>());
  const [summary, setSummary] = useState({ dirty: false, saving: false });
  const reportStatus = useCallback((key: string, status?: EmploymentEditStatus) => {
    if (status) statuses.current.set(key, status); else statuses.current.delete(key);
    const values = [...statuses.current.values()];
    setSummary({ dirty: values.some(value => value.dirty), saving: values.some(value => value.saving) });
  }, []);
  const canLeave = useCallback(() => {
    const allowed = canLeaveEmploymentEditor(statuses.current.values(), message => window.confirm(message));
    // The caller immediately changes views. Avoid a second beforeunload prompt on site return.
    if (allowed) statuses.current.clear();
    return allowed;
  }, []);
  useEffect(() => {
    leaveGuard.current = canLeave;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ([...statuses.current.values()].some(value => value.dirty || value.saving)) {
        event.preventDefault(); event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { leaveGuard.current = () => true; window.removeEventListener('beforeunload', beforeUnload); };
  }, [canLeave, leaveGuard]);
  const select = (id: EmploymentProgramId): boolean => selectEmploymentProgram(selected, id, canLeave, setSelected);
  return (
    <section className="employment-cms" aria-labelledby="employment-cms-title">
      <h2 id="employment-cms-title" className="admin-card-title">고용지원사업 관리</h2>
      <p className="employment-cms-note">현재 저장된 정책 내용을 편집합니다. 이번 단계의 변경사항은 고객 웹사이트에 반영되지 않습니다.</p>
      {navigationTarget && createPortal(<EmploymentProgramNavigation selected={selected} onSelect={select} />, navigationTarget)}
      {summary.saving ? <p className="employment-cms-note" role="status">저장 중에는 다른 사업이나 관리 탭으로 이동할 수 없습니다.</p>
        : summary.dirty && <p className="employment-cms-note" role="status">저장하지 않은 변경사항이 있습니다.</p>}
      <div id="employment-program-panel" role="region" aria-labelledby={`employment-tab-${selected}`}>
        <EmploymentProgramWorkspace key={selected} id={selected} onSave={onSave} reportStatus={reportStatus} />
      </div>
    </section>
  );
}

function EmploymentProgramWorkspace({ id, onSave, reportStatus }: {
  id: EmploymentProgramId; onSave: SaveEmploymentContent;
  reportStatus: (key: string, status?: EmploymentEditStatus) => void;
}) {
  const [data, setData] = useState<EmploymentProgramData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const drafts = useRef(new Map<string, ContentValues>());
  const previewButton = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<EmploymentPreviewData | null>(null);
  const reportDraft = useCallback((areaId: string, draft: ContentValues) => { drafts.current.set(areaId, draft); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setError('');
    void loadEmploymentProgram(id, controller.signal).then(result => {
      if (active) setData(result);
    }).catch(() => { if (active) setError(PROGRAM_LOAD_ERROR); });
    return () => { active = false; controller.abort(); };
  }, [id, attempt]);
  const saved = (row: EmploymentContentRow) => {
    setData(current => {
      if (!current) return current;
      if ('id' in row) return { ...current, program: row };
      if ('section_key' in row) return { ...current, sections: current.sections.map(section => section.section_key === row.section_key ? row : section) };
      return { ...current, benefits: current.benefits.map(benefit => benefit.benefit_key === row.benefit_key ? row : benefit) };
    });
  };
  if (error) return <div className="admin-card"><p className="employment-cms-error" role="alert">{error}</p>
    <button type="button" className="admin-save-btn" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></div>;
  if (!data) return <p className="employment-cms-note" role="status">사업 내용을 불러오는 중...</p>;
  return (
    <>
      <div className="employment-cms-preview-toolbar">
        <h3 className="employment-cms-program-name">{data.program.label}</h3>
        <button ref={previewButton} type="button" className="employment-cms-line-button"
          onClick={() => setPreview(buildEmploymentPreview(data, drafts.current))}>고객 화면 미리보기</button>
      </div>
      <EmploymentQuickNavigation sections={data.sections} />
      <EmploymentRowEditor row={data.program} fields={PROGRAM_CONTENT_FIELDS} selector={{ target: 'program', program_id: id }}
        title="기본 정보" saveLabel="기본 정보 저장" areaId="program" onSave={onSave} onSaved={saved} reportStatus={reportStatus} reportDraft={reportDraft} />
      <h3 className="admin-card-title employment-navigation-target" id="employment-group-benefits" tabIndex={-1}>지원금 안내</h3>
      {data.benefits.length === 0 && <p className="employment-cms-note">현재 등록된 지원금 안내가 없습니다.</p>}
      {data.benefits.map((benefit, index) => <EmploymentRowEditor key={benefit.benefit_key} row={benefit} fields={BENEFIT_CONTENT_FIELDS}
        selector={{ target: 'benefit-group', program_id: id, benefit_key: benefit.benefit_key }}
        title={`지원금 안내 ${index + 1} · ${benefit.type_label}`} saveLabel="이 지원금 안내 저장" areaId={`benefit-${index}`}
        onSave={onSave} onSaved={saved} reportStatus={reportStatus} reportDraft={reportDraft} />)}
      <h3 className="admin-card-title employment-navigation-target" id="employment-group-details" tabIndex={-1}>상세 안내</h3>
      {data.sections.length === 0 && <p className="employment-cms-note">현재 등록된 상세 안내가 없습니다.</p>}
      {data.sections.map((section, index) => <EmploymentRowEditor key={section.section_key} row={section} fields={SECTION_CONTENT_FIELDS}
        selector={{ target: 'section', program_id: id, section_key: section.section_key }}
        title={section.title} saveLabel="이 상세 안내 저장" areaId={`section-${index}`}
        onSave={onSave} onSaved={saved} reportStatus={reportStatus} reportDraft={reportDraft} />)}
      <EmploymentRowEditor row={data.program} fields={POLICY_SOURCE_FIELDS} selector={{ target: 'program', program_id: id }}
        title="정책 기준 정보" saveLabel="정책 기준 정보 저장" areaId="source" onSave={onSave} onSaved={saved} reportStatus={reportStatus} reportDraft={reportDraft} />
      {preview && <EmploymentProgramPreview data={preview} onClose={() => setPreview(null)} returnFocus={previewButton} />}
    </>
  );
}

function EmploymentRowEditor({ row, fields, selector, title, saveLabel, areaId, onSave, onSaved, reportStatus, reportDraft }: {
  row: EmploymentContentRow; fields: ContentField[]; selector: EmploymentSelector;
  title: string; saveLabel: string; areaId: string; onSave: SaveEmploymentContent;
  onSaved: (row: EmploymentContentRow) => void; reportStatus: (key: string, status?: EmploymentEditStatus) => void;
  reportDraft: (key: string, draft: ContentValues) => void;
}) {
  const [state, setState] = useState(() => createEmploymentEditorState(row, fields));
  const pending = useRef(false);
  const dirty = employmentEditorDirty(state);
  const linesError = selector.target === 'section' ? sectionLinesError(state.draft.lines) : '';
  useEffect(() => { reportDraft(areaId, state.draft); }, [areaId, state.draft, reportDraft]);
  useEffect(() => { reportStatus(areaId, { dirty, saving: state.saving }); }, [areaId, dirty, state.saving, reportStatus]);
  useEffect(() => () => reportStatus(areaId), [areaId, reportStatus]);
  const edit = (field: ContentField, value: string, index?: number) => setState(current => editEmploymentField(current, field, value, index));
  const save = async () => {
    if (pending.current || !dirty || linesError) return;
    pending.current = true;
    reportStatus(areaId, { dirty: true, saving: true });
    setState(current => ({ ...current, saving: true, error: '', notice: '' }));
    try {
      const result = await onSave(buildEmploymentPatch(selector, state));
      const clean = savedEmploymentEditorState(state, result, fields);
      setState(clean);
      reportStatus(areaId, { dirty: false, saving: false });
      onSaved(result);
    } catch {
      setState(current => failedEmploymentEditorState(current));
      reportStatus(areaId, { dirty: true, saving: false });
    } finally { pending.current = false; }
  };
  return (
    <form id={`employment-area-${areaId}`} tabIndex={-1} className="admin-card employment-cms-card employment-navigation-target" aria-labelledby={`${areaId}-heading`} aria-busy={state.saving}
      onSubmit={event => { event.preventDefault(); void save(); }}>
      <h4 id={`${areaId}-heading`} className="admin-card-title">{title}</h4>
      <div className="employment-cms-fields">
        {fields.map((field, fieldIndex) => {
          const value = state.draft[field.name];
          const inputs = Array.isArray(value) ? value : [value ?? ''];
          const editableLines = selector.target === 'section' && field.name === 'lines';
          return <div key={field.name} className={field.multiline || field.array ? 'employment-cms-field employment-cms-field-wide' : 'employment-cms-field'}>
            {inputs.map((input, index) => {
              const inputId = `${areaId}-field-${fieldIndex}-${index}`;
              const label = field.label + (field.array ? ` ${index + 1}` : '') + (field.nullable ? ' (선택)' : '');
              const shared = { id: inputId, className: 'admin-input', value: input,
                maxLength: field.max, disabled: state.saving,
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => edit(field, event.target.value, field.array ? index : undefined) };
              return <div key={index} className="employment-cms-input-wrap">
                <label className="admin-field-label" htmlFor={inputId}>{label}</label>
                <div className={editableLines ? 'employment-cms-line-row' : undefined}>
                  {field.multiline ? <textarea {...shared} rows={3} /> : <input {...shared} type={field.inputType ?? 'text'} />}
                  {editableLines && <button type="button" className="employment-cms-line-button"
                    aria-label={`내용 줄 ${index + 1} 삭제`} disabled={state.saving || inputs.length <= SECTION_MIN_LINES}
                    title={inputs.length <= SECTION_MIN_LINES ? '내용 줄은 최소 1개 유지해야 합니다.' : '저장 전 편집 상태에서 이 줄을 삭제합니다.'}
                    onClick={() => setState(current => deleteEmploymentSectionLine(current, index))}>삭제</button>}
                </div>
              </div>;
            })}
            {editableLines && <div className="employment-cms-line-actions">
              <button type="button" className="employment-cms-line-button" disabled={state.saving || inputs.length >= SECTION_MAX_LINES}
                onClick={() => setState(current => addEmploymentSectionLine(current))}>+ 내용 줄 추가</button>
              <span className="employment-cms-note">내용 줄 {inputs.length}/{SECTION_MAX_LINES} · 최소 {SECTION_MIN_LINES}개 유지</span>
            </div>}
          </div>;
        })}
      </div>
      <div className="employment-cms-save-row">
        <span className="employment-cms-note">{dirty ? '수정됨 · 저장 필요' : '변경 없음'}</span>
        <button type="submit" className="admin-save-btn" disabled={!dirty || state.saving || !!linesError}>{state.saving ? '저장 중...' : saveLabel}</button>
      </div>
      {dirty && linesError && <p className="employment-cms-error" role="alert">{linesError}</p>}
      {state.notice && <p className="employment-cms-success" role="status">{state.notice}</p>}
      {state.error && <p className="employment-cms-error" role="alert">{state.error}</p>}
    </form>
  );
}
