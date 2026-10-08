import type { ReactNode } from 'react';
import { EMPLOYMENT_PROGRAM_OPTIONS, type EmploymentProgramId, type EmploymentSectionRow, type EmploymentBenefitRow, type EmploymentProgramData, type ContentValues } from '../../data/employmentPrograms';

export interface EmploymentNavigationContent {
  programId: EmploymentProgramId;
  sections: Pick<EmploymentSectionRow, 'title'>[];
  benefits: Pick<EmploymentBenefitRow, 'type_label' | 'item_names'>[];
  loading: boolean;
  error: boolean;
}
// Read-only labels follow the workspace card order and current local title drafts.
export function buildEmploymentNavigationContent(programId: EmploymentProgramId, data: EmploymentProgramData | null,
  drafts: ReadonlyMap<string, ContentValues>, error = false): EmploymentNavigationContent {
  const current = data?.program.id === programId ? data : null;
  return { programId, loading: !current && !error, error,
    sections: current?.sections.map((section, index) => {
      const draft = drafts.get('section-' + index);
      return { title: typeof draft?.title === 'string' ? draft.title : section.title };
    }) ?? [],
    benefits: current?.benefits.map((benefit, index) => {
      const draft = drafts.get('benefit-' + index);
      return { type_label: typeof draft?.type_label === 'string' ? draft.type_label : benefit.type_label,
        item_names: Array.isArray(draft?.item_names) ? [...draft.item_names] : [...benefit.item_names] };
    }) ?? [] };
}
export function selectEmploymentProgram(current: EmploymentProgramId, next: EmploymentProgramId,
  canLeave: () => boolean, select: (id: EmploymentProgramId) => void): boolean {
  if (next === current) return true;
  if (!canLeave()) return false;
  select(next);
  return true;
}

export type EmploymentNavigationGroup = 'benefits' | 'sections';
export function EmploymentProgramNavigation({ selected, onSelect, content, activeArea, onNavigate, saving = false,
  expanded = true, onToggleExpand, openGroup = null, onToggleGroup,
  mobileExpanded = false, onToggleMobile }: {
  selected: EmploymentProgramId; onSelect: (id: EmploymentProgramId) => boolean;
  content?: EmploymentNavigationContent | null; activeArea?: string;
  onNavigate?: (id: string, document: Pick<Document, 'getElementById'>) => boolean;
  saving?: boolean;
  // `expanded` only governs the selected business's own panel; selection and disclosure are independent.
  expanded?: boolean; onToggleExpand?: () => void;
  openGroup?: EmploymentNavigationGroup | null; onToggleGroup?: (group: EmploymentNavigationGroup) => void;
  mobileExpanded?: boolean; onToggleMobile?: () => void;
}) {
  const current = content?.programId === selected ? content : null;
  return <nav className="employment-program-navigation" aria-label="고용지원사업 선택">
    <h2>고용지원사업</h2>
    <p>사업을 선택한 후 편집 항목으로 이동하세요.</p>
    <button type="button" className="employment-program-mobile-toggle" aria-expanded={mobileExpanded}
      aria-controls="employment-sidebar-menu" onClick={onToggleMobile}>고용지원사업 편집 메뉴</button>
    <div id="employment-sidebar-menu" className="employment-program-navigation-scroll" data-expanded={mobileExpanded}>
      {EMPLOYMENT_PROGRAM_OPTIONS.map((option, index) => {
        const isSelected = selected === option.id;
        const isOpen = isSelected && expanded;
        return <section className="employment-program-choice" key={option.id}>
          <h3><button type="button" id={'employment-tab-' + option.id} aria-pressed={isSelected} aria-expanded={isOpen}
            aria-controls={'employment-navigation-' + option.id} disabled={saving && !isSelected}
            className={'admin-branch-item' + (isSelected ? ' active' : '')}
            onClick={() => { if (isSelected) onToggleExpand?.(); else onSelect(option.id); }}
            onKeyDown={event => {
              if (saving) return;
              let next: number;
              if (event.key === 'ArrowDown') next = (index + 1) % EMPLOYMENT_PROGRAM_OPTIONS.length;
              else if (event.key === 'ArrowUp') next = (index + EMPLOYMENT_PROGRAM_OPTIONS.length - 1) % EMPLOYMENT_PROGRAM_OPTIONS.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = EMPLOYMENT_PROGRAM_OPTIONS.length - 1;
              else return;
              event.preventDefault();
              event.currentTarget.ownerDocument.getElementById('employment-tab-' + EMPLOYMENT_PROGRAM_OPTIONS[next].id)?.focus();
            }}>{option.label}</button></h3>
          <div id={'employment-navigation-' + option.id} role="region" aria-labelledby={'employment-tab-' + option.id}
            hidden={!isOpen} aria-busy={isOpen && (!current || current.loading)}>
            {isOpen && <EmploymentQuickNavigation hierarchical sections={current?.sections ?? []} benefits={current?.benefits ?? []}
              activeArea={activeArea} disabled={saving || !current || current.loading || current.error} onNavigate={onNavigate}
              openGroup={openGroup} onToggleGroup={onToggleGroup} />}
            {isOpen && (!current || current.loading) && <p role="status">편집 항목을 불러오는 중...</p>}
            {isOpen && current?.error && <p role="status">내용을 불러오지 못했습니다. 본문의 다시 불러오기를 이용해 주세요.</p>}
          </div>
        </section>;
      })}
    </div>
  </nav>;
}

