import logo from '../../assets/제이엠커리어 로고.png';
import { PROGRAMS } from '../../data/programs';
import type { View } from '../../pages/HomePage';

export function Header({ view, onHome, onProgram, onEmployer, onBranch, onConsult }: {
  view: View;
  onHome: () => void;
  onProgram: (programId: string) => void;
  onEmployer: () => void;
  onBranch: () => void;
  onConsult: () => void;
}) {
  return (
    <header className="site-header" id="siteHeader">
      <div className="site-header-inner">
        <div className="nav-logo" role="button" tabIndex={0} aria-label="홈으로" onClick={onHome}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
          <img src={logo} alt="제이엠커리어 고용서비스" style={{ display: 'block', width: '190px', height: 'auto', filter: 'brightness(0) invert(1)' }} />
        </div>

        <nav className="gnb">
          <span id="pv-nav-programs" className="gnb-programs">
            <button className={'gnb-item' + (view === 'home' ? ' active' : '')} id="gnbHomeBtn" onClick={onHome}>홈</button>
            {PROGRAMS.map(p => <button key={p.id} className="gnb-item" onClick={() => onProgram(p.id)}>{p.label}</button>)}
            <button className={'gnb-item gnb-employer' + (view === 'employer' ? ' active' : '')} id="gnbEmployerBtn" onClick={onEmployer}>기업 지원금</button>
          </span>
          <button className={'branch-toggle' + (view === 'branch' ? ' active' : '')} id="gnbBranchBtn" onClick={onBranch}>전국지사</button>
        </nav>

        <div className="nav-right">
          <button className="header-cta-pill" onClick={onConsult}>상담 신청</button>
        </div>
      </div>
    </header>
  );
}
