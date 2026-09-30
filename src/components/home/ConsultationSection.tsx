import type { Ref } from 'react';
import { ADMIN_BRANCHES, PUBLIC_BRANCH, branchSuffix, type BranchMap } from '../../data/branches';

// 상담 신청 영역
// 주의: 원본과 동일하게 서버/API 연동이 없다. 버튼은 alert만 띄우며 입력값은 어디에도 전송·저장되지 않는다.
export function ConsultationSection({ branches, sectionRef }: { branches: BranchMap; sectionRef: Ref<HTMLElement> }) {
  return (
    <section className="sec-contact" id="pv-contact-section" ref={sectionRef}>
      <div className="contact-box">
        <div className="contact-info">
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E50FF', textTransform: 'uppercase' }}>FAST CONSULTATION</span>
          <h2>청년의 다음 진로,<br />지금 상담을 시작하세요</h2>
          <p id="pv-contact-intro">신청서를 남겨주시면 가까운 지사의 전담 상담사가 1~2일 내로 상세히 안내해 드립니다.</p>
          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            ✔ 100% 국비지원 무료 상담<br />
            ✔ 최대 720만원 정부지원금 요건 조회<br />
            ✔ 1:1 이력서 &amp; 면접 솔루션 제공
          </div>
        </div>

        <div className="contact-form">
          <select id="pv-contact-branch-select" defaultValue={PUBLIC_BRANCH}>
            {ADMIN_BRANCHES.filter(n => n === '본사' || (branches[n] && branches[n].published)).map(name =>
              <option key={name} value={name}>{name + branchSuffix(name)}</option>)}
          </select>
          <input type="text" placeholder="성함" />
          <input type="text" placeholder="연락처 (예: 010-1234-5678)" />
          <textarea rows={3} placeholder="관심 프로그램이나 궁금하신 점을 남겨주세요"></textarea>
          <button className="btn-contact-submit" onClick={() => alert('상담 신청이 접수되었습니다. 담당 상담사가 곧 연락드리겠습니다.')}>무료 상담 예약하기</button>
        </div>
      </div>
    </section>
  );
}
