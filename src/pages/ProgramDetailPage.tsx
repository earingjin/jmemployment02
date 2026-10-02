import { ProgramDetailBlocks } from '../components/ProgramDetailBlocks';
import { findProgram } from '../data/programs';
import type { ProgramView } from '../data/navigation';

// 사업별 상세 페이지 (/employment-support, /job-leap, /future-experience, /senior-internship)
// 4개 사업 모두 PROGRAMS(src/data/programs.ts)의 seeker/detail 데이터만 렌더링한다.
// 사업마다 detail 블록 구성이 다르므로 데이터에 존재하는 블록만 순서대로 표시하고, 없는 항목을 새로 만들지 않는다.
// 국민취업지원제도의 Ⅰ유형/Ⅱ유형/취업성공수당 블록은 Hero와 같은 BENEFIT_GROUPS에서 생성된다.
export function ProgramDetailPage({ programId, onBack, onConsult }: {
  programId: ProgramView;
  onBack: () => void;
  onConsult: () => void;
}) {
  const program = findProgram(programId);
  if (!program) return null;

  return (
    <main className="smart-care-page program-detail-page">
      <section className="program-detail-hero">
        {program.seeker && <div className="program-detail-eyebrow">{program.seeker.kind}</div>}
        <h1>{program.label}</h1>
        {program.seeker && <p className="program-detail-description">{program.seeker.desc}</p>}
        {program.seeker && (
          <div className="program-detail-target">
            <strong>지원 대상</strong>
            <p>{program.seeker.target}</p>
          </div>
        )}
        <div className="smart-care-page-actions">
          <button className="btn-pill-outline" onClick={onBack}>메인으로 돌아가기</button>
          <button className="btn-pill-dark" onClick={onConsult}>상담 신청</button>
        </div>
      </section>

      <section className="employment-support-detail" aria-label={`${program.label} 상세 정보`}>
        <ProgramDetailBlocks blocks={program.detail} />
      </section>

      <div className="smart-care-page-actions">
        <button className="btn-pill-dark" onClick={onConsult}>상담 신청</button>
      </div>

      <p className="employment-support-source">
        {/* 공식자료 대조를 마친 것은 국민취업지원제도뿐이므로 출처 문구도 해당 사업에만 표시한다 */}
        {programId === 'employment-support' && '공식 안내: 고용24 국민취업지원제도(work24.go.kr) 및 고용노동부 공식 자료를 기준으로 작성되었습니다. '}
        사업 지침 개정에 따라 내용이 변경될 수 있습니다.
      </p>
    </main>
  );
}
