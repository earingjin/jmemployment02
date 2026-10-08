import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { HomePage } from '../src/pages/HomePage';
import { Hero } from '../src/components/home/Hero';
import { ProgramModal } from '../src/components/modals/ProgramModal';
import { ProgramDetailPage } from '../src/pages/ProgramDetailPage';
import { EmployerView } from '../src/components/views/EmployerView';
import { EmploymentProgramsEditor } from '../src/components/admin/EmploymentProgramsEditor';
import { Header } from '../src/components/layout/Header';
import { PROGRAMS, BENEFIT_GROUPS } from '../src/data/programs';
import { adaptCustomerPrograms } from '../src/data/customerProgramAdapter';
import { getCustomerProgramFallback } from '../src/data/customerProgramFallback';
import type { PublicEmploymentPrograms } from '../src/data/publicEmploymentPrograms';
import type { EmploymentProgramId } from '../src/data/employmentPrograms';
import { createInitialBranches } from '../src/data/branches';
import { PROGRAM_VIEWS, VIEW_PATHS } from '../src/data/navigation';
import { readFileSync } from 'node:fs';
const noop=()=>{};
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


// Execute real App/HomePage effects and event callbacks, without a DOM package or live credentials.
function harness(renderComponent: () => React.ReactElement, path = '/') {
  const savedGlobals=['window','document','localStorage','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  const listeners=new Map<string,Set<(...args:any[])=>void>>();
  const location={pathname:path}; const storage=new Map<string,string>(); const scrolls:any[]=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location,
    history:{pushState(_state:unknown,_title:string,path:string){location.pathname=path;}},
    addEventListener(name:string,fn:(...args:any[])=>void){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(fn);},
    removeEventListener(name:string,fn:(...args:any[])=>void){listeners.get(name)?.delete(fn);},
    scrollTo(options:unknown){scrolls.push(options);},
  }});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{style:{overflow:''}},activeElement:null}});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
  const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous=internals.H; const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];let closed=false;let output!:React.ReactElement;
  const same=(a?:unknown[],b?:unknown[])=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
  const dispatcher={
    useState(initial:any){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef(initial:any){const i=cursor++;return slots[i]??={current:initial};},
    useEffect(effect:()=>void|(()=>void),deps:unknown[]){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{
      slots[i]?.cleanup?.();slots[i]={deps,effect,cleanup:effect()};});},
  };
  return {location,scrolls,
    render(){cursor=0;effects=[];internals.H=dispatcher;try{output=renderComponent();}finally{internals.H=previous;}effects.forEach(run=>run());return output;},
    replayEffects(){slots.forEach(slot=>{if(slot?.effect){slot.cleanup?.();slot.cleanup=slot.effect();}});},
    emit(name:string){listeners.get(name)?.forEach(fn=>fn());},
    setFetch(request:typeof fetch){Object.defineProperty(globalThis,'fetch',{configurable:true,value:request});},
    async settle(){for(let i=0;i<4;i++){await new Promise<void>(resolve=>setImmediate(resolve));this.render();}return output;},
    close(){if(closed)return;closed=true;slots.forEach(slot=>slot?.cleanup?.());internals.H=previous;for(const [key,descriptor] of savedGlobals){
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete (globalThis as any)[key];}},
  };
}
function findElement(root:React.ReactNode,type:unknown):React.ReactElement<any>|undefined{
  if(!React.isValidElement<{children?:React.ReactNode}>(root))return undefined;
  if(root.type===type)return root;
  for(const child of React.Children.toArray(root.props.children)){const found=findElement(child,type);if(found)return found;}
}
function appData(element:React.ReactElement){assert.equal(element.type,HomePage);return (element.props as React.ComponentProps<typeof HomePage>).customerPrograms;}
function cmsFixture(){
  const raw=staticContractFixture();
  raw.programs[0].label='CMS 국민취업지원';
  raw.programs[0].seeker_desc='CMS 설명 원문 '; // Preserve original whitespace in the actual UI data.
  raw.benefit_groups[0].headline='최대 480만원';raw.benefit_groups[0].hero_bottom='CMS 추가 지원 안내';
  raw.benefit_groups[0].lines[0]='월 80만원 × 6개월 (최대 480만원)';
  raw.programs[3].employer_amount='최대 610만원';
  raw.sections.filter(s=>s.program_id==='field-training').forEach(s=>{s.lines=s.lines.map(line=>line.replace('550만원','610만원'));});
  return raw;
}

