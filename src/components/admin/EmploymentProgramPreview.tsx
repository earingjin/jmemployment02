import { useEffect, useRef, useState, type RefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hero } from '../home/Hero';
import { ProgramDetailPage } from '../../pages/ProgramDetailPage';
import { ProgramModal } from '../modals/ProgramModal';
import { EmployerView } from '../views/EmployerView';
import customerStylesUrl from '../../styles/global.css?url';
import type { EmploymentPreviewData } from './employmentPreview';
import { CUSTOMER_PREVIEW_SCREENS, affectedCustomerScreens, customerChangeSelectors, previewTabAtKey,
  type CustomerPreviewScreen, type CustomerPreviewChange } from './employmentCustomerImpact';
import './EmploymentProgramPreview.css';

const noop = () => {};
export function renderCustomerPreviewMarkup(data: EmploymentPreviewData, screen: CustomerPreviewScreen): string {
  if (!data.customer) return '';
  const { program, benefitGroups } = data.customer;
  const programs = [program];
  const content = screen === 'hero' ? <Hero programLabel={program.label} benefitGroups={benefitGroups} onConsult={noop} onDetail={noop} onBranch={noop} />
    : screen === 'detail' ? <ProgramDetailPage programId={data.programId} programs={programs} onBack={noop} onConsult={noop} />
    : screen === 'employer' ? <EmployerView active benefitYear={data.benefitYear} programs={programs} onDetail={noop} onConsult={noop} />
    : <ProgramModal open programId={program.id} audience={screen === 'modal-employer' ? 'employer' : 'seeker'}
      programs={programs} onClose={noop} onOpenDetail={noop} onConsult={noop} />;
  return renderToStaticMarkup(<div className={screen === 'hero' ? 'page mobile-home' : 'page'}>{content}</div>);
}
const frameStyles = 'html,body{margin:0;min-width:0;overflow:hidden;} [data-employment-preview-changed]{outline:2px solid #d97706;outline-offset:3px;} .program-modal-overlay{position:relative;inset:auto;min-height:0;background:transparent;backdrop-filter:none;} .program-modal{max-height:none;animation:none;}';
// Only React-escaped markup from the real customer components enters the sandboxed, script-free document.
export function customerPreviewDocument(data: EmploymentPreviewData, screen: CustomerPreviewScreen): string {
  return '<!doctype html>' + renderToStaticMarkup(<html lang="ko"><head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href={customerStylesUrl} /><style>{frameStyles}</style>
  </head><body dangerouslySetInnerHTML={{ __html: renderCustomerPreviewMarkup(data, screen) }} /></html>);
}
export function markCustomerPreviewChanges(document: Document, data: EmploymentPreviewData, screen: CustomerPreviewScreen): number {
  if (!data.customer) return 0;
  const selectors = data.changes.flatMap(change => customerChangeSelectors(change, screen, data.customer!.program,
    data.customer!.benefitGroups, data.sections));
  const matches = new Set(selectors.flatMap(selector => Array.from(document.querySelectorAll(selector))));
  matches.forEach(element => element.setAttribute('data-employment-preview-changed', ''));
  return matches.size;
}
function changeText(value: CustomerPreviewChange['after']): string {
  return value === null ? '(비어 있음)' : Array.isArray(value) ? value.map(line => line || '(작성 중인 빈 줄)').join(' / ') : value || '(작성 중인 빈 값)';
}
export function EmploymentProgramPreview({ data, onClose, returnFocus }: {
  data: EmploymentPreviewData; onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const tabs = useRef(new Map<CustomerPreviewScreen, HTMLButtonElement>());
  const [selected, setSelected] = useState<CustomerPreviewScreen>(() => data.screens[0]);
  const [changedOnly, setChangedOnly] = useState(false);
  const affected = affectedCustomerScreens(data.changes);
  const visible = data.screens.filter(screen => !changedOnly || affected.includes(screen));
  const active = visible.includes(selected) ? selected : visible[0];
  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, [returnFocus]);
  return (
    <dialog ref={dialog} className="employment-preview-dialog" role="dialog" aria-modal="true"
      aria-labelledby="employment-preview-title" aria-describedby="employment-preview-notice"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="employment-preview-header">
        <div>
          <h2 id="employment-preview-title">고객 화면 미리보기</h2>
          <p id="employment-preview-notice">현재 입력 중인 내용을 기준으로 표시됩니다.<br />미리보기만으로는 실제 고객 웹사이트에 반영되지 않습니다.</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="고객 화면 미리보기 닫기">닫기</button>
      </header>
      <div className="employment-preview-controls">
        <button type="button" className="employment-preview-filter" aria-pressed={changedOnly}
          onClick={() => setChangedOnly(value => !value)}>수정된 항목만 보기</button>
        <p>선택한 사업만 표시합니다. 이동·상담 버튼은 미리보기에서 동작하지 않습니다.</p>
        {!!visible.length && <div role="tablist" aria-label="고객 반영 화면">
          {visible.map(screen => <button key={screen} type="button" role="tab" id={'employment-preview-tab-' + screen}
            ref={element => { if (element) tabs.current.set(screen, element); else tabs.current.delete(screen); }}
            aria-selected={active === screen} aria-controls="employment-preview-panel" tabIndex={active === screen ? 0 : -1}
            onClick={() => setSelected(screen)} onKeyDown={event => {
              const next = previewTabAtKey(visible, screen, event.key);
              if (next) { event.preventDefault(); setSelected(next); tabs.current.get(next)?.focus(); }
            }}>{CUSTOMER_PREVIEW_SCREENS.find(item => item.id === screen)!.label}</button>)}
        </div>}
      </div>
      <div className="employment-preview-scroll">
        <div className="employment-preview-unmapped">
          {data.changes.some(change => !change.screens.length) && <>
            <strong>고객 화면에 직접 표시되지 않는 변경 항목</strong>
            <ul>{data.changes.filter(change => !change.screens.length).map(change => <li key={change.areaId + change.field}>
              {change.label}: {changeText(change.after)} — 고객 화면에 직접 표시되지 않습니다.
            </li>)}</ul>
          </>}
          <p>정적 프로그램 카드와 별도 고정 문구는 이 편집 내용으로 변경되지 않습니다. 정책 기준 정보는 고객 출처 문구나 기업 화면의 기준연도와 연결되어 있지 않습니다.</p>
        </div>
        {active ? <section id="employment-preview-panel" role="tabpanel" aria-labelledby={'employment-preview-tab-' + active} tabIndex={0}>
          <EmploymentPreviewContent data={data} screen={active} />
        </section> : <p className="employment-preview-empty-state" role="status">
          {data.changes.length ? '변경된 필드가 직접 반영되는 고객 화면이 없습니다.' : '수정된 항목이 없습니다.'}
        </p>}
      </div>
    </dialog>
  );
}

