import heroConsulting from '../../assets/hero-consulting.png';
import benefitVideo from '../../assets/국취신청.mp4';
import { AutoplayVideo } from '../common/AutoplayVideo';
import { BENEFIT_GROUPS } from '../../data/programs';

const renderBenefitHeadline = (headline: string) => {
  const match = headline.match(/^(최대 )([\d,]+)(만원)$/);
  if (!match) return headline;
  return <><span className="hero-benefit-prefix">{match[1]}</span><span className="hero-benefit-number">{match[2]}</span><span className="hero-benefit-unit">{match[3]}</span></>;
};

// Hero: 배경 이미지 + 좌측 문구/CTA
// 국민취업지원제도 수당(Ⅰ유형/Ⅱ유형/취업성공수당)을 최우선으로 노출한다. 데이터는 BenefitSection·상세 페이지와 동일한
// BENEFIT_GROUPS(src/data/programs.ts)를 그대로 재사용하며, 여기서 새로 금액을 만들거나 합산하지 않는다.
// Hero 카드는 요약(유형/수당명/핵심 금액)만 보여주고, 세부 지급조건은 "자세히 보기" → 상세 페이지(EmploymentSupportPage)에서 확인한다.
// .hero-right(영상·요약 카드 등 원본 DOM)는 CSS로 계속 숨겨진 상태이며 이번 개편에서 건드리지 않는다.
export function Hero({ onConsult, onBranch, onDetail }: {
  onConsult: () => void;
  onBranch: () => void;
  onDetail: () => void;
}) {
  return (
    <section className="hero" id="benefits">
      <div className="hero-inner">
        <div className="hero-left">
          <h1 className="hero-title" id="pv-hero-headline">
            취업이 막막할 때<br />
            <span className="highlight">국민취업지원제도 상담부터</span>
          </h1>
          <p className="hero-desc">
            구직촉진수당 최대 360만 원, 취업성공수당 최대 150만 원<br />
            내가 받을 수 있는 지원금, 상담을 통해 확인해 보세요.
          </p>

          <div className="hero-benefit-grid">
            {BENEFIT_GROUPS.map(group => (
              <div className={'hero-benefit-card' + (group.type === 'Ⅰ유형' ? ' primary' : '')} key={group.type}>
                <div className="hero-benefit-top">
                  <strong className="hero-benefit-name">{group.items.join(' · ')}</strong>
                </div>
                <div className="hero-benefit-divider" />
                <div className="hero-benefit-core">
                  {group.headline ? <strong>{renderBenefitHeadline(group.headline)}</strong> : group.sub?.split(' · ').map((item, index) => (
                    <strong key={item}>{index === 0 ? `${item} +` : item}</strong>
                  ))}
                </div>
                <div className="hero-benefit-divider" />
                <div className="hero-benefit-bottom">
                  <span className="hero-benefit-type">{group.heroType}</span>
                  <span className="hero-benefit-hint">{group.heroBottom}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-actions">
            <button className="btn-pill-dark hero-consult-cta" onClick={onConsult}>
              무료 상담 신청하기 ↗
            </button>
            <button className="btn-pill-outline hero-detail-cta" onClick={onDetail}>
              국민취업지원제도 자세히 보기 →
            </button>
          </div>

          <p className="hero-benefit-note">지급액과 지원 대상은 참여 유형 및 개인별 요건에 따라 달라질 수 있습니다.</p>
        </div>

        <div className="hero-right">
          <div className="hero-benefit-video">
            <div className="hero-video-badge">▶ 구직촉진수당 신청 영상</div>
            <AutoplayVideo src={benefitVideo} label="구직촉진수당 신청 안내 영상" />
            <div className="hero-video-caption">구직촉진수당, 이렇게 신청해요 <span>국민취업지원제도 안내</span></div>
          </div>
          <div className="hero-visual-card consulting-card">
            <img className="hero-consulting-image" src={heroConsulting} alt="상담사와 청년 구직자가 취업 계획을 함께 살펴보는 모습" />
            <div className="hero-floating-lemon">✨</div>
            <div className="hvc-head">
              <span className="hvc-badge">2026 정부지원</span>
              <span className="hvc-year">국비 100% 무료</span>
            </div>
            <div className="hvc-main-benefit">
              <div className="tag">국민취업지원제도</div>
              <div className="amount">수당 안내</div>
              <div className="sub">참여 유형별 수당을 확인하세요</div>
            </div>
            <div className="hvc-grid">
              <div className="hvc-sub-item">
                <div className="label">1유형</div>
                <div className="val">구직촉진수당</div>
              </div>
              <div className="hvc-sub-item">
                <div className="label">2유형</div>
                <div className="val">취업활동비용 (참여수당참여장려수당)</div>
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
          <path d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,48C840,43,960,53,1080,64C1200,75,1320,85,1380,90.7L1440,96L1440,100L1380,100C1320,100,1200,100,1080,100C960,100,840,100,720,100C600,100,480,100,360,100C240,100,120,100,60,100L0,100Z" fill="#0A2374"></path>
        </svg>
      </div>
    </section>
  );
}
