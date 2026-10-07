import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { useAdminSession } from '../src/components/admin/useAdminSession';
import { fixture } from './fixtures/adminSessionClient';
import { ADMIN_SESSION_STORAGE_KEY } from '../src/components/admin/adminSessionRenewal';

const NOW = Date.parse('2026-10-07T00:00:00Z');
const session = (id: string, seconds: number) => ({ id, created_at: new Date(NOW).toISOString(), expires_at: new Date(NOW + seconds * 1000).toISOString() });

// Exercise the real hook's effects/state with mocked browser and SDK, using installed React only.
function harness() {
  fixture.reset();
  let clock = NOW;
  const originalNow = Date.now;
  Date.now = () => clock;
  const savedGlobals = ['window', 'document', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const storage = new Map<string, string>();
  const timers = new Map<number, { callback: () => void; ms: number }>();
  const listeners = new Map<string, Set<() => void>>();
  let timerId = 0;
  const events = { addEventListener(name: string, fn: () => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(fn); },
    removeEventListener(name: string, fn: () => void) { listeners.get(name)?.delete(fn); } };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { ...events,
    setInterval(callback: () => void, ms: number) { timers.set(++timerId, { callback, ms }); return timerId; },
    clearInterval(id: number) { timers.delete(id); } } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { ...events, visibilityState: 'visible' } });
  const internals = (React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown } })
    .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const originalDispatcher = internals.H;
  const slots: any[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  const same = (a?: unknown[], b?: unknown[]) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const dispatcher = {
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial: any) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback(callback: any, deps: unknown[]) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { deps, callback };
      return slots[index].callback;
    },
    useEffect(effect: () => (() => void) | void, deps: unknown[]) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) effects.push(() => {
        slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() };
      });
    },
  };
  let current!: ReturnType<typeof useAdminSession>;
  const render = () => {
    cursor = 0; effects = []; internals.H = dispatcher;
    try { current = useAdminSession(); } finally { internals.H = originalDispatcher; }
    effects.forEach(effect => effect()); return current;
  };
  return {
    storage, timers, render, get current() { return current; },
    advance(ms: number) { clock += ms; },
    emit(name: string) { listeners.get(name)?.forEach(fn => fn()); },
    async settle() { for (let i = 0; i < 4; i++) { await new Promise<void>(resolve => setImmediate(resolve)); render(); } return current; },
    close() {
      slots.forEach(slot => slot?.cleanup?.()); Date.now = originalNow; internals.H = originalDispatcher;
      for (const [key, descriptor] of savedGlobals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete (globalThis as any)[key];
      }
    },
  };
}

async function loggedIn(h: ReturnType<typeof harness>) {
  const first = session('first-fixture', 7200);
  fixture.request = async (method, id) => method === 'DELETE' ? null : method === 'POST' || id === first.id ? first : null;
  h.render(); await h.settle(); await h.current.login('admin', 'synthetic-only'); await h.settle();
  return first;
}

test('real session hook renews without entering loading and updates storage/countdown', async () => {
  const h = harness();
  try {
    const first = await loggedIn(h);
    await h.current.renewSession();
    assert.equal(fixture.calls.filter(call => call.method === 'POST').length, 1);
    h.advance(91 * 60000);
    const fresh = { ...session('renewed-fixture', 7200 + 91 * 60), created_at: new Date(NOW + 91 * 60000).toISOString() };
    fixture.request = async (method, id) => method === 'DELETE' ? null : method === 'POST' || id === fresh.id ? fresh : first;
    const task = h.current.renewSession();
    await Promise.resolve(); h.render();
    assert.equal(h.current.loading, false);
    await task; await h.settle();
    assert.equal(h.current.fixedSession?.id, fresh.id);
    assert.equal(h.storage.get(ADMIN_SESSION_STORAGE_KEY), fresh.id);
    assert.equal(h.current.remaining, 7200);
    assert.equal(h.current.renewing, false);
    assert.match(h.current.renewalMessage, /2시간 연장/);
    assert.equal(fixture.signouts, 0);
    const auth = await h.current.getSaveAuthorization();
    assert.equal(auth.adminSessionId, fresh.id);
    assert.equal(fixture.calls.at(-1)?.method, 'GET');
  } finally { h.close(); }
});

test('real hook serializes renewal and saves, blocks duplicate POST and uses only the verified replacement ID', async () => {
  const h = harness();
  try {
    const first = await loggedIn(h); h.advance(91 * 60000);
    const fresh = { ...session('renewed-fixture', 7200 + 91 * 60), created_at: new Date(NOW + 91 * 60000).toISOString() };
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    fixture.request = async (method, id) => {
      if (method === 'POST') { await blocked; return fresh; }
      return id === fresh.id ? fresh : first;
    };
    const renewal = h.current.renewSession();
    const duplicate = h.current.renewSession();
    let savedId = '';
    const save = h.current.withSaveAuthorization(async authorization => { savedId = authorization.adminSessionId; });
    await h.settle();
    assert.equal(h.current.renewing, true); assert.equal(savedId, '');
    assert.equal(fixture.calls.filter(call => call.method === 'POST').length, 2); // login + single renewal
    release(); await Promise.all([renewal, duplicate, save]); await h.settle();
    assert.equal(savedId, fresh.id);
    // A write keeps the gate occupied even after its GET has completed.
    h.advance(91 * 60000);
    let completeSave!: () => void;
    const patch = new Promise<void>(resolve => { completeSave = resolve; });
    const inFlight = h.current.withSaveAuthorization(async () => { await patch; });
    await h.settle();
    const before = fixture.calls.filter(call => call.method === 'POST').length;
    await h.current.renewSession(); await h.settle();
    assert.equal(fixture.calls.filter(call => call.method === 'POST').length, before);
    assert.match(h.current.renewalMessage, /저장 작업/);
    completeSave(); await inFlight;
  } finally { h.close(); }
});

