import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHandler } from "./handler.ts";
import { HttpError, validatePatch } from "./validation.ts";

const NOW = Date.parse("2026-10-08T00:00:00Z");
const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
type Row = Record<string, unknown>;
const IDS = ["burkman", "coverletter", "interview", "aptitude"];
function fixture(clock: () => number = () => NOW) {
  const tables: Record<string, Row[]> = {
    branch_admins: [{ user_id: USER }],
    admin_sessions: [{ id: SESSION, user_id: USER, created_at: new Date(NOW - 1000).toISOString(), expires_at: new Date(NOW + 7199000).toISOString(), revoked_at: null }],
    smartcare_solutions: IDS.map((id, index) => ({ id, display_order: index + 1, stage: "단계" + index, title: "서비스" + index,
      description: "설명", details: ["항목"], updated_at: new Date(NOW - 5000).toISOString(), updated_by: "private-audit" })),
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
const URL_BASE = "https://fixture.invalid/functions/v1/smartcare-solutions";
function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(URL_BASE, { method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-fixture", "x-admin-session-id": SESSION, ...headers }, body: JSON.stringify(body) });
}
const validPatch = { solution_id: "interview", patch: { title: "AI 면접 연습", details: ["모의 면접", "피드백"] } };

test("smartcare GET returns exactly the four allowlisted rows without audit fields or authentication", async () => {
  const f = fixture();
  const response = await f.handler(new Request(URL_BASE));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["solutions"]);
  assert.deepEqual(body.solutions.map((row: Row) => row.id), IDS);
  assert.equal(Object.hasOwn(body.solutions[0], "updated_by"), false);
  assert.equal(f.authCalls(), 0);
  assert.equal(f.writes.length, 0);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("smartcare GET rejects queries and incomplete or failed lookups with generic errors", async () => {
  const f = fixture();
  for (const query of ["?select=*", "?id=burkman", "?"]) assert.equal((await f.handler(new Request(URL_BASE + query))).status, query === "?" ? 200 : 400, query);
  const missing = fixture(); missing.tables.smartcare_solutions.pop();
  assert.equal((await missing.handler(new Request(URL_BASE))).status, 500);
  const failed = fixture(); failed.fail("smartcare_solutions");
  const response = await failed.handler(new Request(URL_BASE));
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /sensitive/);
});

test("smartcare PATCH requires verified JWT, admin membership and an owned unrevoked fixed session", async () => {
  const missing = fixture();
  assert.equal((await missing.handler(patchRequest(validPatch, { Authorization: "" }))).status, 401);
  const badAuth = fixture(); badAuth.auth(false);
  const bad = await badAuth.handler(patchRequest(validPatch));
  assert.equal(bad.status, 401);
  assert.doesNotMatch(await bad.text(), /sensitive/);
  const nonAdmin = fixture(); nonAdmin.tables.branch_admins = [];
  assert.equal((await nonAdmin.handler(patchRequest(validPatch))).status, 403);
  for (const mutation of [
    { user_id: "other-user" }, { revoked_at: new Date(NOW).toISOString() },
    { expires_at: new Date(NOW).toISOString() }, { expires_at: "not-a-date" },
    { expires_at: new Date(NOW + 7200001).toISOString() },
  ]) {
    const f = fixture(); Object.assign(f.tables.admin_sessions[0], mutation);
    assert.equal((await f.handler(patchRequest(validPatch))).status, 401);
    assert.equal(f.writes.length, 0);
  }
  const invalidId = fixture();
  assert.equal((await invalidId.handler(patchRequest(validPatch, { "x-admin-session-id": "invalid" }))).status, 401);
  const adminFailure = fixture(); adminFailure.fail("branch_admins");
  assert.equal((await adminFailure.handler(patchRequest(validPatch))).status, 500);
});

test("smartcare PATCH updates one existing row with server audit fields and never touches sessions", async () => {
  const f = fixture(); const sessionBefore = JSON.stringify(f.tables.admin_sessions);
  const response = await f.handler(patchRequest(validPatch));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.id, "interview");
  assert.equal(body.data.title, "AI 면접 연습");
  assert.equal(Object.hasOwn(body.data, "updated_by"), false);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].table, "smartcare_solutions");
  assert.equal(f.writes[0].patch.updated_by, USER);
  assert.equal(f.writes[0].patch.updated_at, new Date(NOW).toISOString());
  assert.equal(JSON.stringify(f.tables.admin_sessions), sessionBefore);
  assert.equal(f.tables.smartcare_solutions[0].title, "서비스0");
});

