import type { LegalContentId } from '../../data/legal';

export function Footer({ onLegal }: {
  onLegal: (id: LegalContentId) => void;
}) {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-bottom">
          <span id="pv-footer-phone">JMCAREER 고용서비스</span>
          <span>© JMCAREER. ALL RIGHTS RESERVED.</span>
        </div>
        <div className="footer-legal">
          <div className="legal-links">
            {/* 원본의 공백·&nbsp; 구분자를 그대로 유지하기 위해 한 줄로 작성 */}
            <button className="footer-link-button" aria-haspopup="dialog" onClick={() => onLegal('terms')}>이용약관</button> &nbsp;ㅣ&nbsp; <button className="footer-link-button" aria-haspopup="dialog" onClick={() => onLegal('privacy')}>개인정보취급방침</button> &nbsp;ㅣ&nbsp; <span>이메일 무단수집거부</span> &nbsp;ㅣ&nbsp; <button className="footer-link-button" aria-haspopup="dialog" onClick={() => onLegal('ethics')}>취업윤리경영 · 직업상담사 윤리</button>
          </div>
          <div className="company-info">
            본사 : 서울특별시 영등포구 경인로 775 (문래동3가 55-20, 에이스하이테크시티 1동 9층) TEL. (02)703-9900 FAX. (02)703-9182<br />
            사업자번호 : 210-81-36536 &nbsp;ㅣ&nbsp; 대표 : 윤종만 &nbsp;ㅣ&nbsp; 통신판매신고번호 : 제2009-서울영등포구-1173호
          </div>
        </div>
      </div>
    </footer>
  );
}
