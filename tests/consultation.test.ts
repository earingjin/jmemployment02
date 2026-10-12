import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { createConsultationApi, consultationUrl, initialConsultationSettings, CONSULTATION_FORM_URL, CONSULTATION_IDS, validFormUrl, validateSettings, openLoadedConsultation } from '../src/data/consultation';
import { ConsultationEditor } from '../src/components/admin/ConsultationEditor';
import { AdminPage, CommonEditor } from '../src/components/admin/AdminPage';
import { createInitialBranches } from '../src/data/branches';
import { BranchSaveAuthError } from '../src/data/branchDirectory';
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

const values = () => ({ ...initialConsultationSettings(), default: 'https://forms.gle/common', 'employment-support': 'https://forms.gle/employment', smartcare: 'https://forms.gle/smartcare' });
const auth = { accessToken: 'token', adminSessionId: 'session' };
const api = (request: typeof fetch) => createConsultationApi({ url: 'https://fixture.invalid', key: 'sb_publishable_fixture' }, request);
test('Google Forms URL validation blocks lookalikes, credentials, ports, redirect query parameters and malformed values', () => {
  for (const url of [CONSULTATION_FORM_URL, 'https://forms.gle/Abc123', 'https://docs.google.com/forms/d/abc/viewform', 'https://docs.google.com/forms/d/e/abc/viewform?usp=sharing']) assert.equal(validFormUrl(url), true, url);
  for (const url of ['', 'http://forms.gle/abc', 'https://forms.gle.evil.com/abc', 'https://evil.com/forms.gle/abc', 'https://u:p@forms.gle/abc', 'https://forms.gle:443/abc', 'https://forms.gle:80/abc', 'https://forms.gle/', 'https://docs.google.com/forms/', 'https://docs.google.com/url?q=https://evil.com', 'https://forms.gle/abc?redirect=https://evil.com', 'https://forms.gle/abc#evil', 'https://forms.gle/abc\n', 'https://%66orms.gle/abc', 'https://forms.gle/abc/../bad']) assert.equal(validFormUrl(url), false, url);
  assert.throws(() => validateSettings({ ...values(), default: '' }));
  assert.throws(() => validateSettings({ ...values(), extra: '' }));
  assert.throws(() => validateSettings({ default: values().default }));
  assert.equal(validateSettings(initialConsultationSettings())['job-leap'], '');
});
test('all six service IDs resolve to specific URL or common fallback; invalid stored URLs never navigate', () => {
  const settings = values();
  for (const id of CONSULTATION_IDS) assert.equal(consultationUrl(settings,id), settings[id] || settings.default);
  assert.equal(consultationUrl({ ...settings, smartcare: 'https://evil.com' }, 'smartcare'), settings.default);
  assert.equal(consultationUrl({ ...settings, default: '' }, 'job-leap'), CONSULTATION_FORM_URL);
});
test('public load distinguishes missing, invalid and failed requests and reload sees new saved values', async () => {
  assert.equal((await api(async () => Response.json({ settings: null })).load()).source, 'missing');
  assert.equal((await api(async () => Response.json({ settings: {} })).load()).source, 'invalid');
  await assert.rejects(api(async () => new Response('', { status: 500 })).load());
  let saved = values();
  const client = api(async (_url, init) => {
    assert.equal(init?.cache, init?.method === 'PATCH' ? undefined : 'no-store');
    if (init?.method === 'PATCH') saved = JSON.parse(init.body as string).settings;
    return Response.json({ settings: saved });
  });
  await client.save({ ...saved, default: 'https://forms.gle/newCommon', 'job-leap': 'https://forms.gle/leap' }, auth);
  assert.equal((await client.load()).settings.default, 'https://forms.gle/newCommon');
  assert.equal((await client.load()).settings['job-leap'], 'https://forms.gle/leap');
});
test('save verifies server response, rejects invalid input before request, and preserves authorization errors', async () => {
  let calls = 0;
  const client = api(async () => { calls++; return Response.json({ settings: values() }); });
  await assert.rejects(client.save({ ...values(), default: '' }, auth)); assert.equal(calls, 0);
  for (const code of [401,403]) await assert.rejects(api(async () => new Response('',{status:code})).save(values(),auth), BranchSaveAuthError);
  await assert.rejects(api(async () => new Response('',{status:500})).save(values(),auth));
  await assert.rejects(api(async () => Response.json({settings:null})).save(values(),auth));
});
test('initial click opens a new tab immediately and waits for latest URL without opening the old fallback', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let destination = ''; let opened = ''; let release!: (result:any) => void;
  const tab = { opener: {}, closed: false, location: { replace(url:string) { destination = url; } } };
  Object.defineProperty(globalThis,'window',{ configurable:true, value:{ open(url:string,target:string) { opened=url; assert.equal(target,'_blank'); return tab; } } });
  try {
    const promise = new Promise<any>(resolve => { release=resolve; });
    openLoadedConsultation(promise, 'smartcare'); assert.equal(opened,'about:blank'); assert.equal(destination,''); assert.equal(tab.opener,null);
    release({settings:values(),source:'saved'}); await promise; await Promise.resolve(); assert.equal(destination,values().smartcare);
  } finally { if(previous) Object.defineProperty(globalThis,'window',previous); else delete (globalThis as any).window; }
});
test('real consultation editor loads all fields, serializes saves, guards changes, cancels to last saved and keeps baseline on failure', async () => {
  const originals=['window','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  const listeners=new Map<string,(event:any)=>void>(); let accept=false; let saves=0; let release!: (value:any)=>void;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{pathname:'/admin'},history:{pushState(){}},addEventListener(name:string,fn:any){listeners.set(name,fn);},removeEventListener(name:string){listeners.delete(name);},confirm(){return accept;},alert(){}}});
  Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>Response.json({settings:values()})});
  const guard={current:()=>true}; let fail=false;
  const h=harness(()=>ConsultationEditor({leaveGuard:guard,onSave:async value=>{saves++; if(fail) throw new Error('save failed'); return new Promise(resolve=>{release=resolve;});}}));
  const button=(root:React.ReactNode,label:string)=>elements(root,e=>e.type==='button'&&e.props.children===label)[0];
  const field=(root:React.ReactNode,id:string)=>elements(root,e=>e.props.id==='consultation-'+id)[0];
  try {
    h.render(); let root=await h.settle(); assert.equal(elements(root,e=>e.type==='input').length,6); assert.equal(button(root,'변경사항 저장').props.disabled,true);
    field(root,'default').props.onChange({target:{value:'https://forms.gle/changed'}}); root=h.render(); assert.equal(guard.current(),false);
    let prevented=false; listeners.get('beforeunload')!({preventDefault(){prevented=true;}}); assert.equal(prevented,true);
    field(root,'job-leap').props.onChange({target:{value:'https://forms.gle/leap'}}); root=h.render();
    const save=button(root,'변경사항 저장'); save.props.onClick(); save.props.onClick(); root=h.render(); assert.equal(saves,1); assert.equal(button(root,'저장 중...').props.disabled,true); accept=true; assert.equal(guard.current(),false);
    release({...values(),default:'https://forms.gle/changed','job-leap':'https://forms.gle/leap'}); root=await h.settle(); assert.equal(guard.current(),true); assert.equal(button(root,'변경사항 저장').props.disabled,true);
    field(root,'job-leap').props.onChange({target:{value:''}}); root=h.render(); button(root,'입력 취소').props.onClick(); root=h.render(); assert.equal(field(root,'job-leap').props.value,'https://forms.gle/leap');
    field(root,'default').props.onChange({target:{value:''}}); root=h.render(); button(root,'변경사항 저장').props.onClick(); root=await h.settle(); assert.equal(saves,1); assert.ok(elements(root,e=>e.props.role==='alert').length);
    field(root,'default').props.onChange({target:{value:'https://forms.gle/failure'}}); root=h.render(); fail=true; button(root,'변경사항 저장').props.onClick(); root=await h.settle(); assert.ok(elements(root,e=>e.props.role==='alert').length); button(root,'입력 취소').props.onClick(); root=h.render(); assert.equal(field(root,'default').props.value,'https://forms.gle/changed');
  } finally { h.close(); for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete(globalThis as any)[key];} }
});
test('common tab uses consultation leave guard for tab changes/site return and retains benefit year editor', () => {
  let backs = 0;
  const h = harness(() => AdminPage({ visible: true, openSeq: 0, branches: createInitialBranches(), benefitYear: '2026',
    onSaveBranch: async () => {}, onSaveBenefitYear: () => {}, onBack: () => { backs++; },
    onUploadImage: async () => {}, onDeleteImage: async () => {}, onSaveImageSettings: async () => {},
    onSaveProgramContent: async () => { throw new Error('unused'); }, onSaveSmartCareContent: async () => { throw new Error('unused'); }, onSaveConsultation: async value => value }));
  const tab = (root: React.ReactNode, id: string) => elements(root, e => e.props.id === 'admin-tab-' + id)[0];
  try {
    let root = h.render(); tab(root, 'common').props.onClick(); root = h.render();
    assert.equal(component(root, CommonEditor).props.benefitYear, '2026');
    const editor = component(root, ConsultationEditor); assert.ok(editor);
    editor.props.leaveGuard.current = () => false;
    tab(root, 'branch').props.onClick(); root = h.render(); assert.equal(tab(root, 'common').props['aria-selected'], true);
    const back = elements(root, e => e.type === 'button' && typeof e.props.children === 'string' && e.props.children.includes('사이트로 돌아가기'))[0];
    back.props.onClick(); assert.equal(backs, 0);
    editor.props.leaveGuard.current = () => true;
    back.props.onClick(); assert.equal(backs, 1);
    tab(root, 'branch').props.onClick(); root = h.render(); assert.equal(tab(root, 'branch').props['aria-selected'], true);
  } finally { h.close(); }
});
test('admin lookup failure shows retry instead of editable fallback settings', async () => {
  const originals = ['window', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {} } });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => new Response('', { status: 500 }) });
  const h = harness(() => ConsultationEditor({ onSave: async value => value, leaveGuard: { current: () => true } }));
  try {
    h.render(); const root = await h.settle();
    assert.equal(elements(root, e => e.type === 'input').length, 0);
    assert.equal(elements(root, e => e.props.role === 'alert').length, 1);
    assert.ok(elements(root, e => e.type === 'button' && e.props.children === '다시 조회').length);
  } finally {
    h.close(); for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; }
  }
});
