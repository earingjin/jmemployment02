import { BranchSaveAuthError, type BranchSaveAuthorization } from './branchDirectory';

// Administrator CMS data only. Customer programs.ts remains independent.
export const EMPLOYMENT_PROGRAM_OPTIONS = [
  { id: 'employment-support', label: '국민취업지원제도' },
  { id: 'job-leap', label: '청년일자리도약장려금' },
  { id: 'future-experience', label: '미래내일 일경험' },
  { id: 'field-training', label: '시니어인턴십' },
] as const;
export type EmploymentProgramId = typeof EMPLOYMENT_PROGRAM_OPTIONS[number]['id'];
export type ContentValue = string | string[] | null;
export type ContentValues = Record<string, ContentValue>;
export interface ContentField {
  name: string; label: string; max: number; nullable?: boolean;
  multiline?: boolean; array?: boolean; inputType?: 'date' | 'url';
}
export const PROGRAM_CONTENT_FIELDS: ContentField[] = [
  { name: 'label', label: '사업명', max: 100 },
  { name: 'seeker_kind', label: '구직자 유형', max: 300, nullable: true },
  { name: 'seeker_target', label: '지원 대상', max: 300, nullable: true, multiline: true },
  { name: 'seeker_big', label: '주요 지원 내용', max: 300, nullable: true },
  { name: 'seeker_sub', label: '추가 지원 안내', max: 300, nullable: true },
  { name: 'seeker_desc', label: '세부 설명', max: 2000, nullable: true, multiline: true },
  { name: 'employer_target', label: '기업 대상', max: 300, nullable: true, multiline: true },
  { name: 'employer_amount', label: '기업 지원금액', max: 300, nullable: true },
  { name: 'employer_desc', label: '기업 안내', max: 2000, nullable: true, multiline: true },
];
export const POLICY_SOURCE_FIELDS: ContentField[] = [
  { name: 'effective_date', label: '정책 기준일', max: 10, nullable: true, inputType: 'date' },
  { name: 'source_name', label: '출처명', max: 200, nullable: true },
  { name: 'source_url', label: '출처 주소 (HTTPS)', max: 2000, nullable: true, inputType: 'url' },
];
export const SECTION_CONTENT_FIELDS: ContentField[] = [
  { name: 'title', label: '제목', max: 150 },
  { name: 'lines', label: '안내 내용', max: 1000, array: true, multiline: true },
];
export const BENEFIT_CONTENT_FIELDS: ContentField[] = [
  { name: 'type_label', label: '지원 유형', max: 100 },
  { name: 'item_names', label: '지원 항목', max: 150, array: true },
  { name: 'sub_label', label: '보조 안내', max: 300, nullable: true },
  { name: 'headline', label: '주요 지원금 안내', max: 300, nullable: true },
  { name: 'hero_note', label: '지원금 보충 설명', max: 500, nullable: true, multiline: true },
  { name: 'hero_type', label: '요약 지원 유형', max: 150 },
  { name: 'hero_bottom', label: '요약 하단 안내', max: 300 },
  { name: 'lines', label: '지원금 상세 내용', max: 1000, array: true, multiline: true },
];
export interface EmploymentProgramRow {
  id: EmploymentProgramId; label: string;
  seeker_kind: string | null; seeker_target: string | null; seeker_big: string | null;
  seeker_sub: string | null; seeker_desc: string | null;
  employer_target: string | null; employer_amount: string | null; employer_desc: string | null;
  effective_date: string | null; source_name: string | null; source_url: string | null;
  updated_at: string;
}
export interface EmploymentSectionRow {
  program_id: EmploymentProgramId; section_key: string; title: string; lines: string[];
  display_order: number; variant: string; updated_at: string;
}
export interface EmploymentBenefitRow {
  program_id: EmploymentProgramId; benefit_key: string; type_label: string; item_names: string[];
  sub_label: string | null; headline: string | null; hero_note: string | null;
  hero_type: string; hero_bottom: string; lines: string[]; display_order: number; updated_at: string;
}
export type EmploymentContentRow = EmploymentProgramRow | EmploymentSectionRow | EmploymentBenefitRow;
export interface EmploymentProgramData {
  program: EmploymentProgramRow; sections: EmploymentSectionRow[]; benefits: EmploymentBenefitRow[];
}
export type EmploymentSelector =
  | { program_id: EmploymentProgramId; target: 'program' }
  | { program_id: EmploymentProgramId; target: 'section'; section_key: string }
  | { program_id: EmploymentProgramId; target: 'benefit-group'; benefit_key: string };
export type EmploymentPatchRequest = EmploymentSelector & { patch: ContentValues };
export const PROGRAM_SAVE_ERROR = '저장하지 못했습니다. 입력 내용을 확인한 후 다시 시도해주세요.';
export const PROGRAM_LOAD_ERROR = '사업 내용을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

