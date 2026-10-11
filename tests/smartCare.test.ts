import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SMART_SOLUTIONS } from '../src/data/content';
import { BranchSaveAuthError } from '../src/data/branchDirectory';
import { createSmartCareApi, getSmartCareFallback, loadSmartCareWithFallback, parseSmartCareResponse, smartCareFieldError,
  smartCareRowsFromSolutions, toSmartSolutions, SMARTCARE_IDS, SMARTCARE_LOAD_ERROR, SMARTCARE_SAVE_ERROR,
  type SmartCareRow, type SmartCarePatchRequest } from '../src/data/smartCare';
import { SmartCareSection } from '../src/components/home/SmartCareSection';
import { SmartCarePage } from '../src/pages/SmartCarePage';
import { SmartSolutionModal } from '../src/components/modals/SmartSolutionModal';
import { addSmartCareDetail, buildSmartCarePatch, createSmartCareEditorState, editSmartCareField, removeSmartCareDetail,
  smartCareEditorDirty, smartCareEditorErrors } from '../src/components/admin/smartCareEditorState';
import { buildSmartCarePreview, smartCareChangeSelectors, affectedSmartCareScreens, smartCarePreviewTabAtKey } from '../src/components/admin/smartCarePreviewModel';
import { SmartCarePreview, SmartCarePreviewContent, markSmartCarePreviewChanges, smartCarePreviewDocument } from '../src/components/admin/SmartCarePreview';
import { SmartCareEditor, canLeaveSmartCareEditor, type SaveSmartCareContent } from '../src/components/admin/SmartCareEditor';
import { SmartCareNavigation } from '../src/components/admin/SmartCareNavigation';
import { AdminPage } from '../src/components/admin/AdminPage';
import { EmploymentProgramsEditor } from '../src/components/admin/EmploymentProgramsEditor';
import { ADMIN_BRANCHES, makeDefaultBranch } from '../src/data/branches';

const UPDATED = '2026-10-08T00:00:00Z';
function rows(): SmartCareRow[] {
  return smartCareRowsFromSolutions(SMART_SOLUTIONS).map(row => ({ ...row, updated_at: UPDATED }));
}
const response = (value = rows()) => ({ solutions: value });
function visit(root: React.ReactNode, callback: (element: React.ReactElement<any>) => void) {
  if (Array.isArray(root)) { root.forEach(child => visit(child, callback)); return; }
  if (React.isValidElement<any>(root)) { callback(root); React.Children.forEach((root.props as { children?: React.ReactNode }).children, child => visit(child, callback)); }
  else if (root && typeof root === 'object' && 'children' in root) visit((root as unknown as { children: React.ReactNode }).children, callback);
}
function elements(root: React.ReactNode, filter: (element: React.ReactElement<any>) => boolean) { const result: React.ReactElement<any>[] = []; visit(root, element => { if (filter(element)) result.push(element); }); return result; }
function component(root: React.ReactNode, type: unknown) { return elements(root, e => e.type === type)[0]; }
function harness(renderComponent: () => React.ReactElement, beforeEffects?: (root: React.ReactElement) => void) {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE; const original = internals.H;
  const slots: any[] = []; let cursor = 0; let effects: (() => void)[] = []; let closed = false;
  const same = (a?: unknown[], b?: unknown[]) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const dispatcher = {
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback: any, deps: unknown[]) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, callback }; return slots[i].callback; },
    useEffect(effect: () => void | (() => void), deps: unknown[]) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); },
  };
  const render = () => { cursor = 0; effects = []; internals.H = dispatcher; let root!: React.ReactElement; try { root = renderComponent(); } finally { internals.H = original; } beforeEffects?.(root); effects.forEach(run => run()); return root; };
  return { render, async settle() { for (let i = 0; i < 4; i++) { await new Promise<void>(resolve => setImmediate(resolve)); render(); } return render(); },
    close() { if (closed) return; closed = true; slots.forEach(slot => slot?.cleanup?.()); internals.H = original; } };
}
function globals() {
  const saved = ['window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let accepted = false; let confirmations = 0; const listeners = new Map<string, (event: any) => void>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    addEventListener(type: string, listener: (event: any) => void) { listeners.set(type, listener); },
    removeEventListener(type: string) { listeners.delete(type); },
    confirm() { confirmations++; return accepted; } } });
  return { get confirmations() { return confirmations; }, accept(value: boolean) { accepted = value; },
    unload() { let prevented = false; listeners.get('beforeunload')?.({ preventDefault() { prevented = true; }, returnValue: undefined }); return prevented; },
    hasUnload: () => listeners.has('beforeunload'),
    close() { for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; } } };
}

