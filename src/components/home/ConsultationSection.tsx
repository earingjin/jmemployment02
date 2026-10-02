import { CONSULTATION_FORM_URL } from '../../data/consultation';

// 신청 정보 입력은 외부 구글 폼에서 진행한다.
export function ConsultationSection() {
  return (
    <section className="sec-contact" id="pv-contact-section">
      <div className="contact-box">
        <div className="contact-info">
          <span className="contact-eyebrow">FAST CONSULTATION</span>
          <h2>청년의 다음 진로,<br /><span>지금 상담을 시작하세요</span></h2>
          <p id="pv-contact-intro">신청서를 남겨주시면 가까운 지사의 전담 상담사가 상세히 안내해 드립니다.</p>
          <div className="contact-benefits">
            ✔ 무료 상담<br />
            ✔ 정부지원금 요건 조회<br />
            ✔ 1:1 이력서 &amp; 면접 솔루션 제공
          </div>
        </div>

        <div className="contact-application">
          <h3>상담 신청 안내</h3>
          <p>아래 버튼을 눌러 구글 폼에서 이름, 연락처 등 신청 정보를 입력해 주세요.</p>
          <p className="contact-application-note">신청서는 새 탭에서 열립니다.</p>
          <a className="btn-contact-submit" href={CONSULTATION_FORM_URL} target="_blank" rel="noopener noreferrer">상담 신청하기 (새 탭)</a>
        </div>
      </div>
    </section>
  );
}