test('App uses one complete public snapshot in StrictMode, preserves it across navigation, and reloads on refresh',async()=>{
  const raw=cmsFixture();let calls=0;
  const app=harness(()=>App());
  try{
    app.setFetch(async(url,init)=>{
      if(String(url).endsWith('/employment-programs')){calls++;assert.equal(init?.method,'GET');assert.deepEqual(init?.headers,{apikey:'sb_publishable_fixture'});return Response.json(raw);}
      return Response.json([]);
    });
    const initial=app.render();assert.deepEqual(appData(initial),getCustomerProgramFallback());
    app.replayEffects();const result=await app.settle();
    assert.equal(calls,1);assert.deepEqual(appData(result).programs,adaptCustomerPrograms(raw).programs);
    app.location.pathname='/job-leap';app.emit('popstate');await app.settle();assert.equal(calls,1);
    assert.equal(appData(app.render()).programs[0].seeker?.desc,'CMS 설명 원문 ');
  }finally{app.close();}
  const refreshed=harness(()=>App(),'/senior-internship');
  try{
    refreshed.setFetch(async url=>{if(String(url).endsWith('/employment-programs')){calls++;return Response.json(raw);}return Response.json([]);});
    refreshed.render();await refreshed.settle();assert.equal(calls,2);
    assert.equal(appData(refreshed.render()).programs[3].employer?.amount,'최대 610만원');
  }finally{refreshed.close();}
});
test('real App remains usable with static content on HTTP failure, missing data, duplicates, or conflicting mirrors',async()=>{
  const missing=staticContractFixture();missing.sections.splice(0,1);
  const duplicate=staticContractFixture();duplicate.programs[1]=duplicate.programs[0];
  const conflict=staticContractFixture(true);conflict.sections[0].lines=['conflicting benefit'];
  for(const response of [()=>new Response('',{status:503}),()=>new Response('{'),()=>Response.json(missing),()=>Response.json(duplicate),()=>Response.json(conflict),()=>{throw new Error('offline');}]){
    const h=harness(()=>App());let calls=0;
    try{h.setFetch(async url=>{if(String(url).endsWith('/employment-programs')){calls++;return response();}return Response.json([]);});
      h.render();const result=await h.settle();assert.equal(calls,1);assert.deepEqual(appData(result).programs,PROGRAMS);
    }finally{h.close();}
  }
});
test('App aborts pending public GET on unmount and ignores a late successful response',async()=>{
  const h=harness(()=>App());let signal:AbortSignal|undefined;let release!:(response:Response)=>void;
  try{h.setFetch(async(url,init)=>{
    if(String(url).endsWith('/employment-programs')){signal=init?.signal as AbortSignal;return new Promise(resolve=>{release=resolve;});}
    return Response.json([]);
  });h.render();await Promise.resolve();assert.ok(signal);h.close();assert.equal(signal.aborted,true);
  release(Response.json(cmsFixture()));await new Promise<void>(resolve=>setImmediate(resolve));
  assert.deepEqual(appData(h.render()).programs,PROGRAMS);
  }finally{h.close();}
});
test('HomePage passes the same CMS snapshot to Hero, detail page, employer list and modal; existing navigation and modal switch remain',()=>{
  const customerPrograms=adaptCustomerPrograms(cmsFixture());
  const h=harness(()=>HomePage({branches:createInitialBranches(),benefitYear:'2026',customerPrograms}));
  try{
    let root=h.render();
    assert.equal(findElement(root,Hero)!.props.benefitGroups,customerPrograms.benefitGroups);
    assert.equal(findElement(root,EmployerView)!.props.programs,customerPrograms.programs);
    findElement(root,Hero)!.props.onDetail();root=h.render();
    assert.equal(h.location.pathname,'/employment-support');
    assert.equal(findElement(root,ProgramDetailPage)!.props.programs,customerPrograms.programs);
    findElement(root,EmployerView)!.props.onDetail('field-training');root=h.render();
    let modal=findElement(root,ProgramModal)!;assert.equal(modal.props.open,true);assert.equal(modal.props.audience,'employer');
    assert.equal(modal.props.programs,customerPrograms.programs);
    modal.props.onOpenDetail('field-training','seeker');root=h.render();modal=findElement(root,ProgramModal)!;
    assert.equal(modal.props.audience,'seeker');modal.props.onClose();assert.equal(findElement(h.render(),ProgramModal)!.props.open,false);
    h.location.pathname='/future-experience';h.emit('popstate');root=h.render();
    assert.equal(findElement(root,ProgramDetailPage)!.props.programId,'future-experience');
    assert.ok(h.scrolls.some(scroll=>scroll.behavior==='smooth'));
  }finally{h.close();}
});
test('all customer displays show CMS amounts and text consistently; static default markup remains identical',()=>{
  const data=adaptCustomerPrograms(cmsFixture());
  const hero=renderToStaticMarkup(React.createElement(Hero,{onConsult:noop,onBranch:noop,onDetail:noop,benefitGroups:data.benefitGroups,programLabel:data.programs[0].label}));
  assert.match(hero,/CMS 국민취업지원/);assert.match(hero,/최대 480만 원/);assert.match(hero,/>480</);assert.doesNotMatch(hero,/>360<|최대 360만/);
  const employer=renderToStaticMarkup(React.createElement(EmployerView,{active:true,benefitYear:'2026',onDetail:noop,onConsult:noop,programs:data.programs}));
  assert.match(employer,/최대 610만원/);assert.doesNotMatch(employer,/최대 550만원/);
  for(const programId of PROGRAM_VIEWS){
    const page=renderToStaticMarkup(React.createElement(ProgramDetailPage,{programId,onBack:noop,onConsult:noop,programs:data.programs}));
    const modal=renderToStaticMarkup(React.createElement(ProgramModal,{open:true,programId,audience:'seeker',onClose:noop,onOpenDetail:noop,onConsult:noop,programs:data.programs}));
    for(const block of data.programs.find(p=>p.id===programId)!.detail){assert.ok(page.includes(block.heading));assert.ok(modal.includes(block.heading));}
    if(programId==='employment-support'){assert.match(page,/최대 480만원/);assert.match(modal,/최대 480만원/);}
  }
  const emModal=renderToStaticMarkup(React.createElement(ProgramModal,{open:true,programId:'field-training',audience:'employer',onClose:noop,onOpenDetail:noop,onConsult:noop,programs:data.programs}));assert.match(emModal,/최대 610만원/);
  const fallback=getCustomerProgramFallback();
  const props={onConsult:noop,onBranch:noop,onDetail:noop};
  assert.equal(renderToStaticMarkup(React.createElement(Hero,{...props,benefitGroups:fallback.benefitGroups,programLabel:fallback.programs[0].label})),renderToStaticMarkup(React.createElement(Hero,props)));
  for(const programId of PROGRAM_VIEWS){const props={programId,onBack:noop,onConsult:noop};
    assert.equal(renderToStaticMarkup(React.createElement(ProgramDetailPage,{...props,programs:fallback.programs})),renderToStaticMarkup(React.createElement(ProgramDetailPage,props)));}
});
test('mobile menu selection and deep-link reload retain existing routes and customer data',()=>{
  const data=adaptCustomerPrograms(cmsFixture());
  for(const programId of PROGRAM_VIEWS){
    const h=harness(()=>HomePage({branches:createInitialBranches(),benefitYear:'2026',customerPrograms:data}),VIEW_PATHS[programId]);
    try{const root=h.render();assert.equal(findElement(root,ProgramDetailPage)!.props.programId,programId);
      assert.equal(findElement(root,ProgramDetailPage)!.props.programs,data.programs);
    }finally{h.close();}
  }
  const h=harness(()=>Header({view:'home',onNavigate:view=>{h.location.pathname=VIEW_PATHS[view];},onConsult:noop}));
  try{
    let root=h.render();const visit=(node:React.ReactNode,fn:(element:React.ReactElement<any>)=>void)=>{if(!React.isValidElement<any>(node))return;fn(node);React.Children.forEach((node.props as {children?:React.ReactNode}).children,child=>visit(child,fn));};
    let toggle!:React.ReactElement<any>;visit(root,e=>{if(e.props.className==='mobile-menu-toggle')toggle=e;});toggle.props.onClick();
    root=h.render();assert.equal(document.body.style.overflow,'hidden');
    let link!:React.ReactElement<any>;visit(root,e=>{if(e.props.className?.includes('mobile-menu-sublink') && e.props.children==='시니어인턴십')link=e;});
    assert.ok(link);link.props.onClick();root=h.render();assert.equal(h.location.pathname,'/senior-internship');
    assert.equal(document.body.style.overflow,'');
    let panel=false;visit(root,e=>{if(e.props.id==='mobile-menu-panel')panel=true;});assert.equal(panel,false);
  }finally{h.close();}
});
test('provided live snapshot is displayed without modifying policy text or trailing whitespace', {skip:!process.env.EMPLOYMENT_PROGRAMS_SNAPSHOT},()=>{
  const raw=JSON.parse(readFileSync(process.env.EMPLOYMENT_PROGRAMS_SNAPSHOT!,'utf8')) as PublicEmploymentPrograms;
  const data=adaptCustomerPrograms(raw);
  assert.equal(data.programs[0].seeker?.desc,raw.programs.find(p=>p.id==='employment-support')!.seeker_desc);
  for(const row of raw.programs){const p=data.programs.find(p=>p.id===row.id)!;assert.equal(p.employer?.amount??null,row.employer_amount);}
  assert.deepEqual(data.benefitGroups.map(g=>g.headline),raw.benefit_groups.map(g=>g.headline));
});

test('CMS notice accurately explains saved customer content, refresh and fallback without changing save behavior',()=>{
  const markup=renderToStaticMarkup(React.createElement(EmploymentProgramsEditor,{onSave:async()=>{throw new Error('no writes in renderer');},leaveGuard:{current:()=>true},navigationTarget:null}));
  assert.match(markup,/고객 웹사이트에 즉시 반영/);assert.match(markup,/새로고침 후 확인/);assert.match(markup,/조회에 실패하면 기존 안내/);
  assert.doesNotMatch(markup,/고객 웹사이트에 반영되지 않습니다/);
});
