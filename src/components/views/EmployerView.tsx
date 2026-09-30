import { PROGRAMS } from '../../data/programs';

// 서브뷰: 기업 지원금 안내 (원본 #employerPage, showView('employer'))
export function EmployerView({ active, benefitYear, onDetail, onConsult }: {
  active: boolean;
  benefitYear: string;
  onDetail: (programId: string) => void;
  onConsult: () => void;
}) {
  const list = PROGRAMS.filter(p => p.employer && p.employer.amount);
  return (
    <div id="employerPage" className={'subpage' + (active ? ' active' : '')}>
      <section className="bd-hero">
        <div className="bd-eyebrow">기업 담당자용</div>
        <h1>기업 지원금 안내</h1>
        <p>청년·중장년을 채용하는 기업이 받을 수 있는 정부 지원금입니다. (<span id="ep-year">{benefitYear || '2026'}</span>년 기준)</p>
      </section>
      <div className="ep-grid" id="epGrid">
        {list.length ? list.map(p => (
          <div key={p.id} className="ep-card">
            <div className="ep-name">{p.label}</div>
            <div className="ep-target">{p.employer!.target}</div>
            <div className="ep-amount">{p.employer!.amount}</div>
            <p className="ep-desc">{p.employer!.desc}</p>
            <button className="ep-more" onClick={() => onDetail(p.id)}>자세히 보기 →</button>
          </div>
        )) : <div style={{ padding: '40px', textAlign: 'center' }}>등록된 기업 지원금이 없습니다.</div>}
      </div>
      <div style={{ marginTop: '40px', background: '#F0F5FF', border: '1px solid #D4E2FF', borderRadius: 'var(--radius-xl)', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <strong style={{ fontSize: '19px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>우리 회사도 받을 수 있을까요?</strong>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>지원 요건과 신청 절차를 가까운 지사에서 친절히 안내해 드립니다.</span>
        </div>
        <button className="btn-pill-dark" onClick={onConsult}>기업 상담 신청하기 →</button>
      </div>
    </div>
  );
}
