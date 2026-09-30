import type { ReactNode } from 'react';
import { SMART_SOLUTIONS, type SmartSolutionKey } from '../../data/content';

// 카드 상단 일러스트 (원본 정적 HTML 그대로)
const CARD_VISUALS: Record<SmartSolutionKey, ReactNode> = {
  burkman: (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="23" cy="23" r="13" fill="#EF4444" opacity="0.85" />
      <circle cx="37" cy="23" r="13" fill="#F59E0B" opacity="0.85" />
      <circle cx="23" cy="37" r="13" fill="#10B981" opacity="0.85" />
      <circle cx="37" cy="37" r="13" fill="#3B82F6" opacity="0.85" />
    </svg>
  ),
  coverletter: (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  interview: (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <circle cx="9" cy="10" r="1"></circle>
      <circle cx="13" cy="10" r="1"></circle>
    </svg>
  ),
  aptitude: (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
      <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
    </svg>
  )
};

// AI & 스마트 커리어 솔루션 카드 4종
export function SmartCareSection({ onOpen }: { onOpen: (key: SmartSolutionKey) => void }) {
  return (
    <section className="sec-products-wrap">
      <div className="ribbon-badge-center">
        <span className="ribbon-pill">✦ AI &amp; SMART CAREER SOLUTIONS</span>
      </div>
      <div className="sec-header-center">
        <h2>취업 준비의 모든 단계, 스마트하게 완성</h2>
        <p>10만 건 합격 빅데이터와 전문 진단 도구로 서류부터 실전 면접까지 든든하게 준비합니다.</p>
      </div>

      <div className="product-cards-grid">
        {SMART_SOLUTIONS.map(s => (
          <div key={s.key} className="white-prod-card" onClick={() => onOpen(s.key)}>
            <div>
              <div className="wpc-top">
                <span className="wpc-cat-badge">{s.card.category}</span>
                <span className="wpc-icon-fav">★</span>
              </div>
              <div className="wpc-visual">{CARD_VISUALS[s.key]}</div>
              <div className="wpc-body">
                <h4>{s.title}</h4>
                <p>{s.card.summary}</p>
              </div>
            </div>
            <div className="wpc-footer">
              <span className="feature-text">{s.card.feature}</span>
              <div className="arrow-btn">→</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
