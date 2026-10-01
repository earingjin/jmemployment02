import { useEffect, useRef, useState } from 'react';
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const mobileMenuWasOpenRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(true);
  // 좁은 화면(GNB 가로 스크롤)에서도 현재 페이지 메뉴가 보이도록 GNB 안에서만 가로 스크롤한다
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('.active');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const a = active.getBoundingClientRect(), n = nav.getBoundingClientRect();
    nav.scrollTo({ left: nav.scrollLeft + (a.left - n.left) - (nav.clientWidth - a.width) / 2, behavior: 'smooth' });
  }, [view]);

  const menu = NAV_ITEMS.filter(item => item.view !== 'branch' && !item.hidden);
  const branch = NAV_ITEMS.find(item => item.view === 'branch');
  const activeService = menu.some(item => item.view === view);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const selectMobileMenu = (next: View) => {
    closeMobileMenu();
    onNavigate(next);
  };

  useEffect(() => {
    if (!mobileMenuOpen) {
      if (mobileMenuWasOpenRef.current) {
        mobileMenuWasOpenRef.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }
    mobileMenuWasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuCloseRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!mobileMenuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = menuPanelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

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

        <button className="mobile-menu-toggle" ref={menuButtonRef} type="button"
          aria-expanded={mobileMenuOpen} aria-controls="mobile-menu-panel"
          onClick={() => setMobileMenuOpen(open => !open)}>
          <span>MENU</span>
          <span className="mobile-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onMouseDown={closeMobileMenu}>
          <section className="mobile-menu-panel" id="mobile-menu-panel" ref={menuPanelRef} role="dialog" aria-modal="true"
            aria-label="전체 메뉴" tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
            <div className="mobile-menu-head">
              <strong>MENU</strong>
              <button className="mobile-menu-close" ref={menuCloseRef} type="button" onClick={closeMobileMenu} aria-label="메뉴 닫기">×</button>
            </div>
            <nav className="mobile-menu-list" aria-label="모바일 전체 메뉴">
              <button className={'mobile-menu-link' + (view === 'home' ? ' active' : '')} type="button"
                aria-current={view === 'home' ? 'page' : undefined} onClick={() => selectMobileMenu('home')}>홈</button>
              <button className={'mobile-menu-accordion' + (activeService ? ' active' : '')} type="button"
                aria-expanded={servicesOpen} aria-controls="mobile-service-menu" onClick={() => setServicesOpen(open => !open)}>
                <span>전체 서비스</span><span aria-hidden="true">{servicesOpen ? '−' : '+'}</span>
              </button>
              {servicesOpen && (
                <div className="mobile-menu-sublist" id="mobile-service-menu">
                  {menu.map(item => (
                    <button key={item.view} className={'mobile-menu-link mobile-menu-sublink' + (view === item.view ? ' active' : '')}
                      type="button" aria-current={view === item.view ? 'page' : undefined}
                      onClick={() => selectMobileMenu(item.view)}>{item.label}</button>
                  ))}
                </div>
              )}
              {branch && (
                <button className={'mobile-menu-link' + (view === branch.view ? ' active' : '')} type="button"
                  aria-current={view === branch.view ? 'page' : undefined}
                  onClick={() => selectMobileMenu(branch.view)}>{branch.label}</button>
              )}
            </nav>
            <button className="mobile-menu-consult" type="button" onClick={() => { closeMobileMenu(); onConsult(); }}>무료 상담 신청하기</button>
          </section>
        </div>
      )}
    </header>
  );
}
