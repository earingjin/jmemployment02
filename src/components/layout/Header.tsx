import { useEffect, useRef } from 'react';
import logo from '../../assets/제이엠커리어 로고.png';
import { NAV_ITEMS, type View } from '../../data/navigation';

// 원본 GNB 구조: [홈 · 사업 메뉴 · 기업 지원금](.gnb-programs) + 전국지사(.branch-toggle) + 상담 신청 CTA
const ITEM_IDS: Partial<Record<View, string>> = { home: 'gnbHomeBtn', employer: 'gnbEmployerBtn' };

export function Header({ view, onNavigate, onConsult }: {
  view: View;
  onNavigate: (view: View) => void;
  onConsult: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  // 좁은 화면(GNB 가로 스크롤)에서도 현재 페이지 메뉴가 보이도록 GNB 안에서만 가로 스크롤한다
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('.active');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const a = active.getBoundingClientRect(), n = nav.getBoundingClientRect();
    nav.scrollTo({ left: nav.scrollLeft + (a.left - n.left) - (nav.clientWidth - a.width) / 2, behavior: 'smooth' });
  }, [view]);

  const menu = NAV_ITEMS.filter(item => item.view !== 'branch');
  const branch = NAV_ITEMS.find(item => item.view === 'branch');

  return (
    <header className="site-header" id="siteHeader">
      <div className="site-header-inner">
        <div className="nav-logo" role="button" tabIndex={0} aria-label="홈으로" onClick={() => onNavigate('home')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
          <img src={logo} alt="제이엠커리어 고용서비스" style={{ display: 'block', width: '190px', height: 'auto', filter: 'brightness(0) invert(1)' }} />
        </div>

        <nav className="gnb" ref={navRef}>
          <span id="pv-nav-programs" className="gnb-programs">
            {menu.map(item => (
              <button key={item.view} id={ITEM_IDS[item.view]}
                className={'gnb-item' + (item.view === 'employer' ? ' gnb-employer' : '') + (view === item.view ? ' active' : '')}
                aria-current={view === item.view ? 'page' : undefined}
                onClick={() => onNavigate(item.view)}>{item.label}</button>
            ))}
          </span>
          {branch && (
            <button className={'branch-toggle' + (view === 'branch' ? ' active' : '')} id="gnbBranchBtn"
              aria-current={view === 'branch' ? 'page' : undefined}
              onClick={() => onNavigate('branch')}>{branch.label}</button>
          )}
        </nav>

        <div className="nav-right">
          <button className="header-cta-pill" onClick={onConsult}>상담 신청</button>
        </div>
      </div>
    </header>
  );
}
