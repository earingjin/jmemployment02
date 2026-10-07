import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHandler } from "./handler.ts";
import { HttpError, validatePatch } from "./validation.ts";

const NOW = Date.parse("2026-10-07T00:00:00Z");
const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
type Row = Record<string, unknown>;
function fixture(clock: () => number = () => NOW) {
  const tables: Record<string, Row[]> = {
    branch_admins: [{ user_id: USER }],
    admin_sessions: [{ id: SESSION, user_id: USER, created_at: new Date(NOW - 1000).toISOString(), expires_at: new Date(NOW + 7199000).toISOString(), revoked_at: null }],
    employment_programs: [{ id: "employment-support", label: "기존 정책", updated_by: "private-audit" }, { id: "not-public", label: "제외" }],
    employment_program_sections: [{ id: 1, program_id: "employment-support", section_key: "eligibility", title: "기존 제목", lines: ["기존 내용"], display_order: 1, variant: "blue" }],
    employment_benefit_groups: [{ id: 2, program_id: "employment-support", benefit_key: "type-1", type_label: "Ⅰ유형", item_names: ["지원"], lines: ["기존"], display_order: 1 }],
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

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://fixture.invalid/employment-programs", { method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-fixture", "x-admin-session-id": SESSION, ...headers }, body: JSON.stringify(body) });
}
const programPatch = { program_id: "employment-support", target: "program", patch: { label: "변경된 정책" } };

test("GET returns allowlisted public fields without administrator authentication", async () => {
  const f = fixture();
  const response = await f.handler(new Request("https://fixture.invalid/employment-programs"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.programs.length, 1);
  assert.equal(body.sections[0].variant, "blue");
  assert.equal(Object.hasOwn(body.programs[0], "updated_by"), false);
  assert.equal(Object.hasOwn(body.sections[0], "id"), false);
  assert.equal(f.authCalls(), 0);
  assert.equal(f.writes.length, 0);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("GET query is limited to known programs and cannot change projection", async () => {
  const f = fixture();
  for (const query of ["program_id=unknown", "select=*", "program_id=employment-support&program_id=job-leap"]) {
    assert.equal((await f.handler(new Request("https://fixture.invalid/employment-programs?" + query))).status, 400);
  }
  assert.equal((await f.handler(new Request("https://fixture.invalid/employment-programs?program_id=field-training"))).status, 200);
});

test("PATCH requires verified JWT, admin membership and owned unrevoked fixed session", async () => {
  const missing = fixture();
  assert.equal((await missing.handler(patchRequest(programPatch, { Authorization: "" }))).status, 401);
  const badAuth = fixture(); badAuth.auth(false);
  assert.equal((await badAuth.handler(patchRequest(programPatch))).status, 401);
  const nonAdmin = fixture(); nonAdmin.tables.branch_admins = [];
  assert.equal((await nonAdmin.handler(patchRequest(programPatch))).status, 403);
  for (const mutation of [
    { user_id: "other-user" }, { revoked_at: new Date(NOW).toISOString() },
    { expires_at: new Date(NOW).toISOString() }, { expires_at: "not-a-date" },
    { expires_at: new Date(NOW + 7200001).toISOString() },
  ]) {
    const f = fixture(); Object.assign(f.tables.admin_sessions[0], mutation);
    assert.equal((await f.handler(patchRequest(programPatch))).status, 401);
    assert.equal(f.writes.length, 0);
  }
  const invalidId = fixture();
  assert.equal((await invalidId.handler(patchRequest(programPatch, { "x-admin-session-id": "invalid" }))).status, 401);
});

test("one existing row is updated with server audit fields; no session writes or extension", async () => {
  for (const body of [programPatch,
    { program_id: "employment-support", target: "section", section_key: "eligibility", patch: { title: "참여 자격", lines: ["검증된 정책"] } },
    { program_id: "employment-support", target: "benefit-group", benefit_key: "type-1", patch: { headline: "지원금 안내", item_names: ["구직촉진수당"] } },
  ]) {
    const f = fixture(); const sessionBefore = JSON.stringify(f.tables.admin_sessions);
    const response = await f.handler(patchRequest(body));
    assert.equal(response.status, 200);
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].patch.updated_by, USER);
    assert.equal(f.writes[0].patch.updated_at, new Date(NOW).toISOString());
    assert.equal(JSON.stringify(f.tables.admin_sessions), sessionBefore);
    assert.equal((await response.text()).includes(USER), false);
  }
  const f = fixture();
  assert.equal((await f.handler(patchRequest({ program_id: "employment-support", target: "section", section_key: "missing", patch: { title: "없음" } }))).status, 404);
  assert.equal(f.writes.length, 0);
});

test("session expiration during request validation prevents the final UPDATE", async () => {
  let calls = 0;
  const f = fixture(() => ++calls === 1 ? NOW : NOW + 7200000);
  assert.equal((await f.handler(patchRequest(programPatch))).status, 401);
  assert.equal(f.writes.length, 0);
});

test("structure/design/audit fields, unknown properties and prototype keys are rejected", () => {
  for (const field of ["id", "program_id", "section_key", "benefit_key", "display_order", "variant", "updated_at", "updated_by", "__proto__", "constructor"]) {
    const patch = JSON.parse(JSON.stringify({ [field]: "forbidden" }));
    assert.throws(() => validatePatch({ ...programPatch, patch }), HttpError);
  }
  assert.throws(() => validatePatch({ ...programPatch, extra: "forbidden" }), HttpError);
  assert.throws(() => validatePatch({ ...programPatch, patch: {} }), HttpError);
  assert.throws(() => validatePatch({ ...programPatch, target: "section", section_key: "a,b", patch: { title: "x" } }), HttpError);
});

test("plain-text lengths, array counts, types, HTTPS URLs and dates are strictly checked", () => {
  for (const value of [null, 123, true, [], {}, "", " ", "x".repeat(121), "<script>alert(1)</script>", "javascript:alert(1)", "```css", "bad\u0000text"]) {
    assert.throws(() => validatePatch({ ...programPatch, patch: { label: value } }), HttpError);
  }
  const section = { program_id: "employment-support", target: "section", section_key: "eligibility" };
  for (const lines of [[], Array(31).fill("x"), [123], [null], ["x".repeat(2001)], "not-array"]) {
    assert.throws(() => validatePatch({ ...section, patch: { lines } }), HttpError);
  }
  assert.doesNotThrow(() => validatePatch({ ...section, patch: { lines: Array(30).fill("안내") } }));
  for (const url of ["http://example.com", "javascript:alert(1)", "/relative", "https://user:pass@example.com", "https://example.com:8443", "https://example.com/a b", "https://example.com\\evil"]) {
    assert.throws(() => validatePatch({ ...programPatch, patch: { source_url: url } }), HttpError);
  }
  assert.doesNotThrow(() => validatePatch({ ...programPatch, patch: { source_url: "https://www.work24.go.kr/", effective_date: "2024-02-29", seeker_desc: null } }));
  for (const date of ["0000-01-01", "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-1"]) {
    assert.throws(() => validatePatch({ ...programPatch, patch: { effective_date: date } }), HttpError);
  }
});

test("JSON body size/content type and methods are constrained", async () => {
  const f = fixture();
  assert.equal((await f.handler(patchRequest(programPatch, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await f.handler(patchRequest(programPatch, { "Content-Length": "70000" }))).status, 413);
  assert.equal((await f.handler(patchRequest({ ...programPatch, patch: { label: "x".repeat(70000) } }))).status, 413);
  const malformed = new Request("https://fixture.invalid/employment-programs", { method: "PATCH", headers: patchRequest(programPatch).headers, body: "{" });
  assert.equal((await f.handler(malformed)).status, 400);
  assert.equal((await f.handler(new Request("https://fixture.invalid/employment-programs", { method: "POST" }))).status, 405);
  assert.equal((await f.handler(new Request("https://fixture.invalid/employment-programs", { method: "OPTIONS" }))).status, 204);
  assert.equal(f.writes.length, 0);
});

test("DB/auth failures and missing deployment configuration expose generic errors only", async () => {
  for (const table of ["employment_programs", "branch_admins", "admin_sessions"]) {
    const f = fixture(); f.fail(table);
    const response = await f.handler(patchRequest(programPatch));
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes("sensitive-db-detail"), false);
  }
  const handler = createHandler(() => { throw new HttpError(503, "Server not configured"); });
  assert.equal((await handler(new Request("https://fixture.invalid/employment-programs"))).status, 503);
});
