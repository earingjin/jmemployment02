import { BENEFIT_CONTENT_FIELDS, POLICY_SOURCE_FIELDS, PROGRAM_CONTENT_FIELDS, SECTION_CONTENT_FIELDS,
  type ContentField, type ContentValues, type EmploymentContentRow, type EmploymentProgramData } from '../../data/employmentPrograms';

import { adaptEmploymentProgramContent, type CustomerBenefitGroup } from '../../data/customerProgramAdapter';
import type { Program } from '../../data/programs';
import { applicableCustomerScreens, customerFieldScreens, CUSTOMER_PREVIEW_SCREENS,
  type CustomerPreviewScreen, type CustomerPreviewChange, type CustomerEditArea } from './employmentCustomerImpact';
import { DEFAULT_BENEFIT_YEAR } from '../../data/content';

export interface EmploymentPreviewData {
  programId: EmploymentProgramData['program']['id'];
  customer: { program: Program; benefitGroups: CustomerBenefitGroup[] } | null;
  screens: CustomerPreviewScreen[];
  changes: CustomerPreviewChange[];
  error: string;
  benefitYear: string;
  program: {
    name: string; seeker: { kind: string | null; target: string | null; big: string | null; sub: string | null; description: string | null };
    employer: { target: string | null; amount: string | null; description: string | null };
    policy: { date: string | null; source: string | null; url: string | null };
  };
  benefits: { type: string; items: string[]; sub: string | null; headline: string | null; note: string | null;
    summaryType: string; summaryBottom: string; lines: string[] }[];
  sections: { title: string; lines: string[] }[];
}
function content(row: EmploymentContentRow, fields: ContentField[], draft?: ContentValues): ContentValues {
  const result: ContentValues = {};
  for (const field of fields) {
    const value = draft && Object.hasOwn(draft, field.name) ? draft[field.name] : (row as unknown as ContentValues)[field.name];
    result[field.name] = Array.isArray(value) ? [...value] : value;
  }
  return result;
}
// Read-only local snapshot. No API, persistence or dirty-state updates. Program ID is retained only for real component props.
export function buildEmploymentPreview(data: EmploymentProgramData, drafts: ReadonlyMap<string, ContentValues>, benefitYear = DEFAULT_BENEFIT_YEAR): EmploymentPreviewData {
  const p = { ...content(data.program, PROGRAM_CONTENT_FIELDS, drafts.get('program')),
    ...content(data.program, POLICY_SOURCE_FIELDS, drafts.get('source')) };
  const draftContent: EmploymentProgramData = { program: { ...data.program, ...p } as EmploymentProgramData['program'],
    benefits: data.benefits.map((row, index) => ({ ...row, ...content(row, BENEFIT_CONTENT_FIELDS, drafts.get('benefit-' + index)) }) as EmploymentProgramData['benefits'][number]),
    sections: data.sections.map((row, index) => ({ ...row, ...content(row, SECTION_CONTENT_FIELDS, drafts.get('section-' + index)) }) as EmploymentProgramData['sections'][number]) };
  const areas = [
    { areaId: 'program', area: 'program' as CustomerEditArea, row: data.program, fields: PROGRAM_CONTENT_FIELDS },
    { areaId: 'source', area: 'source' as CustomerEditArea, row: data.program, fields: POLICY_SOURCE_FIELDS },
    ...data.benefits.map((row, index) => ({ areaId: 'benefit-' + index, area: 'benefit' as CustomerEditArea, rowIndex: index, row, fields: BENEFIT_CONTENT_FIELDS })),
    ...data.sections.map((row, index) => ({ areaId: 'section-' + index, area: 'section' as CustomerEditArea, rowIndex: index, row, fields: SECTION_CONTENT_FIELDS })),
  ];
  const changes: CustomerPreviewChange[] = areas.flatMap(area => {
    const values = content(area.row, area.fields, drafts.get(area.areaId));
    return area.fields.flatMap(field => {
      const before = (area.row as unknown as ContentValues)[field.name];
      const after = values[field.name];
      if (JSON.stringify(before) === JSON.stringify(after)) return [];
      const rowIndex = 'rowIndex' in area ? area.rowIndex : undefined;
      const screens = [...new Set([
        ...customerFieldScreens(area.area, field.name, { program: data.program, benefit: rowIndex === undefined ? undefined : data.benefits[rowIndex] }),
        ...customerFieldScreens(area.area, field.name, { program: draftContent.program, benefit: rowIndex === undefined ? undefined : draftContent.benefits[rowIndex] },
          { program: data.program, benefit: rowIndex === undefined ? undefined : data.benefits[rowIndex] }),
      ])];
      return [{ areaId: area.areaId, area: area.area, rowIndex, field: field.name, label: field.label,
        before: Array.isArray(before) ? [...before] : before, after, screens }];
    });
  });
  let customer: EmploymentPreviewData['customer'] = null;
  let error = '';
  try { customer = adaptEmploymentProgramContent(draftContent); }
  catch (cause) { error = cause instanceof Error ? cause.message : '입력 내용을 확인해주세요.'; }
  const available = new Set([...applicableCustomerScreens(data.program), ...applicableCustomerScreens(draftContent.program)]);
  return {
    programId: data.program.id, customer, changes, error, benefitYear,
    screens: CUSTOMER_PREVIEW_SCREENS.filter(screen => available.has(screen.id)).map(screen => screen.id),
    program: { name: p.label as string,
      seeker: { kind: p.seeker_kind as string | null, target: p.seeker_target as string | null,
        big: p.seeker_big as string | null, sub: p.seeker_sub as string | null, description: p.seeker_desc as string | null },
      employer: { target: p.employer_target as string | null, amount: p.employer_amount as string | null, description: p.employer_desc as string | null },
      policy: { date: p.effective_date as string | null, source: p.source_name as string | null, url: p.source_url as string | null } },
    benefits: data.benefits.map((row, index) => {
      const b = content(row, BENEFIT_CONTENT_FIELDS, drafts.get(`benefit-${index}`));
      return { type: b.type_label as string, items: b.item_names as string[], sub: b.sub_label as string | null,
        headline: b.headline as string | null, note: b.hero_note as string | null,
        summaryType: b.hero_type as string, summaryBottom: b.hero_bottom as string, lines: b.lines as string[] };
    }),
    sections: data.sections.map((row, index) => {
      const section = content(row, SECTION_CONTENT_FIELDS, drafts.get(`section-${index}`));
      return { title: section.title as string, lines: section.lines as string[] };
    }),
  };
}
