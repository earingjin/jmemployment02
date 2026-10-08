import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMS, BENEFIT_GROUPS } from '../src/data/programs';
import type { EmploymentProgramId } from '../src/data/employmentPrograms';
import { parsePublicEmploymentPrograms, createPublicEmploymentProgramsApi, type PublicEmploymentPrograms } from '../src/data/publicEmploymentPrograms';
// This is a static-derived contract fixture, NOT a captured DB seed.
export function staticContractFixture(mirrors = false): PublicEmploymentPrograms {
  const updated_at = '2026-10-08T00:00:00Z';
  return {
    programs: PROGRAMS.map(p => ({ id: p.id as EmploymentProgramId, label: p.label,
      seeker_kind: p.seeker?.kind ?? null, seeker_target: p.seeker?.target ?? null,
      seeker_big: p.seeker?.big ?? null, seeker_sub: p.seeker?.sub ?? null, seeker_desc: p.seeker?.desc ?? null,
      employer_target: p.employer?.target ?? null, employer_amount: p.employer?.amount ?? null,
      employer_desc: p.employer?.desc ?? null, effective_date: null, source_name: null, source_url: null, updated_at })),
    sections: PROGRAMS.flatMap(p => p.detail.flatMap((b, i) => p.id === 'employment-support' && i < BENEFIT_GROUPS.length && !mirrors ? [] : [{
      program_id: p.id as EmploymentProgramId, section_key: p.id === 'employment-support' ? (i < 3 ? 'mirror-' + i : ['notice', 'eligibility', 'steps', 'office', 'caution'][i - 3]) : ['benefit', 'eligibility', 'steps', 'office', 'documents'][i], title: b.heading, lines: [...b.lines],
      display_order: i, variant: b.background === '#F0F5FF' ? 'blue' : 'gray', updated_at }])),
    benefit_groups: BENEFIT_GROUPS.map((b, i) => ({ program_id: 'employment-support' as const, benefit_key: ['type-1', 'type-2', 'success'][i],
      type_label: b.type, item_names: [...b.items], sub_label: b.sub, headline: b.headline, hero_note: b.heroNote,
      hero_type: b.heroType, hero_bottom: b.heroBottom, lines: [...b.lines], display_order: i, updated_at })),
  };
}

