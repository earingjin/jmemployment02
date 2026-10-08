import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Children, createElement, createRef, isValidElement, type ReactElement, type ReactNode } from 'react';
import { AdminPage, CommonEditor } from '../src/components/admin/AdminPage';
import { AdminPasswordChange } from '../src/components/admin/AdminPasswordChange';
import { ADMIN_BRANCHES, makeDefaultBranch } from '../src/data/branches';
import { EmploymentProgramNavigation, EmploymentQuickNavigation, employmentQuickLinks,
  focusEmploymentArea, selectEmploymentProgram } from '../src/components/admin/EmploymentProgramNavigation';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildEmploymentPreview } from '../src/components/admin/employmentPreview';
import { EmploymentProgramPreview, EmploymentPreviewContent, renderCustomerPreviewMarkup } from '../src/components/admin/EmploymentProgramPreview';
import { BranchSaveAuthError } from '../src/data/branchDirectory';
import { BENEFIT_CONTENT_FIELDS, createEmploymentProgramsApi, EMPLOYMENT_PROGRAM_OPTIONS,
  POLICY_SOURCE_FIELDS, PROGRAM_CONTENT_FIELDS, PROGRAM_LOAD_ERROR, PROGRAM_SAVE_ERROR, SECTION_CONTENT_FIELDS,
  parseEmploymentProgramData, type ContentValues, type EmploymentContentRow, type EmploymentPatchRequest, type EmploymentProgramId,
  type EmploymentProgramRow, type EmploymentSectionRow, type EmploymentBenefitRow } from '../src/data/employmentPrograms';
import { addEmploymentSectionLine, deleteEmploymentSectionLine, sectionLinesError,
  buildEmploymentPatch, canLeaveEmploymentEditor, createEmploymentEditorState,
  editEmploymentField, employmentEditorDirty, failedEmploymentEditorState, savedEmploymentEditorState } from '../src/components/admin/employmentEditorState';
import { validatePatch } from '../supabase/functions/employment-programs/validation';

function fixture(id: EmploymentProgramId = 'employment-support') {
  const program: EmploymentProgramRow = { id, label: '현재 사업명', seeker_kind: '구직자', seeker_target: '지원 대상',
    seeker_big: '지원 내용', seeker_sub: '', seeker_desc: '현재 상세 설명', employer_target: null, employer_amount: null,
    employer_desc: null, effective_date: null, source_name: null, source_url: null, updated_at: '2026-10-07T00:00:00Z' };
  const section: EmploymentSectionRow = { program_id: id, section_key: 'eligibility', title: '현재 참여 안내',
    lines: ['첫째 줄', '둘째 줄'], display_order: 3, variant: 'blue', updated_at: program.updated_at };
  const benefit: EmploymentBenefitRow = { program_id: id, benefit_key: 'type-1', type_label: '현재 지원 유형',
    item_names: ['지원 항목 하나', '지원 항목 둘'], sub_label: null, headline: '현재 지원 금액', hero_note: null,
    hero_type: '지원 대상', hero_bottom: '현재 조건', lines: ['첫 지원 안내', '둘째 지원 안내'], display_order: 1, updated_at: program.updated_at };
  return { program, section, benefit, response: { programs: [program],
    sections: [section, { ...section, section_key: 'steps', title: '신청 방법', display_order: 1 }], benefit_groups: [benefit] } };
}
const config = { url: 'https://fixture.invalid/', publishableKey: 'fixture-publishable' };
// Synthetic test values only; never use live sessions or credentials in this suite.
const authorization = { accessToken: 'fixture-access', adminSessionId: 'fixture-session' };

test('all four programs load DB values and ordered rows without using customer data', async () => {
  for (const { id } of EMPLOYMENT_PROGRAM_OPTIONS) {
    const f = fixture(id);
    const api = createEmploymentProgramsApi(config, async (url, init) => {
      assert.equal(String(url), `https://fixture.invalid/functions/v1/employment-programs?program_id=${id}`);
      assert.equal(init?.method, 'GET');
      assert.equal(new Headers(init?.headers).get('apikey'), config.publishableKey);
      assert.equal(new Headers(init?.headers).has('Authorization'), false);
      return Response.json(f.response);
    });
    const loaded = await api.load(id);
    assert.deepEqual(loaded.program, f.program);
    assert.deepEqual(loaded.sections.map(row => row.display_order), [1, 3]);
    assert.deepEqual(loaded.sections[1].lines, f.section.lines);
    assert.deepEqual(loaded.benefits[0].item_names, f.benefit.item_names);
    const state = createEmploymentEditorState(loaded.program, PROGRAM_CONTENT_FIELDS);
    assert.equal(state.draft.label, '현재 사업명');
    assert.equal(state.draft.seeker_sub, '');
    assert.equal(state.draft.employer_target, null);
    assert.equal(employmentEditorDirty(state), false);
  }
});

