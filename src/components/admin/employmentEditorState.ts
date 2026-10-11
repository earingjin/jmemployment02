import { fieldsForTarget, PROGRAM_SAVE_ERROR, SECTION_CONTENT_FIELDS, type ContentField, type ContentValues,
  type EmploymentContentRow, type EmploymentPatchRequest, type EmploymentSelector } from '../../data/employmentPrograms';

export interface EmploymentEditorState {
  baseline: ContentValues; draft: ContentValues; saving: boolean; error: string; notice: string;
}
export const SECTION_MIN_LINES = 1;
export const SECTION_MAX_LINES = 30;
export function sectionLinesError(value: unknown): string {
  if (!Array.isArray(value) || value.length < SECTION_MIN_LINES || value.length > SECTION_MAX_LINES) {
    return `상세 안내는 내용 줄을 ${SECTION_MIN_LINES}개 이상, ${SECTION_MAX_LINES}개 이하로 작성해주세요.`;
  }
  const maxLength = SECTION_CONTENT_FIELDS.find(field => field.name === 'lines')!.max;
  for (const [index, line] of value.entries()) {
    if (typeof line !== 'string' || !line.trim()) return `내용 줄 ${index + 1}에 내용을 입력해주세요. 빈 줄이나 공백만 있는 줄은 저장할 수 없습니다.`;
    if (line.length > maxLength) return `내용 줄 ${index + 1}은 ${maxLength}자 이하로 작성해주세요.`;
  }
  return '';
}
export function addEmploymentSectionLine(state: EmploymentEditorState): EmploymentEditorState {
  const lines = state.draft.lines;
  if (state.saving || !Object.hasOwn(state.baseline, 'title') || !Array.isArray(lines) || lines.length >= SECTION_MAX_LINES) return state;
  return { ...state, draft: { ...state.draft, lines: [...lines, ''] }, error: '', notice: '' };
}
export function deleteEmploymentSectionLine(state: EmploymentEditorState, index: number): EmploymentEditorState {
  const lines = state.draft.lines;
  if (state.saving || !Object.hasOwn(state.baseline, 'title') || !Array.isArray(lines) || lines.length <= SECTION_MIN_LINES ||
    !Number.isInteger(index) || index < 0 || index >= lines.length) return state;
  return { ...state, draft: { ...state.draft, lines: lines.filter((_, i) => i !== index) }, error: '', notice: '' };
}
function valuesOf(row: EmploymentContentRow, fields: ContentField[]): ContentValues {
  const values: ContentValues = {};
  for (const field of fields) {
    const value = (row as unknown as ContentValues)[field.name];
    values[field.name] = Array.isArray(value) ? [...value] : value;
  }
  return values;
}
export function createEmploymentEditorState(row: EmploymentContentRow, fields: ContentField[]): EmploymentEditorState {
  return { baseline: valuesOf(row, fields), draft: valuesOf(row, fields), saving: false, error: '', notice: '' };
}
export function employmentEditorDirty(state: EmploymentEditorState): boolean {
  return Object.keys(state.baseline).some(key => JSON.stringify(state.baseline[key]) !== JSON.stringify(state.draft[key]));
}
export function editEmploymentField(state: EmploymentEditorState, field: ContentField, value: string, index?: number): EmploymentEditorState {
  if (state.saving || !Object.hasOwn(state.baseline, field.name)) return state;
  let next: string | string[] | null = field.nullable && value === ''
    ? (state.baseline[field.name] === '' ? '' : null) : value;
  if (field.array) {
    const current = state.draft[field.name];
    if (!Array.isArray(current) || !Number.isInteger(index) || index! < 0 || index! >= current.length) return state;
    next = current.map((line, i) => i === index ? value : line);
  }
  return { ...state, draft: { ...state.draft, [field.name]: next }, notice: '', error: '' };
}
export function buildEmploymentPatch(selector: EmploymentSelector, state: EmploymentEditorState): EmploymentPatchRequest {
  if (selector.target === 'section') {
    const error = sectionLinesError(state.draft.lines);
    if (error) throw new Error(error);
  }
  const patch: ContentValues = {};
  for (const field of fieldsForTarget(selector.target)) {
    if (!Object.hasOwn(state.baseline, field.name) || JSON.stringify(state.baseline[field.name]) === JSON.stringify(state.draft[field.name])) continue;
    const value = state.draft[field.name];
    if (field.array && (!Array.isArray(value) ||
      (!(selector.target === 'section' && field.name === 'lines') && value.length !== (state.baseline[field.name] as string[]).length))) throw new Error(PROGRAM_SAVE_ERROR);
    patch[field.name] = value;
  }
  if (!Object.keys(patch).length) throw new Error(PROGRAM_SAVE_ERROR);
  // Selectors are identifiers only; never copied into the editable patch.
  return selector.target === 'program' ? { target: selector.target, program_id: selector.program_id, patch }
    : selector.target === 'section' ? { target: selector.target, program_id: selector.program_id, section_key: selector.section_key, patch }
      : { target: selector.target, program_id: selector.program_id, benefit_key: selector.benefit_key, patch };
}
export function savedEmploymentEditorState(state: EmploymentEditorState, row: EmploymentContentRow, fields: ContentField[]): EmploymentEditorState {
  // Inputs are disabled while saving; only this area's baseline is replaced.
  const saved = createEmploymentEditorState(row, fields);
  for (const field of fields.filter(field => field.array)) {
    const sectionLines = 'section_key' in row && field.name === 'lines';
    const expected = sectionLines ? state.draft[field.name] : state.baseline[field.name];
    if ((saved.baseline[field.name] as string[]).length !== (expected as string[]).length ||
      (sectionLines && sectionLinesError(saved.baseline[field.name]))) throw new Error(PROGRAM_SAVE_ERROR);
  }
  return { ...saved, notice: '저장되었습니다.' };
}
export function failedEmploymentEditorState(state: EmploymentEditorState): EmploymentEditorState {
  return { ...state, saving: false, error: PROGRAM_SAVE_ERROR, notice: '' };
}
export interface EmploymentEditStatus { dirty: boolean; saving: boolean; }
export function canLeaveEmploymentEditor(statuses: Iterable<EmploymentEditStatus>, confirm: (message: string) => boolean): boolean {
  const values = [...statuses];
  if (values.some(value => value.saving)) return false;
  return !values.some(value => value.dirty) || confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 이동하시겠습니까?');
}