export function EmploymentPreviewContent({ data, screen = 'detail' }: { data: EmploymentPreviewData; screen?: CustomerPreviewScreen }) {
  const resizeObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => resizeObserver.current?.disconnect(), [data, screen]);
  const changes = data.changes.filter(change => change.screens.includes(screen));
  const title = CUSTOMER_PREVIEW_SCREENS.find(item => item.id === screen)!.label;
  return <div className="employment-preview-content">
    {changes.length > 0 && <aside className="employment-preview-changes" aria-label={title + ' 변경 항목'}>
      <strong>이 화면의 변경 항목</strong>
      <p>정확하게 찾은 표시 위치만 테두리로 강조합니다. 삭제되었거나 위치를 확정할 수 없는 항목은 아래 목록에서 확인해 주세요.</p>
      <ul>{changes.map(change => <li key={change.areaId + change.field}>
        <span>{change.label}</span><del>{changeText(change.before)}</del><ins>{changeText(change.after)}</ins>
      </li>)}</ul>
    </aside>}
    {data.error ? <p role="alert" className="employment-preview-validation">{data.error} 고객과 동일한 변환을 적용할 수 없어 화면을 임의로 표시하지 않습니다.</p>
      : <iframe key={screen} className="employment-preview-frame" title={title + ' 미리보기'} tabIndex={-1}
        sandbox="allow-same-origin" srcDoc={customerPreviewDocument(data, screen)} onLoad={event => {
          const frame = event.currentTarget;
          const document = frame.contentDocument;
          if (!document) return;
          markCustomerPreviewChanges(document, data, screen);
          const resize = () => { frame.style.height = Math.max(1, Math.ceil(document.body.getBoundingClientRect().height)) + 'px'; };
          resize();
          resizeObserver.current?.disconnect();
          if (typeof ResizeObserver !== 'undefined') {
            resizeObserver.current = new ResizeObserver(resize);
            resizeObserver.current.observe(document.body);
          }
        }} />}
  </div>;
}
