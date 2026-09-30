import { BENEFIT_GROUPS } from '../../data/programs';

export function BenefitSection({ onDetail }: { onDetail: () => void }) {
  return (
    <section className="benefit-types-section" id="benefits" aria-labelledby="benefit-types-title">
      <div className="benefit-types-inner">
        <div className="sec-header-center">
          <span className="eyebrow">EMPLOYMENT BENEFITS</span>
          <h2 id="benefit-types-title">국민취업지원제도 수당 안내</h2>
          <p>참여 유형에 따라 확인할 수 있는 수당을 안내합니다.</p>
        </div>
        <div className="benefit-types-grid">
          {BENEFIT_GROUPS.map(group => (
            <article className="benefit-type-card" key={group.type}>
              <span>{group.type}</span>
              <h3>{group.items.join(' · ')}</h3>
              {group.sub && <p className="benefit-type-sub">{group.sub}</p>}
              <ul>{group.lines.map(line => <li key={line}>{line}</li>)}</ul>
            </article>
          ))}
        </div>
        <p className="benefit-types-note">제시 금액은 2026년 기준이며 지침 개정에 따라 변경될 수 있습니다.</p>
        <div className="smart-care-more">
          <button className="btn-pill-dark" onClick={onDetail}>국민취업지원제도 자세히 보기 →</button>
        </div>
      </div>
    </section>
  );
}