test('public SmartCare response is accepted only with the four fixed IDs, fixed order and valid plain text', () => {
  assert.deepEqual(parseSmartCareResponse(response()).map(row => row.id), [...SMARTCARE_IDS]);
  const bad: [string, (value: any) => void][] = [
    ['three rows', v => v.solutions.pop()],
    ['five rows', v => v.solutions.push({ ...v.solutions[0] })],
    ['unknown ID', v => { v.solutions[0].id = 'new-service'; }],
    ['duplicate ID', v => { v.solutions[1] = { ...v.solutions[0] }; }],
    ['reordered', v => { v.solutions.reverse(); }],
    ['display order changed', v => { v.solutions[0].display_order = 2; }],
    ['extra row field', v => { v.solutions[0].updated_by = 'audit'; }],
    ['extra envelope field', v => { v.extra = true; }],
    ['empty title', v => { v.solutions[0].title = ' '; }],
    ['html', v => { v.solutions[1].description = '<script>alert(1)</script>'; }],
    ['script URL', v => { v.solutions[1].description = 'javascript:alert(1)'; }],
    ['too long stage', v => { v.solutions[2].stage = '가'.repeat(31); }],
    ['duplicate details', v => { v.solutions[2].details = ['같음', '같음']; }],
    ['no details', v => { v.solutions[2].details = []; }],
    ['eleven details', v => { v.solutions[2].details = Array.from({ length: 11 }, (_, i) => '항목' + i); }],
    ['non-string detail', v => { v.solutions[2].details = [1]; }],
    ['bad timestamp', v => { v.solutions[3].updated_at = 'yesterday'; }],
  ];
  for (const [label, mutate] of bad) {
    const value = structuredClone(response()) as any; mutate(value);
    assert.throws(() => parseSmartCareResponse(value), new RegExp(SMARTCARE_LOAD_ERROR), label);
  }
  for (const value of [null, [], 'text', { solutions: null }]) assert.throws(() => parseSmartCareResponse(value));
});

test('customer adapter keeps static card copy and icons keys while replacing editable text only', () => {
  const edited = rows(); edited[2] = { ...edited[2], stage: '실전 면접', title: '새 면접 서비스', description: '새 설명', details: ['새 항목'] };
  const solutions = toSmartSolutions(edited);
  assert.deepEqual(solutions.map(s => s.key), [...SMARTCARE_IDS]);
  assert.deepEqual(solutions[2], { key: 'interview', stage: '실전 면접', title: '새 면접 서비스', card: SMART_SOLUTIONS[2].card, modal: { desc: '새 설명', list: ['새 항목'] } });
  assert.deepEqual(toSmartSolutions(rows()), SMART_SOLUTIONS);
  solutions[0].card.summary = 'mutated'; solutions[0].modal.list.push('mutated');
  assert.notEqual(SMART_SOLUTIONS[0].card.summary, 'mutated');
  const fallback = getSmartCareFallback(); fallback[0].modal.list.push('x');
  assert.equal(SMART_SOLUTIONS[0].modal.list.includes('x'), false);
});

