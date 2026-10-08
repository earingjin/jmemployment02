import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PROGRAMS, BENEFIT_GROUPS } from '../src/data/programs';
import { PROGRAM_CONTENT_FIELDS, BENEFIT_CONTENT_FIELDS, SECTION_CONTENT_FIELDS, POLICY_SOURCE_FIELDS,
  type EmploymentProgramId, type EmploymentProgramData, type ContentValues } from '../src/data/employmentPrograms';
import { applicableCustomerScreens, customerFieldNotice, customerChangeSelectors, affectedCustomerScreens, previewTabAtKey,
  type CustomerPreviewScreen, type CustomerEditArea } from '../src/components/admin/employmentCustomerImpact';
import { buildEmploymentPreview, type EmploymentPreviewData } from '../src/components/admin/employmentPreview';
import { EmploymentProgramPreview, EmploymentPreviewContent, renderCustomerPreviewMarkup, customerPreviewDocument,
  markCustomerPreviewChanges } from '../src/components/admin/EmploymentProgramPreview';
import { Hero } from '../src/components/home/Hero';
import { ProgramDetailPage } from '../src/pages/ProgramDetailPage';
import { ProgramModal } from '../src/components/modals/ProgramModal';
import { EmployerView } from '../src/components/views/EmployerView';
const noop=()=>{};
function fixture(id:EmploymentProgramId='employment-support'):EmploymentProgramData {
  const p=PROGRAMS.find(p=>p.id===id)!;const updated_at='2026-10-08T00:00:00Z';
  return {program:{id,label:p.label,seeker_kind:p.seeker?.kind??null,seeker_target:p.seeker?.target??null,
    seeker_big:p.seeker?.big??null,seeker_sub:p.seeker?.sub??null,seeker_desc:p.seeker?.desc??null,
    employer_target:p.employer?.target??null,employer_amount:p.employer?.amount??null,employer_desc:p.employer?.desc??null,
    effective_date:null,source_name:null,source_url:null,updated_at},
    sections:p.detail.flatMap((b,i)=>id==='employment-support'&&i<3?[]:[{program_id:id,section_key:'section-'+i,
      title:b.heading,lines:[...b.lines],display_order:i,variant:b.background==='#F0F5FF'?'benefit':'info',updated_at}]),
    benefits:id==='employment-support'?BENEFIT_GROUPS.map((b,i)=>({program_id:id,benefit_key:'benefit-'+i,type_label:b.type,item_names:[...b.items],
      sub_label:b.sub,headline:b.headline,hero_note:b.heroNote,hero_type:b.heroType,hero_bottom:b.heroBottom,lines:[...b.lines],display_order:i,updated_at})):[]};
}
for(const id of ['employment-support','job-leap','future-experience','field-training'] as const){
  test(id+' offers only its actual customer screens and reuses the real rendered components',()=>{
    const data=fixture(id);const preview=buildEmploymentPreview(data,new Map(),'2030');
    const expected:CustomerPreviewScreen[]=id==='employment-support'?['hero','detail','modal-seeker']
      :id==='future-experience'?['detail','modal-seeker']:['detail','modal-seeker','employer','modal-employer'];
    assert.deepEqual(preview.screens,expected);assert.deepEqual(applicableCustomerScreens(data.program),expected);
    const p=preview.customer!.program;const programs=[p];
    for(const screen of expected){
      const component=screen==='hero'?React.createElement(Hero,{benefitGroups:preview.customer!.benefitGroups,programLabel:p.label,onConsult:noop,onDetail:noop,onBranch:noop})
        :screen==='detail'?React.createElement(ProgramDetailPage,{programId:id,programs,onBack:noop,onConsult:noop})
        :screen==='employer'?React.createElement(EmployerView,{active:true,benefitYear:'2030',programs,onDetail:noop,onConsult:noop})
        :React.createElement(ProgramModal,{open:true,programId:id,programs,audience:screen==='modal-employer'?'employer':'seeker',onClose:noop,onOpenDetail:noop,onConsult:noop});
      assert.equal(renderCustomerPreviewMarkup(preview,screen),renderToStaticMarkup(React.createElement('div',{className:screen==='hero'?'page mobile-home':'page'},component)));
    }
  });
  const areas=[{area:'program' as CustomerEditArea,areaId:'program',fields:PROGRAM_CONTENT_FIELDS},
    {area:'source' as CustomerEditArea,areaId:'source',fields:POLICY_SOURCE_FIELDS},
    {area:'section' as CustomerEditArea,areaId:'section-0',fields:SECTION_CONTENT_FIELDS},
    ...(id==='employment-support'?[0,1].map(i=>({area:'benefit' as CustomerEditArea,areaId:'benefit-'+i,fields:BENEFIT_CONTENT_FIELDS})):[])];
  for(const area of areas)for(const field of area.fields)test(id+' '+area.areaId+'.'+field.name+' mapping agrees with actual customer render changes',()=>{
    const data=fixture(id);const baseline=buildEmploymentPreview(data,new Map());
    const value=field.array?['미저장 검증 값']:field.inputType==='date'?'2031-01-02':field.inputType==='url'?'https://example.invalid/policy':'미저장 검증 값';
    const drafts=new Map<string,ContentValues>([[area.areaId,{[field.name]:value}]]);const before=JSON.stringify({data,drafts:[...drafts]});
    const preview=buildEmploymentPreview(data,drafts);assert.equal(preview.error,'');assert.equal(preview.changes.length,1);
    const actual=baseline.screens.filter(screen=>renderCustomerPreviewMarkup(baseline,screen)!==renderCustomerPreviewMarkup(preview,screen));
    assert.deepEqual([...preview.changes[0].screens].sort(),[...actual].sort());
    assert.equal(JSON.stringify({data,drafts:[...drafts]}),before);
  });
}
test('non-displayed fields and conditional Hero summary are described honestly',()=>{
  const data=fixture();
  for(const [area,field] of [['program','seeker_sub'],['benefit','hero_note'],['source','effective_date'],['source','source_name'],['source','source_url']] as const){
    assert.match(customerFieldNotice(area,field,{program:data.program,benefit:data.benefits[0]}),/직접 표시되지 않습니다/);
  }
  assert.doesNotMatch(customerFieldNotice('benefit','sub_label',{program:data.program,benefit:data.benefits[0]}),/Hero/);
  assert.match(customerFieldNotice('benefit','sub_label',{program:data.program,benefit:data.benefits[1]}),/Hero/);
  assert.match(customerFieldNotice('benefit','type_label',{program:data.program,benefit:data.benefits[0]}),/강조 스타일/);
  assert.doesNotMatch(customerFieldNotice('benefit','type_label',{program:data.program,benefit:data.benefits[1]}),/Hero/);
});
test('changed fields are baseline comparisons, revert cleanly and never include policy or static copy as affected screens',()=>{
  const data=fixture();
  const drafts=new Map<string,ContentValues>([['program',{label:data.program.label,seeker_sub:'숨긴 안내'}],['source',{effective_date:'2030-01-01'}],['benefit-0',{hero_note:'보충 설명'}]]);
  const preview=buildEmploymentPreview(data,drafts);assert.equal(preview.changes.length,3);assert.deepEqual(affectedCustomerScreens(preview.changes),[]);
  assert.deepEqual(buildEmploymentPreview(data,new Map<string,ContentValues>([['program',{label:data.program.label}]])).changes,[]);
});
test('exact line positions are highlighted while deleted or ambiguous blocks stay in the change list',()=>{
  const data=fixture('job-leap');
  const preview=buildEmploymentPreview(data,new Map<string,ContentValues>([['section-0',{lines:[data.sections[0].lines[0],'미저장 두번째 줄',...data.sections[0].lines.slice(2)]}]]));
  const change=preview.changes[0];
  assert.deepEqual(customerChangeSelectors(change,'detail',preview.customer!.program,preview.customer!.benefitGroups,preview.sections),['.program-detail-card:nth-child(1) .program-detail-lines li:nth-child(2)']);
  assert.deepEqual(customerChangeSelectors(change,'employer',preview.customer!.program,[],preview.sections),[]);
  const removed=buildEmploymentPreview(data,new Map<string,ContentValues>([['section-0',{lines:data.sections[0].lines.slice(0,-1)}]]));
  assert.deepEqual(customerChangeSelectors(removed.changes[0],'detail',removed.customer!.program,[],removed.sections),[]);
  const duplicate={...preview.customer!.program,detail:[...preview.customer!.program.detail,preview.customer!.program.detail[0]]};
  assert.deepEqual(customerChangeSelectors(change,'detail',duplicate,[],preview.sections),[]);
  let queried='';let marks=0;const node={setAttribute(name:string){assert.equal(name,'data-employment-preview-changed');marks++;}};
  const document={querySelectorAll(selector:string){queried=selector;return [node];}} as unknown as Document;
  assert.equal(markCustomerPreviewChanges(document,preview,'detail'),1);assert.equal(marks,1);assert.ok(queried.includes('nth-child(2)'));
  assert.equal(markCustomerPreviewChanges({querySelectorAll:()=>[]} as unknown as Document,preview,'detail'),0);
});
test('conflicting benefit mirrors are reported using the public converter without a fabricated fallback',()=>{
  const data=fixture();data.sections.unshift({program_id:data.program.id,section_key:'mirror',title:'Ⅰ유형 · 구직촉진수당',lines:['충돌 문장'],display_order:0,variant:'benefit',updated_at:data.program.updated_at});
  const preview=buildEmploymentPreview(data,new Map());assert.equal(preview.customer,null);assert.match(preview.error,/일치하지 않습니다/);
  const markup=renderToStaticMarkup(React.createElement(EmploymentPreviewContent,{data:preview}));assert.match(markup,/role="alert"/);assert.doesNotMatch(markup,/<iframe/);
});
test('draft HTML, URLs and blank lines stay React-escaped in a script-free real customer document',()=>{
  const data=fixture();const preview=buildEmploymentPreview(data,new Map<string,ContentValues>([['program',{label:'<img src=x onerror=alert(1)>'}],['section-0',{lines:['', '<script>alert(1)</script>']}],['source',{source_url:'javascript:alert(1)'}]]));
  const document=customerPreviewDocument(preview,'detail');assert.ok(document.includes('&lt;script&gt;'));assert.doesNotMatch(document,/<script[ >]/);assert.doesNotMatch(document,/<img src="x"/);
  assert.doesNotMatch(document,/javascript:alert/);assert.ok(preview.changes.some(c=>c.field==='source_url'&&!c.screens.length));
  const frame=renderToStaticMarkup(React.createElement(EmploymentPreviewContent,{data:preview}));assert.match(frame,/sandbox="allow-same-origin"/);assert.doesNotMatch(frame,/allow-scripts|allow-forms|allow-top-navigation/);
});

