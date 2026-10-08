import { type Program, type ProgramDetailBlock } from './programs';
import type { EmploymentProgramData } from './employmentPrograms';
import { parsePublicEmploymentPrograms, type PublicEmploymentPrograms } from './publicEmploymentPrograms';

export interface CustomerBenefitGroup {
  type: string; items: string[]; sub: string | null; headline: string | null; heroNote: string | null;
  heroType: string; heroBottom: string; lines: string[];
}
export interface CustomerProgramData {
  programs: Program[];
  benefitGroups: CustomerBenefitGroup[];
}
function block(heading: string, lines: string[], blue: boolean): ProgramDetailBlock {
  return { heading, lines: [...lines], headingColor: blue ? '#1E50FF' : 'var(--text-primary)',
    background: blue ? '#F0F5FF' : '#F8FAFC', border: blue ? '1px solid #D4E2FF' : '1px solid #E2E8F0', marginBottom: true };
}
// Shared pure content conversion. Public callers validate the full snapshot first;
// administrator preview callers supply their local draft, never publishing it.
export function adaptEmploymentProgramContent(data: EmploymentProgramData): { program: Program; benefitGroups: CustomerBenefitGroup[] } {
  const row = data.program;
  const sections = data.sections;
  const benefitGroups = (row.id === 'employment-support' ? data.benefits : []).map(row => ({ type: row.type_label, items: [...row.item_names],
    sub: row.sub_label, headline: row.headline, heroNote: row.hero_note,
    heroType: row.hero_type, heroBottom: row.hero_bottom, lines: [...row.lines] }));
  const benefits = benefitGroups.map(g => block(g.type + ' · ' + g.items.join(' · ') + (g.sub ? ' (' + g.sub + ')' : ''), g.lines, true));
  if (new Set(benefits.map(b => b.heading)).size !== benefits.length) {
    throw new Error('수당 상세 제목이 중복되어 구분할 수 없습니다.');
  }
    const matches = benefits.map(b => sections.map((s, index) => s.title === b.heading ? index : -1).filter(i => i >= 0));
    // Mirrors are identified by exact title AND lines, never by guessed keys or fuzzy policy wording.
    matches.forEach((indices, index) => {
      if (indices.length > 1 || indices.some(i => JSON.stringify(sections[i].lines) !== JSON.stringify(benefits[index].lines))) {
        throw new Error('수당과 상세 안내 내용이 일치하지 않습니다.');
      }
    });
    const mirrored = matches.flat();
    if (mirrored.some((index, i) => i > 0 && index <= mirrored[i - 1])) {
      throw new Error('수당과 상세 안내 순서가 일치하지 않습니다.');
    }
    // Unmirrored benefits precede sections as in programs.ts. Exact mirrors stay in their section positions.
    if (mirrored.length && mirrored.length !== benefits.length) {
      throw new Error('수당 상세 안내가 일부만 중복되어 순서를 확정할 수 없습니다.');
    }
    const detail = [...(mirrored.length ? [] : benefits), ...sections.map((section, i) => {
      const benefitIndex = matches.findIndex(indices => indices.includes(i));
      return benefitIndex >= 0 ? benefits[benefitIndex] : block(section.title, section.lines, section.variant === 'blue' || section.variant === 'benefit');
    })];
    detail.forEach((b, i) => { b.marginBottom = i !== detail.length - 1; });
    const program: Program = { id: row.id, label: row.label,
      seeker: { kind: row.seeker_kind!, target: row.seeker_target!, big: row.seeker_big!, sub: row.seeker_sub!, desc: row.seeker_desc! },
      employer: row.employer_target === null ? null : { target: row.employer_target, amount: row.employer_amount!, desc: row.employer_desc! }, detail };
  return { program, benefitGroups };
}
// Validation remains mandatory on the public path; drafts never enter it.
export function adaptCustomerPrograms(input: PublicEmploymentPrograms): CustomerProgramData {
  const data = parsePublicEmploymentPrograms(input);
  const snapshots = data.programs.map(program => adaptEmploymentProgramContent({ program,
    sections: data.sections.filter(row => row.program_id === program.id),
    benefits: data.benefit_groups.filter(row => row.program_id === program.id) }));
  return { programs: snapshots.map(snapshot => snapshot.program), benefitGroups: snapshots.flatMap(snapshot => snapshot.benefitGroups) };
}
