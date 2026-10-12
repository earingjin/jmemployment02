import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHandler } from './handler.ts';
function settings() { return { default:'https://forms.gle/common','employment-support':'','job-leap':'','future-experience':'','field-training':'',smartcare:'' }; }
const NOW = Date.parse("2026-10-08T00:00:00Z");
const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
type Row = Record<string, unknown>;
const IDS = ["burkman", "coverletter", "interview", "aptitude"];
function fixture(clock: () => number = () => NOW) {
  const tables: Record<string, Row[]> = {
    branch_admins: [{ user_id: USER }],
    admin_sessions: [{ id: SESSION, user_id: USER, created_at: new Date(NOW - 1000).toISOString(), expires_at: new Date(NOW + 7199000).toISOString(), revoked_at: null }],
    consultation_settings: [{ id: "consultation", urls: settings(), updated_at: new Date(NOW - 5000).toISOString(), updated_by: "private-audit" }],
  };
  const writes: { table: string; patch: Row }[] = [];
  let validAuth = true;
  let failTable = "";
  let authCalls = 0;
  const db = {
    auth: { getUser: async () => { authCalls++; return { data: { user: validAuth ? { id: USER } : null }, error: validAuth ? null : { message: "sensitive-auth-detail" } }; } },
    from(table: string) {
      let fields = "";
      let patch: Row | null = null;
      let max = Infinity;
      const filters: ((row: Row) => boolean)[] = [];
      const result = () => {
        if (failTable === table) return { data: null, error: { message: "sensitive-db-detail" } };
        let rows = (tables[table] || []).filter(row => filters.every(filter => filter(row))).slice(0, max);
        if (patch) {
          if (rows.length) writes.push({ table, patch });
          for (const row of rows) Object.assign(row, patch);
        }
        rows = rows.map(row => Object.fromEntries(fields.split(",").map(field => [field, row[field]])));
        return { data: rows, error: null };
      };
      const query = {
        select(value: string) { fields = value; return query; },
        eq(key: string, value: unknown) { filters.push(row => row[key] === value); return query; },
        in(key: string, values: unknown[]) { filters.push(row => values.includes(row[key])); return query; },
        order(_field: string) { return query; },
        limit(value: number) { max = value; return query; },
        update(value: Row) { patch = value; return query; },
        async maybeSingle() { const value = result(); return { ...value, data: value.data?.[0] ?? null }; },
        then(resolve: (value: ReturnType<typeof result>) => unknown, reject?: (error: unknown) => unknown) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return query;
    },
  };
  return {
    tables, writes, handler: createHandler(() => db as unknown as SupabaseClient, clock),
    auth: (valid: boolean) => { validAuth = valid; },
    fail: (table: string) => { failTable = table; },
    authCalls: () => authCalls,
  };
}

const endpoint='https://fixture.invalid/functions/v1/consultation-settings';
function patch(body:unknown={settings:settings()}, headers:Record<string,string>={}) { return new Request(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture','x-admin-session-id':SESSION,...headers},body:JSON.stringify(body)}); }
test('public GET exposes exactly URLs, distinguishes unregistered settings and returns errors on DB failure',async()=>{
  const f=fixture();const response=await f.handler(new Request(endpoint)); assert.equal(response.status,200); assert.deepEqual(await response.json(),{settings:settings()});assert.equal(f.authCalls(),0);assert.equal(f.writes.length,0);
  const missing=fixture();missing.tables.consultation_settings=[];assert.deepEqual(await (await missing.handler(new Request(endpoint))).json(),{settings:null});
  f.fail('consultation_settings');assert.equal((await f.handler(new Request(endpoint))).status,500);
});
test('PATCH denies signed-out, invalid JWT, non-admin, foreign/revoked/expired sessions without writing',async()=>{
  const unsigned=fixture();assert.equal((await unsigned.handler(patch(undefined,{Authorization:''}))).status,401);assert.equal(unsigned.writes.length,0);
  const invalid=fixture();invalid.auth(false);assert.equal((await invalid.handler(patch())).status,401);
  const nonadmin=fixture();nonadmin.tables.branch_admins=[];assert.equal((await nonadmin.handler(patch())).status,403);
  for(const changes of [{user_id:'another'},{revoked_at:new Date(NOW).toISOString()},{expires_at:new Date(NOW-1).toISOString()}]){const f=fixture();Object.assign(f.tables.admin_sessions[0],changes);assert.equal((await f.handler(patch())).status,401);assert.equal(f.writes.length,0);}
});
test('all six URLs save in one atomic UPDATE with server audit and no session changes; empty individual URLs allowed',async()=>{
  const f=fixture();const value={...settings(),default:'https://forms.gle/new','job-leap':'https://forms.gle/leap',smartcare:'https://forms.gle/smart'};
  const response=await f.handler(patch({settings:value}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{settings:value});assert.equal(f.writes.length,1);assert.equal(f.writes[0].table,'consultation_settings');assert.equal(f.writes[0].patch.updated_by,USER);assert.equal(f.writes[0].patch.updated_at,new Date(NOW).toISOString());assert.deepEqual(f.writes[0].patch.urls,value);
  assert.equal(f.tables.admin_sessions[0].expires_at,new Date(NOW+7199000).toISOString());
});
test('invalid default, malformed Google URL, unknown IDs/audit fields and incomplete batches reject without changing saved values',async()=>{
  const bad=[{settings:{...settings(),default:''}},{settings:{...settings(),smartcare:'https://forms.gle.evil.com/abc'}},{settings:{...settings(),default:'https://user@forms.gle/abc'}},{settings:{default:'https://forms.gle/abc'}},{settings:{...settings(),unknown:''}},{settings:settings(),updated_by:USER}];
  for(const body of bad){const f=fixture();assert.equal((await f.handler(patch(body))).status,400);assert.equal(f.writes.length,0);assert.deepEqual(f.tables.consultation_settings[0].urls,settings());}
});
test('failed update keeps previous snapshot and missing migration never reports save success',async()=>{
  const f=fixture();f.fail('consultation_settings');const response=await f.handler(patch());assert.equal(response.status,500);assert.equal(f.writes.length,0);assert.deepEqual(f.tables.consultation_settings[0].urls,settings());assert.doesNotMatch(await response.text(),/sensitive/);
  const missing=fixture();missing.tables.consultation_settings=[];assert.equal((await missing.handler(patch())).status,409);
});
test('authorization service errors and expired session during validation cannot write; methods and oversized/invalid bodies reject',async()=>{
  for(const table of ['branch_admins','admin_sessions']){const f=fixture();f.fail(table);assert.equal((await f.handler(patch())).status,500);assert.equal(f.writes.length,0);}
  let calls=0;const expired=fixture(()=>calls++===0?NOW:NOW+7200000);assert.equal((await expired.handler(patch())).status,401);assert.equal(expired.writes.length,0);
  const f=fixture();assert.equal((await f.handler(new Request(endpoint,{method:'DELETE'}))).status,405);assert.equal((await f.handler(new Request(endpoint+'?select=*'))).status,400);
  assert.equal((await f.handler(new Request(endpoint,{method:'PATCH',headers:{Authorization:'Bearer fixture','x-admin-session-id':SESSION,'Content-Type':'application/json'},body:'x'.repeat(20001)}))).status,413);
});