test('GET rejects missing, mismatched, malformed and duplicate rows; empty benefits are supported', () => {
  const f = fixture();
  assert.equal(parseEmploymentProgramData({ ...f.response, benefit_groups: [] }, f.program.id).benefits.length, 0);
  for (const response of [null, { ...f.response, programs: [] }, { ...f.response, programs: [fixture('job-leap').program] },
    { ...f.response, sections: [{ ...f.section, lines: 'flattened' }] },
    { ...f.response, sections: [f.section, f.section] },
    { ...f.response, benefit_groups: [{ ...f.benefit, program_id: 'job-leap' }] }]) {
    assert.throws(() => parseEmploymentProgramData(response, f.program.id), new Error(PROGRAM_LOAD_ERROR));
  }
});

test('scalar/null/empty and individual line edits become dirty and reverting becomes clean', () => {
  const f = fixture();
  const label = PROGRAM_CONTENT_FIELDS[0];
  const initial = createEmploymentEditorState(f.program, PROGRAM_CONTENT_FIELDS);
  const changed = editEmploymentField(initial, label, '새 사업명');
  assert.equal(employmentEditorDirty(changed), true);
  assert.equal(initial.draft.label, f.program.label);
  assert.equal(employmentEditorDirty(editEmploymentField(changed, label, f.program.label)), false);
  for (const fieldName of ['employer_target', 'seeker_sub']) {
    const field = PROGRAM_CONTENT_FIELDS.find(field => field.name === fieldName)!;
    const edited = editEmploymentField(initial, field, '입력');
    assert.equal(employmentEditorDirty(edited), true);
    assert.equal(employmentEditorDirty(editEmploymentField(edited, field, '')), false);
  }
  const section = createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS);
  const lines = SECTION_CONTENT_FIELDS[1];
  const edited = editEmploymentField(section, lines, '바뀐 둘째 줄', 1);
  assert.deepEqual(edited.draft.lines, ['첫째 줄', '바뀐 둘째 줄']);
  assert.deepEqual(section.draft.lines, ['첫째 줄', '둘째 줄']);
  assert.equal(employmentEditorDirty(editEmploymentField(edited, lines, '둘째 줄', 1)), false);
  assert.equal(editEmploymentField(section, lines, '새 줄', 2), section);
});

test('each area PATCH contains changed content only and is accepted by the existing server validation', () => {
  const f = fixture();
  const cases = [
    { row: f.program, fields: PROGRAM_CONTENT_FIELDS, selector: { target: 'program', program_id: f.program.id } as const, field: PROGRAM_CONTENT_FIELDS[0], value: '새 사업명' },
    { row: f.program, fields: POLICY_SOURCE_FIELDS, selector: { target: 'program', program_id: f.program.id } as const, field: POLICY_SOURCE_FIELDS[2], value: 'https://example.com/policy' },
    { row: f.section, fields: SECTION_CONTENT_FIELDS, selector: { target: 'section', program_id: f.program.id, section_key: f.section.section_key } as const, field: SECTION_CONTENT_FIELDS[0], value: '새 참여 안내' },
    { row: f.benefit, fields: BENEFIT_CONTENT_FIELDS, selector: { target: 'benefit-group', program_id: f.program.id, benefit_key: f.benefit.benefit_key } as const, field: BENEFIT_CONTENT_FIELDS[0], value: '새 지원 유형' },
  ];
  for (const entry of cases) {
    const initial = createEmploymentEditorState(entry.row, entry.fields);
    const state = editEmploymentField(initial, entry.field, entry.value);
    const request = buildEmploymentPatch(entry.selector, state);
    assert.deepEqual(request.patch, { [entry.field.name]: entry.value });
    assert.doesNotThrow(() => validatePatch(request));
    for (const forbidden of ['id', 'program_id', 'section_key', 'benefit_key', 'display_order', 'variant', 'updated_by', 'updated_at']) {
      assert.equal(Object.hasOwn(request.patch, forbidden), false);
    }
    assert.throws(() => buildEmploymentPatch(entry.selector, initial), new Error(PROGRAM_SAVE_ERROR));
  }
});

