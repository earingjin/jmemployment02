import type { CSSProperties, ReactNode } from 'react';
import { PROGRAM_CARDS, type ProgramCardVariant } from '../../data/programs';

// 원본 applyProgramCardCopy()가 런타임에 적용하던 인라인 스타일을 그대로 재현
const GRID_STYLE: CSSProperties = { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' };
const CARD_STYLE: CSSProperties = { minHeight: '230px', padding: '23px', background: '#FFFFFF', borderColor: '#DCE5F1', boxShadow: 'none' };
const TITLE_STYLE: CSSProperties = { fontSize: '20px', color: '#0A1E7A' };
const DESC_STYLE: CSSProperties = { fontSize: '13px', color: '#64748B' };
const AMOUNT_STYLE: CSSProperties = { fontSize: '21px', color: '#1E50FF' };
const BADGE_STYLE: CSSProperties = { display: 'none' };

// 원본 카드 일러스트 (CSS로 숨김 처리되어 있음)
const ART: Record<Exclude<ProgramCardVariant, 'peach'>, ReactNode> = {
  pink: (
    <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="42" fill="#D4E2FF" opacity="0.6" />
      <circle cx="50" cy="50" r="30" fill="#1E50FF" opacity="0.95" />
      <path d="M38 50L46 58L64 40" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  green: (
    <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="42" fill="#D4E2FF" opacity="0.6" />
      <circle cx="50" cy="50" r="30" fill="#1E50FF" opacity="0.95" />
      <path d="M50 32V68M32 50H68" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  yellow: (
    <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="42" fill="#BAE6FD" opacity="0.3" />
      <circle cx="50" cy="50" r="30" fill="#FFFFFF" opacity="0.95" />
      <polygon points="50,30 55,42 68,43 58,52 61,65 50,58 39,65 42,52 32,43 45,42" fill="#FFFFFF" />
    </svg>
  )
};

// 2026 핵심 취업지원 프로그램 카드 4종
export function ProgramSection({ onProgram, onEmployer }: {
  onProgram: (programId: string) => void;
  onEmployer: () => void;
}) {
  return (
    <section className="sec-bento" id="programs">
      <div className="sec-bento-inner">
        <div className="sec-header-center">
          <span className="eyebrow">GOVERNMENT PROGRAM</span>
          <h2>2026 핵심 취업지원 프로그램</h2>
          <p>구직자 유형과 희망 진로에 맞춘 정부 공식 지원 제도입니다. 클릭 시 상세 혜택과 신청 요건을 바로 확인하실 수 있습니다.</p>
        </div>

        <div className="bento-grid" style={GRID_STYLE}>
          {PROGRAM_CARDS.map(card => (
            <div key={card.variant} className={'bento-card ' + card.variant} onClick={() => onProgram(card.openProgramId)} style={CARD_STYLE}>
              <div className="bento-top">
                <div className="bento-title-group">
                  <span className="bento-label">{card.category}</span>
                  <h3 style={TITLE_STYLE}>{card.title}</h3>
                </div>
                <span className="bento-badge" style={BADGE_STYLE}>{card.hiddenBadge}</span>
              </div>
              {card.variant === 'peach' ? (
                // 네 번째 카드는 원본의 체크리스트 + 버튼 구조를 유지
                <div>
                  <ul className="bento-checklist">
                    <li>{card.description}</li>
                  </ul>
                  <button className="btn-peach-cta" onClick={e => { e.stopPropagation(); onEmployer(); }}>{card.amount}</button>
                </div>
              ) : (
                <div className="bento-body">
                  <div className="bento-info">
                    <div className="amount" style={AMOUNT_STYLE}>{card.amount}</div>
                    <div className="desc" style={DESC_STYLE}>{card.description}</div>
                  </div>
                  <div className="bento-art">{ART[card.variant]}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
