import heroConsulting from '../../assets/hero-consulting.png';
import benefitVideo from '../../assets/국취신청.mp4';
import { AutoplayVideo } from '../common/AutoplayVideo';

// Hero: 배경 이미지 + 좌측 문구/CTA
// .hero-eyebrow-pill, .hero-badges-row, .hero-right(영상·요약 카드)는 원본에서도 CSS로 숨겨진 상태이며, 원본 DOM 보존을 위해 그대로 둔다.
export function Hero({ benefitYear, onConsult, onBranch, onProgram }: {
  benefitYear: string;
  onConsult: () => void;
  onBranch: () => void;
  onProgram: (programId: string) => void;
}) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-eyebrow-pill">
            <span className="star">✦</span> <span id="pv-benefit-year">{benefitYear || '2026'}</span>년 취업지원 수당 &amp; 1:1 맞춤 컨설팅
          </div>
          <h1 className="hero-title" id="pv-hero-headline">
            취업이 막막할 때,<br />
            <span className="highlight">국민취업지원제도 상담부터</span>
          </h1>
          <p className="hero-desc">
            국민취업지원제도 최대 360만원 혜택받기<br />
            취업지원금, 받을 수 있는지 지금 확인하세요
          </p>

          <div className="hero-actions">
            <button className="btn-pill-dark" onClick={onConsult}>
              국민취업지원제도 상담 신청
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </button>
            <button className="btn-pill-outline" onClick={onBranch}>
              가까운 지사 찾기 →
            </button>
          </div>

          <div className="hero-badges-row">
            <div className="hero-mini-badge"><span className="circle-icon">✓</span> 1:1 전담상담</div>
            <div className="hero-mini-badge"><span className="circle-icon">✓</span> 수당 전액신청</div>
            <div className="hero-mini-badge"><span className="circle-icon">✓</span> AI 모의면접</div>
            <div className="hero-mini-badge"><span className="circle-icon">✓</span> 취업성공수당</div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-benefit-video">
            <div className="hero-video-badge">▶ 구직수당 신청 영상</div>
            <AutoplayVideo src={benefitVideo} label="구직수당 신청 안내 영상" />
            <div className="hero-video-caption">구직수당, 이렇게 신청해요 <span>국민취업지원제도 안내</span></div>
          </div>
          <div className="hero-visual-card consulting-card">
            <img className="hero-consulting-image" src={heroConsulting} alt="상담사와 청년 구직자가 취업 계획을 함께 살펴보는 모습" />
            <div className="hero-floating-lemon">✨</div>
            <div className="hvc-head">
              <span className="hvc-badge">2026 정부지원</span>
              <span className="hvc-year">국비 100% 무료</span>
            </div>
            <div className="hvc-main-benefit" onClick={() => onProgram('job-leap')} style={{ cursor: 'pointer' }}>
              <div className="tag">최대 지원금</div>
              <div className="amount">최대 720만원</div>
              <div className="sub">청년 일자리도약장려금 근속 인센티브</div>
            </div>
            <div className="hvc-grid">
              <div className="hvc-sub-item" onClick={() => onProgram('employment-support')} style={{ cursor: 'pointer' }}>
                <div className="label">국민취업지원제도</div>
                <div className="val">월 60만원</div>
              </div>
              <div className="hvc-sub-item" onClick={() => onProgram('future-experience')} style={{ cursor: 'pointer' }}>
                <div className="label">미래내일 일경험</div>
                <div className="val">월 150만원</div>
              </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>전국 19개 지사 방문 가능</span>
              <span style={{ color: '#1E50FF', cursor: 'pointer' }} onClick={onBranch}>지사 위치 보기 →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 원본 JS 호환용 숨김 요소 */}
      <div id="pv-benefit-tiles" style={{ display: 'none' }}></div>
      <p id="pv-benefit-notice" style={{ display: 'none' }}></p>

      <div className="hero-wave-wrap">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,48C840,43,960,53,1080,64C1200,75,1320,85,1380,90.7L1440,96L1440,100L1380,100C1320,100,1200,100,1080,100C960,100,840,100,720,100C600,100,480,100,360,100C240,100,120,100,60,100L0,100Z" fill="#FFFFFF"></path>
        </svg>
      </div>
    </section>
  );
}