test('line edits preserve entries and benefit array counts remain fixed', () => {
  const f = fixture();
  for (const entry of [
    { row: f.section, fields: SECTION_CONTENT_FIELDS, selector: { target: 'section', program_id: f.program.id, section_key: f.section.section_key } as const },
    { row: f.benefit, fields: BENEFIT_CONTENT_FIELDS, selector: { target: 'benefit-group', program_id: f.program.id, benefit_key: f.benefit.benefit_key } as const },
  ]) {
    const initial = createEmploymentEditorState(entry.row, entry.fields);
    for (const field of entry.fields.filter(field => field.array)) {
      const state = editEmploymentField(initial, field, '수정 내용\n같은 항목 안의 줄바꿈', 0);
      const request = buildEmploymentPatch(entry.selector, state);
      assert.equal((request.patch[field.name] as string[]).length, (initial.baseline[field.name] as string[]).length);
      assert.doesNotThrow(() => validatePatch(request));
      const resized = { ...state, draft: { ...state.draft, [field.name]: [...state.draft[field.name] as string[], '추가 줄'] } };
      if (entry.selector.target === 'section') assert.doesNotThrow(() => validatePatch(buildEmploymentPatch(entry.selector, resized)));
      else assert.throws(() => buildEmploymentPatch(entry.selector, resized), new Error(PROGRAM_SAVE_ERROR));
      assert.throws(() => savedEmploymentEditorState(state, { ...entry.row, [field.name]: ['예상치 못한 개수'] }, entry.fields), new Error(PROGRAM_SAVE_ERROR));
    }
  }
});

test('section addition appends one empty editable line and becomes dirty without changing existing data', () => {
  const f = fixture();
  const initial = createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS);
  const added = addEmploymentSectionLine(initial);
  assert.deepEqual(added.draft.lines, ['첫째 줄', '둘째 줄', '']);
  assert.deepEqual(added.baseline.lines, f.section.lines);
  assert.deepEqual(initial.draft.lines, f.section.lines);
  assert.equal(employmentEditorDirty(added), true);
  const filled = editEmploymentField(added, SECTION_CONTENT_FIELDS[1], '새 마지막 줄', 2);
  assert.deepEqual(filled.draft.lines, ['첫째 줄', '둘째 줄', '새 마지막 줄']);
  assert.equal(sectionLinesError(filled.draft.lines), '');
  assert.equal(employmentEditorDirty(deleteEmploymentSectionLine(added, 2)), false);
});

test('deleting a specific section line preserves the order of remaining entries and only changes the draft', () => {
  const f = fixture();
  const initial = createEmploymentEditorState({ ...f.section, lines: ['내용 A', '내용 B', '내용 C'] }, SECTION_CONTENT_FIELDS);
  const deleted = deleteEmploymentSectionLine(initial, 1);
  assert.deepEqual(deleted.draft.lines, ['내용 A', '내용 C']);
  assert.deepEqual(deleted.baseline.lines, ['내용 A', '내용 B', '내용 C']);
  assert.equal(employmentEditorDirty(deleted), true);
  for (const index of [-1, 3, 1.5, NaN]) assert.equal(deleteEmploymentSectionLine(initial, index), initial);
});

test('section line minimum, maximum, saving lock and benefit isolation are enforced', () => {
  const f = fixture();
  const single = createEmploymentEditorState({ ...f.section, lines: ['유일한 줄'] }, SECTION_CONTENT_FIELDS);
  assert.equal(deleteEmploymentSectionLine(single, 0), single);
  const limit = createEmploymentEditorState({ ...f.section, lines: Array(30).fill('기존 줄') }, SECTION_CONTENT_FIELDS);
  assert.equal(addEmploymentSectionLine(limit), limit);
  const twentyNine = createEmploymentEditorState({ ...f.section, lines: Array(29).fill('기존 줄') }, SECTION_CONTENT_FIELDS);
  const thirty = addEmploymentSectionLine(twentyNine);
  assert.equal((thirty.draft.lines as string[]).length, 30);
  assert.equal(addEmploymentSectionLine(thirty), thirty);
  const saving = { ...twentyNine, saving: true };
  assert.equal(addEmploymentSectionLine(saving), saving);
  assert.equal(deleteEmploymentSectionLine(saving, 0), saving);
  const benefit = createEmploymentEditorState(f.benefit, BENEFIT_CONTENT_FIELDS);
  assert.equal(addEmploymentSectionLine(benefit), benefit);
  assert.equal(deleteEmploymentSectionLine(benefit, 0), benefit);
});

