import { SMART_SOLUTIONS } from '../data/content';

export function SmartCarePage({ onBack, onConsult }: { onBack: () => void; onConsult: () => void }) {
  return (
    <main className="smart-care-page">
      <section className="bd-hero">
        <div className="bd-eyebrow">SMART CARE</div>
        <h1>SmartCare 서비스 안내</h1>
        <p>취업 준비 단계별 SmartCare 서비스를 확인하세요.</p>
        <div className="smart-care-page-actions">
          <button className="btn-pill-outline" onClick={onBack}>메인으로 돌아가기</button>
          <button className="btn-pill-dark" onClick={onConsult}>상담 신청</button>
        </div>
      </section>
      <section className="smart-care-detail-grid" aria-label="SmartCare 상세 서비스">
        {SMART_SOLUTIONS.map(solution => (
          <article className="white-prod-card smart-care-detail-card" key={solution.key}>
            <div className="wpc-top"><span className="wpc-cat-badge">{solution.card.category}</span></div>
            <div className="wpc-body">
              <h2>{solution.title}</h2>
              <p>{solution.modal.desc}</p>
              <ul>{solution.modal.list.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