test("smartcare PATCH expires between validation and update without writing", async () => {
  let calls = 0;
  const f = fixture(() => (calls++ === 0 ? NOW : NOW + 7200000));
  assert.equal((await f.handler(patchRequest(validPatch))).status, 401);
  assert.equal(f.writes.length, 0);
});

test("smartcare structure, ordering, audit and unknown fields are rejected", () => {
  for (const body of [
    { solution_id: "new-service", patch: { title: "추가" } },
    { solution_id: "burkman", patch: { display_order: 2 } },
    { solution_id: "burkman", patch: { id: "aptitude" } },
    { solution_id: "burkman", patch: { updated_by: USER } },
    { solution_id: "burkman", patch: { card: { summary: "x" } } },
    { solution_id: "burkman", patch: {} },
    { solution_id: "burkman", patch: { title: "x" }, extra: true },
    { solution_id: "burkman", patch: JSON.parse('{"__proto__":{"title":"x"}}') },
    [{ solution_id: "burkman", patch: { title: "x" } }],
  ]) assert.throws(() => validatePatch(body), HttpError, JSON.stringify(body));
});

test("smartcare plain text, length, count and duplicate detail limits are enforced at the boundary", () => {
  const ok = (patch: Record<string, unknown>) => validatePatch({ solution_id: "burkman", patch });
  assert.equal(ok({ stage: "가".repeat(30), title: "나".repeat(60), description: "다".repeat(500) }).patch.stage.length, 30);
  assert.equal((ok({ details: Array.from({ length: 10 }, (_, i) => String(i).padEnd(200, "라")) }).patch.details as string[]).length, 10);
  for (const patch of [{ stage: "가".repeat(31) }, { title: "나".repeat(61) }, { description: "다".repeat(501) },
    { details: ["라".repeat(201)] }, { details: Array.from({ length: 11 }, (_, i) => "항목" + i) }, { details: [] },
    { details: ["같음", "같음"] }, { details: "문자열" }, { details: [1] }, { title: "" }, { title: "   " }, { title: null },
    { title: "<b>굵게</b>" }, { description: "javascript:alert(1)" }, { description: "```code```" }, { title: "줄\u0000바꿈" }]) {
    assert.throws(() => ok(patch), HttpError, JSON.stringify(patch));
  }
});

test("smartcare JSON body size, content type, methods and missing rows are constrained", async () => {
  const f = fixture();
  assert.equal((await f.handler(patchRequest(validPatch, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await f.handler(new Request(URL_BASE, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer t", "x-admin-session-id": SESSION },
    body: JSON.stringify({ solution_id: "burkman", patch: { description: "가".repeat(20000) } }) }))).status, 413);
  assert.equal((await f.handler(new Request(URL_BASE, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer t", "x-admin-session-id": SESSION }, body: "{" }))).status, 400);
  for (const method of ["POST", "PUT", "DELETE"]) assert.equal((await f.handler(new Request(URL_BASE, { method }))).status, 405);
  assert.equal((await f.handler(new Request(URL_BASE, { method: "OPTIONS" }))).status, 204);
  const gone = fixture(); gone.tables.smartcare_solutions = gone.tables.smartcare_solutions.filter(row => row.id !== "interview");
  assert.equal((await gone.handler(patchRequest(validPatch))).status, 404);
  assert.equal(gone.writes.length, 0);
});
