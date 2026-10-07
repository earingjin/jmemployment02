import { BENEFIT_CONTENT_FIELDS, POLICY_SOURCE_FIELDS, PROGRAM_CONTENT_FIELDS, SECTION_CONTENT_FIELDS,
  type ContentField, type ContentValues, type EmploymentContentRow, type EmploymentProgramData } from '../../data/employmentPrograms';

export interface EmploymentPreviewData {
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
// Read-only snapshot. No API, persistence, dirty-state updates or technical identifiers.
export function buildEmploymentPreview(data: EmploymentProgramData, drafts: ReadonlyMap<string, ContentValues>): EmploymentPreviewData {
  const p = { ...content(data.program, PROGRAM_CONTENT_FIELDS, drafts.get('program')),
    ...content(data.program, POLICY_SOURCE_FIELDS, drafts.get('source')) };
  return {
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