test('empty, whitespace-only, overlong and out-of-range section lines cannot produce a save payload', () => {
  const f = fixture();
  const selector = { target: 'section', program_id: f.program.id, section_key: f.section.section_key } as const;
  const initial = createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS);
  for (const lines of [[''], ['  \t\n'], ['\u00a0'], ['기존 내용', ''], ['x'.repeat(1001)], [], Array(31).fill('내용')]) {
    const state = { ...initial, draft: { ...initial.draft, lines } };
    assert.notEqual(sectionLinesError(lines), '');
    assert.throws(() => buildEmploymentPatch(selector, state));
    assert.throws(() => validatePatch({ ...selector, patch: { lines } }));
  }
  const valid = Array(30).fill('x'.repeat(1000));
  assert.equal(sectionLinesError(valid), '');
  assert.doesNotThrow(() => validatePatch(buildEmploymentPatch(selector, { ...initial, draft: { ...initial.draft, lines: valid } })));
});

test('added and deleted lines PATCH exactly the final array and clean from the server response', async () => {
  const f = fixture();
  const selector = { target: 'section', program_id: f.program.id, section_key: f.section.section_key } as const;
  const initial = createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS);
  const added = editEmploymentField(addEmploymentSectionLine(initial), SECTION_CONTENT_FIELDS[1], '새 줄', 2);
  for (const draft of [added, deleteEmploymentSectionLine(initial, 0)]) {
    const body = buildEmploymentPatch(selector, draft);
    assert.deepEqual(body.patch, { lines: draft.draft.lines });
    assert.deepEqual(Object.keys(body).sort(), ['patch', 'program_id', 'section_key', 'target']);
    for (const field of ['section_key', 'program_id', 'display_order', 'variant', 'updated_at', 'updated_by']) assert.equal(Object.hasOwn(body.patch, field), false);
    const api = createEmploymentProgramsApi(config, async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      assert.deepEqual(payload.patch.lines, draft.draft.lines);
      assert.doesNotThrow(() => validatePatch(payload));
      return Response.json({ target: 'section', data: { ...f.section, lines: payload.patch.lines } });
    });
    const saved = await api.save(body, authorization);
    const clean = savedEmploymentEditorState(draft, saved, SECTION_CONTENT_FIELDS);
    assert.deepEqual(clean.baseline.lines, draft.draft.lines);
    assert.deepEqual(clean.draft.lines, draft.draft.lines);
    assert.equal(employmentEditorDirty(clean), false);
    assert.equal(clean.notice, '저장되었습니다.');
  }
});

test('line additions and deletions retain drafts after failure and use existing unsaved protection', () => {
  const f = fixture();
  const initial = createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS);
  for (const state of [addEmploymentSectionLine(initial), deleteEmploymentSectionLine(initial, 0)]) {
    const failed = failedEmploymentEditorState({ ...state, saving: true });
    assert.deepEqual(failed.draft.lines, state.draft.lines);
    assert.deepEqual(failed.baseline.lines, initial.baseline.lines);
    assert.equal(failed.error, PROGRAM_SAVE_ERROR);
    const statuses = [{ dirty: employmentEditorDirty(failed), saving: failed.saving }];
    assert.equal(canLeaveEmploymentEditor(statuses, () => false), false);
    assert.equal(canLeaveEmploymentEditor(statuses, () => true), true);
    assert.deepEqual(failed.draft.lines, state.draft.lines);
  }
});

test('GET forwards cancellation so abandoned requests cannot require loading an empty form', async () => {
  const controller = new AbortController();
  const api = createEmploymentProgramsApi(config, async (_url, init) => {
    assert.equal(init?.signal, controller.signal);
    controller.abort();
    throw new DOMException('Cancelled', 'AbortError');
  });
  await assert.rejects(api.load('employment-support', controller.signal), error => error instanceof DOMException && error.name === 'AbortError');
});

