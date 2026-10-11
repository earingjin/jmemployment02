import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmploymentProgramNavigation, EmploymentQuickNavigation, employmentQuickLinks, buildEmploymentNavigationContent,
  type EmploymentNavigationContent, type EmploymentNavigationGroup } from '../src/components/admin/EmploymentProgramNavigation';
import { EmploymentProgramsEditor, type SaveEmploymentContent } from '../src/components/admin/EmploymentProgramsEditor';
import { EmploymentProgramPreview } from '../src/components/admin/EmploymentProgramPreview';
import { EMPLOYMENT_PROGRAM_OPTIONS, type EmploymentProgramId, type EmploymentProgramData, type ContentValues,
  type EmploymentPatchRequest, type EmploymentSectionRow } from '../src/data/employmentPrograms';
function fixture(id:EmploymentProgramId='employment-support'):EmploymentProgramData{
  const updated_at='2026-10-08T00:00:00Z';
  return{program:{id,label:'현재 사업',seeker_kind:'구직자',seeker_target:'지원 대상',seeker_big:'지원 안내',seeker_sub:'',seeker_desc:'설명',
    employer_target:null,employer_amount:null,employer_desc:null,effective_date:null,source_name:null,source_url:null,updated_at},
    sections:[{program_id:id,section_key:'first',title:'현재 상세 첫 항목',lines:['본문 첫째 줄','본문 둘째 줄'],display_order:1,variant:'info',updated_at},
      {program_id:id,section_key:'second',title:'현재 상세 두번째 항목',lines:['다른 줄'],display_order:2,variant:'info',updated_at}],
    benefits:[{program_id:id,benefit_key:'first',type_label:'현재 지원 유형',item_names:['현재 항목 하나','현재 항목 둘'],sub_label:null,
      headline:'현재 금액',hero_note:null,hero_type:'대상',hero_bottom:'조건',lines:['지급 안내'],display_order:1,updated_at}]};
}
function visit(root:React.ReactNode,callback:(element:React.ReactElement<any>)=>void){
  if(Array.isArray(root)){root.forEach(child=>visit(child,callback));return;}
  if(React.isValidElement<any>(root)){callback(root);React.Children.forEach((root.props as {children?:React.ReactNode}).children,child=>visit(child,callback));}
  else if(root&&typeof root==='object'&&'children' in root)visit((root as unknown as {children:React.ReactNode}).children,callback);
}
function elements(root:React.ReactNode,filter:(element:React.ReactElement<any>)=>boolean){const result:React.ReactElement<any>[]=[];visit(root,element=>{if(filter(element))result.push(element);});return result;}
function component(root:React.ReactNode,type:unknown){return elements(root,e=>e.type===type)[0];}
function harness(renderComponent:()=>React.ReactElement){
  const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;const original=internals.H;
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];let closed=false;
  const same=(a?:unknown[],b?:unknown[])=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
  const dispatcher={
    useState(initial:any){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef(initial:any){const i=cursor++;return slots[i]??={current:initial};},
    useCallback(callback:any,deps:unknown[]){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,callback};return slots[i].callback;},
    useEffect(effect:()=>void|(()=>void),deps:unknown[]){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:effect()};});},
  };
  const render=()=>{cursor=0;effects=[];internals.H=dispatcher;let root!:React.ReactElement;try{root=renderComponent();}finally{internals.H=original;}effects.forEach(run=>run());return root;};
  return{render,async settle(){for(let i=0;i<4;i++){await new Promise<void>(resolve=>setImmediate(resolve));render();}return render();},
    close(){if(closed)return;closed=true;slots.forEach(slot=>slot?.cleanup?.());internals.H=original;}};
}
function globals(){
  const saved=['window','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  let accepted=false;let confirmations=0;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){},removeEventListener(){},confirm(){confirmations++;return accepted;}}});
  return{get confirmations(){return confirmations;},accept(value:boolean){accepted=value;},setFetch(request:typeof fetch){Object.defineProperty(globalThis,'fetch',{configurable:true,value:request});},
    close(){for(const[key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete(globalThis as any)[key];}}};
}
test('four business accordions expose only the selected business items with accessible linked regions',()=>{
  const content=buildEmploymentNavigationContent('job-leap',fixture('job-leap'),new Map());
  const tree=EmploymentProgramNavigation({selected:'job-leap',onSelect:()=>true,content,activeArea:'employment-area-section-1'});
  const buttons=elements(tree,e=>e.type==='button'&&e.props.id?.startsWith('employment-tab-'));
  assert.deepEqual(buttons.map(b=>b.props.children),EMPLOYMENT_PROGRAM_OPTIONS.map(p=>p.label));
  assert.equal(buttons.filter(b=>b.props['aria-expanded']).length,1);assert.equal(buttons[1].props['aria-expanded'],true);
  const regions=elements(tree,e=>e.props.role==='region');assert.equal(regions.filter(r=>!r.props.hidden).length,1);
  const children=elements(tree,e=>e.type===EmploymentQuickNavigation);assert.equal(children.length,1);assert.equal(children[0].props.hierarchical,true);
  const html=renderToStaticMarkup(React.createElement(EmploymentProgramNavigation,{selected:'job-leap',onSelect:()=>true,content}));
  assert.match(html,/현재 상세 첫 항목/);assert.match(html,/현재 지원 유형 · 현재 항목 하나 · 현재 항목 둘/);
  assert.match(html,/aria-controls="employment-navigation-job-leap"/);
});
test('dynamic labels follow loaded order and draft titles/items without altering loaded data or drafts',()=>{
  const data=fixture();const drafts=new Map<string,ContentValues>([['section-0',{title:'미저장 상세 제목'}],['benefit-0',{type_label:'미저장 유형',item_names:['미저장 항목']}]]);
  const before=JSON.stringify({data,drafts:[...drafts]});const content=buildEmploymentNavigationContent(data.program.id,data,drafts);
  const links=employmentQuickLinks(content.sections,content.benefits);
  assert.equal(links.sections[0].label,'미저장 상세 제목');assert.equal(links.benefits[0].label,'미저장 유형 · 미저장 항목');
  assert.equal(links.sections[1].id,'employment-area-section-1');assert.equal(links.benefits[0].id,'employment-area-benefit-0');
  content.benefits[0].item_names.push('copy only');assert.equal(JSON.stringify({data,drafts:[...drafts]}),before);
  const many=Array.from({length:80},()=>({title:'동일 제목'}));assert.equal(new Set(employmentQuickLinks(many).sections.map(link=>link.id)).size,80);
});
test('hierarchical groups are independently expandable, mutually exclusive and every child targets the existing exact card ID',()=>{
  const data=fixture();const content=buildEmploymentNavigationContent(data.program.id,data,new Map());
  const base={sections:content.sections,benefits:content.benefits,hierarchical:true as const,activeArea:'employment-area-section-1'};
  const closed=EmploymentQuickNavigation(base);
  const groups=elements(closed,e=>e.props.className==='employment-edit-group');
  assert.equal(groups.length,2);assert.equal(groups[0].props['data-active'],false);assert.equal(groups[1].props['data-active'],true);
  // Content stays mounted (never stripped) even while every group is closed, so card scroll/focus targets always exist.
  const anchors=elements(closed,e=>e.type==='a');assert.deepEqual(anchors.map(a=>a.props.href),[
    '#employment-area-program','#employment-group-benefits','#employment-area-benefit-0',
    '#employment-group-details','#employment-area-section-0','#employment-area-section-1','#employment-area-source']);
  assert.equal(anchors.filter(a=>a.props['aria-current']==='location').length,1);
  assert.equal(anchors.find(a=>a.props['aria-current']==='location')!.props.href,'#employment-area-section-1');
  let focused='';let scrolled='';const link=anchors.find(a=>a.props.href==='#employment-area-benefit-0')!;
  link.props.onClick({preventDefault(){},currentTarget:{ownerDocument:{getElementById(id:string){assert.equal(id,'employment-area-benefit-0');return{
    focus(options:FocusOptions){assert.equal(options.preventScroll,true);focused=id;},scrollIntoView(options:ScrollIntoViewOptions){assert.equal(options.block,'start');assert.equal(options.behavior,'auto');scrolled=id;}};}}}});
  assert.equal(focused,'employment-area-benefit-0');assert.equal(scrolled,focused);
  // +/- indicator reflects disclosure only; closed by default and independent of which group is "active".
  const toggles=elements(closed,e=>e.type==='button'&&e.props.className==='employment-edit-group-toggle');
  assert.equal(toggles.length,2);assert.ok(toggles.every(toggle=>toggle.props['aria-expanded']===false));
  const panels=elements(closed,e=>e.props.id?.startsWith('employment-edit-group-')&&e.props.id.endsWith('-panel'));
  assert.ok(panels.every(panel=>panel.props.hidden===true));
  const toggled:EmploymentNavigationGroup[]=[];
  const onToggleGroup=(group:EmploymentNavigationGroup)=>{toggled.push(group);};
  toggles[0].props.onClick();toggles[1].props.onClick();assert.deepEqual(toggled,[]);
  const withClickTracking=EmploymentQuickNavigation({...base,onToggleGroup});
  const trackedToggles=elements(withClickTracking,e=>e.type==='button'&&e.props.className==='employment-edit-group-toggle');
  trackedToggles[0].props.onClick();trackedToggles[1].props.onClick();assert.deepEqual(toggled,['benefits','sections']);
  // Only the group named by `openGroup` is open; the sibling stays closed (single-open accordion).
  const benefitsOpen=EmploymentQuickNavigation({...base,openGroup:'benefits'});
  const openToggles=elements(benefitsOpen,e=>e.type==='button'&&e.props.className==='employment-edit-group-toggle');
  assert.deepEqual(openToggles.map(t=>t.props['aria-expanded']),[true,false]);
  const openPanels=elements(benefitsOpen,e=>e.props.id?.startsWith('employment-edit-group-')&&e.props.id.endsWith('-panel'));
  assert.deepEqual(openPanels.map(p=>p.props.hidden),[false,true]);
});
test('saving and loading/error states prevent menu movement and stale business metadata is never displayed',()=>{
  const content=buildEmploymentNavigationContent('employment-support',fixture(),new Map());let navigations=0;
  const tree=EmploymentProgramNavigation({selected:'employment-support',onSelect:()=>false,content,saving:true,onNavigate:()=>{navigations++;return true;}});
  assert.equal(elements(tree,e=>e.type==='button'&&e.props.disabled).length,3);
  const nav=component(tree,EmploymentQuickNavigation);const quick=EmploymentQuickNavigation(nav.props);
  for(const link of elements(quick,e=>e.type==='a')){assert.equal(link.props['aria-disabled'],true);link.props.onClick({preventDefault(){}});}
  assert.equal(navigations,0);
  const stale=renderToStaticMarkup(React.createElement(EmploymentProgramNavigation,{selected:'job-leap',onSelect:()=>true,content}));
  assert.doesNotMatch(stale,/현재 상세 첫 항목|현재 지원 유형/);assert.match(stale,/불러오는 중/);
  const failure=buildEmploymentNavigationContent('job-leap',null,new Map(),true);assert.equal(failure.loading,false);
  const failed=renderToStaticMarkup(React.createElement(EmploymentProgramNavigation,{selected:'job-leap',onSelect:()=>true,content:failure}));assert.match(failed,/다시 불러오기/);
});
test('accordion heading keyboard moves focus only, leaving business selection to Enter/Space or click',()=>{
  let selections=0;const tree=EmploymentProgramNavigation({selected:'employment-support',onSelect:()=>{selections++;return true;}});
  const buttons=elements(tree,e=>e.type==='button'&&e.props.id?.startsWith('employment-tab-'));let focused='';let prevented=0;
  const event=(key:string)=>({key,preventDefault(){prevented++;},currentTarget:{ownerDocument:{getElementById(id:string){return{focus(){focused=id;}};}}}});
  buttons[0].props.onKeyDown(event('ArrowUp'));assert.equal(focused,'employment-tab-field-training');
  buttons[0].props.onKeyDown(event('End'));assert.equal(focused,'employment-tab-field-training');
  buttons[2].props.onKeyDown(event('Home'));assert.equal(focused,'employment-tab-employment-support');
  buttons[0].props.onKeyDown(event('Tab'));assert.equal(prevented,3);assert.equal(selections,0);
});
test('real editor/workspace navigation keeps drafts, save guards, customer reflection and popup preview intact',async()=>{
  const g=globals();const data=fixture();let requests=0;let saveCount=0;let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});let savedPatch!:EmploymentPatchRequest;
  const onSave:SaveEmploymentContent=async request=>{saveCount++;savedPatch=request;await pending;return {...data.sections[0],...request.patch} as EmploymentSectionRow;};
  g.setFetch(async(url,init)=>{requests++;assert.match(String(url),/employment-programs\?program_id=employment-support$/);assert.equal(init?.method,'GET');return Response.json({programs:[data.program],sections:data.sections,benefit_groups:data.benefits});});
  const leaveGuard={current:()=>true};const slot={nodeType:1} as unknown as HTMLElement;
  const parent=harness(()=>EmploymentProgramsEditor({onSave,leaveGuard,navigationTarget:slot}));let workspace:ReturnType<typeof harness>|undefined;let row:ReturnType<typeof harness>|undefined;
  try{
    let root=parent.render();const workspaceElement=elements(root,e=>typeof e.props.reportNavigation==='function')[0];assert.ok(workspaceElement);
    workspace=harness(()=>(workspaceElement.type as (props:any)=>React.ReactElement)(workspaceElement.props));workspace.render();await workspace.settle();
    root=parent.render();let nav=component(root,EmploymentProgramNavigation);assert.equal(nav.props.content.loading,false);assert.equal(requests,1);
    const workspaceRoot=workspace.render();assert.equal(component(workspaceRoot,EmploymentQuickNavigation),undefined); // No duplicate body toolbar.
    const rowElement=elements(workspaceRoot,e=>e.props.areaId==='section-0')[0];assert.ok(rowElement);
    row=harness(()=>(rowElement.type as (props:any)=>React.ReactElement)(rowElement.props));let rowRoot=row.render();
    const titleInput=elements(rowRoot,e=>e.type==='input'&&e.props.id==='section-0-field-0-0')[0];titleInput.props.onChange({target:{value:'미저장 상세 제목'}});rowRoot=row.render();
    root=parent.render();nav=component(root,EmploymentProgramNavigation);assert.equal(nav.props.content.sections[0].title,'미저장 상세 제목');
    const calls:string[]=[];const document={getElementById(id:string){return{focus(options:FocusOptions){assert.equal(options.preventScroll,true);calls.push('focus:'+id);},scrollIntoView(){calls.push('scroll:'+id);}} as HTMLElement;}};
    assert.equal(nav.props.onNavigate('employment-area-section-0',document),true);
    root=parent.render();assert.equal(component(root,EmploymentProgramNavigation).props.activeArea,'employment-area-section-0');
    assert.deepEqual(calls,['focus:employment-area-section-0','scroll:employment-area-section-0']);assert.equal(g.confirmations,0);assert.equal(requests,1);
    assert.equal(nav.props.onNavigate('employment-area-missing',{getElementById:()=>null}),false);
    const panel=elements(root,e=>e.props.id==='employment-program-panel')[0];
    const focusedArea={id:'employment-area-source'};
    panel.props.onFocusCapture({target:{closest:()=>focusedArea},currentTarget:{contains:()=>true}});
    root=parent.render();assert.equal(component(root,EmploymentProgramNavigation).props.activeArea,'employment-area-source');
    assert.equal(elements(row.render(),e=>e.props.id==='section-0-field-0-0')[0].props.value,'미저장 상세 제목');
    assert.equal(elements(root,e=>typeof e.props.reportNavigation==='function')[0].key,workspaceElement.key);
    nav=component(root,EmploymentProgramNavigation);nav.props.onToggleMobile();root=parent.render();assert.equal(component(root,EmploymentProgramNavigation).props.mobileExpanded,true);
    nav.props.onToggleMobile();root=parent.render();assert.equal(component(root,EmploymentProgramNavigation).props.mobileExpanded,false);
    const previewButton=elements(workspace.render(),e=>e.type==='button'&&e.props.children==='고객 화면 미리보기')[0];previewButton.props.onClick();
    const preview=component(workspace.render(),EmploymentProgramPreview);assert.equal(preview.props.data.sections[0].title,'미저장 상세 제목');preview.props.onClose();
    nav=component(parent.render(),EmploymentProgramNavigation);assert.equal(nav.props.onSelect('job-leap'),false);assert.equal(g.confirmations,1);
    assert.equal(component(parent.render(),EmploymentProgramNavigation).props.selected,'employment-support');
    const markup=renderToStaticMarkup(row.render());assert.match(markup,/고객 반영 위치/);assert.match(markup,/저장 전 고객 화면 미리보기/);
    (row.render() as React.ReactElement<any>).props.onSubmit({preventDefault(){}});root=parent.render();nav=component(root,EmploymentProgramNavigation);
    assert.equal(saveCount,1);assert.equal(nav.props.saving,true);assert.equal(nav.props.onNavigate('employment-area-source',document),false);
    assert.equal(nav.props.onSelect('job-leap'),false);assert.equal(leaveGuard.current(),false);assert.equal(g.confirmations,1);assert.equal(calls.length,2);
    release();await row.settle();await workspace.settle();root=parent.render();nav=component(root,EmploymentProgramNavigation);assert.equal(nav.props.saving,false);
    assert.deepEqual(savedPatch.patch,{title:'미저장 상세 제목'});assert.equal(requests,1);assert.equal(leaveGuard.current(),true);
    assert.equal(nav.props.onSelect('job-leap'),true);root=parent.render();const newWorkspace=elements(root,e=>typeof e.props.reportNavigation==='function')[0];
    assert.notEqual(newWorkspace.key,workspaceElement.key);assert.equal(component(root,EmploymentProgramNavigation).props.selected,'job-leap');
  }finally{release?.();row?.close();workspace?.close();parent.close();g.close();}
});
test('sidebar accordion: selection and disclosure are independent, groups are mutually exclusive, drafts and selection survive collapsing',async()=>{
  const g=globals();const data=fixture();
  g.setFetch(async()=>Response.json({programs:[data.program],sections:data.sections,benefit_groups:data.benefits}));
  const leaveGuard={current:()=>true};const slot={nodeType:1} as unknown as HTMLElement;
  const parent=harness(()=>EmploymentProgramsEditor({onSave:async request=>({...data.sections[0],...request.patch}) as EmploymentSectionRow,leaveGuard,navigationTarget:slot}));
  let workspace:ReturnType<typeof harness>|undefined;let row:ReturnType<typeof harness>|undefined;
  try{
    let root=parent.render();const workspaceElement=elements(root,e=>typeof e.props.reportNavigation==='function')[0];
    workspace=harness(()=>(workspaceElement.type as (props:any)=>React.ReactElement)(workspaceElement.props));workspace.render();await workspace.settle();
    root=parent.render();let nav=component(root,EmploymentProgramNavigation);
    // Default: the selected business starts expanded and no sub-group is open yet, matching previous behavior.
    assert.equal(nav.props.expanded,true);assert.equal(nav.props.openGroup,null);
    // Opening one group auto-closes the other (single-open accordion at this level).
    nav.props.onToggleGroup('benefits');root=parent.render();nav=component(root,EmploymentProgramNavigation);assert.equal(nav.props.openGroup,'benefits');
    nav.props.onToggleGroup('sections');root=parent.render();nav=component(root,EmploymentProgramNavigation);assert.equal(nav.props.openGroup,'sections');
    // Toggling the open group again collapses it back to none.
    nav.props.onToggleGroup('sections');root=parent.render();nav=component(root,EmploymentProgramNavigation);assert.equal(nav.props.openGroup,null);
    // Typing a draft, then collapsing the currently selected business's whole panel, must not discard the draft or change selection.
    const workspaceRoot=workspace.render();const rowElement=elements(workspaceRoot,e=>e.props.areaId==='section-0')[0];
    row=harness(()=>(rowElement.type as (props:any)=>React.ReactElement)(rowElement.props));let rowRoot=row.render();
    const titleInput=elements(rowRoot,e=>e.type==='input'&&e.props.id==='section-0-field-0-0')[0];titleInput.props.onChange({target:{value:'접어도 남는 제목'}});row.render();
    nav.props.onToggleExpand();root=parent.render();nav=component(root,EmploymentProgramNavigation);
    assert.equal(nav.props.expanded,false);assert.equal(nav.props.selected,'employment-support'); // Collapsed but still selected/active.
    assert.equal(elements(row.render(),e=>e.props.id==='section-0-field-0-0')[0].props.value,'접어도 남는 제목');
    // Selecting a different business (confirming away the unsaved draft) resets the panel and its groups to default-open.
    g.accept(true);
    assert.equal(nav.props.onSelect('job-leap'),true);root=parent.render();nav=component(root,EmploymentProgramNavigation);
    assert.equal(nav.props.expanded,true);assert.equal(nav.props.openGroup,null);assert.equal(nav.props.selected,'job-leap');
  }finally{row?.close();workspace?.close();parent.close();g.close();}
});