export function employmentQuickLinks(sections: Pick<EmploymentSectionRow, 'title'>[], benefits: Pick<EmploymentBenefitRow, 'type_label' | 'item_names'>[] = []) {
  return {
    groups: [
      { id: 'employment-area-program', label: '기본 정보' },
      { id: 'employment-group-benefits', label: '지원금 안내' },
      { id: 'employment-group-details', label: '상세 안내' },
      { id: 'employment-area-source', label: '정책 기준 정보' },
    ],
    benefits: benefits.map((benefit, index) => ({ id: 'employment-area-benefit-' + index,
      label: [benefit.type_label, ...benefit.item_names].filter(Boolean).join(' · ') })),
    sections: sections.map((section, index) => ({ id: 'employment-area-section-' + index, label: section.title })),
  };
}
export function focusEmploymentArea(element: Pick<HTMLElement, 'focus' | 'scrollIntoView'> | null): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'start', behavior: 'auto' });
}
export function EmploymentQuickNavigation({ sections, benefits = [], hierarchical = false, activeArea,
  disabled = false, onNavigate, openGroup = null, onToggleGroup }: {
  sections: Pick<EmploymentSectionRow, 'title'>[]; benefits?: Pick<EmploymentBenefitRow, 'type_label' | 'item_names'>[];
  hierarchical?: boolean; activeArea?: string; disabled?: boolean;
  onNavigate?: (id: string, document: Pick<Document, 'getElementById'>) => boolean;
  // Collapsing/expanding a group never navigates or loses drafts, so it stays enabled even while `disabled` (e.g. saving).
  openGroup?: EmploymentNavigationGroup | null; onToggleGroup?: (group: EmploymentNavigationGroup) => void;
}) {
  const links = employmentQuickLinks(sections, benefits);
  const renderLink = (link: typeof links.groups[number], number?: number) => <a key={link.id} href={'#' + link.id}
    aria-current={activeArea === link.id ? 'location' : undefined} aria-disabled={disabled || undefined}
    tabIndex={disabled ? -1 : undefined} className={activeArea === link.id ? 'active' : undefined}
    onClick={event => {
      event.preventDefault();
      if (disabled) return;
      const document = event.currentTarget.ownerDocument;
      if (onNavigate) onNavigate(link.id, document);
      else focusEmploymentArea(document.getElementById(link.id));
    }}>{number !== undefined && <span className="employment-nav-item-number">{number + 1}. </span>}{link.label || '(이름 작성 중)'}</a>;
  const currentLink = [...links.groups, ...links.benefits, ...links.sections].find(link => link.id === activeArea);
  const renderLinks = (items: typeof links.groups) => items.map(link => renderLink(link));
  // A single group is open at a time: opening one implicitly closes any other open sibling.
  const group = (key: EmploymentNavigationGroup, label: string, count: number, active: boolean, items: ReactNode) =>
    <div key={key} className="employment-edit-group" data-active={active}>
      <button type="button" id={'employment-edit-group-' + key + '-toggle'} className="employment-edit-group-toggle"
        aria-expanded={openGroup === key} aria-controls={'employment-edit-group-' + key + '-panel'}
        onClick={() => onToggleGroup?.(key)}>{label} <span>({count})</span></button>
      <div id={'employment-edit-group-' + key + '-panel'} role="region" aria-labelledby={'employment-edit-group-' + key + '-toggle'}
        hidden={openGroup !== key} className="employment-edit-items">{items}</div>
    </div>;
  if (hierarchical) return <nav className="employment-edit-navigation" aria-label="사업 내부 편집 항목">
    {currentLink && <p className="employment-current-area">현재 편집: {currentLink.label || '(이름 작성 중)'}</p>}
    {renderLink(links.groups[0])}
    {group('benefits', '지원금 안내', links.benefits.length,
      activeArea === links.groups[1].id || !!activeArea?.startsWith('employment-area-benefit-'), <>
      {renderLink({ ...links.groups[1], label: '지원금 안내 전체' })}
      {links.benefits.map((link, index) => renderLink(link, index))}
      {!links.benefits.length && <p>등록된 지원금 안내가 없습니다.</p>}
    </>)}
    {group('sections', '상세 안내', links.sections.length,
      activeArea === links.groups[2].id || !!activeArea?.startsWith('employment-area-section-'), <>
      {renderLink({ ...links.groups[2], label: '상세 안내 전체' })}
      {links.sections.map((link, index) => renderLink(link, index))}
      {!links.sections.length && <p>등록된 상세 안내가 없습니다.</p>}
    </>)}
    {renderLink(links.groups[3])}
  </nav>;
  return <div className="employment-quick-navigation">
    <nav aria-label="사업 내부 빠른 이동">{renderLinks(links.groups)}</nav>
    {!!links.benefits.length && <details><summary>지원금 안내 항목 바로가기 ({links.benefits.length}개)</summary>
      <nav className="employment-section-links" aria-label="지원금 안내 빠른 이동">{renderLinks(links.benefits)}</nav></details>}
    {!!links.sections.length && <details><summary>상세 안내 항목 바로가기 ({links.sections.length}개)</summary>
      <nav className="employment-section-links" aria-label="상세 안내 빠른 이동">{renderLinks(links.sections)}</nav></details>}
  </div>;
}
