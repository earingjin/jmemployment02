import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminSessionOperationGate, ADMIN_SESSION_STORAGE_KEY, canRenewAdminSession,
  persistAdminSession, renewVerifiedAdminSession, sessionRemaining } from '../src/components/admin/adminSessionRenewal';
import type { FixedAdminSession } from '../src/lib/supabase';

const NOW = Date.parse('2026-10-07T00:00:00Z');
const fixed = (id: string, seconds: number): FixedAdminSession => ({ id,
  created_at: new Date(NOW - 3600000).toISOString(), expires_at: new Date(NOW + seconds * 1000).toISOString() });
const old = fixed('old-fixture', 1500);
const next = { ...fixed('new-fixture', 7200), created_at: new Date(NOW).toISOString() };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('explicit renewal eligibility is positive remaining time of at most 30 minutes', () => {
  assert.equal(canRenewAdminSession(null, NOW), false);
  for (const seconds of [-1, 0, 1801, 7200]) assert.equal(canRenewAdminSession(fixed('fixture', seconds), NOW), false);
  for (const seconds of [1, 1799, 1800]) assert.equal(canRenewAdminSession(fixed('fixture', seconds), NOW), true);
});

test('renewal verifies the old ID, POSTs only once and verifies the new ID before application', async () => {
  const calls: string[] = [];
  const result = await renewVerifiedAdminSession(old, async (method, id) => {
    calls.push(`${method}:${id ?? ''}`);
    return method === 'POST' || id === next.id ? next : old;
  }, () => true, () => {}, () => NOW);
  assert.deepEqual(calls, ['GET:old-fixture', 'POST:', 'GET:new-fixture']);
  assert.deepEqual(result, { session: next, renewed: true });
  const storage = new Map<string, string>([[ADMIN_SESSION_STORAGE_KEY, old.id]]);
  persistAdminSession(result.session, { setItem: (key, value) => { storage.set(key, value); } });
  assert.equal(storage.get(ADMIN_SESSION_STORAGE_KEY), next.id);
  assert.equal(sessionRemaining(result.session, NOW), 7200);
  assert.equal(canRenewAdminSession(result.session, NOW), false);
});

test('server GET eligibility is rechecked; ineligible or expired sessions cannot cause POST', async () => {
  for (const seconds of [0, 1801]) {
    const calls: string[] = [];
    const operation = renewVerifiedAdminSession(old, async method => {
      calls.push(method); return fixed(old.id, seconds);
    }, () => true, () => {}, () => NOW);
    if (seconds === 0) await assert.rejects(operation);
    else assert.equal((await operation).renewed, false);
    assert.equal(calls.includes('POST'), false);
  }
});

test('failed POST retains only an old session reverified by the server', async () => {
  const calls: string[] = [];
  const result = await renewVerifiedAdminSession(old, async method => {
    calls.push(method);
    if (method === 'POST') throw new Error('Synthetic network failure');
    return old;
  }, () => true, () => {}, () => NOW);
  assert.deepEqual(calls, ['GET', 'POST', 'GET']);
  assert.deepEqual(result, { session: old, renewed: false });
});

test('revoked, expired, wrong-ID or unverifiable old sessions after failure require logout', async () => {
  for (const fallback of [null, fixed(old.id, 0), next, 'network-error']) {
    let gets = 0;
    await assert.rejects(renewVerifiedAdminSession(old, async method => {
      if (method === 'POST') throw new Error('Synthetic insert failure');
      if (++gets === 1) return old;
      if (fallback === 'network-error') throw new Error('Synthetic network failure');
      return fallback as FixedAdminSession | null;
    }, () => true, () => {}, () => NOW));
  }
});

test('a new unverified session is never returned as a successful replacement', async () => {
  let created: FixedAdminSession | null = null;
  const result = await renewVerifiedAdminSession(old, async (method, id) => {
    if (method === 'POST') return next;
    return id === next.id ? null : old;
  }, () => true, session => { created = session; }, () => NOW);
  assert.deepEqual(created, next);
  assert.deepEqual(result, { session: old, renewed: false });
});

test('generation cancellation before POST prevents creation', async () => {
  const calls: string[] = [];
  const result = await renewVerifiedAdminSession(old, async method => { calls.push(method); return old; },
    () => false, () => {}, () => NOW);
  assert.deepEqual(calls, ['GET', 'GET']);
  assert.equal(result.renewed, false);
});

test('operation gate rejects rapid duplicate renewal and makes saves wait for replacement', async () => {
  const gate = new AdminSessionOperationGate();
  const barrier = deferred();
  let id = old.id;
  let posts = 0;
  const renewal = gate.renew(async () => { posts++; await barrier.promise; id = next.id; });
  assert.equal(gate.renew(async () => { posts++; }), null);
  let usedId = '';
  const save = gate.save(async () => { usedId = id; });
  await Promise.resolve();
  assert.equal(usedId, '');
  barrier.resolve();
  await renewal;
  await save;
  assert.equal(posts, 1);
  assert.equal(usedId, next.id);
  assert.equal(gate.renewing, false);
  assert.equal(gate.saving, false);
});

test('operation gate blocks renewal throughout the full PATCH and releases on errors', async () => {
  const gate = new AdminSessionOperationGate();
  const patch = deferred();
  const save = gate.save(async () => { await patch.promise; throw new Error('Synthetic save failure'); });
  assert.equal(gate.saving, true);
  assert.equal(gate.renew(async () => {}), null);
  patch.resolve();
  await assert.rejects(save);
  assert.equal(gate.saving, false);
  await gate.renew(async () => {});
});
