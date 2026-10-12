import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { ADMIN_BRANCHES, BRANCH_REGIONS, createInitialBranches, type BranchMap } from '../src/data/branches';
import { discardLegacyBranchCache, publicBranchesFromResponse, usePublicBranchDirectory } from '../src/data/publicBranches';
import { BranchDirectoryView } from '../src/components/views/BranchDirectoryView';

const rows = () => Object.values(createInitialBranches()).map(b => ({
  slug: b.slug, phone: b.phone, address: b.address, map_url: b.mapUrl, region: b.region,
  hours: b.hours, published: true, program_ids: b.programIds,
  image_path: null, image_path_2: null, image_zoom: 1, image_2_zoom: 1,
  image_position_x: 50, image_position_y: 50, image_2_position_x: 50, image_2_position_y: 50,
}));
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
const markup = (branches: BranchMap, region = '전체', status: 'ready' | 'error' | 'loading' = 'ready') =>
  renderToStaticMarkup(React.createElement(BranchDirectoryView, { active: true, branches, region, status, onRegion() {}, onOpenMap() {} }));

// Execute the real hooks/App with the installed React dispatcher and isolated
// browser/network fixtures. No real API, authentication or database requests.
function harness<T>(render: () => T, cached: string | null = null, path = '/') {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const originalDispatcher = internals.H;
  const globals = ['fetch', 'localStorage', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let reply: () => Promise<Response> = async () => response(rows());
  const storage = new Map(cached === null ? [] : [['jmcareer_demo_branches', cached]]);
  let storageReads = 0;
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: () => reply() });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => { storageReads++; return storage.get(key) ?? null; },
    removeItem: (key: string) => storage.delete(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { pathname: path }, addEventListener() {}, removeEventListener() {}, scrollTo() {},
    history: { pushState() {} },
  } });
  const slots: any[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  const same = (a?: unknown[], b?: unknown[]) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const dispatcher = {
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (next: any) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn: any, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => void | (() => void), deps?: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) {
      effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } },
  };
  let current: T;
  const run = () => { cursor = 0; internals.H = dispatcher; try { current = render(); } finally { internals.H = originalDispatcher; }
    const pending = effects; effects = []; pending.forEach(fn => fn()); return current; };
  return {
    render: run, get current() { return current; }, storage, get storageReads() { return storageReads; },
    respond(fn: () => Promise<Response>) { reply = fn; },
    async settle() { for (let i = 0; i < 6; i++) { await new Promise(resolve => setImmediate(resolve)); run(); } },
    close() { slots.forEach(slot => slot?.cleanup?.()); internals.H = originalDispatcher;
      for (const [key, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; } },
  };
}

test('20 public rows produce 19 branches excluding headquarters', () => {
  const branches = publicBranchesFromResponse(rows());
  assert.equal(Object.keys(branches).length, 20);
  assert.match(markup(branches), /전국 19개 지사/);
});

test('19 returned rows exclude the omitted branch and reduce the public count', () => {
  const branches = publicBranchesFromResponse(rows().filter(row => row.slug !== '남부'));
  assert.equal(Object.keys(branches).length, 19);
  assert.equal(branches['남부'], undefined);
  assert.match(markup(branches), /전국 18개 지사/);
});

test('server omission replaces previous public state even when the legacy cache contains that branch', async () => {
  const h = harness(() => usePublicBranchDirectory('https://fixture.invalid'), JSON.stringify(createInitialBranches()));
  try { h.render(); await h.settle(); assert.ok(h.current.branches['남부']);
    h.respond(async () => response(rows().filter(row => row.slug !== '남부')));
    await h.current.refresh(); h.render();
    assert.equal(h.current.branches['남부'], undefined);
    assert.equal(h.storageReads, 0); assert.equal(h.storage.size, 0);
  } finally { h.close(); }
});

test('successful empty response stays empty and ready', async () => {
  const h = harness(() => usePublicBranchDirectory('https://fixture.invalid'));
  try { h.respond(async () => response([])); h.render(); await h.settle();
    assert.deepEqual(h.current.branches, {}); assert.equal(h.current.status, 'ready');
    assert.match(markup(h.current.branches), /전국 0개 지사/);
  } finally { h.close(); }
});

test('network and HTTP failures clear previous public data and show failure, not defaults', async () => {
  const h = harness(() => usePublicBranchDirectory('https://fixture.invalid'));
  try { h.render(); await h.settle();
    for (const fail of [async () => { throw new Error('offline'); }, async () => new Response('', { status: 500 })]) {
      h.respond(fail); await h.current.refresh(); h.render();
      assert.deepEqual(h.current.branches, {}); assert.equal(h.current.status, 'error');
      assert.match(markup(h.current.branches, '전체', h.current.status), /불러오지 못했습니다/);
    }
  } finally { h.close(); }
});

