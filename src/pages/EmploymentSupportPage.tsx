import { Fragment } from 'react';
import { findProgram } from '../data/programs';

// 국민취업지원제도 상세 페이지 (/employment-support)
// Hero 카드가 요약만 보여주는 대신, 여기서 Ⅰ유형/Ⅱ유형/취업성공수당/신청방법 등 세부 지급조건을 확인한다.
// 데이터는 Hero·ProgramModal과 동일한 PROGRAMS(findProgram('employment-support'))를 그대로 재사용하며
// 이 페이지만을 위한 별도 수당 데이터를 새로 만들지 않는다.
const program = findProgram('employment-support')!;

export function EmploymentSupportPage({ onBack, onConsult }: { onBack: () => void; onConsult: () => void }) {
  return (
    <main className="smart-care-page">
      <section className="bd-hero">
        <div className="bd-eyebrow">국민취업지원제도</div>
        <h1>{program.label}</h1>
        <p>{program.seeker?.desc}</p>
        <div className="smart-care-page-actions">
          <button className="btn-pill-outline" onClick={onBack}>메인으로 돌아가기</button>
          <button className="btn-pill-dark" onClick={onConsult}>상담 신청</button>
        </div>
      </section>

      <section className="employment-support-detail" aria-label="국민취업지원제도 상세 정보">
        {program.detail.map((block, i) => (
          <article className="employment-support-block" key={i} style={{ background: block.background, border: block.border }}>
            <strong style={{ color: block.headingColor }}>{block.heading}</strong>
            <p>
              {block.lines.map((line, j) => (
                <Fragment key={j}>{j > 0 && <br />}{line}</Fragment>
              ))}
            </p>
          </article>
        ))}
      </section>

      <p className="employment-support-source">공식 안내: 고용24 국민취업지원제도(work24.go.kr) 및 고용노동부 공식 자료를 기준으로 작성되었습니다. 지침 개정에 따라 내용이 변경될 수 있습니다.</p>
    </main>
  );
}