test('PATCH uses Edge Function auth headers, excludes structure fields and validates response identity', async () => {
  const f = fixture();
  const bodies: EmploymentPatchRequest[] = [
    { target: 'program', program_id: f.program.id, patch: { label: '저장된 사업명', id: 'tampered', display_order: '99' } },
    { target: 'section', program_id: f.program.id, section_key: f.section.section_key, patch: { title: '저장된 상세 제목', variant: 'tampered' } },
    { target: 'benefit-group', program_id: f.program.id, benefit_key: f.benefit.benefit_key, patch: { type_label: '저장된 지원 유형', benefit_key: 'tampered' } },
  ];
  for (const body of bodies) {
    const row = body.target === 'program' ? f.program : body.target === 'section' ? f.section : f.benefit;
    const api = createEmploymentProgramsApi(config, async (url, init) => {
      assert.equal(String(url), 'https://fixture.invalid/functions/v1/employment-programs');
      assert.equal(init?.method, 'PATCH');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), `Bearer ${authorization.accessToken}`);
      assert.equal(headers.get('x-admin-session-id'), authorization.adminSessionId);
      assert.equal(headers.get('apikey'), config.publishableKey);
      const payload = JSON.parse(String(init?.body));
      assert.doesNotThrow(() => validatePatch(payload));
      for (const key of ['id', 'program_id', 'section_key', 'benefit_key', 'display_order', 'variant']) assert.equal(Object.hasOwn(payload.patch, key), false);
      return Response.json({ target: body.target, data: { ...row, ...payload.patch } });
    });
    const saved = await api.save(body, authorization);
    assert.ok(saved);
  }
  const bad = createEmploymentProgramsApi(config, async () => Response.json({ target: 'section', data: { ...f.section, section_key: 'wrong' } }));
  await assert.rejects(bad.save(bodies[1], authorization), new Error(PROGRAM_SAVE_ERROR));
});

test('success adopts server data and cleans only the saved area while keeping other drafts', async () => {
  const f = fixture();
  const baseline = createEmploymentEditorState(f.program, PROGRAM_CONTENT_FIELDS);
  const state = editEmploymentField(baseline, PROGRAM_CONTENT_FIELDS[0], '管理');
  const source = editEmploymentField(createEmploymentEditorState(f.program, POLICY_SOURCE_FIELDS), POLICY_SOURCE_FIELDS[1], '다른 미저장 출처');
  const api = createEmploymentProgramsApi(config, async () => Response.json({ target: 'program', data: { ...f.program, label: '서버에서 반환한 사업명' } }));
  const saved = await api.save(buildEmploymentPatch({ target: 'program', program_id: f.program.id }, state), authorization);
  const clean = savedEmploymentEditorState({ ...state, saving: true }, saved, PROGRAM_CONTENT_FIELDS);
  assert.equal(clean.draft.label, '서버에서 반환한 사업명');
  assert.equal(employmentEditorDirty(clean), false);
  assert.equal(clean.saving, false);
  assert.equal(clean.notice, '저장되었습니다.');
  assert.equal(employmentEditorDirty(source), true);
  assert.equal(source.draft.source_name, '다른 미저장 출처');
});

test('failed save retains draft and baseline with a safe message; auth errors remain distinguishable', async () => {
  const f = fixture();
  const state = editEmploymentField(createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS), SECTION_CONTENT_FIELDS[0], '새 제목');
  const request = buildEmploymentPatch({ target: 'section', program_id: f.program.id, section_key: f.section.section_key }, state);
  for (const status of [400, 404, 500]) {
    const api = createEmploymentProgramsApi(config, async () => Response.json({ error: 'private-server-detail' }, { status }));
    await assert.rejects(api.save(request, authorization), new Error(PROGRAM_SAVE_ERROR));
  }
  const network = createEmploymentProgramsApi(config, async () => { throw new Error('private-network-detail'); });
  await assert.rejects(network.save(request, authorization), new Error(PROGRAM_SAVE_ERROR));
  await assert.rejects(network.load(f.program.id), new Error(PROGRAM_LOAD_ERROR));
  const failed = failedEmploymentEditorState({ ...state, saving: true });
  assert.equal(failed.draft.title, '새 제목');
  assert.equal(failed.baseline.title, f.section.title);
  assert.equal(employmentEditorDirty(failed), true);
  assert.equal(failed.saving, false);
  assert.equal(failed.error, PROGRAM_SAVE_ERROR);
  for (const status of [401, 403]) {
    const api = createEmploymentProgramsApi(config, async () => Response.json({ error: 'private-auth-detail' }, { status }));
    await assert.rejects(api.save(request, authorization), BranchSaveAuthError);
  }
  await assert.rejects(network.save(request, { accessToken: '', adminSessionId: '' }), BranchSaveAuthError);
});

test('unsaved protection confirms dirty areas, respects cancel/accept and blocks navigation during save', () => {
  let confirmations = 0;
  const cancel = () => { confirmations++; return false; };
  assert.equal(canLeaveEmploymentEditor([{ dirty: false, saving: false }], cancel), true);
  assert.equal(confirmations, 0);
  const statuses = [{ dirty: false, saving: false }, { dirty: true, saving: false }];
  assert.equal(canLeaveEmploymentEditor(statuses, cancel), false);
  assert.equal(confirmations, 1);
  assert.equal(canLeaveEmploymentEditor(statuses, () => true), true);
  assert.equal(statuses[1].dirty, true); // Asking permission does not mutate or discard the draft.
  assert.equal(canLeaveEmploymentEditor([{ dirty: true, saving: true }], () => { throw new Error('must not prompt during save'); }), false);
});

