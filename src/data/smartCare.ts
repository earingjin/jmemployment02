import { SMART_SOLUTIONS, type SmartSolution, type SmartSolutionKey } from './content';
import { BranchSaveAuthError, type BranchSaveAuthorization } from './branchDirectory';
import type { ContentField, ContentValues } from './employmentPrograms';

// The four services are fixed. Icons and card copy stay keyed by these IDs; only content text is CMS-managed.
export const SMARTCARE_IDS = ['burkman', 'coverletter', 'interview', 'aptitude'] as const satisfies readonly SmartSolutionKey[];
export type SmartCareId = typeof SMARTCARE_IDS[number];
export interface SmartCareRow {
  id: SmartCareId; display_order: number; stage: string; title: string;
  description: string; details: string[]; updated_at: string;
}
export const SMARTCARE_MAX_DETAILS = 10;
export const SMARTCARE_MIN_DETAILS = 1;
export const SMARTCARE_FIELDS: ContentField[] = [
  { name: 'stage', label: '단계명', max: 30 },
  { name: 'title', label: '서비스명', max: 60 },
  { name: 'description', label: '설명', max: 500, multiline: true },
  { name: 'details', label: '상세 안내', max: 200, array: true },
];
export const SMARTCARE_LOAD_ERROR = 'SmartCare 내용을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
export const SMARTCARE_SAVE_ERROR = '저장하지 못했습니다. 입력 내용을 확인한 후 다시 시도해주세요.';
export interface SmartCarePatchRequest { solution_id: SmartCareId; patch: ContentValues }

