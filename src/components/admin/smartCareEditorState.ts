import type { ContentValues } from '../../data/employmentPrograms';
import { SMARTCARE_FIELDS, SMARTCARE_MAX_DETAILS, SMARTCARE_MIN_DETAILS, SMARTCARE_SAVE_ERROR, smartCareFieldError,
  type SmartCarePatchRequest, type SmartCareRow } from '../../data/smartCare';

export interface SmartCareEditorState {
  baseline: ContentValues; draft: ContentValues; saving: boolean; error: string; notice: string;
}
function valuesOf(row: SmartCareRow): ContentValues {
  const values: ContentValues = {};
  for (const field of SMARTCARE_FIELDS) {
    const value = row[field.name as keyof SmartCareRow];
    values[field.name] = Array.isArray(value) ? [...value] : value as string;
  }
  return values;
}
export function createSmartCareEditorState(row: SmartCareRow): SmartCareEditorState {
  return { baseline: valuesOf(row), draft: valuesOf(row), saving: false, error: '', notice: '' };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function smartCareEditorDirty(state: SmartCareEditorState): boolean {
  return SMARTCARE_FIELDS.some(field => !same(state.baseline[field.name], state.draft[field.name]));
}
export function smartCareEditorErrors(state: SmartCareEditorState): Record<string, string> {
  return Object.fromEntries(SMARTCARE_FIELDS.map(field => [field.name, smartCareFieldError(field.name, state.draft[field.name])]).filter(([, error]) => error));
}
export function editSmartCareField(state: SmartCareEditorState, name: string, value: string, index?: number): SmartCareEditorState {
  const field = SMARTCARE_FIELDS.find(item => item.name === name);
  if (state.saving || !field) return state;
  let next: string | string[] = value;
  if (field.array) {
    const current = state.draft[name];
    if (!Array.isArray(current) || !Number.isInteger(index) || index! < 0 || index! >= current.length) return state;
    next = current.map((item, i) => i === index ? value : item);
  }
  return { ...state, draft: { ...state.draft, [name]: next }, error: '', notice: '' };
}
export function addSmartCareDetail(state: SmartCareEditorState): SmartCareEditorState {
  const details = state.draft.details;
  if (state.saving || !Array.isArray(details) || details.length >= SMARTCARE_MAX_DETAILS) return state;
  return { ...state, draft: { ...state.draft, details: [...details, ''] }, error: '', notice: '' };
}
export function removeSmartCareDetail(state: SmartCareEditorState, index: number): SmartCareEditorState {
  const details = state.draft.details;
  if (state.saving || !Array.isArray(details) || details.length <= SMARTCARE_MIN_DETAILS ||
    !Number.isInteger(index) || index < 0 || index >= details.length) return state;
  return { ...state, draft: { ...state.draft, details: details.filter((_, i) => i !== index) }, error: '', notice: '' };
}
// Only changed content fields are sent. The service ID is a selector and never part of the patch.
export function buildSmartCarePatch(id: SmartCareRow['id'], state: SmartCareEditorState): SmartCarePatchRequest {
  if (Object.keys(smartCareEditorErrors(state)).length) throw new Error(SMARTCARE_SAVE_ERROR);
  const patch: ContentValues = {};
  for (const field of SMARTCARE_FIELDS) {
    if (!same(state.baseline[field.name], state.draft[field.name])) patch[field.name] = state.draft[field.name];
  }
  if (!Object.keys(patch).length) throw new Error(SMARTCARE_SAVE_ERROR);
  return { solution_id: id, patch };
}
export function savedSmartCareEditorState(row: SmartCareRow): SmartCareEditorState {
  return { ...createSmartCareEditorState(row), notice: '저장되었습니다. 고객 화면은 새로고침 후 반영됩니다.' };
}
export function failedSmartCareEditorState(state: SmartCareEditorState): SmartCareEditorState {
  return { ...state, saving: false, error: SMARTCARE_SAVE_ERROR, notice: '' };
}