test('preview uses all latest unsaved card drafts, including added/deleted lines and policy source', () => {
  const f = fixture();
  const data = { program: f.program, benefits: [f.benefit], sections: [f.section] };
  const program = editEmploymentField(createEmploymentEditorState(f.program, PROGRAM_CONTENT_FIELDS), PROGRAM_CONTENT_FIELDS[0], '미저장 사업명');
  let benefit = createEmploymentEditorState(f.benefit, BENEFIT_CONTENT_FIELDS);
  benefit = editEmploymentField(benefit, BENEFIT_CONTENT_FIELDS[0], '미저장 지원 유형');
  benefit = editEmploymentField(benefit, BENEFIT_CONTENT_FIELDS.find(field => field.name === 'lines')!, '미저장 지원금 안내', 0);
  let section = deleteEmploymentSectionLine(createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS), 0);
  section = editEmploymentField(section, SECTION_CONTENT_FIELDS[0], '미저장 상세 제목');
  section = editEmploymentField(addEmploymentSectionLine(section), SECTION_CONTENT_FIELDS[1], '미저장 추가 줄', 1);
  let source = createEmploymentEditorState(f.program, POLICY_SOURCE_FIELDS);
  source = editEmploymentField(source, POLICY_SOURCE_FIELDS[0], '2026-10-08');
  source = editEmploymentField(source, POLICY_SOURCE_FIELDS[1], '미저장 출처');
  source = editEmploymentField(source, POLICY_SOURCE_FIELDS[2], 'https://example.com/unsaved');
  const states = [program, benefit, section, source];
  const before = JSON.stringify({ data, states });
  const drafts = new Map<string, ContentValues>([['program', program.draft], ['benefit-0', benefit.draft], ['section-0', section.draft], ['source', source.draft]]);
  const preview = buildEmploymentPreview(data, drafts);
  assert.equal(preview.program.name, '미저장 사업명');
  assert.equal(preview.benefits[0].type, '미저장 지원 유형');
  assert.equal(preview.benefits[0].lines[0], '미저장 지원금 안내');
  assert.equal(preview.sections[0].title, '미저장 상세 제목');
  assert.deepEqual(preview.sections[0].lines, ['둘째 줄', '미저장 추가 줄']);
  assert.deepEqual(preview.program.policy, { date: '2026-10-08', source: '미저장 출처', url: 'https://example.com/unsaved' });
  const markup = renderToStaticMarkup(createElement(EmploymentPreviewContent, { data: preview }));
  assert.ok(markup.includes('미저장 추가 줄'));
  assert.equal(renderCustomerPreviewMarkup(preview, 'detail').includes('첫째 줄'), false); // Removed text appears only in the before/after change list.
  assert.equal(JSON.stringify({ data, states }), before);
  assert.ok(states.every(employmentEditorDirty));
  preview.sections[0].lines.push('미리보기 복사본만 변경');
  assert.deepEqual(section.draft.lines, ['둘째 줄', '미저장 추가 줄']);
});

test('preview fallback uses loaded values and exposes no structure or audit fields', () => {
  const f = fixture();
  const preview = buildEmploymentPreview({ program: f.program, benefits: [f.benefit], sections: [f.section] }, new Map());
  assert.equal(preview.program.name, f.program.label);
  assert.deepEqual(preview.sections[0].lines, f.section.lines);
  const forbidden = ['id', 'program_id', 'section_key', 'benefit_key', 'display_order', 'variant', 'updated_at', 'updated_by'];
  const inspect = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.includes(key), false, key);
      inspect(child);
    }
  };
  inspect({ program: preview.program, benefits: preview.benefits, sections: preview.sections }); // Customer component props retain only their required program ID internally.
  const markup = renderToStaticMarkup(createElement(EmploymentPreviewContent, { data: preview }));
  assert.equal(markup.includes('기업 지원 정보'), false);
  for (const identifier of [f.program.id, f.section.section_key, f.benefit.benefit_key, f.section.variant]) assert.equal(markup.includes('>' + identifier + '<'), false);
});

