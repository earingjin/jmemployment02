import type { Ref } from 'react';
import { ADMIN_BRANCHES, branchSuffix, type BranchMap } from '../../data/branches';

// 상담 신청 영역. 제출 대상이 확정되기 전까지 입력값은 전송·저장하지 않는다.
export function ConsultationSection({ branches, sectionRef }: { branches: BranchMap; sectionRef: Ref<HTMLElement> }) {
  return (
    <section className="sec-contact" id="pv-contact-section" ref={sectionRef}>
      <div className="contact-box">
        <div className="contact-info">
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E50FF', textTransform: 'uppercase' }}>FAST CONSULTATION</span>
          <h2>청년의 다음 진로,<br />지금 상담을 시작하세요</h2>
          <p id="pv-contact-intro">신청서를 남겨주시면 가까운 지사의 전담 상담사가 상세히 안내해 드립니다.</p>
          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            ✔ 무료 상담<br />
            ✔ 정부지원금 요건 조회<br />
            ✔ 1:1 이력서 &amp; 면접 솔루션 제공
          </div>
        </div>

        <form className="contact-form" onSubmit={event => event.preventDefault()}>
          <input name="name" type="text" placeholder="이름" autoComplete="name" required />
          <input name="phone" type="tel" placeholder="전화번호 (예: 010-1234-5678)" autoComplete="tel" required />
          <select name="preferredRegion" id="pv-contact-branch-select" defaultValue="" aria-label="희망지역" required>
            <option value="" disabled>희망지역을 선택해 주세요</option>
            {ADMIN_BRANCHES.filter(n => n === '본사' || (branches[n] && branches[n].published)).map(name =>
              <option key={name} value={name}>{name + branchSuffix(name)}</option>)}
          </select>
          <input name="participationPath" type="text" placeholder="참여경로" required />
          <button className="btn-contact-submit" type="submit" disabled aria-disabled="true">상담 신청 준비 중</button>
        </form>
      </div>
    </section>
  );
}