const fail = (message = SMARTCARE_LOAD_ERROR): never => { throw new Error(message); };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const ROW_KEYS = ['id', 'display_order', 'stage', 'title', 'description', 'details', 'updated_at'];
export function smartCareTextValid(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max &&
    !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) && !/```|\b(?:javascript|vbscript|data)\s*:/i.test(value);
}
const fieldMax = (name: string) => SMARTCARE_FIELDS.find(field => field.name === name)!.max;
// Validation errors shown in the editor before saving. Mirrors the server rules.
export function smartCareFieldError(name: string, value: unknown): string {
  const field = SMARTCARE_FIELDS.find(item => item.name === name);
  if (!field) return '';
  if (field.array) {
    if (!Array.isArray(value) || value.length < SMARTCARE_MIN_DETAILS || value.length > SMARTCARE_MAX_DETAILS) {
      return `상세 안내는 ${SMARTCARE_MIN_DETAILS}개 이상, ${SMARTCARE_MAX_DETAILS}개 이하로 작성해주세요.`;
    }
    for (const [index, item] of value.entries()) {
      if (!smartCareTextValid(item, field.max)) return `상세 안내 ${index + 1}: 빈 값, HTML 꺾쇠(< >), 코드 표기 없이 ${field.max}자 이하로 작성해주세요.`;
    }
    if (new Set(value).size !== value.length) return '같은 상세 안내 항목이 중복되었습니다.';
    return '';
  }
  return smartCareTextValid(value, field.max) ? '' : `${field.label}: 빈 값, HTML 꺾쇠(< >), 코드 표기 없이 ${field.max}자 이하로 작성해주세요.`;
}
function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}
export function parseSmartCareRow(value: unknown, expectedId?: SmartCareId): SmartCareRow {
  if (!isRecord(value) || Object.keys(value).some(key => !ROW_KEYS.includes(key)) ||
    !(SMARTCARE_IDS as readonly unknown[]).includes(value.id) || (expectedId && value.id !== expectedId) ||
    value.display_order !== SMARTCARE_IDS.indexOf(value.id as SmartCareId) + 1 || !validTimestamp(value.updated_at) ||
    SMARTCARE_FIELDS.some(field => smartCareFieldError(field.name, value[field.name]))) return fail();
  const row = value as unknown as SmartCareRow;
  return { id: row.id, display_order: row.display_order, stage: row.stage, title: row.title,
    description: row.description, details: [...row.details], updated_at: row.updated_at };
}
// The whole snapshot must be valid: exactly four fixed IDs in fixed order. No partial customer content.
export function parseSmartCareResponse(value: unknown): SmartCareRow[] {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value.solutions) ||
    value.solutions.length !== SMARTCARE_IDS.length) return fail();
  return SMARTCARE_IDS.map((id, index) => parseSmartCareRow((value.solutions as unknown[])[index], id));
}

export function getSmartCareFallback(): SmartSolution[] {
  return structuredClone(SMART_SOLUTIONS);
}
// Customer shape. Card copy and icons are not CMS-managed and come from the static definition.
export function toSmartSolutions(rows: readonly Pick<SmartCareRow, 'id' | 'stage' | 'title' | 'description' | 'details'>[]): SmartSolution[] {
  return SMARTCARE_IDS.map(id => {
    const base = SMART_SOLUTIONS.find(solution => solution.key === id) ?? fail();
    const row = rows.find(item => item.id === id) ?? fail();
    return { key: id, stage: row.stage, title: row.title, card: { ...base.card },
      modal: { desc: row.description, list: [...row.details] } };
  });
}
export function smartCareRowsFromSolutions(solutions: readonly SmartSolution[]): Omit<SmartCareRow, 'updated_at'>[] {
  return SMARTCARE_IDS.map((id, index) => {
    const solution = solutions.find(item => item.key === id) ?? fail();
    return { id, display_order: index + 1, stage: solution.stage, title: solution.title,
      description: solution.modal.desc, details: [...solution.modal.list] };
  });
}

// Factory keeps network behavior testable without real credentials or DB writes.
export function createSmartCareApi(config: { url: string; publishableKey: string }, request: typeof fetch = fetch) {
  const endpoint = () => {
    const url = new URL(config.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) fail();
    return config.url.replace(/\/$/, '') + '/functions/v1/smartcare-solutions';
  };
  return {
    async load(signal?: AbortSignal): Promise<SmartCareRow[]> {
      try {
        const response = await request(endpoint(), {
          method: 'GET', headers: { apikey: config.publishableKey }, credentials: 'omit',
          cache: 'no-store', redirect: 'error', signal,
        });
        if (!response.ok) fail();
        return parseSmartCareResponse(await response.json());
      } catch (cause) {
        if (signal?.aborted) throw cause;
        return fail();
      }
    },
    async save(body: SmartCarePatchRequest, authorization: BranchSaveAuthorization): Promise<SmartCareRow> {
      const { accessToken, adminSessionId } = authorization;
      if (!accessToken || !adminSessionId) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
      try {
        // Rebuild the envelope and allowlist the patch even if a caller passes extra properties.
        const patch: ContentValues = {};
        for (const field of SMARTCARE_FIELDS) {
          if (!Object.hasOwn(body.patch, field.name)) continue;
          if (smartCareFieldError(field.name, body.patch[field.name])) fail(SMARTCARE_SAVE_ERROR);
          patch[field.name] = body.patch[field.name];
        }
        if (!Object.keys(patch).length || !SMARTCARE_IDS.includes(body.solution_id)) fail(SMARTCARE_SAVE_ERROR);
        const response = await request(endpoint(), {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: config.publishableKey,
            Authorization: `Bearer ${accessToken}`, 'x-admin-session-id': adminSessionId },
          body: JSON.stringify({ solution_id: body.solution_id, patch }), credentials: 'omit', redirect: 'error',
        });
        if (response.status === 401) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
        if (response.status === 403) throw new BranchSaveAuthError('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
        if (!response.ok) fail(SMARTCARE_SAVE_ERROR);
        const result: unknown = await response.json();
        if (!isRecord(result) || Object.keys(result).length !== 1) fail(SMARTCARE_SAVE_ERROR);
        return parseSmartCareRow((result as Record<string, unknown>).data, body.solution_id);
      } catch (cause) {
        if (cause instanceof BranchSaveAuthError) throw cause;
        throw new Error(SMARTCARE_SAVE_ERROR);
      }
    },
  };
}
const api = () => createSmartCareApi({ url: import.meta.env.VITE_SUPABASE_URL, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY });
export const loadSmartCareRows = (signal?: AbortSignal) => api().load(signal);
export const saveSmartCareContent = (body: SmartCarePatchRequest, authorization: BranchSaveAuthorization) => api().save(body, authorization);

export type SmartCareLoadResult = { solutions: SmartSolution[]; source: 'api' | 'fallback' };
export async function loadSmartCareWithFallback(
  load: (signal?: AbortSignal) => Promise<SmartCareRow[]> = loadSmartCareRows,
  signal?: AbortSignal,
): Promise<SmartCareLoadResult> {
  try {
    return { solutions: toSmartSolutions(await load(signal)), source: 'api' };
  } catch (cause) {
    // Cancellation is caller intent, not an API failure to hide with static content.
    if (signal?.aborted) throw cause;
    return { solutions: getSmartCareFallback(), source: 'fallback' };
  }
}