test('preview renders customer text safely and keeps non-displayed policy changes outside customer frames', () => {
  const f = fixture();
  const drafts = new Map<string, ContentValues>([
    ['program', { label: '<script>alert(1)</script>', employer_target: '기업 대상', employer_amount: '기업 금액', employer_desc: '기업 설명' }],
    ['source', { source_name: '출처', source_url: 'javascript:alert(1)' }],
  ]);
  const preview = buildEmploymentPreview({ program: f.program, benefits: [], sections: [] }, drafts);
  const markup = renderToStaticMarkup(createElement(EmploymentPreviewContent, { data: preview }));
  assert.ok(markup.includes('&lt;script&gt;'));
  assert.equal(markup.includes('<script>'), false);
  const employerMarkup = renderCustomerPreviewMarkup(preview, 'employer');
  assert.ok(employerMarkup.includes('기업 설명'));
  const dialogMarkup = renderToStaticMarkup(createElement(EmploymentProgramPreview, { data: preview, onClose: () => {}, returnFocus: createRef<HTMLButtonElement>() }));
  assert.ok(dialogMarkup.includes('javascript:alert(1)')); // Plain text in the non-displayed change list only.
  assert.equal(renderCustomerPreviewMarkup(preview, 'detail').includes('javascript:alert(1)'), false);
  assert.equal(employerMarkup.includes('href='), false);
});

test('preview dialog has explicit notice/close control and rendering it never sends requests or alters drafts', () => {
  const f = fixture();
  const state = editEmploymentField(createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS), SECTION_CONTENT_FIELDS[0], '미저장 제목');
  const before = JSON.stringify(state);
  const data = { program: f.program, benefits: [], sections: [f.section] };
  let requests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { requests++; throw new Error('Preview must not make API requests'); };
  let snapshot: ReturnType<typeof buildEmploymentPreview>;
  let html: string;
  try {
    snapshot = buildEmploymentPreview(data, new Map([['section-0', state.draft]]));
    html = renderToStaticMarkup(createElement(EmploymentProgramPreview, {
      data: snapshot, onClose: () => {}, returnFocus: createRef<HTMLButtonElement>(),
    }));
  } finally { globalThis.fetch = originalFetch; }
  assert.equal(requests, 0);
  assert.ok(html.includes('<dialog'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('aria-labelledby="employment-preview-title"'));
  assert.ok(html.includes('현재 입력 중인 내용을 기준으로 표시됩니다.'));
  assert.ok(html.includes('미리보기만으로는 실제 고객 웹사이트에 반영되지 않습니다.'));
  assert.ok(html.includes('type="button"'));
  assert.equal(html.includes('<form'), false);
  assert.equal(html.includes('<input'), false);
  assert.equal(html.includes('<textarea'), false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(employmentEditorDirty(state), true);
  // Opening/closing view snapshots are independent of the network helper and editor state.
  const reopened = buildEmploymentPreview(data, new Map([['section-0', state.draft]]));
  assert.deepEqual(reopened, snapshot);
});

function elementsOfType(tree: ReactNode, type: string): ReactElement<Record<string, any>>[] {
  const result: ReactElement<Record<string, any>>[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (child.type === type) result.push(child);
    result.push(...elementsOfType(child.props.children, type));
  });
  return result;
}

test('sidebar offers exactly four business choices and uses the existing dirty/saving guard', () => {
  let selected: EmploymentProgramId = 'employment-support';
  let confirmations = 0;
  let accepted = false;
  let saving = false;
  const guard = () => canLeaveEmploymentEditor([{ dirty: true, saving }], () => { confirmations++; return accepted; });
  const onSelect = (id: EmploymentProgramId) => selectEmploymentProgram(selected, id, guard, id => { selected = id; });
  const tree = EmploymentProgramNavigation({ selected, onSelect });
  const buttons = elementsOfType(tree, 'button');
  assert.equal(buttons.length, 4);
  assert.deepEqual(buttons.map(button => button.props.children), EMPLOYMENT_PROGRAM_OPTIONS.map(option => option.label));
  assert.equal(buttons[0].props['aria-pressed'], true);
  buttons[1].props.onClick();
  assert.equal(selected, 'employment-support');
  assert.equal(confirmations, 1);
  accepted = true;
  buttons[1].props.onClick();
  assert.equal(selected, 'job-leap');
  saving = true;
  buttons[2].props.onClick();
  assert.equal(selected, 'job-leap');
  assert.equal(confirmations, 2);
  assert.equal(selectEmploymentProgram(selected, selected, () => { throw new Error('same selection must not prompt'); }, () => {}), true);
});

