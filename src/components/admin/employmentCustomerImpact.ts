import type { EmploymentProgramRow, EmploymentBenefitRow, ContentValue } from '../../data/employmentPrograms';
import type { Program } from '../../data/programs';

export type CustomerPreviewScreen = 'hero' | 'detail' | 'modal-seeker' | 'employer' | 'modal-employer';
export type CustomerEditArea = 'program' | 'benefit' | 'section' | 'source';
export const CUSTOMER_PREVIEW_SCREENS: { id: CustomerPreviewScreen; label: string }[] = [
  { id: 'hero', label: '홈 Hero' }, { id: 'detail', label: '사업 상세페이지' },
  { id: 'modal-seeker', label: '상세 모달 · 구직자' }, { id: 'employer', label: '기업 지원금 화면' },
  { id: 'modal-employer', label: '상세 모달 · 기업' },
];
export interface CustomerImpactContext { program: EmploymentProgramRow; benefit?: EmploymentBenefitRow; }
export const hasCustomerEmployer = (program: EmploymentProgramRow) => program.employer_target !== null && !!program.employer_amount;
export function applicableCustomerScreens(program: EmploymentProgramRow): CustomerPreviewScreen[] {
  return CUSTOMER_PREVIEW_SCREENS.filter(screen => screen.id === 'hero' ? program.id === 'employment-support'
    : screen.id === 'employer' || screen.id === 'modal-employer' ? hasCustomerEmployer(program) : true).map(screen => screen.id);
}
const detailScreens: CustomerPreviewScreen[] = ['detail', 'modal-seeker', 'modal-employer'];
// These declarations describe reads in Hero, ProgramDetailPage, ProgramModal and EmployerView.
// No PROGRAM_CARDS, fixed copy, year settings or policy metadata is counted as a CMS read.
const usage: Record<CustomerEditArea, Record<string, CustomerPreviewScreen[]>> = {
  program: {
    label: ['hero', 'detail', 'modal-seeker', 'employer', 'modal-employer'],
    seeker_kind: ['detail', 'modal-seeker'], seeker_target: ['detail', 'modal-seeker'],
    seeker_big: ['modal-seeker'], seeker_sub: [], seeker_desc: ['detail', 'modal-seeker'],
    employer_target: ['employer', 'modal-employer'], employer_amount: ['employer', 'modal-employer'],
    employer_desc: ['employer', 'modal-employer'],
  },
  benefit: { type_label: ['hero', ...detailScreens], item_names: ['hero', ...detailScreens],
    sub_label: ['hero', ...detailScreens], headline: ['hero'], hero_note: [],
    hero_type: ['hero'], hero_bottom: ['hero'], lines: detailScreens },
  section: { title: detailScreens, lines: detailScreens },
  source: { effective_date: [], source_name: [], source_url: [] },
};
export function customerFieldScreens(area: CustomerEditArea, field: string, context: CustomerImpactContext, previous?: CustomerImpactContext): CustomerPreviewScreen[] {
  const reads = (ctx: CustomerImpactContext) => {
    const available = applicableCustomerScreens(ctx.program);
    if (area === 'benefit' && ctx.program.id !== 'employment-support') return [];
    return (usage[area][field] ?? []).filter(screen => available.includes(screen) &&
      !(area === 'benefit' && screen === 'hero' && (field === 'sub_label' && ctx.benefit?.headline || field === 'type_label' && ctx.benefit?.type_label !== 'Ⅰ유형')));
  };
  const screens = new Set([...reads(context), ...(previous ? reads(previous) : [])]);
  // Employer availability also controls the seeker modal's existing audience-switch button.
  if (previous && area === 'program' && (field === 'employer_target' || field === 'employer_amount') &&
    hasCustomerEmployer(context.program) !== hasCustomerEmployer(previous.program)) screens.add('modal-seeker');
  return CUSTOMER_PREVIEW_SCREENS.filter(screen => screens.has(screen.id)).map(screen => screen.id);
}
export function customerFieldNotice(area: CustomerEditArea, field: string, context: CustomerImpactContext, previous?: CustomerImpactContext): string {
  const screens = customerFieldScreens(area, field, context, previous);
  if (!screens.length) return '현재 고객 화면에 직접 표시되지 않습니다.';
  return '고객 반영 위치: ' + screens.map(id => CUSTOMER_PREVIEW_SCREENS.find(screen => screen.id === id)!.label).join(' · ') +
    (area === 'benefit' && field === 'type_label' && screens.includes('hero') ? ' (Hero에서는 카드 강조 스타일에 사용되며 유형명 자체는 직접 표시하지 않습니다.)' : '');
}
export interface CustomerPreviewChange {
  areaId: string; area: CustomerEditArea; rowIndex?: number; field: string; label: string;
  before: ContentValue; after: ContentValue; screens: CustomerPreviewScreen[];
}
export function affectedCustomerScreens(changes: CustomerPreviewChange[]): CustomerPreviewScreen[] {
  return CUSTOMER_PREVIEW_SCREENS.filter(screen => changes.some(change => change.screens.includes(screen.id))).map(screen => screen.id);
}
export function previewTabAtKey(screens: CustomerPreviewScreen[], current: CustomerPreviewScreen, key: string): CustomerPreviewScreen | undefined {
  const index = screens.indexOf(current);
  if (!screens.length) return;
  if (key === 'Home') return screens[0];
  if (key === 'End') return screens[screens.length - 1];
  if (key === 'ArrowRight') return screens[(index + 1) % screens.length];
  if (key === 'ArrowLeft') return screens[(index - 1 + screens.length) % screens.length];
}
const programSelectors: Partial<Record<CustomerPreviewScreen, Record<string, string>>> = {
  hero: { label: '.hero-title .highlight, .hero-detail-cta' },
  detail: { label: '.program-detail-hero h1', seeker_kind: '.program-detail-eyebrow', seeker_target: '.program-detail-target p', seeker_desc: '.program-detail-description' },
  'modal-seeker': { label: '.pm-head h3', seeker_kind: '.pm-summary > div:first-child', seeker_big: '.pm-sum-big', seeker_target: '.pm-summary > div:nth-child(3)', seeker_desc: '.pm-summary p', employer_target: '.pm-switch', employer_amount: '.pm-switch' },
  employer: { label: '.ep-name', employer_target: '.ep-target', employer_amount: '.ep-amount', employer_desc: '.ep-desc' },
  'modal-employer': { label: '.pm-head h3', employer_target: '.pm-summary > div:nth-child(3)', employer_amount: '.pm-sum-big', employer_desc: '.pm-summary p' },
};
// Select only exact component positions. Ambiguous blocks/removals stay in the change list without a guessed highlight.
export function customerChangeSelectors(change: CustomerPreviewChange, screen: CustomerPreviewScreen, program: Program,
  benefits: { type: string; items: string[]; sub: string | null; lines: string[] }[], sections: { title: string; lines: string[] }[]): string[] {
  if (!change.screens.includes(screen)) return [];
  if (change.area === 'program') return programSelectors[screen]?.[change.field] ? [programSelectors[screen]![change.field]] : [];
  const index = change.rowIndex!;
  if (change.area === 'benefit' && screen === 'hero') {
    const parts: Record<string, string> = { type_label: '', item_names: ' .hero-benefit-name', sub_label: ' .hero-benefit-core',
      headline: ' .hero-benefit-core', hero_type: ' .hero-benefit-type', hero_bottom: ' .hero-benefit-hint' };
    return Object.hasOwn(parts, change.field) ? ['.hero-benefit-card:nth-child(' + (index + 1) + ')' + parts[change.field]] : [];
  }
  if (change.area !== 'benefit' && change.area !== 'section') return [];
  const group = benefits[index];
  const block = change.area === 'section' ? sections[index] : group && {
    title: group.type + ' · ' + group.items.join(' · ') + (group.sub ? ' (' + group.sub + ')' : ''), lines: group.lines };
  if (!block) return [];
  const matches = program.detail.map((detail, i) => detail.heading === block.title && JSON.stringify(detail.lines) === JSON.stringify(block.lines) ? i : -1).filter(i => i >= 0);
  if (matches.length !== 1) return [];
  const base = '.program-detail-card:nth-child(' + (matches[0] + 1) + ')';
  if (change.field !== 'lines') return [base + ' .program-detail-heading'];
  return block.lines.flatMap((line, i) => (change.before as string[])[i] !== line ? [base + ' .program-detail-lines li:nth-child(' + (i + 1) + ')'] : []);
}