export function fieldsForTarget(target: EmploymentSelector['target']): ContentField[] {
  return target === 'program' ? [...PROGRAM_CONTENT_FIELDS, ...POLICY_SOURCE_FIELDS]
    : target === 'section' ? SECTION_CONTENT_FIELDS : BENEFIT_CONTENT_FIELDS;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validContent(row: Record<string, unknown>, fields: ContentField[]): boolean {
  return fields.every(field => field.array
    ? Array.isArray(row[field.name]) && (row[field.name] as unknown[]).every(value => typeof value === 'string')
    : typeof row[field.name] === 'string' || (field.nullable && row[field.name] === null));
}
function validRow(row: unknown, selector: EmploymentSelector): row is EmploymentContentRow {
  if (!record(row) || typeof row.updated_at !== 'string' || !validContent(row, fieldsForTarget(selector.target))) return false;
  if (selector.target === 'program') return row.id === selector.program_id;
  return row.program_id === selector.program_id && Number.isInteger(row.display_order) &&
    (selector.target === 'section' ? row.section_key === selector.section_key && typeof row.variant === 'string'
      : row.benefit_key === selector.benefit_key);
}
export function parseEmploymentProgramData(value: unknown, id: EmploymentProgramId): EmploymentProgramData {
  if (!record(value) || !Array.isArray(value.programs) || value.programs.length !== 1 ||
    !validRow(value.programs[0], { target: 'program', program_id: id }) ||
    !Array.isArray(value.sections) || !Array.isArray(value.benefit_groups)) throw new Error(PROGRAM_LOAD_ERROR);
  const sections = value.sections;
  const benefits = value.benefit_groups;
  if (!sections.every(row => record(row) && typeof row.section_key === 'string' &&
    validRow(row, { target: 'section', program_id: id, section_key: row.section_key })) ||
    !benefits.every(row => record(row) && typeof row.benefit_key === 'string' &&
      validRow(row, { target: 'benefit-group', program_id: id, benefit_key: row.benefit_key })) ||
    new Set(sections.map(row => row.section_key)).size !== sections.length ||
    new Set(benefits.map(row => row.benefit_key)).size !== benefits.length) throw new Error(PROGRAM_LOAD_ERROR);
  return { program: value.programs[0] as EmploymentProgramRow,
    sections: [...sections].sort((a, b) => a.display_order - b.display_order),
    benefits: [...benefits].sort((a, b) => a.display_order - b.display_order) };
}

// Factory keeps network behavior testable without real credentials or DB writes.
export function createEmploymentProgramsApi(config: { url: string; publishableKey: string }, request: typeof fetch = fetch) {
  const endpoint = `${config.url.replace(/\/$/, '')}/functions/v1/employment-programs`;
  return {
    async load(id: EmploymentProgramId, signal?: AbortSignal): Promise<EmploymentProgramData> {
      try {
        if (!EMPLOYMENT_PROGRAM_OPTIONS.some(option => option.id === id)) throw new Error(PROGRAM_LOAD_ERROR);
        const response = await request(`${endpoint}?program_id=${encodeURIComponent(id)}`, {
          method: 'GET', headers: { apikey: config.publishableKey }, signal, cache: 'no-store',
        });
        if (!response.ok) throw new Error(PROGRAM_LOAD_ERROR);
        return parseEmploymentProgramData(await response.json(), id);
      } catch (cause) {
        if (signal?.aborted) throw cause;
        throw new Error(PROGRAM_LOAD_ERROR);
      }
    },
    async save(body: EmploymentPatchRequest, authorization: BranchSaveAuthorization): Promise<EmploymentContentRow> {
      const { accessToken, adminSessionId } = authorization;
      if (!accessToken || !adminSessionId) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
      try {
        // Rebuild the envelope and allowlist the patch even if a caller passes extra properties.
        const patch: ContentValues = {};
        for (const field of fieldsForTarget(body.target)) {
          if (Object.hasOwn(body.patch, field.name)) patch[field.name] = body.patch[field.name];
        }
        if (!Object.keys(patch).length || !EMPLOYMENT_PROGRAM_OPTIONS.some(option => option.id === body.program_id)) throw new Error(PROGRAM_SAVE_ERROR);
        const payload: EmploymentPatchRequest = body.target === 'program'
          ? { target: body.target, program_id: body.program_id, patch }
          : body.target === 'section' ? { target: body.target, program_id: body.program_id, section_key: body.section_key, patch }
            : { target: body.target, program_id: body.program_id, benefit_key: body.benefit_key, patch };
        const response = await request(endpoint, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: config.publishableKey,
            Authorization: `Bearer ${accessToken}`, 'x-admin-session-id': adminSessionId }, body: JSON.stringify(payload),
        });
        if (response.status === 401) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
        if (response.status === 403) throw new BranchSaveAuthError('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
        if (!response.ok) throw new Error(PROGRAM_SAVE_ERROR);
        const result: unknown = await response.json();
        if (!record(result) || result.target !== body.target || !validRow(result.data, body)) throw new Error(PROGRAM_SAVE_ERROR);
        return result.data;
      } catch (cause) {
        if (cause instanceof BranchSaveAuthError) throw cause;
        throw new Error(PROGRAM_SAVE_ERROR);
      }
    },
  };
}
function api() {
  return createEmploymentProgramsApi({ url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY });
}
export const loadEmploymentProgram = async (id: EmploymentProgramId, signal?: AbortSignal) => api().load(id, signal);
export const saveEmploymentContent = async (body: EmploymentPatchRequest, authorization: BranchSaveAuthorization) => api().save(body, authorization);
