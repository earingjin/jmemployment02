// 제이엠커리어 네트워크 & 스토리 (전국지사 / 1:1 상담 / 기업협약) 3단 카드
export function NetworkSection({ onBranch, onConsult, onEmployer }: {
  onBranch: () => void;
  onConsult: () => void;
  onEmployer: () => void;
}) {
  return (
    <section className="sec-three-cards">
      <div className="sec-three-cards-inner">
        <div className="sec-header-center">
          <span className="eyebrow">OUR STORY &amp; NETWORK</span>
          <h2>제이엠커리어 네트워크 &amp; 스토리</h2>
          <p>전국 지사, 1:1 맞춤 상담, 산학협력으로 취업의 전 과정을 지원합니다.</p>
        </div>

        <div className="three-cards-grid">
          <div className="story-photo-card" onClick={onBranch}>
            <div className="spc-image" style={{ background: 'linear-gradient(135deg, #1E50FF, #0A1E7A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spc-tag">전국 네트워크</span>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div className="spc-body">
              <div>
                <h3>전국 지사 네트워크</h3>
                <p>서울 본사부터 수도권, 충청, 영남, 호남까지 가까운 지사에서 방문 상담과 신청을 지원합니다.</p>
              </div>
              <span className="spc-link-btn">내 주변 지사 찾기 →</span>
            </div>
          </div>

          <div className="story-photo-card" onClick={onConsult}>
            <div className="spc-image" style={{ background: 'linear-gradient(135deg, #3B82F6, #0D2CB5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spc-tag">전문 상담사</span>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="spc-body">
              <div>
                <h3>1:1 전담 취업 컨설팅</h3>
                <p>직업상담사 자격을 갖춘 전문 컨설턴트가 이력서 첨삭부터 모의면접, 알선까지 밀착 동행합니다.</p>
              </div>
              <span className="spc-link-btn">무료 상담 신청하기 →</span>
            </div>
          </div>

          <div className="story-photo-card" onClick={onEmployer}>
            <div className="spc-image" style={{ background: 'linear-gradient(135deg, #1742DE, #07154B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spc-tag">산학·기업협약</span>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div className="spc-body">
              <div>
                <h3>협약 기업 &amp; 산학협력</h3>
                <p>주요 대학 및 우수 기업과의 MOU를 통해 수료생 우선 추천 및 실전 채용 기회를 제공합니다.</p>
              </div>
              <span className="spc-link-btn">기업 지원 혜택 보기 →</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
