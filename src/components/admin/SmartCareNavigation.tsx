import { SMARTCARE_IDS, type SmartCareId } from '../../data/smartCare';

export interface SmartCareNavigationItem { id: SmartCareId; stage: string; title: string; details: string[] }
export const SMARTCARE_AREA = {
  basic: 'smartcare-area-basic', description: 'smartcare-area-description',
  details: 'smartcare-area-details', detail: (index: number) => 'smartcare-area-detail-' + index,
} as const;
export function smartCareServiceLabel(item: Pick<SmartCareNavigationItem, 'stage' | 'title'>): string {
  return [item.stage, item.title].map(value => value.trim()).filter(Boolean).join(' · ') || '(이름 작성 중)';
}

// Flat list of the four fixed services only. No sub-menus: selecting a service shows every one of its
// editable fields together on the right (see SmartCareEditor), so there is nothing left here to disclose.
export function SmartCareNavigation({ items, selected, onSelect, saving = false, loading = false,
  mobileExpanded = false, onToggleMobile }: {
  items: SmartCareNavigationItem[] | null; selected: SmartCareId; onSelect: (id: SmartCareId) => boolean;
  saving?: boolean; loading?: boolean;
  mobileExpanded?: boolean; onToggleMobile?: () => void;
}) {
  return <nav className="employment-program-navigation smartcare-program-navigation" aria-label="SmartCare 서비스 선택">
    <h2>SmartCare</h2>
    <p>편집할 서비스를 선택하세요. 서비스 추가·삭제·순서 변경은 지원하지 않습니다.</p>
    <button type="button" className="employment-program-mobile-toggle" aria-expanded={mobileExpanded}
      aria-controls="smartcare-sidebar-menu" onClick={onToggleMobile}>SmartCare 편집 메뉴</button>
    <div id="smartcare-sidebar-menu" className="employment-program-navigation-scroll" data-expanded={mobileExpanded}>
      {loading && <p role="status">서비스 목록을 불러오는 중...</p>}
      {items?.map((item, index) => {
        const isSelected = selected === item.id;
        return <button type="button" key={item.id} id={'smartcare-tab-' + item.id} aria-pressed={isSelected}
          aria-controls="smartcare-service-panel" disabled={saving && !isSelected}
          className={'admin-branch-item' + (isSelected ? ' active' : '')} onClick={() => onSelect(item.id)}
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
          }}><span className="employment-nav-item-number">STEP {index + 1}. </span>{smartCareServiceLabel(item)}</button>;
      })}
    </div>
  </nav>;
}