test('fallback is used on any API or validation failure but cancellation is never hidden', async () => {
  const api = await loadSmartCareWithFallback(async () => { const value = rows(); value[0].title = 'API 제목'; return value; });
  assert.equal(api.source, 'api'); assert.equal(api.solutions[0].title, 'API 제목');
  const failed = await loadSmartCareWithFallback(async () => { throw new Error('down'); });
  assert.equal(failed.source, 'fallback'); assert.deepEqual(failed.solutions, SMART_SOLUTIONS);
  const network = createSmartCareApi({ url: 'https://fixture.invalid', publishableKey: 'sb_publishable_fixture' },
    async () => Response.json({ solutions: rows().slice(0, 3) }));
  assert.equal((await loadSmartCareWithFallback(signal => network.load(signal))).source, 'fallback');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadSmartCareWithFallback(async () => { throw new DOMException('aborted', 'AbortError'); }, controller.signal));
});

test('public GET uses only the publishable key, no credentials and rejects unsafe configuration', async () => {
  const calls: [string, RequestInit | undefined][] = [];
  const api = createSmartCareApi({ url: 'https://fixture.invalid/', publishableKey: 'sb_publishable_fixture' },
    async (url, init) => { calls.push([String(url), init]); return Response.json(response()); });
  assert.equal((await api.load()).length, 4);
  assert.equal(calls[0][0], 'https://fixture.invalid/functions/v1/smartcare-solutions');
  assert.equal(calls[0][1]?.method, 'GET'); assert.equal(calls[0][1]?.credentials, 'omit'); assert.equal(calls[0][1]?.cache, 'no-store');
  assert.deepEqual(calls[0][1]?.headers, { apikey: 'sb_publishable_fixture' });
  for (const config of [{ url: 'http://fixture.invalid', publishableKey: 'sb_publishable_fixture' }, { url: 'https://fixture.invalid', publishableKey: 'service-role' },
    { url: 'https://user:pw@fixture.invalid', publishableKey: 'sb_publishable_fixture' }]) {
    let requested = false;
    await assert.rejects(createSmartCareApi(config, async () => { requested = true; return Response.json(response()); }).load());
    assert.equal(requested, false);
  }
  await assert.rejects(createSmartCareApi({ url: 'https://fixture.invalid', publishableKey: 'sb_publishable_fixture' }, async () => new Response('', { status: 500 })).load());
});

test('administrator PATCH sends only allowlisted changed fields with session headers and validates the saved row', async () => {
  let body: any; let headers: any;
  const saved = { ...rows()[1], title: '새 서비스명' };
  const api = createSmartCareApi({ url: 'https://fixture.invalid', publishableKey: 'sb_publishable_fixture' }, async (_url, init) => {
    body = JSON.parse(String(init?.body)); headers = init?.headers; return Response.json({ data: saved });
  });
  const auth = { accessToken: 'token', adminSessionId: 'session' };
  const request = { solution_id: 'coverletter', patch: { title: '새 서비스명', display_order: 9, id: 'burkman' } } as unknown as SmartCarePatchRequest;
  assert.equal((await api.save(request, auth)).title, '새 서비스명');
  assert.deepEqual(body, { solution_id: 'coverletter', patch: { title: '새 서비스명' } });
  assert.equal(headers.Authorization, 'Bearer token'); assert.equal(headers['x-admin-session-id'], 'session');
  for (const [status, type] of [[401, BranchSaveAuthError], [403, BranchSaveAuthError]] as const) {
    await assert.rejects(createSmartCareApi({ url: 'https://fixture.invalid', publishableKey: 'sb_publishable_fixture' }, async () => new Response('', { status })).save(request, auth), type);
  }
  await assert.rejects(api.save(request, { accessToken: '', adminSessionId: 'x' }), BranchSaveAuthError);
  const wrongRow = createSmartCareApi({ url: 'https://fixture.invalid', publishableKey: 'sb_publishable_fixture' }, async () => Response.json({ data: rows()[0] }));
  await assert.rejects(wrongRow.save(request, auth), new RegExp(SMARTCARE_SAVE_ERROR));
  let sent = false;
  const invalid = createSmartCareApi({ url: 'https://fixture.invalid', publishableKey: 'sb_publishable_fixture' }, async () => { sent = true; return Response.json({ data: saved }); });
  await assert.rejects(invalid.save({ solution_id: 'coverletter', patch: { title: '<b>x</b>' } }, auth), new RegExp(SMARTCARE_SAVE_ERROR));
  await assert.rejects(invalid.save({ solution_id: 'new' as never, patch: { title: 'x' } }, auth));
  assert.equal(sent, false);
});

