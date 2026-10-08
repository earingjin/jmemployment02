import { useEffect, useRef, useState, type RefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SmartCareSection } from '../home/SmartCareSection';
import { SmartCarePage } from '../../pages/SmartCarePage';
import { SmartSolutionModal } from '../modals/SmartSolutionModal';
import customerStylesUrl from '../../styles/global.css?url';
import { SMARTCARE_PREVIEW_SCREENS, affectedSmartCareScreens, smartCareChangeSelectors, smartCarePreviewTabAtKey,
  type SmartCarePreviewData, type SmartCarePreviewScreen, type SmartCarePreviewChange } from './smartCarePreviewModel';
import './EmploymentProgramPreview.css';

const noop = () => {};
export function renderSmartCarePreviewMarkup(data: SmartCarePreviewData, screen: SmartCarePreviewScreen): string {
  if (!data.solutions) return '';
  const solutions = data.solutions;
  const content = screen === 'home' ? <SmartCareSection solutions={solutions} onDetail={noop} />
    : screen === 'detail' ? <SmartCarePage solutions={solutions} onBack={noop} onConsult={noop} />
    : <SmartSolutionModal open solution={solutions.find(solution => solution.key === data.selectedId) ?? null} onClose={noop} onConsult={noop} />;
  return renderToStaticMarkup(<div className="page">{content}</div>);
}
const frameStyles = 'html,body{margin:0;min-width:0;overflow:hidden;} [data-smartcare-preview-changed]{outline:2px solid #d97706;outline-offset:3px;} .map-modal-overlay{position:relative;inset:auto;min-height:0;padding:24px 0;background:transparent;backdrop-filter:none;} .ai-modal{max-height:none;animation:none;}';
// Only React-escaped markup from the real customer components enters the sandboxed, script-free document.
export function smartCarePreviewDocument(data: SmartCarePreviewData, screen: SmartCarePreviewScreen): string {
  return '<!doctype html>' + renderToStaticMarkup(<html lang="ko"><head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href={customerStylesUrl} /><style>{frameStyles}</style>
  </head><body dangerouslySetInnerHTML={{ __html: renderSmartCarePreviewMarkup(data, screen) }} /></html>);
}
export function markSmartCarePreviewChanges(document: Pick<Document, 'querySelectorAll'>, data: SmartCarePreviewData, screen: SmartCarePreviewScreen): number {
  if (!data.solutions) return 0;
  const matches = new Set(data.changes.flatMap(change => smartCareChangeSelectors(change, screen))
    .flatMap(selector => Array.from(document.querySelectorAll(selector))));
  matches.forEach(element => element.setAttribute('data-smartcare-preview-changed', ''));
  return matches.size;
}
function changeText(value: SmartCarePreviewChange['after']): string {
  return value === null ? '(비어 있음)' : Array.isArray(value) ? value.map((line, index) => `${index + 1}. ${line || '(작성 중인 빈 항목)'}`).join('\n') : value || '(작성 중인 빈 값)';
}
export function SmartCarePreview({ data, serviceLabel, onClose, returnFocus }: {
  data: SmartCarePreviewData; serviceLabel: string; onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const tabs = useRef(new Map<SmartCarePreviewScreen, HTMLButtonElement>());
  const [selected, setSelected] = useState<SmartCarePreviewScreen>('home');
  const [changedOnly, setChangedOnly] = useState(false);
  const affected = affectedSmartCareScreens(data.changes);
  const visible = SMARTCARE_PREVIEW_SCREENS.map(screen => screen.id).filter(screen => !changedOnly || affected.includes(screen));
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
      aria-labelledby="smartcare-preview-title" aria-describedby="smartcare-preview-notice"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="employment-preview-header">
        <div>
          <h2 id="smartcare-preview-title">SmartCare 고객 화면 미리보기 · {serviceLabel}</h2>
          <p id="smartcare-preview-notice">현재 입력 중인 내용을 기준으로 표시됩니다.<br />미리보기만으로는 실제 고객 웹사이트에 반영되지 않습니다.</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="SmartCare 미리보기 닫기">닫기</button>
      </header>
      <div className="employment-preview-controls">
        <button type="button" className="employment-preview-filter" aria-pressed={changedOnly}
          onClick={() => setChangedOnly(value => !value)}>수정된 화면만 보기</button>
        <p>이동·상담 버튼은 미리보기에서 동작하지 않습니다. 안내 모달은 편집 중인 서비스만 표시합니다.</p>
        {!!visible.length && <div role="tablist" aria-label="SmartCare 고객 반영 화면">
          {visible.map(screen => <button key={screen} type="button" role="tab" id={'smartcare-preview-tab-' + screen}
            ref={element => { if (element) tabs.current.set(screen, element); else tabs.current.delete(screen); }}
            aria-selected={active === screen} aria-controls="smartcare-preview-panel" tabIndex={active === screen ? 0 : -1}
            onClick={() => setSelected(screen)} onKeyDown={event => {
              const next = smartCarePreviewTabAtKey(visible, screen, event.key);
              if (next) { event.preventDefault(); setSelected(next); tabs.current.get(next)?.focus(); }
            }}>{SMARTCARE_PREVIEW_SCREENS.find(item => item.id === screen)!.label}</button>)}
        </div>}
      </div>
      <div className="employment-preview-scroll">
        {active ? <section id="smartcare-preview-panel" role="tabpanel" aria-labelledby={'smartcare-preview-tab-' + active} tabIndex={0}>
          <SmartCarePreviewContent data={data} screen={active} />
        </section> : <p className="employment-preview-empty-state" role="status">수정된 항목이 없습니다.</p>}
      </div>
    </dialog>
  );
}

export function SmartCarePreviewContent({ data, screen }: { data: SmartCarePreviewData; screen: SmartCarePreviewScreen }) {
  const resizeObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => resizeObserver.current?.disconnect(), [data, screen]);
  const changes = data.changes.filter(change => change.screens.includes(screen));
  const hidden = data.changes.filter(change => !change.screens.includes(screen));
  const title = SMARTCARE_PREVIEW_SCREENS.find(item => item.id === screen)!.label;
  return <div className="employment-preview-content">
    {changes.length > 0 && <aside className="employment-preview-changes" aria-label={title + ' 변경 항목'}>
      <strong>이 화면의 변경 항목 (변경 전 → 변경 후)</strong>
      <p>바뀐 표시 위치를 테두리로 강조합니다. 삭제된 상세 안내 항목은 화면에 없으므로 아래 목록에서 확인해 주세요.</p>
      <ul>{changes.map(change => <li key={change.field}>
        <span>{change.label}</span><del>{changeText(change.before)}</del><ins>{changeText(change.after)}</ins>
        {change.removedItems.length > 0 && <span>삭제된 항목: {change.removedItems.join(' / ')}</span>}
      </li>)}</ul>
    </aside>}
    {hidden.length > 0 && <p className="employment-preview-unmapped">이 화면에 표시되지 않는 변경 항목: {hidden.map(change => change.label).join(', ')}</p>}
    {data.error ? <p role="alert" className="employment-preview-validation">{data.error} 입력 내용을 고친 후 미리보기를 다시 열어 주세요.</p>
      : <iframe key={screen} className="employment-preview-frame" title={title + ' 미리보기'} tabIndex={-1}
        sandbox="allow-same-origin" srcDoc={smartCarePreviewDocument(data, screen)} onLoad={event => {
          const frame = event.currentTarget;
          const document = frame.contentDocument;
          if (!document) return;
          markSmartCarePreviewChanges(document, data, screen);
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