function popupHarness(data:EmploymentPreviewData, connected=true){
  const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;const original=internals.H;
  const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
  const body={style:{overflow:'scroll'}};
  Object.defineProperty(globalThis,'document',{configurable:true,value:{body}});
  const calls={opened:0,closed:0,returnFocus:0,onClose:0,prevented:0,focus:[] as string[]};
  const returnFocus={current:{isConnected:connected,focus(){calls.returnFocus++;}}} as unknown as React.RefObject<HTMLButtonElement>;
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];let closed=false;
  const same=(a?:unknown[],b?:unknown[])=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
  const dispatcher={useRef(initial:any){const i=cursor++;return slots[i]??={current:initial};},
    useState(initial:any){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useEffect(effect:()=>void|(()=>void),deps:unknown[]){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:effect()};});}};
  const visit=(node:React.ReactNode,run:(node:React.ReactElement<any>)=>void)=>{if(!React.isValidElement<any>(node))return;run(node);React.Children.forEach((node.props as {children?:React.ReactNode}).children,child=>visit(child,run));};
  const elements=(root:React.ReactNode,filter:(element:React.ReactElement<any>)=>boolean)=>{const list:React.ReactElement<any>[]=[];visit(root,node=>{if(filter(node))list.push(node);});return list;};
  const render=()=>{cursor=0;effects=[];internals.H=dispatcher;let root!:React.ReactElement<any>;
    try{root=EmploymentProgramPreview({data,returnFocus,onClose:()=>{calls.onClose++;}});}finally{internals.H=original;}
    visit(root,node=>{const ref=node.props.ref;if(!ref)return;const mock={showModal(){calls.opened++;},close(){calls.closed++;},focus(){calls.focus.push(node.props.id??node.props['aria-label']??'');}};
      if(typeof ref==='function')ref(mock);else if(!ref.current)ref.current=mock;});effects.forEach(run=>run());return root;
  };
  return{calls,body,render,elements,close(){if(closed)return;closed=true;slots.forEach(slot=>slot?.cleanup?.());internals.H=original;if(saved)Object.defineProperty(globalThis,'document',saved);else delete(globalThis as any).document;}};
}
test('native dialog, ESC, close/backdrop, scroll lock and focus return survive tab changes and filtering without altering drafts',()=>{
  const data=fixture();const drafts=new Map<string,ContentValues>([['program',{seeker_big:'미저장 대표값'}]]);
  const preview=buildEmploymentPreview(data,drafts);const before=JSON.stringify({data,drafts:[...drafts],preview});const h=popupHarness(preview);
  try{
    let root=h.render();assert.equal(root.type,'dialog');assert.equal(h.calls.opened,1);assert.equal(document.body.style.overflow,'hidden');
    assert.equal(h.calls.focus[0],'고객 화면 미리보기 닫기');
    let tabs=h.elements(root,e=>e.props.role==='tab');assert.equal(tabs.length,3);assert.equal(tabs.filter(t=>t.props.tabIndex===0).length,1);
    tabs[0].props.onKeyDown({key:'ArrowRight',preventDefault(){h.calls.prevented++;}});root=h.render();
    assert.equal(h.elements(root,e=>e.props.role==='tab'&&e.props['aria-selected'])[0].props.id,'employment-preview-tab-detail');
    assert.ok(h.calls.focus.includes('employment-preview-tab-detail'));
    tabs=h.elements(root,e=>e.props.role==='tab');tabs[1].props.onKeyDown({key:'End',preventDefault(){}});root=h.render();
    assert.equal(h.elements(root,e=>e.props.role==='tab'&&e.props['aria-selected'])[0].props.id,'employment-preview-tab-modal-seeker');
    const filter=h.elements(root,e=>e.props['aria-pressed']!==undefined)[0];filter.props.onClick();root=h.render();
    tabs=h.elements(root,e=>e.props.role==='tab');assert.equal(tabs.length,1);assert.equal(tabs[0].props.id,'employment-preview-tab-modal-seeker');
    assert.equal(h.calls.opened,1);assert.equal(h.calls.closed,0);assert.equal(document.body.style.overflow,'hidden');
    root.props.onCancel({preventDefault(){h.calls.prevented++;}});assert.equal(h.calls.onClose,1);
    const bounds={getBoundingClientRect:()=>({left:10,right:100,top:10,bottom:100})};
    root.props.onClick({target:bounds,currentTarget:bounds,clientX:50,clientY:50});assert.equal(h.calls.onClose,1);
    root.props.onClick({target:bounds,currentTarget:bounds,clientX:0,clientY:50});assert.equal(h.calls.onClose,2);
    h.elements(root,e=>e.props['aria-label']==='고객 화면 미리보기 닫기')[0].props.onClick();assert.equal(h.calls.onClose,3);
    assert.equal(JSON.stringify({data,drafts:[...drafts],preview}),before);h.close();assert.equal(h.calls.closed,1);assert.equal(h.calls.returnFocus,1);assert.equal(h.body.style.overflow,'scroll');
  }finally{h.close();}
});
test('filtered empty state explains non-displayed changes and disconnected launchers do not receive focus',()=>{
  const data=fixture();const preview=buildEmploymentPreview(data,new Map<string,ContentValues>([['source',{source_name:'미저장 출처'}]]));const h=popupHarness(preview,false);
  try{let root=h.render();h.elements(root,e=>e.props['aria-pressed']!==undefined)[0].props.onClick();root=h.render();
    assert.equal(h.elements(root,e=>e.props.role==='tab').length,0);assert.ok(h.elements(root,e=>e.props.role==='status').length);
    const html=renderToStaticMarkup(root);assert.match(html,/직접 표시되지 않는 변경 항목/);assert.match(html,/미저장 출처/);
    h.close();assert.equal(h.calls.returnFocus,0);assert.equal(h.calls.closed,1);
  }finally{h.close();}
});
test('tab keyboard wraps, supports Home/End, and ignores unrelated keys',()=>{
  const screens:CustomerPreviewScreen[]=['detail','modal-seeker','employer'];
  assert.equal(previewTabAtKey(screens,'detail','ArrowLeft'),'employer');assert.equal(previewTabAtKey(screens,'employer','ArrowRight'),'detail');
  assert.equal(previewTabAtKey(screens,'modal-seeker','Home'),'detail');assert.equal(previewTabAtKey(screens,'detail','End'),'employer');
  assert.equal(previewTabAtKey(screens,'detail','Tab'),undefined);assert.equal(previewTabAtKey([],'detail','ArrowRight'),undefined);
});
test('preview rendering makes no API/save calls; frame document uses the existing stylesheet and responsive viewport',()=>{
  const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('no API calls from previews');};
  try{const preview=buildEmploymentPreview(fixture('field-training'),new Map<string,ContentValues>([['program',{employer_amount:'미저장 기업금액'}]]),'2040');
    const document=customerPreviewDocument(preview,'employer');assert.match(document,/name="viewport"/);assert.match(document,/width=device-width/);assert.match(document,/rel="stylesheet"/);assert.match(document,/2040/);assert.match(document,/미저장 기업금액/);
    renderToStaticMarkup(React.createElement(EmploymentProgramPreview,{data:preview,onClose:noop,returnFocus:React.createRef<HTMLButtonElement>()}));assert.equal(requests,0);
  }finally{globalThis.fetch=original;}
});

test('removing employer availability also affects the existing seeker-modal switch without inventing other screens',()=>{
  for(const field of ['employer_target','employer_amount']){
    const data=fixture('job-leap');const baseline=buildEmploymentPreview(data,new Map());
    const preview=buildEmploymentPreview(data,new Map<string,ContentValues>([['program',{[field]:null}]]));
    const actual=baseline.screens.filter(screen=>renderCustomerPreviewMarkup(baseline,screen)!==renderCustomerPreviewMarkup(preview,screen));
    assert.deepEqual([...preview.changes[0].screens].sort(),actual.sort());assert.ok(affectedCustomerScreens(preview.changes).includes('modal-seeker'));
    assert.match(customerFieldNotice('program',field,{program:{...data.program,[field]:null}},{program:data.program}),/구직자/);
  }
});
