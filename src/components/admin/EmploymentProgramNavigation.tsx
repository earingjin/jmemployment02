import { EMPLOYMENT_PROGRAM_OPTIONS, type EmploymentProgramId, type EmploymentSectionRow } from '../../data/employmentPrograms';

export function selectEmploymentProgram(current: EmploymentProgramId, next: EmploymentProgramId,
  canLeave: () => boolean, select: (id: EmploymentProgramId) => void): boolean {
  if (next === current) return true;
  if (!canLeave()) return false;
  select(next);
  return true;
}

export function EmploymentProgramNavigation({ selected, onSelect }: {
  selected: EmploymentProgramId; onSelect: (id: EmploymentProgramId) => boolean;
}) {
  return <nav className="employment-program-navigation" aria-label="고용지원사업 선택">
    <h2>고용지원사업</h2>
    <p>편집할 사업을 선택하세요.</p>
    {EMPLOYMENT_PROGRAM_OPTIONS.map(option => <button type="button" key={option.id}
      id={`employment-tab-${option.id}`} aria-pressed={selected === option.id} aria-controls="employment-program-panel"
      className={'admin-branch-item' + (selected === option.id ? ' active' : '')}
      onClick={() => onSelect(option.id)}>{option.label}</button>)}
  </nav>;
}

export function employmentQuickLinks(sections: Pick<EmploymentSectionRow, 'title'>[]) {
  return {
    groups: [
      { id: 'employment-area-program', label: '기본 정보' },
      { id: 'employment-group-benefits', label: '지원금 안내' },
      { id: 'employment-group-details', label: '상세 안내' },
      { id: 'employment-area-source', label: '정책 기준 정보' },
    ],
    sections: sections.map((section, index) => ({ id: `employment-area-section-${index}`, label: section.title })),
  };
}
export function focusEmploymentArea(element: Pick<HTMLElement, 'focus' | 'scrollIntoView'> | null): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'start', behavior: 'auto' });
}
export function EmploymentQuickNavigation({ sections }: { sections: Pick<EmploymentSectionRow, 'title'>[] }) {
  const links = employmentQuickLinks(sections);
  const renderLinks = (items: typeof links.groups) => items.map(link => <a key={link.id} href={`#${link.id}`}
    onClick={event => {
      event.preventDefault();
      focusEmploymentArea(event.currentTarget.ownerDocument.getElementById(link.id));
    }}>{link.label}</a>);
  return <div className="employment-quick-navigation">
    <nav aria-label="사업 내부 빠른 이동">{renderLinks(links.groups)}</nav>
    {links.sections.length > 0 && <details>
      <summary>상세 안내 항목 바로가기 ({links.sections.length}개)</summary>
      <nav className="employment-section-links" aria-label="상세 안내 빠른 이동">{renderLinks(links.sections)}</nav>
    </details>}
  </div>;
}