test('provisional seed SQL matches the static fallback text for all four fixed services', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations-draft/20261008000000_smartcare_solutions.sql'), 'utf8');
  const quote = (value: string) => "'" + value.replace(/'/g, "''") + "'";
  SMART_SOLUTIONS.forEach((solution, index) => {
    const line = `(${quote(solution.key)}, ${index + 1}, ${quote(solution.stage)}, ${quote(solution.title)},`;
    assert.ok(sql.includes(line), line);
    assert.ok(sql.includes(quote(solution.modal.desc)));
    assert.ok(sql.includes('array[' + solution.modal.list.map(quote).join(', ') + ']'));
  });
  assert.match(sql, /enable row level security/); assert.match(sql, /on conflict \(id\) do nothing/);
  assert.doesNotMatch(sql, /create policy/i);
});

test('home section, detail page and guide modal all render the supplied snapshot', () => {
  const edited = toSmartSolutions(rows().map(row => row.id === 'aptitude' ? { ...row, stage: 'API 단계', title: 'API 서비스', description: 'API 설명', details: ['API 항목'] } : row));
  const home = renderToStaticMarkup(React.createElement(SmartCareSection, { solutions: edited, onDetail: () => {} }));
  assert.match(home, /API 단계/); assert.match(home, /API 서비스/); assert.match(home, /STEP 04/);
  const page = renderToStaticMarkup(React.createElement(SmartCarePage, { solutions: edited, onBack: () => {}, onConsult: () => {} }));
  for (const text of ['API 단계', 'API 서비스', 'API 설명', 'API 항목']) assert.ok(page.includes(text), text);
  assert.equal(page.includes(SMART_SOLUTIONS[3].title), false);
  const modal = renderToStaticMarkup(React.createElement(SmartSolutionModal, { open: true, solution: edited[3], onClose: () => {}, onConsult: () => {} }));
  assert.match(modal, /API 서비스/); assert.match(modal, /API 설명/); assert.match(modal, /API 항목/);
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.equal((app.match(/loadSmartCareWithFallback\(/g) || []).length, 1);
  assert.match(app, /smartCareSolutions=\{smartCareSolutions\}/);
});

test('editor state edits only content fields, keeps 1 to 10 details and builds a changed-only patch', () => {
  const row = rows()[0];
  let state = createSmartCareEditorState(row);
  assert.equal(smartCareEditorDirty(state), false);
  assert.throws(() => buildSmartCarePatch(row.id, state));
  state = editSmartCareField(state, 'title', '새 이름');
  state = editSmartCareField(state, 'details', '바뀐 첫 항목', 0);
  assert.equal(editSmartCareField(state, 'display_order', '9'), state);
  assert.equal(editSmartCareField(state, 'details', 'x', 99), state);
  assert.deepEqual(buildSmartCarePatch(row.id, state), { solution_id: 'burkman', patch: { title: '새 이름', details: ['바뀐 첫 항목', ...row.details.slice(1)] } });
  for (let i = 0; i < 20; i++) state = addSmartCareDetail(state);
  assert.equal((state.draft.details as string[]).length, 10);
  assert.ok(smartCareEditorErrors(state).details);
  assert.throws(() => buildSmartCarePatch(row.id, state));
  for (let i = 0; i < 20; i++) state = removeSmartCareDetail(state, 0);
  assert.equal((state.draft.details as string[]).length, 1);
  state = editSmartCareField(state, 'details', row.details[0], 0);
  assert.equal(smartCareEditorErrors(state).details, undefined);
  state = editSmartCareField(state, 'title', row.title);
  assert.deepEqual(buildSmartCarePatch(row.id, state).patch, { details: [row.details[0]] });
  assert.match(smartCareFieldError('title', ''), /서비스명/);
  assert.equal(addSmartCareDetail({ ...state, saving: true }).draft, state.draft);
});

test('preview applies the draft to a copy and reports exact positions, before/after values and removed items', () => {
  const base = rows(); const before = JSON.stringify(base);
  const draft = { stage: '진단', title: '새 버크만', description: base[0].description,
    details: [base[0].details[0], '바뀐 둘째', base[0].details[2]] };
  const preview = buildSmartCarePreview(base, 'burkman', draft);
  assert.equal(JSON.stringify(base), before);
  assert.equal(preview.error, '');
  assert.equal(preview.solutions![0].title, '새 버크만'); assert.equal(preview.solutions![1].title, base[1].title);
  assert.deepEqual(preview.changes.map(c => c.field), ['title', 'details']);
  const title = preview.changes[0];
  assert.equal(title.before, base[0].title); assert.equal(title.after, '새 버크만');
  assert.deepEqual(smartCareChangeSelectors(title, 'home'), ['[data-smartcare-id="burkman"] [data-smartcare-field="title"]']);
  const details = preview.changes[1];
  assert.deepEqual(details.changedIndexes, [1]); assert.deepEqual(details.removedItems, [base[0].details[1], base[0].details[3]]);
  assert.deepEqual(smartCareChangeSelectors(details, 'home'), []);
  assert.deepEqual(smartCareChangeSelectors(details, 'detail'), ['[data-smartcare-id="burkman"] [data-smartcare-field="details"][data-smartcare-index="1"]']);
  assert.deepEqual(affectedSmartCareScreens(preview.changes), ['home', 'detail', 'modal']);
  assert.deepEqual(buildSmartCarePreview(base, 'burkman', { ...draft, title: base[0].title, details: base[0].details }).changes, []);
  const invalid = buildSmartCarePreview(base, 'burkman', { ...draft, title: '' });
  assert.equal(invalid.solutions, null); assert.match(invalid.error, /서비스명/);
  const markup = renderToStaticMarkup(React.createElement(SmartCarePreviewContent, { data: invalid, screen: 'detail' }));
  assert.match(markup, /role="alert"/); assert.doesNotMatch(markup, /<iframe/);
  assert.equal(smartCarePreviewTabAtKey(['home', 'detail', 'modal'], 'home', 'ArrowLeft'), 'modal');
});

test('preview document uses the real customer markup, stays script-free and highlights changed positions', () => {
  const base = rows();
  const preview = buildSmartCarePreview(base, 'interview', { stage: base[2].stage, description: base[2].description, title: '면접 & 연습', details: [...base[2].details.slice(0, 3), '새 넷째'] });
  for (const screen of ['home', 'detail', 'modal'] as const) {
    const document = smartCarePreviewDocument(preview, screen);
    assert.match(document, /면접 &amp; 연습/);
    assert.doesNotMatch(document, /<script[ >]/);
  }
  assert.match(smartCarePreviewDocument(preview, 'home'), /smart-care-summary/);
  assert.match(smartCarePreviewDocument(preview, 'detail'), /smart-care-detail-list/);
  const modal = smartCarePreviewDocument(preview, 'modal');
  assert.match(modal, /ai-modal/); assert.match(modal, /새 넷째/); assert.equal(modal.includes(base[0].title), false);
  const queried: string[] = []; let marks = 0;
  const document = { querySelectorAll(selector: string) { queried.push(selector); return [{ setAttribute(name: string) { assert.equal(name, 'data-smartcare-preview-changed'); marks++; } }]; } };
  assert.equal(markSmartCarePreviewChanges(document as unknown as Document, preview, 'detail'), 2);
  assert.equal(marks, 2); assert.ok(queried.some(selector => selector.includes('data-smartcare-index="3"')));
  const frame = renderToStaticMarkup(React.createElement(SmartCarePreviewContent, { data: preview, screen: 'detail' }));
  assert.match(frame, /sandbox="allow-same-origin"/); assert.doesNotMatch(frame, /allow-scripts|allow-forms|allow-top-navigation/);
  assert.match(frame, /<del>/); assert.match(frame, /<ins>/);
});

test('preview dialog filters changed screens and the modal heading names the edited service', () => {
  const base = rows();
  const preview = buildSmartCarePreview(base, 'burkman', { stage: base[0].stage, title: base[0].title, details: base[0].details, description: '설명만 변경' });
  const h = harness(() => SmartCarePreview({ data: preview, serviceLabel: '진단 · 버크만 성격검사', onClose: () => {}, returnFocus: { current: null } }),
    root => visit(root, node => { const ref = node.props.ref; if (ref && typeof ref === 'object' && !ref.current) ref.current = { showModal() {}, close() {}, focus() {} }; }));
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: { overflow: '' } } } });
  try {
    let root = h.render();
    let tabs = elements(root, e => e.props.role === 'tab');
    assert.equal(tabs.length, 3);
    elements(root, e => e.props['aria-pressed'] !== undefined)[0].props.onClick();
    root = h.render(); tabs = elements(root, e => e.props.role === 'tab');
    assert.deepEqual(tabs.map(t => t.props.id), ['smartcare-preview-tab-detail', 'smartcare-preview-tab-modal']);
    assert.match(renderToStaticMarkup(elements(root, e => e.type === 'h2')[0]), /진단 · 버크만 성격검사/);
  } finally {
    h.close();
    if (saved) Object.defineProperty(globalThis, 'document', saved); else delete (globalThis as any).document;
  }
});