test('corrupt and old-version localStorage caches never populate the public list', async () => {
  for (const cached of ['{broken', JSON.stringify({ version: 0, branches: createInitialBranches() })]) {
    const h = harness(() => usePublicBranchDirectory('https://fixture.invalid'), cached);
    try { h.respond(async () => response([])); h.render(); await h.settle();
      assert.deepEqual(h.current.branches, {}); assert.equal(h.current.status, 'ready');
      assert.equal(h.storageReads, 0); assert.equal(h.storage.size, 0);
    } finally { h.close(); }
  }
  assert.doesNotThrow(() => discardLegacyBranchCache({ removeItem() { throw new Error('blocked'); } }));
});

test('App save callback refreshes public data from GET and reload uses the new server snapshot', async () => {
  const h = harness(() => App(), null, '/admin');
  const changed = rows().map(row => row.slug === '남부' ? { ...row, address: '모의 서버 저장 주소' } : row);
  try { h.render(); await h.settle(); h.respond(async () => response(changed));
    const admin = (h.current.props as any).children;
    admin.props.onBranchSaved({ ...changed[1], address: '저장 응답만의 주소' });
    await h.settle();
    assert.equal((h.current.props as any).children.props.branches['남부'].address, '모의 서버 저장 주소');
    assert.equal(h.storage.size, 0);
  } finally { h.close(); }
  const reload = harness(() => usePublicBranchDirectory('https://fixture.invalid'));
  try { reload.respond(async () => response(changed)); reload.render(); await reload.settle();
    assert.equal(reload.current.branches['남부'].address, '모의 서버 저장 주소');
  } finally { reload.close(); }
});

test('regional branch counts change with server membership and exclude headquarters', () => {
  const full = publicBranchesFromResponse(rows());
  const less = publicBranchesFromResponse(rows().filter(row => row.slug !== '남부'));
  assert.match(markup(full, '수도권'), /수도권<span class="cnt">8<\/span>/);
  assert.match(markup(less, '수도권'), /수도권<span class="cnt">7<\/span>/);
  for (const region of BRANCH_REGIONS) {
    const count = Object.values(less).filter(b => b.slug !== '본사' && b.region === region).length;
    assert.ok(markup(less).includes(`${region}<span class="cnt">${count}</span>`));
  }
  assert.match(markup(publicBranchesFromResponse(rows().slice(0, 1))), /전국 0개 지사/);
});

test('saved administrator data cannot become public when the follow-up GET fails', async () => {
  const h = harness(() => App(), JSON.stringify(createInitialBranches()), '/admin');
  try {
    h.render(); await h.settle();
    h.respond(async () => { throw new Error('offline'); });
    let admin = (h.current.props as any).children;
    admin.props.onBranchSaved({ ...rows()[1], address: '모의 저장 결과' });
    await h.settle();
    admin = (h.current.props as any).children;
    assert.equal(admin.props.branches['남부'].address, '모의 저장 결과');
    admin.props.onBack(); await h.settle();
    assert.deepEqual((h.current.props as any).branches, {});
    assert.equal((h.current.props as any).branchStatus, 'error');
    assert.equal(h.storage.size, 0);
  } finally { h.close(); }
});

test('malformed successful response enters error state instead of accepting partial data', async () => {
  const h = harness(() => usePublicBranchDirectory('https://fixture.invalid'));
  try {
    h.respond(async () => response([rows()[0], { slug: '남부' }]));
    h.render(); await h.settle();
    assert.equal(h.current.status, 'error'); assert.deepEqual(h.current.branches, {});
  } finally { h.close(); }
});

test('invalid response shapes are rejected and private or administrator fields do not enter public state', () => {
  for (const invalid of [null, {}, [null], [{ ...rows()[0], published: 'true' }], [{ ...rows()[0], image_zoom: NaN }], [rows()[0], rows()[0]]]) {
    assert.throws(() => publicBranchesFromResponse(invalid));
  }
  const data = rows(); data[1].published = false;
  const publicData = publicBranchesFromResponse(data.map(row => ({ ...row, contact_manager_name: 'fixture-private' })));
  assert.equal(publicData['남부'], undefined);
  assert.equal(publicData['본사'].contactManagerName, '');
  assert.equal(ADMIN_BRANCHES.length, 20);
});

test('late earlier request cannot overwrite a newer snapshot', async () => {
  const h = harness(() => usePublicBranchDirectory('https://fixture.invalid'));
  let finish!: (r: Response) => void;
  try { h.respond(() => new Promise(resolve => { finish = resolve; })); h.render();
    h.respond(async () => response([])); await h.current.refresh();
    finish(response(rows())); await h.settle();
    assert.deepEqual(h.current.branches, {}); assert.equal(h.current.status, 'ready');
  } finally { h.close(); }
});
