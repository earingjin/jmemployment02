import { useRef, useState } from 'react';
import { REVIEWS, STATS } from '../../data/content';

const NAV_BUTTON_STYLE = { width: '38px', height: '38px', borderRadius: '50%', background: '#F5F5F4', border: 'none', cursor: 'pointer', fontSize: '16px' };

// 후기 슬라이더 + 통계 스트립
export function ReviewsSection({ onOpenReview }: { onOpenReview: (index: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reviewIndex = useRef(0);
  const [transform, setTransform] = useState('translateX(-0px)');

  // 원본 slideReviews(): 클릭 시점의 카드 폭으로 이동량 계산(리사이즈 시 재계산하지 않음), 끝에서 처음/마지막으로 순환
  const slideReviews = (dir: number) => {
    const max = Math.max(0, REVIEWS.length - (window.innerWidth <= 768 ? 1 : 4));
    reviewIndex.current += dir;
    if (reviewIndex.current > max) reviewIndex.current = 0;
    if (reviewIndex.current < 0) reviewIndex.current = max;
    const first = trackRef.current?.firstElementChild;
    if (!first) return;
    const cardWidth = first.getBoundingClientRect().width;
    const gap = 20;
    setTransform(`translateX(-${reviewIndex.current * (cardWidth + gap)}px)`);
  };

  return (
    <section className="sec-reviews">
      <div className="sec-reviews-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E50FF', textTransform: 'uppercase' }}>SUCCESS STORIES</span>
            <h2 id="pv-philosophy-headline" style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px', marginTop: '4px' }}>취업, 혼자 고민하지 마세요</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => slideReviews(-1)} style={NAV_BUTTON_STYLE}>‹</button>
            <button onClick={() => slideReviews(1)} style={NAV_BUTTON_STYLE}>›</button>
          </div>
        </div>

        <div className="review-slider-wrap">
          <div className="review-track" id="pv-review-track" ref={trackRef} style={{ transform }}>
            {REVIEWS.map((r, i) => (
              <div key={i} className="review-memo-card" onClick={() => onOpenReview(i)}>
                <div>
                  <span className="rm-badge">{r.badge}</span>
                  <div className="rm-excerpt">{`"${r.excerpt}"`}</div>
                </div>
                <div className="rm-author">{r.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-strip-yellow" id="pv-stats-strip">
          {STATS.map(s => <div key={s.label} className="stat-item"><div className="num">{s.num}</div><div className="label">{s.label}</div></div>)}
        </div>
      </div>
    </section>
  );
}