test('quick navigation dynamically uses section titles, including empty/duplicate/variable section lists', () => {
  for (const titles of [[], ['안내'], ['참여자격', '신청방법', '신청 창구', '유의사항'], ['안내', '안내']]) {
    const sections = titles.map(title => ({ title }));
    const links = employmentQuickLinks(sections);
    assert.deepEqual(links.groups.map(link => link.label), ['기본 정보', '지원금 안내', '상세 안내', '정책 기준 정보']);
    assert.deepEqual(links.sections.map(link => link.label), titles);
    assert.equal(new Set(links.sections.map(link => link.id)).size, titles.length);
    const anchors = elementsOfType(EmploymentQuickNavigation({ sections }), 'a');
    assert.equal(anchors.length, 4 + titles.length);
    assert.deepEqual(anchors.slice(4).map(anchor => anchor.props.href), titles.map((_, index) => `#employment-area-section-${index}`));
  }
});

test('internal navigation moves focus/scroll only, preserving dirty drafts without confirm or API calls', () => {
  const f = fixture();
  const state = addEmploymentSectionLine(createEmploymentEditorState(f.section, SECTION_CONTENT_FIELDS));
  const before = JSON.stringify(state);
  const calls: string[] = [];
  const target = {
    focus: (options: FocusOptions) => { assert.equal(options.preventScroll, true); calls.push('focus'); },
    scrollIntoView: (options: ScrollIntoViewOptions) => { assert.equal(options.block, 'start'); calls.push('scroll'); },
  };
  const links = elementsOfType(EmploymentQuickNavigation({ sections: [f.section] }), 'a');
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Navigation must not call APIs'); };
  try {
    links[4].props.onClick({ preventDefault: () => calls.push('prevent'), currentTarget: { ownerDocument: {
      getElementById: (id: string) => { assert.equal(id, 'employment-area-section-0'); return target; },
    } } });
    focusEmploymentArea(null);
  } finally { globalThis.fetch = previousFetch; }
  assert.deepEqual(calls, ['prevent', 'focus', 'scroll']);
  assert.equal(JSON.stringify(state), before);
  assert.equal(employmentEditorDirty(state), true);
});

test('site common settings render the existing year input with clear purpose and no new storage', () => {
  let saves = 0;
  const html = renderToStaticMarkup(createElement(CommonEditor, { benefitYear: '2026', onSave: () => { saves++; } }));
  assert.ok(html.includes('사이트 공통 설정'));
  assert.ok(html.includes('여러 고객 화면에서 공통으로 사용하는 표시 기준을 관리합니다.'));
  assert.ok(html.includes('기업 지원금 안내에 표시되는 기준연도입니다.'));
  assert.ok(html.includes('value="2026"'));
  assert.ok(html.includes('aria-describedby="c-benefit-year-help"'));
  assert.equal(saves, 0);
});

test('account management exposes the existing password form immediately with its policy and logout notice', () => {
  const html = renderToStaticMarkup(createElement(AdminPasswordChange, { onChanged: async () => {} }));
  assert.equal((html.match(/type="password"/g) || []).length, 3);
  for (const label of ['현재 비밀번호', '새 비밀번호', '새 비밀번호 확인', '변경하기']) assert.ok(html.includes(label));
  assert.ok(html.includes('최소 10자, 영문과 숫자를 각각 1개 이상'));
  assert.ok(html.includes('현재 관리자 로그인이 즉시 종료됩니다.'));
  assert.equal(html.includes('aria-expanded'), false);
});

test('administrator entry retains the branch default and search/editor while showing all four management menus first', () => {
  const branches = Object.fromEntries(ADMIN_BRANCHES.map(name => [name, makeDefaultBranch(name)]));
  const html = renderToStaticMarkup(createElement(AdminPage, { visible: true, openSeq: 0, branches, benefitYear: '2026',
    onSaveBranch: async () => {}, onSaveBenefitYear: () => {}, onBack: () => {},
    onUploadImage: async () => {}, onDeleteImage: async () => {}, onSaveImageSettings: async () => {},
    onSaveProgramContent: async () => fixture().program }));
  for (const label of ['지사 관리', '고용지원사업 관리', '사이트 공통 설정', '계정 관리']) assert.ok(html.includes(label));
  assert.ok(html.indexOf('admin-navigation-header') < html.indexOf('admin-sidebar'));
  assert.ok(html.includes('id="branchSearch"'));
  assert.ok(html.includes('본사 설정'));
  assert.equal(html.includes('고객 화면 미리보기'), false);
});
