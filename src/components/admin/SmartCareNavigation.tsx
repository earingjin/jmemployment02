import { SMARTCARE_IDS, type SmartCareId } from '../../data/smartCare';
import { focusEmploymentArea } from './EmploymentProgramNavigation';

export interface SmartCareNavigationItem { id: SmartCareId; stage: string; title: string; details: string[] }
export const SMARTCARE_AREA = {
  basic: 'smartcare-area-basic', description: 'smartcare-area-description',
  details: 'smartcare-area-details', detail: (index: number) => 'smartcare-area-detail-' + index,
} as const;
export function smartCareServiceLabel(item: Pick<SmartCareNavigationItem, 'stage' | 'title'>): string {
  return [item.stage, item.title].map(value => value.trim()).filter(Boolean).join(' · ') || '(이름 작성 중)';
}

// Same hierarchy and classes as the employment program sidebar: fixed services, then editable areas.
export function SmartCareNavigation({ items, selected, onSelect, activeArea, onNavigate, saving = false, loading = false,
  expanded = true, onToggleExpand, detailsOpen = true, onToggleDetails,
  mobileExpanded = false, onToggleMobile }: {
  items: SmartCareNavigationItem[] | null; selected: SmartCareId; onSelect: (id: SmartCareId) => boolean;
  activeArea?: string; onNavigate: (id: string, document: Pick<Document, 'getElementById'>) => boolean;
  saving?: boolean; loading?: boolean;
  // `expanded` only governs the selected service's own panel; selection and disclosure are independent.
  expanded?: boolean; onToggleExpand?: () => void;
  detailsOpen?: boolean; onToggleDetails?: () => void;
  mobileExpanded?: boolean; onToggleMobile?: () => void;
}) {
  return <nav className="employment-program-navigation" aria-label="SmartCare 서비스 선택">
    <h2>SmartCare</h2>
    <p>서비스를 선택한 후 편집 항목으로 이동하세요. 서비스 추가·삭제·순서 변경은 지원하지 않습니다.</p>
    <button type="button" className="employment-program-mobile-toggle" aria-expanded={mobileExpanded}
      aria-controls="smartcare-sidebar-menu" onClick={onToggleMobile}>SmartCare 편집 메뉴</button>
    <div id="smartcare-sidebar-menu" className="employment-program-navigation-scroll" data-expanded={mobileExpanded}>
      {loading && <p role="status">서비스 목록을 불러오는 중...</p>}
      {items?.map((item, index) => {
        const isSelected = selected === item.id;
        const isOpen = isSelected && expanded;
        const link = (id: string, label: string, number?: number) => <a key={id} href={'#' + id}
          aria-current={activeArea === id ? 'location' : undefined} aria-disabled={saving || undefined}
          tabIndex={saving ? -1 : undefined} className={activeArea === id ? 'active' : undefined}
          onClick={event => {
            event.preventDefault();
            if (!saving) onNavigate(id, event.currentTarget.ownerDocument);
          }}>{number !== undefined && <span className="employment-nav-item-number">{number + 1}. </span>}{label}</a>;
        return <section className="employment-program-choice" key={item.id}>
          <h3><button type="button" id={'smartcare-tab-' + item.id} aria-pressed={isSelected} aria-expanded={isOpen}
            aria-controls={'smartcare-navigation-' + item.id} disabled={saving && !isSelected}
            className={'admin-branch-item' + (isSelected ? ' active' : '')}
            onClick={() => { if (isSelected) onToggleExpand?.(); else onSelect(item.id); }}
            onKeyDown={event => {
              if (saving) return;
              let next: number;
              if (event.key === 'ArrowDown') next = (index + 1) % SMARTCARE_IDS.length;
              else if (event.key === 'ArrowUp') next = (index + SMARTCARE_IDS.length - 1) % SMARTCARE_IDS.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = SMARTCARE_IDS.length - 1;
              else return;
              event.preventDefault();
              event.currentTarget.ownerDocument.getElementById('smartcare-tab-' + SMARTCARE_IDS[next])?.focus();
            }}><span className="employment-nav-item-number">STEP {index + 1}. </span>{smartCareServiceLabel(item)}</button></h3>
          <div id={'smartcare-navigation-' + item.id} role="region" aria-labelledby={'smartcare-tab-' + item.id} hidden={!isOpen}>
            {isOpen && <nav className="employment-edit-navigation" aria-label="SmartCare 서비스 편집 항목">
              {link(SMARTCARE_AREA.basic, '단계명 · 서비스명')}
              {link(SMARTCARE_AREA.description, '설명')}
              <div className="employment-edit-group" data-active={activeArea === SMARTCARE_AREA.details || !!activeArea?.startsWith('smartcare-area-detail-')}>
                <button type="button" id="smartcare-edit-group-details-toggle" className="employment-edit-group-toggle"
                  aria-expanded={detailsOpen} aria-controls="smartcare-edit-group-details-panel"
                  onClick={() => onToggleDetails?.()}>상세 안내 <span>({item.details.length})</span></button>
                <div id="smartcare-edit-group-details-panel" role="region" aria-labelledby="smartcare-edit-group-details-toggle"
                  hidden={!detailsOpen} className="employment-edit-items">
                  {link(SMARTCARE_AREA.details, '상세 안내 전체')}
                  {item.details.map((detail, i) => link(SMARTCARE_AREA.detail(i), detail.trim() || '(작성 중)', i))}
                </div>
              </div>
            </nav>}
          </div>
        </section>;
      })}
    </div>
  </nav>;
}
export { focusEmploymentArea as focusSmartCareArea };