test('whole snapshot normalizes all four IDs and independent display orders without mutating input', () => {
  const raw = staticContractFixture(); raw.programs.reverse(); raw.sections.reverse(); raw.benefit_groups.reverse();
  const before = structuredClone(raw); const parsed = parsePublicEmploymentPrograms(raw);
  assert.deepEqual(parsed.programs.map(p => p.id), PROGRAMS.map(p => p.id));
  for (const p of parsed.programs) {
    const orders = parsed.sections.filter((s: {program_id: string}) => s.program_id === p.id).map(s => s.display_order);
    assert.deepEqual(orders, [...orders].sort((a,b) => a-b));
  }
  assert.deepEqual(parsed.benefit_groups.map(b => b.display_order), [0,1,2]);
  parsed.sections[0].lines.push('changed'); assert.deepEqual(raw, before);
});
const invalid: [string, (data: any) => void][] = [
  ['missing program', d => d.programs.pop()], ['duplicate program', d => d.programs[1] = d.programs[0]],
  ['unknown program', d => d.programs[0].id = 'unknown'], ['orphan section', d => d.sections[0].program_id = 'unknown'],
  ['orphan benefit', d => d.benefit_groups[0].program_id = 'unknown'],
  ['missing sections', d => d.sections = d.sections.filter((s: {program_id: string}) => s.program_id !== 'job-leap')],
  ['missing benefits', d => d.benefit_groups = []],
  ['one missing section', d => d.sections.splice(0, 1)],
  ['one missing benefit', d => d.benefit_groups.splice(0, 1)],
  ['duplicate section key', d => d.sections.push({...d.sections[0], display_order: 99})],
  ['duplicate benefit key', d => d.benefit_groups.push({...d.benefit_groups[0], display_order: 99})],
  ['duplicate section order', d => d.sections[1].display_order = d.sections[0].display_order],
  ['duplicate benefit order', d => d.benefit_groups[1].display_order = 0],
  ['fractional order', d => d.sections[0].display_order = 0.5], ['negative order', d => d.sections[0].display_order = -1],
  ['unsafe order', d => d.sections[0].display_order = Number.MAX_SAFE_INTEGER + 1],
  ['bad key', d => d.sections[0].section_key = 'Bad key'], ['empty variant', d => d.sections[0].variant = ''],
  ['wrong lines type', d => d.sections[0].lines = 'text'], ['empty lines', d => d.sections[0].lines = []],
  ['nontext line', d => d.sections[0].lines = [4]], ['blank line', d => d.sections[0].lines = [' ']],
  ['too many lines', d => d.sections[0].lines = Array(31).fill('line')],
  ['too long line', d => d.sections[0].lines = ['x'.repeat(1001)]], ['HTML', d => d.sections[0].title = '<b>title</b>'],
  ['missing nullable field', d => delete d.programs[0].source_name],
  ['incomplete seeker', d => d.programs[0].seeker_target = null],
  ['incomplete employer', d => d.programs[1].employer_amount = null],
  ['missing required employer', d => {d.programs[1].employer_target=null;d.programs[1].employer_amount=null;d.programs[1].employer_desc=null;}],
  ['invalid date', d => d.programs[0].effective_date = '2026-02-30'],
  ['invalid source URL', d => d.programs[0].source_url = 'http://example.com'],
  ['invalid timestamp', d => d.sections[0].updated_at = 'bad'],
  ['extra row field', d => d.programs[0].updated_by = 'private'],
  ['invalid calendar timestamp', d => d.sections[0].updated_at = '2026-02-30T00:00:00Z'],
  ['date-only timestamp', d => d.sections[0].updated_at = '2026-10-08'],
  ['extra envelope field', d => d.error = 'bad'], ['excessive rows', d => d.sections = Array(501).fill(d.sections[0])],
];
for (const [name, mutate] of invalid) test('rejects ' + name, () => {
  const data = staticContractFixture(); mutate(data); assert.throws(() => parsePublicEmploymentPrograms(data));
});
test('GET once without program_id; only public apikey and no cookies', async () => {
  let calls = 0;
  const api = createPublicEmploymentProgramsApi({url:'https://fixture.invalid/', publishableKey:'sb_publishable_fixture'}, async (url, init) => {
    calls++; assert.equal(url, 'https://fixture.invalid/functions/v1/employment-programs');
    assert.equal(init?.method, 'GET'); assert.deepEqual(init?.headers, {apikey:'sb_publishable_fixture'});
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.cache, 'no-store'); assert.equal(init?.redirect, 'error');
    return Response.json(staticContractFixture());
  });
  assert.equal((await api.load()).programs.length, 4); assert.equal(calls, 1);
});
test('fails closed on invalid public configuration before any request', async () => {
  for (const publishableKey of ['', 'sb_secret_forbidden', 'eyJhbGciOiJIUzI1NiJ9.admin', 'admin-session']) {
    let called = false; const api = createPublicEmploymentProgramsApi({url:'https://fixture.invalid', publishableKey}, async () => {called=true; return Response.json({});});
    await assert.rejects(api.load()); assert.equal(called,false);
  }
});
test('HTTP, JSON, network and invalid payload failures reject; no hidden fallback or retries', async () => {
  for (const request of [async () => new Response('',{status:503}), async () => new Response('{'),
    async () => {throw new Error('offline');}, async () => Response.json({programs:[]})]) {
    let count=0; const api=createPublicEmploymentProgramsApi({url:'https://fixture.invalid',publishableKey:'sb_publishable_fixture'}, async () => {count++;return request();});
    await assert.rejects(api.load()); assert.equal(count,1);
  }
});
test('propagates abort and passes the signal', async () => {
  const control=new AbortController(); control.abort(); const cause=new Error('aborted');
  const api=createPublicEmploymentProgramsApi({url:'https://fixture.invalid',publishableKey:'sb_publishable_fixture'},async (_url,init)=>{assert.equal(init?.signal,control.signal);throw cause;});
  await assert.rejects(api.load(control.signal), e => e === cause);
});
