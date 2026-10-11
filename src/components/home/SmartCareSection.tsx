import type { SmartSolution } from '../../data/content';

// data-smartcare-* attributes locate CMS fields for the administrator preview only; they do not affect styling.
export function SmartCareSection({ solutions, onDetail }: { solutions: readonly SmartSolution[]; onDetail: () => void }) {
  return (
    <section className="sec-products-wrap">
      <div className="ribbon-badge-center">
        <span className="ribbon-pill">✦ AI &amp; SMART CAREER SOLUTIONS</span>
      </div>
      <div className="sec-header-center">
        <h2>취업 준비, SmartCare로 단계별로</h2>
        <p>진단부터 서류 준비, 면접까지 취업 준비 과정을 지원합니다.</p>
      </div>
      <div className="smart-care-summary" aria-label="SmartCare 지원 단계">
        {solutions.map((solution, index) => (
          <div className="smart-care-step" key={solution.key} data-smartcare-id={solution.key}>
            <span className="smart-care-step-number">STEP {String(index + 1).padStart(2, '0')}</span>
            <span className="smart-care-step-stage" data-smartcare-field="stage">{solution.stage}</span>
            <h3 data-smartcare-field="title">{solution.title}</h3>
          </div>
        ))}
      </div>
      <div className="smart-care-more">
        <button className="btn-pill-dark" onClick={onDetail}>SmartCare 자세히 보기 →</button>
      </div>
    </section>
  );
}
