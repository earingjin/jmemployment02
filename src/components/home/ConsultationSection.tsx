import { CONSULTATION_FORM_URL } from '../../data/consultation';

// 신청 정보 입력은 외부 구글 폼에서 진행한다.
export function ConsultationSection() {
  return (
    <section className="sec-contact" id="pv-contact-section">
      <div className="contact-box">
        <div className="contact-guidance">
          <div className="contact-guidance-intro">
            <h2>어떤 사업을 신청해야 할지 모르겠다면</h2>
            <p>연령·취업 상태·소득 수준에 맞는 사업을 제이엠커리어 상담창구에서 무료로 안내해 드립니다.</p>
            <p>고용노동부 고객상담센터 1350 또는 온라인 예약 시 대기 없이 상담받을 수 있습니다.</p>
            <p>공식 신청 창구는 고용24(work24.go.kr) 또는 각 사업 전용 포털이며, 온라인 신청이 어려우면 지사 방문 신청도 가능합니다.</p>
            <a className="btn-contact-submit" href={CONSULTATION_FORM_URL} target="_blank" rel="noopener noreferrer">상담 신청하기 (새 탭)</a>
          </div>
          <div className="contact-program-guide">
            <h2>상황별 지원사업 안내</h2>
            <ol>
              <li><span>만 15~69세 구직자, 저소득층, 고용보험 미가입자</span><strong>국민취업지원제도</strong></li>
              <li><span>만 15~34세 청년을 정규직 채용하려는 기업</span><strong>청년일자리도약장려금</strong></li>
              <li><span>실무 경력이 없어 경험이 필요한 미취업 청년</span><strong>미래내일 일경험</strong></li>
              <li><span>만 60세 이상 구직자, 고령자를 채용하려는 기업</span><strong>시니어인턴십</strong></li>
            </ol>
            <p className="contact-program-guide-note">세부 지원 요건과 신청 가능 여부는 상담 및 해당 사업의 공식 공고를 통해 확인해 주세요.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