test('leave decision blocks while saving, confirms unsaved drafts and allows clean editors', () => {
  let asked = 0;
  assert.equal(canLeaveSmartCareEditor({ dirty: true, saving: true }, () => { asked++; return true; }), false);
  assert.equal(asked, 0);
  assert.equal(canLeaveSmartCareEditor({ dirty: true, saving: false }, () => { asked++; return false; }), false);
  assert.equal(canLeaveSmartCareEditor({ dirty: true, saving: false }, () => { asked++; return true; }), true);
  assert.equal(canLeaveSmartCareEditor({ dirty: false, saving: false }, () => { asked++; return false; }), true);
  assert.equal(asked, 2);
});

test('real SmartCare editor: flat sidebar follows drafts, guards service/tab/site leave, previews and serializes saves', async () => {
  const g = globals(); const data = rows(); let loads = 0; let saves = 0; let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; }); let sent!: SmartCarePatchRequest;
  const onSave: SaveSmartCareContent = async request => { saves++; sent = request; await pending; return { ...data[0], ...request.patch, updated_at: '2026-10-08T01:00:00Z' } as SmartCareRow; };
  const load = async () => { loads++; return rows(); };
  const leaveGuard = { current: () => true }; const slot = { nodeType: 1 } as unknown as HTMLElement;
  const parent = harness(() => SmartCareEditor({ onSave, leaveGuard, navigationTarget: slot, load }));
  let form: ReturnType<typeof harness> | undefined;
  try {
    parent.render(); let root = await parent.settle();
    assert.equal(loads, 1); assert.ok(g.hasUnload());
    let nav = component(root, SmartCareNavigation);
    assert.deepEqual(nav.props.items.map((item: any) => item.id), [...SMARTCARE_IDS]);
    // No accordion props remain: selecting a service is the only action the sidebar exposes.
    assert.deepEqual(Object.keys(nav.props).sort(), ['items', 'loading', 'mobileExpanded', 'onSelect', 'onToggleMobile', 'saving', 'selected'].sort());
    const navMarkup = renderToStaticMarkup(React.createElement(SmartCareNavigation, nav.props));
    assert.match(navMarkup, /STEP 1/);
    // The four fixed categories only; no per-field sub-items and no +/- disclosure markers.
    assert.equal((navMarkup.match(/admin-branch-item/g) || []).length, SMARTCARE_IDS.length);
    assert.doesNotMatch(navMarkup, /aria-expanded="true"/);
    const formElement = elements(root, e => typeof e.props.reportDraft === 'function')[0]; assert.ok(formElement);
    form = harness(() => (formElement.type as (props: any) => React.ReactElement)(formElement.props));
    let formRoot = form.render();
    // Clicking the selected service's own button is a no-op (no collapse concept left) and leaves the draft untouched.
    assert.equal(nav.props.onSelect('burkman'), true);
    assert.equal(leaveGuard.current(), true); assert.equal(g.unload(), false);
    elements(formRoot, e => e.props.id === 'smartcare-field-title')[0].props.onChange({ target: { value: '미저장 버크만' } });
    formRoot = form.render(); root = parent.render(); nav = component(root, SmartCareNavigation);
    assert.equal(nav.props.items[0].title, '미저장 버크만');
    assert.equal(g.unload(), true);
    // All of the selected service's editable fields render together on the right; nothing is hidden behind a sub-menu.
    for (const id of ['smartcare-field-stage', 'smartcare-field-title', 'smartcare-field-description', 'smartcare-field-details-0'])
      assert.ok(elements(formRoot, e => e.props.id === id)[0], id);
    // Service switch and admin tab/site leave share one guard; rejecting keeps the draft and selection.
    assert.equal(nav.props.onSelect('coverletter'), false); assert.equal(g.confirmations, 1);
    assert.equal(leaveGuard.current(), false); assert.equal(g.confirmations, 2);
    assert.equal(component(parent.render(), SmartCareNavigation).props.selected, 'burkman');
    assert.equal(elements(form.render(), e => e.props.id === 'smartcare-field-title')[0].props.value, '미저장 버크만');
    elements(form.render(), e => e.type === 'button' && e.props.children === '고객 화면 미리보기')[0].props.onClick();
    const preview = component(form.render(), SmartCarePreview);
    assert.equal(preview.props.data.solutions[0].title, '미저장 버크만');
    assert.equal(preview.props.data.changes[0].before, data[0].title);
    preview.props.onClose();
    // Saving: everything is locked without asking, and only the changed field is sent.
    (form.render() as React.ReactElement<any>).props.onSubmit({ preventDefault() {} });
    root = parent.render(); nav = component(root, SmartCareNavigation);
    assert.equal(saves, 1); assert.deepEqual(sent, { solution_id: 'burkman', patch: { title: '미저장 버크만' } });
    assert.equal(nav.props.saving, true);
    // Selection is also blocked while saving: the active service's own button stays enabled, others are disabled.
    const savingButtons = elements(SmartCareNavigation(nav.props), e => e.type === 'button' && e.props.id?.startsWith('smartcare-tab-'));
    assert.deepEqual(savingButtons.map(b => b.props.disabled), [false, true, true, true]);
    assert.equal(nav.props.onSelect('aptitude'), false);
    assert.equal(leaveGuard.current(), false); assert.equal(g.confirmations, 2);
    assert.equal(g.unload(), true);
    (form.render() as React.ReactElement<any>).props.onSubmit({ preventDefault() {} }); assert.equal(saves, 1);
    release(); await form.settle(); root = parent.render();
    assert.equal(component(root, SmartCareNavigation).props.saving, false);
    assert.equal(leaveGuard.current(), true); assert.equal(g.unload(), false); assert.equal(g.confirmations, 2);
    assert.match(renderToStaticMarkup(form.render()), /저장되었습니다/);
    assert.equal(component(root, SmartCareNavigation).props.items[0].title, '미저장 버크만');
    assert.equal(nav.props.onSelect('coverletter'), true); assert.equal(component(parent.render(), SmartCareNavigation).props.selected, 'coverletter');
  } finally { form?.close(); parent.close(); g.close(); }
  assert.equal(leaveGuard.current(), true); // Unmount restores the default guard.
});