test('stale background GET cannot overwrite a successful explicit renewal', async () => {
  const h = harness();
  try {
    const first = await loggedIn(h); h.advance(91 * 60000);
    const fresh = { ...session('renewed-fixture', 7200 + 91 * 60), created_at: new Date(NOW + 91 * 60000).toISOString() };
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    let gets = 0;
    fixture.request = async (method, id) => {
      if (method === 'POST' || id === fresh.id) return fresh;
      if (method === 'GET' && ++gets === 1) await blocked;
      return first;
    };
    h.emit('focus'); await Promise.resolve();
    await h.current.renewSession(); await h.settle();
    release(); await h.settle();
    assert.equal(h.current.fixedSession?.id, fresh.id);
    assert.equal(h.storage.get(ADMIN_SESSION_STORAGE_KEY), fresh.id);
    assert.equal(h.current.remaining, 7200);
    assert.equal(fixture.signouts, 0);
  } finally { h.close(); }
});

test('logout during a pending renewal never reopens the administrator and attempts to revoke its new ID', async () => {
  const h = harness();
  try {
    const first = await loggedIn(h); h.advance(91 * 60000);
    const fresh = { ...session('renewed-fixture', 7200 + 91 * 60), created_at: new Date(NOW + 91 * 60000).toISOString() };
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    fixture.request = async (method, id) => {
      if (method === 'DELETE') return null;
      if (method === 'POST') { await blocked; return fresh; }
      return id === fresh.id ? fresh : first;
    };
    const renewal = h.current.renewSession(); await h.settle();
    await h.current.logout(); await h.settle();
    release(); await renewal; await h.settle();
    assert.equal(h.current.session, null); assert.equal(h.current.fixedSession, null);
    assert.equal(h.storage.has(ADMIN_SESSION_STORAGE_KEY), false);
    assert.ok(fixture.calls.some(call => call.method === 'DELETE' && call.id === fresh.id));
  } finally { h.close(); }
});

test('real hook keeps only server-valid sessions on renewal failure and logs out on uncertain/revoked ones', async () => {
  for (const valid of [true, false]) {
    const h = harness();
    try {
      const first = await loggedIn(h); h.advance(91 * 60000);
      let attempted = false;
      fixture.request = async (method) => {
        if (method === 'DELETE') return null;
        if (method === 'POST') { attempted = true; throw new Error('Synthetic failure'); }
        if (attempted && !valid) throw new Error('Synthetic revoked session');
        return first;
      };
      await h.current.renewSession(); await h.settle();
      assert.equal(h.current.loading, false);
      if (valid) {
        assert.equal(h.current.fixedSession?.id, first.id);
        assert.equal(h.storage.get(ADMIN_SESSION_STORAGE_KEY), first.id);
        assert.match(h.current.renewalMessage, /연장하지 못했습니다/);
        assert.equal(fixture.signouts, 0);
      } else {
        assert.equal(h.current.session, null); assert.equal(h.current.fixedSession, null);
        assert.equal(h.storage.has(ADMIN_SESSION_STORAGE_KEY), false);
        assert.equal(fixture.signouts, 1); assert.match(h.current.serviceError, /만료/);
      }
    } finally { h.close(); }
  }
});

test('real hook preserves GET-only periodic/focus/online/visibility/token refresh checks and revokes on logout/expiry', async () => {
  for (const expire of [false, true]) {
    const h = harness();
    try {
      await loggedIn(h);
      for (const event of ['focus', 'online', 'visibilitychange']) { h.emit(event); await h.settle(); }
      fixture.event('TOKEN_REFRESHED'); await h.settle();
      [...h.timers.values()].filter(timer => timer.ms === 60000).forEach(timer => timer.callback()); await h.settle();
      assert.equal(fixture.calls.filter(call => call.method === 'POST').length, 1);
      assert.equal(h.current.remaining, 7200);
      if (expire) {
        h.advance(7200000); [...h.timers.values()].filter(timer => timer.ms === 1000).forEach(timer => timer.callback()); await h.settle();
      } else { await h.current.logout(); await h.settle(); }
      assert.equal(h.current.session, null); assert.equal(h.current.fixedSession, null);
      assert.equal(fixture.calls.at(-1)?.method, 'DELETE');
      assert.equal(fixture.signouts, 1);
    } finally { h.close(); }
  }
});

test('real hook restores an existing fixed ID via GET without starting a new two-hour window', async () => {
  const h = harness();
  try {
    const first = await loggedIn(h);
    h.advance(3600000);
    // Existing restore path is also invoked by the SDK when the hook initially has no fixed state.
    await h.current.logout(); await h.settle();
    h.storage.set(ADMIN_SESSION_STORAGE_KEY, first.id);
    fixture.auth = { user: { id: 'fixture-user' }, access_token: 'fixture-access' };
    fixture.event('SIGNED_IN'); await h.settle();
    assert.equal(h.current.fixedSession?.id, first.id);
    assert.equal(h.current.remaining, 3600);
    assert.equal(fixture.calls.at(-1)?.method, 'GET');
    assert.equal(fixture.calls.filter(call => call.method === 'POST').length, 1);
  } finally { h.close(); }
});
