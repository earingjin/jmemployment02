import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMS, BENEFIT_GROUPS } from '../src/data/programs';
import type { EmploymentProgramId } from '../src/data/employmentPrograms';
import { parsePublicEmploymentPrograms, createPublicEmploymentProgramsApi, type PublicEmploymentPrograms } from '../src/data/publicEmploymentPrograms';
import { adaptCustomerPrograms } from '../src/data/customerProgramAdapter';
import { getCustomerProgramFallback, loadCustomerProgramsWithFallback } from '../src/data/customerProgramFallback';
import { ProgramDetailBlocks } from '../src/components/ProgramDetailBlocks';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
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

// Accept a future raw GET snapshot; assertion diffs expose wording/order/style differences without correction.
// Whitespace normalization is ONLY for semantic comparison; runtime data remains untouched.
function semanticText(value: unknown): unknown {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(semanticText);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, semanticText(item)]));
  return value;
}
export function assertStaticEquivalence(raw: unknown, semantic = false) {
  const adapted = adaptCustomerPrograms(parsePublicEmploymentPrograms(raw));
  const compare = semantic ? semanticText : (value: unknown) => value;
  assert.deepEqual(compare(adapted.benefitGroups), compare(BENEFIT_GROUPS), 'benefit groups differ from static data');
  assert.deepEqual(compare(adapted.programs), compare(PROGRAMS), 'program content/order/styles differ from static data');
}
for (const mirrors of [false,true]) test('static-derived contract round trip, mirrors=' + mirrors, () => {
  const raw=staticContractFixture(mirrors); const before=structuredClone(raw);
  assertStaticEquivalence(raw); assert.deepEqual(raw,before);
  const result=adaptCustomerPrograms(raw);
  const detail=result.programs[0].detail;
  assert.equal(detail.length,PROGRAMS[0].detail.length);
  assert.deepEqual(detail.slice(0,3).map(b=>b.heading),PROGRAMS[0].detail.slice(0,3).map(b=>b.heading));
  result.benefitGroups[0].items.push('mutation'); result.programs[0].detail[0].lines.push('mutation');
  assert.deepEqual(raw,before); assert.equal(BENEFIT_GROUPS[0].items.length,1);
});
test('preserves section, benefit and sentence display order without mutating input', () => {
  const raw=staticContractFixture();raw.sections.reverse();raw.benefit_groups.reverse();raw.programs.reverse();
  assertStaticEquivalence(raw);
  const section=raw.sections.find(s=>s.program_id==='job-leap' && s.display_order===0)!;
  section.lines.reverse();
  assert.deepEqual(adaptCustomerPrograms(raw).programs[1].detail[0].lines,section.lines);
});
test('title-based ProgramDetailBlocks markup matches every static program', () => {
  const result=adaptCustomerPrograms(staticContractFixture(true));
  for(const [i,p] of result.programs.entries()) {
    const actual=renderToStaticMarkup(createElement(ProgramDetailBlocks,{blocks:p.detail}));
    const expected=renderToStaticMarkup(createElement(ProgramDetailBlocks,{blocks:PROGRAMS[i].detail}));
    assert.equal(actual,expected);assert.match(actual,/card--benefit/);assert.match(actual,/card--eligibility/);
    assert.match(actual,/card--steps/);assert.match(actual,/<ol/);assert.match(actual,/card--office/);
  }
});
test('exact mirrors keep section positions even when interleaved with other guidance', () => {
  const raw=staticContractFixture(true);
  const support=raw.sections.filter(s=>s.program_id==='employment-support');
  const order=[0,3,1,4,2,5,6,7];
  order.forEach((oldIndex,newIndex)=>{support[oldIndex].display_order=newIndex;});
  const result=adaptCustomerPrograms(raw).programs[0].detail;
  assert.deepEqual(result.map(b=>b.heading),order.map(i=>support[i].title));
  assert.equal(result.length,support.length);
});
test('semantic comparison exposes CMS differences instead of replacing them with static text', () => {
  const raw=staticContractFixture();raw.programs[3].employer_amount='다른 CMS 금액';
  assert.throws(()=>assertStaticEquivalence(raw), /program content/);
  assert.equal(adaptCustomerPrograms(raw).programs[3].employer?.amount,'다른 CMS 금액');
});
test('conflicting mirrors and ambiguous mirror order fail instead of silently fixing', () => {
  for(const mutate of [
    (d:PublicEmploymentPrograms)=>{d.sections[0].lines=['different policy'];},
    (d:PublicEmploymentPrograms)=>{[d.sections[0].display_order,d.sections[1].display_order]=[d.sections[1].display_order,d.sections[0].display_order];},
    (d:PublicEmploymentPrograms)=>{d.sections.splice(0,1);},
    (d:PublicEmploymentPrograms)=>{d.sections.push({...d.sections[0],section_key:'duplicate-title',display_order:99});},
  ]){const raw=staticContractFixture(true);mutate(raw);assert.throws(()=>adaptCustomerPrograms(raw));}
});
test('API success uses CMS text verbatim and reports api source', async () => {
  const raw=staticContractFixture();raw.programs[0].label='CMS 사업명';
  const result=await loadCustomerProgramsWithFallback(async()=>raw);
  assert.equal(result.source,'api');assert.equal(result.programs[0].label,'CMS 사업명');
});
test('fallback covers API and validation/conversion failures with fresh static copies', async () => {
  for(const load of [async()=>{throw new Error('offline');},async()=>({} as PublicEmploymentPrograms),async()=>{
    const raw=staticContractFixture(true);raw.sections[0].lines=['conflicting CMS'];return raw;
  }]) {
    const result=await loadCustomerProgramsWithFallback(load);assert.equal(result.source,'fallback');
    assert.deepEqual(result.programs,PROGRAMS);assert.deepEqual(result.benefitGroups,BENEFIT_GROUPS);
    result.programs[0].detail[0].lines.push('mutation');result.benefitGroups[0].items.push('mutation');
    assert.deepEqual(getCustomerProgramFallback(),{programs:PROGRAMS,benefitGroups:BENEFIT_GROUPS});
  }
});
test('fallback does not swallow cancellation',async()=>{
  const control=new AbortController();control.abort();const cause=new Error('abort');
  await assert.rejects(loadCustomerProgramsWithFallback(async signal=>{assert.equal(signal,control.signal);throw cause;},control.signal),e=>e===cause);
});
test('provided public GET snapshot semantic equivalence', {skip: !process.env.EMPLOYMENT_PROGRAMS_SNAPSHOT}, () => {
  assertStaticEquivalence(JSON.parse(readFileSync(process.env.EMPLOYMENT_PROGRAMS_SNAPSHOT!, 'utf8')), true);
});

test('CMS benefit/info variants preserve the original Program block style contract',()=>{
  const raw=staticContractFixture();
  raw.sections.forEach(section=>{section.variant=section.variant==='blue'?'benefit':'info';});
  assertStaticEquivalence(raw);
});