test('SmartCare load failure shows retry and never exposes stale or partial content', async () => {
  const g = globals(); let loads = 0;
  const load = async () => { loads++; throw new Error('down'); };
  const parent = harness(() => SmartCareEditor({ onSave: async () => { throw new Error('unused'); }, leaveGuard: { current: () => true },
    navigationTarget: null, load }));
  try {
    parent.render(); let root = await parent.settle();
    const markup = renderToStaticMarkup(root);
    assert.match(markup, new RegExp(SMARTCARE_LOAD_ERROR)); assert.equal(markup.includes(SMART_SOLUTIONS[0].title), false);
    elements(root, e => e.type === 'button' && e.props.children === '다시 불러오기')[0].props.onClick();
    root = await parent.settle(); assert.equal(loads, 2);
  } finally { parent.close(); g.close(); }
});

test('admin tabs: SmartCare tab exists and only the active tab guard can block tab changes and site return', () => {
  const branches = Object.fromEntries(ADMIN_BRANCHES.map(name => [name, makeDefaultBranch(name)]));
  let backs = 0;
  const h = harness(() => AdminPage({ visible: true, openSeq: 0, branches, benefitYear: '2026',
    onSaveBranch: async () => {}, onSaveBenefitYear: () => {}, onBack: () => { backs++; },
    onUploadImage: async () => {}, onDeleteImage: async () => {}, onSaveImageSettings: async () => {},
    onSaveProgramContent: async () => { throw new Error('unused'); }, onSaveSmartCareContent: async () => { throw new Error('unused'); } }));
  const tab = (root: React.ReactElement, id: string) => elements(root, e => e.props.id === 'admin-tab-' + id)[0];
  const selected = (root: React.ReactElement) => elements(root, e => e.props.role === 'tab' && e.props['aria-selected'])[0].props.id;
  const back = (root: React.ReactElement) => elements(root, e => e.type === 'button' && e.props.children === '← 사이트로 돌아가기')[0].props.onClick();
  try {
    let root = h.render();
    assert.deepEqual(elements(root, e => e.props.role === 'tab').map(e => e.props.children), ['지사 관리', '고용지원사업 관리', 'SmartCare 관리', '사이트 공통 설정', '계정 관리']);
    tab(root, 'smartcare').props.onClick(); root = h.render();
    assert.equal(selected(root), 'admin-tab-smartcare');
    const smartCare = component(root, SmartCareEditor); assert.ok(smartCare);
    assert.equal(component(root, EmploymentProgramsEditor), undefined);
    smartCare.props.leaveGuard.current = () => false;
    tab(root, 'branch').props.onClick(); root = h.render(); assert.equal(selected(root), 'admin-tab-smartcare');
    back(root); assert.equal(backs, 0);
    smartCare.props.leaveGuard.current = () => true;
    tab(root, 'programs').props.onClick(); root = h.render(); assert.equal(selected(root), 'admin-tab-programs');
    // A stale SmartCare guard has no effect once the employment editor is the active tab.
    smartCare.props.leaveGuard.current = () => false;
    const programs = component(root, EmploymentProgramsEditor); assert.ok(programs);
    programs.props.leaveGuard.current = () => false;
    tab(root, 'smartcare').props.onClick(); root = h.render(); assert.equal(selected(root), 'admin-tab-programs');
    back(root); assert.equal(backs, 0);
    programs.props.leaveGuard.current = () => true;
    tab(root, 'common').props.onClick(); root = h.render(); assert.equal(selected(root), 'admin-tab-common');
    back(root); assert.equal(backs, 1);
  } finally { h.close(); }
});
