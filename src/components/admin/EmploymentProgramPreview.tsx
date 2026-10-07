import { useEffect, useRef, type RefObject } from 'react';
import type { EmploymentPreviewData } from './employmentPreview';
import './EmploymentProgramPreview.css';

export function EmploymentProgramPreview({ data, onClose, returnFocus }: {
  data: EmploymentPreviewData; onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
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
      <div className="employment-preview-scroll">
        <EmploymentPreviewContent data={data} />
      </div>
    </dialog>
  );
}

// Administrator-only presentation, intentionally independent of programs.ts/customer rendering.
export function EmploymentPreviewContent({ data }: { data: EmploymentPreviewData }) {
  const { program, benefits, sections } = data;
  const { seeker, employer, policy } = program;
  return (
    <div className="employment-preview-content">
      <section className="employment-preview-hero">
        {seeker.kind && <p className="employment-preview-eyebrow">{seeker.kind}</p>}
        <h3>{program.name}</h3>
        {seeker.description && <p>{seeker.description}</p>}
        {seeker.target && <div className="employment-preview-target"><strong>지원 대상</strong><p>{seeker.target}</p></div>}
        {seeker.big && <p className="employment-preview-amount">{seeker.big}</p>}
        {seeker.sub && <p>{seeker.sub}</p>}
      </section>
      {(employer.target || employer.amount || employer.description) && <section className="employment-preview-card">
        <h4>기업 지원 정보</h4>
        {employer.target && <p><strong>기업 대상 · </strong>{employer.target}</p>}
        {employer.amount && <p className="employment-preview-amount">{employer.amount}</p>}
        {employer.description && <p>{employer.description}</p>}
      </section>}
      {benefits.map((benefit, index) => <section className="employment-preview-card employment-preview-benefit" key={index}>
        <h4>{benefit.type} · {benefit.items.join(' · ')}</h4>
        {benefit.sub && <p>{benefit.sub}</p>}
        {benefit.headline && <p className="employment-preview-amount">{benefit.headline}</p>}
        {benefit.note && <p>{benefit.note}</p>}
        <p className="employment-preview-eyebrow">{benefit.summaryType} · {benefit.summaryBottom}</p>
        <ul>{benefit.lines.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
      </section>)}
      {sections.map((section, index) => <section className="employment-preview-card" key={index}>
        <h4>{section.title}</h4>
        <ul>{section.lines.map((line, lineIndex) => <li key={lineIndex}>{line || <span className="employment-preview-empty">(작성 중인 빈 줄)</span>}</li>)}</ul>
      </section>)}
      {(policy.date || policy.source || policy.url) && <section className="employment-preview-card employment-preview-source">
        <h4>정책 기준 정보</h4>
        {policy.date && <p>정책 기준일 · {policy.date}</p>}
        {policy.source && <p>출처 · {policy.source}</p>}
        {policy.url && <p>출처 주소 · {policy.url}</p>}
      </section>}
    </div>
  );
}
