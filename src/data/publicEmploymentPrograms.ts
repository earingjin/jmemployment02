import { EMPLOYMENT_PROGRAM_OPTIONS, fieldsForTarget, parseEmploymentProgramData, PROGRAM_LOAD_ERROR,
  type EmploymentProgramData, type EmploymentProgramId, type ContentField } from './employmentPrograms';

export interface PublicEmploymentPrograms {
  programs: EmploymentProgramData['program'][];
  sections: EmploymentProgramData['sections'];
  benefit_groups: EmploymentProgramData['benefits'];
}
const ids = EMPLOYMENT_PROGRAM_OPTIONS.map(option => option.id);
const requiredSections: Record<EmploymentProgramId, readonly string[]> = {
  'employment-support': ['notice', 'eligibility', 'steps', 'office', 'caution'],
  'job-leap': ['benefit', 'eligibility', 'steps', 'office', 'documents'],
  'future-experience': ['benefit', 'eligibility', 'steps', 'office', 'documents'],
  'field-training': ['benefit', 'eligibility', 'steps', 'office', 'documents'],
};
// Existing CMS selectors are immutable; missing a single required area must not publish a partial page.
const requiredBenefits = ['type-1', 'type-2', 'success'];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const fail = (): never => { throw new Error(PROGRAM_LOAD_ERROR); };
function content(row: Record<string, unknown>, fields: ContentField[]) {
  for (const field of fields) {
    const value = row[field.name];
    if (value === null && field.nullable) continue;
    const values = field.array ? value : [value];
    if (!Array.isArray(values) || !values.length || values.length > (field.name === 'item_names' ? 10 : 30) ||
      !values.every(item => typeof item === 'string' && item.length <= field.max &&
        (item.trim().length > 0 || field.name === 'seeker_sub' && item === '') &&
        !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(item) &&
        !/```|\b(?:javascript|vbscript|data)\s*:/i.test(item))) fail();
    if (field.inputType === 'date' && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value.startsWith('0000-') || !Number.isFinite(Date.parse(value + 'T00:00:00Z')) ||
      new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value)) fail();
    if (field.inputType === 'url') {
      const url = new URL(value as string);
      if (url.protocol !== 'https:' || url.username || url.password || /\s|\\/.test(value as string) ||
        (url.port && url.port !== '443')) fail();
    }
  }
}
function completeGroup(row: Record<string, unknown>, names: string[], required: boolean) {
  const allNull = names.every(name => row[name] === null);
  if (allNull && !required) return;
  if (!names.every(name => typeof row[name] === 'string')) fail();
}
// Validate the entire snapshot before exposing any of its rows. No partial success.
export function parsePublicEmploymentPrograms(value: unknown): PublicEmploymentPrograms {
  try {
    if (!isRecord(value) || Object.keys(value).some(key => !['programs', 'sections', 'benefit_groups'].includes(key)) ||
      !Array.isArray(value.programs) || value.programs.length !== ids.length ||
      !Array.isArray(value.sections) || !Array.isArray(value.benefit_groups) ||
      value.sections.length > 500 || value.benefit_groups.length > 500) fail();
    const raw = value as unknown as PublicEmploymentPrograms;
    if (new Set(raw.programs.map(row => row?.id)).size !== ids.length) fail();
    for (const [rows, target] of [[raw.programs, 'program'], [raw.sections, 'section'], [raw.benefit_groups, 'benefit-group']] as const) {
      for (const entry of rows) {
        const row: unknown = entry;
        if (!isRecord(row)) return fail();
        const id = target === 'program' ? row.id : row.program_id;
        if (!ids.includes(id as EmploymentProgramId)) fail();
        const fields = fieldsForTarget(target);
        const structural = target === 'program' ? ['id', 'updated_at'] : target === 'section'
          ? ['program_id', 'section_key', 'display_order', 'variant', 'updated_at']
          : ['program_id', 'benefit_key', 'display_order', 'updated_at'];
        if (Object.keys(row).some(key => !structural.includes(key) && !fields.some(field => field.name === key))) fail();
        content(row, fields);
        if (typeof row.updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(row.updated_at) ||
          !Number.isFinite(Date.parse(row.updated_at)) || row.updated_at.startsWith('0000-') ||
          new Date(row.updated_at.slice(0, 10) + 'T00:00:00Z').toISOString().slice(0, 10) !== row.updated_at.slice(0, 10)) fail();
        if (target === 'program') {
          completeGroup(row, ['seeker_kind', 'seeker_target', 'seeker_big', 'seeker_sub', 'seeker_desc'], true);
          completeGroup(row, ['employer_target', 'employer_amount', 'employer_desc'], id === 'job-leap' || id === 'field-training');
        } else {
          const key = target === 'section' ? row.section_key : row.benefit_key;
          if (typeof key !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(key) ||
            !Number.isSafeInteger(row.display_order) || (row.display_order as number) < 0) fail();
          if (target === 'section' && (typeof row.variant !== 'string' || !row.variant.trim() || row.variant.length > 64)) fail();
          if (target === 'benefit-group' && id !== 'employment-support') fail();
        }
      }
    }
    const data = ids.map(id => {
      const sections = raw.sections.filter(row => row.program_id === id);
      const benefits = raw.benefit_groups.filter(row => row.program_id === id);
      if (!requiredSections[id].every(key => sections.some(row => row.section_key === key)) ||
        id === 'employment-support' && !requiredBenefits.every(key => benefits.some(row => row.benefit_key === key)) ||
        new Set(sections.map(row => row.display_order)).size !== sections.length ||
        new Set(benefits.map(row => row.display_order)).size !== benefits.length) fail();
      return parseEmploymentProgramData({ programs: raw.programs.filter(row => row.id === id), sections, benefit_groups: benefits }, id);
    });
    // Copy arrays so consumers cannot mutate the response supplied by the caller.
    return { programs: data.map(d => ({ ...d.program })),
      sections: data.flatMap(d => d.sections.map(row => ({ ...row, lines: [...row.lines] }))),
      benefit_groups: data.flatMap(d => d.benefits.map(row => ({ ...row, item_names: [...row.item_names], lines: [...row.lines] }))) };
  } catch { return fail(); }
}

export function createPublicEmploymentProgramsApi(config: { url: string; publishableKey: string }, request: typeof fetch = fetch) {
  return {
    async load(signal?: AbortSignal): Promise<PublicEmploymentPrograms> {
      try {
        const url = new URL(config.url);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
          !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) fail();
        const response = await request(config.url.replace(/\/$/, '') + '/functions/v1/employment-programs', {
          method: 'GET', headers: { apikey: config.publishableKey }, credentials: 'omit',
          cache: 'no-store', redirect: 'error', signal,
        });
        if (!response.ok) fail();
        return parsePublicEmploymentPrograms(await response.json());
      } catch (cause) {
        if (signal?.aborted) throw cause;
        return fail();
      }
    },
  };
}
export const loadPublicEmploymentPrograms = (signal?: AbortSignal) => createPublicEmploymentProgramsApi({
  url: import.meta.env.VITE_SUPABASE_URL, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}).load(signal);
