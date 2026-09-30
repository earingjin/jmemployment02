export function EthicsSection() {
  return (
    <section className="ethics-section" id="ethics" aria-labelledby="ethics-title">
      <div className="ethics-inner">
        <div>
          <span className="eyebrow">ETHICS</span>
          <h2 id="ethics-title">윤리 관련 정보</h2>
          <p>고용서비스의 신뢰를 위한 윤리 관련 정보를 안내합니다.</p>
        </div>
        <div className="ethics-links" aria-label="윤리 관련 콘텐츠">
          <div className="ethics-card"><strong>취업윤리경영</strong><span>상세 콘텐츠 제공 대기</span></div>
          <div className="ethics-card"><strong>직업상담사 윤리</strong><span>상세 콘텐츠 제공 대기</span></div>
        </div>
      </div>
    </section>
  );
}
