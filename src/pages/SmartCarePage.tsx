import { SMART_SOLUTIONS } from '../data/content';

export function SmartCarePage({ onBack, onConsult }: { onBack: () => void; onConsult: () => void }) {
  return (
    <main className="smart-care-page program-detail-page smart-care-detail-page">
      <section className="program-detail-hero">
        <div className="program-detail-eyebrow">SmartCare</div>
        <h1>취업 준비 단계별 SmartCare 서비스를 확인하세요</h1>
        <p className="program-detail-description">진단부터 서류 준비, 면접, 역량 확인까지 필요한 서비스를 살펴보세요.</p>
      </section>
      <div className="smart-care-detail-list" aria-label="SmartCare 상세 서비스">
        {SMART_SOLUTIONS.map((solution) => (
          <section className="smart-care-detail-item program-detail-card" key={solution.key}>
            <div className="smart-care-detail-heading">
              <span className="smart-care-detail-stage">{solution.stage}</span>
              <h2>{solution.title}</h2>
            </div>
            <div className="smart-care-detail-content">
              <p>{solution.modal.desc}</p>
              <ul>{solution.modal.list.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>
        ))}
      </div>
      <div className="smart-care-page-actions">
        <button className="btn-pill-outline" onClick={onBack}>메인으로 돌아가기</button>
        <button className="btn-pill-dark" onClick={onConsult}>상담 신청</button>
      </div>
    </main>
  );
}
