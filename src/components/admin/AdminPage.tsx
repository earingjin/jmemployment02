import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BranchImageSlot, BranchImageSettings } from '../../data/branchDirectory';
import { BranchImageEditor } from './BranchImageEditor';
import { ADMIN_BRANCHES, BRANCH_REGIONS, branchSuffix, type Branch, type BranchMap } from '../../data/branches';
import './AdminPage.css';
import { EmploymentProgramsEditor, type SaveEmploymentContent } from './EmploymentProgramsEditor';
import { SmartCareEditor, type SaveSmartCareContent } from './SmartCareEditor';

export type BranchPatch = Pick<Branch, 'phone' | 'address' | 'hours' | 'region'>;

const managementTabs = [
  { id: 'branch', label: '지사 관리' },
  { id: 'programs', label: '고용지원사업 관리' },
  { id: 'smartcare', label: 'SmartCare 관리' },
  { id: 'common', label: '사이트 공통 설정' },
  { id: 'account', label: '계정 관리' },
] as const;
type ManagementTab = typeof managementTabs[number]['id'];
// Tabs whose editor keeps unsaved drafts or in-flight saves; each owns its own leave guard.
const guardedTabs = ['programs', 'smartcare'] as const satisfies readonly ManagementTab[];
type GuardedTab = typeof guardedTabs[number];
const isGuardedTab = (tab: ManagementTab): tab is GuardedTab => (guardedTabs as readonly ManagementTab[]).includes(tab);

export function AdminPage({ visible, openSeq, branches, benefitYear, onSaveBranch, onSaveBenefitYear, onBack, sessionActions, accountActions, onUploadImage, onDeleteImage, onSaveImageSettings, onSaveProgramContent, onSaveSmartCareContent }: {
  visible: boolean;
  openSeq: number; // 관리자 화면을 열 때마다 증가 (원본 showAdmin()의 목록·편집기 재렌더링 시점)
  branches: BranchMap;
  benefitYear: string;
  onSaveBranch: (slug: string, patch: BranchPatch) => Promise<void>;
  onSaveBenefitYear: (year: string) => void;
  onBack: () => void;
  sessionActions?: ReactNode;
  accountActions?: ReactNode;
  onUploadImage: (slug: string, slot: BranchImageSlot, file: File) => Promise<void>;
  onDeleteImage: (slug: string, slot: BranchImageSlot) => Promise<void>;
  onSaveImageSettings: (slug: string, slot: BranchImageSlot, settings: BranchImageSettings) => Promise<void>;
  onSaveProgramContent: SaveEmploymentContent;
  onSaveSmartCareContent: SaveSmartCareContent;
}) {
  const [activeSlug, setActiveSlug] = useState('본사');
  const [adminMode, setAdminMode] = useState<ManagementTab>('branch');
  const [search, setSearch] = useState('');
  // 원본은 renderBranchList() 호출 시점에만 목록의 권역 표시를 갱신했다(저장 직후에는 갱신하지 않음). 그 시점을 보존한다.
  const [listRegions, setListRegions] = useState(() => regionsOf(branches));
  // 편집기는 원본 renderBranchEditor()/renderCommonEditor() 호출 시점마다 새로 그려져 저장하지 않은 입력이 초기화된다.
  const [branchEditorSeq, setBranchEditorSeq] = useState(0);
  const [commonEditorSeq, setCommonEditorSeq] = useState(0);
  const [seenOpenSeq, setSeenOpenSeq] = useState(openSeq);
  const programLeaveGuard = useRef<() => boolean>(() => true);
  const smartCareLeaveGuard = useRef<() => boolean>(() => true);
  const leaveGuards: Record<GuardedTab, typeof programLeaveGuard> = { programs: programLeaveGuard, smartcare: smartCareLeaveGuard };
  // Only the active tab's editor is mounted, so only its guard can block leaving.
  const canLeaveCurrentTab = () => !isGuardedTab(adminMode) || leaveGuards[adminMode].current();
  const [programNavigationTarget, setProgramNavigationTarget] = useState<HTMLDivElement | null>(null);
  const [smartCareNavigationTarget, setSmartCareNavigationTarget] = useState<HTMLDivElement | null>(null);

  if (openSeq !== seenOpenSeq) {
    setSeenOpenSeq(openSeq);
    setListRegions(regionsOf(branches));
    setBranchEditorSeq(s => s + 1);
  }

  const changeMode = (mode: ManagementTab) => {
    if (mode === adminMode) return true;
    if (!canLeaveCurrentTab()) return false;
    setAdminMode(mode);
    if (mode === 'branch') setBranchEditorSeq(s => s + 1);
    if (mode === 'common') setCommonEditorSeq(s => s + 1);
    return true;
  };

  const q = search.trim();

  return (
    <div id="adminPage" style={visible ? { display: 'block' } : undefined}>
      <div className={'admin-shell' + (isGuardedTab(adminMode) ? ' admin-shell-programs' : '')}>
        <div className="admin-navigation-header">
          <header className="admin-management-header">
            <h1>본사 통합 관리자</h1>
            {sessionActions}
          </header>
          <div className="admin-management-tabs" role="tablist" aria-label="관리자 기능">
            {managementTabs.map((tab, index) => (
              <button key={tab.id} type="button" role="tab" id={`admin-tab-${tab.id}`}
                aria-selected={adminMode === tab.id} aria-controls={`admin-panel-${tab.id}`}
                tabIndex={adminMode === tab.id ? 0 : -1}
                className={'admin-mode-btn' + (adminMode === tab.id ? ' active' : '')}
                onClick={() => changeMode(tab.id)}
                onKeyDown={event => {
                  let next: number;
                  if (event.key === 'ArrowRight') next = (index + 1) % managementTabs.length;
                  else if (event.key === 'ArrowLeft') next = (index + managementTabs.length - 1) % managementTabs.length;
                  else if (event.key === 'Home') next = 0;
                  else if (event.key === 'End') next = managementTabs.length - 1;
                  else return;
                  event.preventDefault();
                  if (changeMode(managementTabs[next].id)) document.getElementById(`admin-tab-${managementTabs[next].id}`)?.focus();
                }}>{tab.label}</button>
            ))}
          </div>
        </div>
        <div className="admin-sidebar">
          <div className="admin-logo">
            <span style={{ color: '#1E50FF', fontWeight: 900, fontSize: '20px' }}>*</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>JMCAREER</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>본사 통합 관리자</div>
            </div>
          </div>
          <div style={{ padding: '12px' }}>
            <button onClick={() => { if (canLeaveCurrentTab()) onBack(); }} style={{ width: '100%', background: '#334155', color: '#FFF', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>← 사이트로 돌아가기</button>
          </div>
          <div id="branchListWrap" style={{ display: adminMode === 'branch' ? 'block' : 'none' }}>
            <div className="admin-search-wrap">
              <input id="branchSearch" placeholder="지사 검색..." value={search}
                onChange={e => { setSearch(e.target.value); setListRegions(regionsOf(branches)); }} />
            </div>
            <div className="admin-branch-list" id="branchList">
              {ADMIN_BRANCHES.filter(n => n.includes(q)).map(name => (
                <button key={name} className={'admin-branch-item' + (name === activeSlug ? ' active' : '')}
                  onClick={() => { setActiveSlug(name); setListRegions(regionsOf(branches)); setBranchEditorSeq(s => s + 1); }}>
                  <span style={{ fontWeight: 700 }}>{name + branchSuffix(name)}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{name === '본사' ? '본사' : listRegions[name]}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: '12px', fontSize: '12px', color: '#94A3B8' }} id="branchSummary">{`전체 ${ADMIN_BRANCHES.length}개 지사/본사`}</div>
          </div>
          <div id="commonInfoWrap" style={{ display: adminMode === 'common' ? 'block' : 'none', padding: '20px', fontSize: '12.5px', color: '#94A3B8', lineHeight: 1.7 }}>
            여기서 수정하는 내용은 <strong>전국 지사 전체</strong>에 동시에 반영됩니다.
          </div>
          <div className="admin-program-navigation-slot" ref={setProgramNavigationTarget} hidden={adminMode !== 'programs'} />
          <div className="admin-program-navigation-slot" ref={setSmartCareNavigationTarget} hidden={adminMode !== 'smartcare'} />
        </div>

        <div className="admin-main">
          <div id="admin-panel-branch" role="tabpanel" aria-labelledby="admin-tab-branch" hidden={adminMode !== 'branch'}>
            <BranchEditor key={`${activeSlug}-${branchEditorSeq}`} slug={activeSlug} branch={branches[activeSlug]} onSave={patch => onSaveBranch(activeSlug, patch)} onUploadImage={(slot, file) => onUploadImage(activeSlug, slot, file)} onDeleteImage={slot => onDeleteImage(activeSlug, slot)} onSaveImageSettings={(slot, settings) => onSaveImageSettings(activeSlug, slot, settings)} />
          </div>
          <div id="admin-panel-programs" role="tabpanel" aria-labelledby="admin-tab-programs" hidden={adminMode !== 'programs'}>
            {adminMode === 'programs' && <EmploymentProgramsEditor benefitYear={benefitYear} onSave={onSaveProgramContent} leaveGuard={programLeaveGuard} navigationTarget={programNavigationTarget} />}
          </div>
          <div id="admin-panel-smartcare" role="tabpanel" aria-labelledby="admin-tab-smartcare" hidden={adminMode !== 'smartcare'}>
            {adminMode === 'smartcare' && <SmartCareEditor onSave={onSaveSmartCareContent} leaveGuard={smartCareLeaveGuard} navigationTarget={smartCareNavigationTarget} />}
          </div>
          <div id="admin-panel-common" role="tabpanel" aria-labelledby="admin-tab-common" hidden={adminMode !== 'common'}>
            {commonEditorSeq > 0 && <CommonEditor key={commonEditorSeq} benefitYear={benefitYear} onSave={onSaveBenefitYear} />}
          </div>
          <div id="admin-panel-account" role="tabpanel" aria-labelledby="admin-tab-account" hidden={adminMode !== 'account'}>
            <h2 className="admin-card-title">계정 관리</h2>
            {adminMode === 'account' && accountActions}
          </div>
        </div>
      </div>
    </div>
  );
}

function regionsOf(branches: BranchMap) {
  return Object.fromEntries(Object.entries(branches).map(([name, b]) => [name, b.region]));
}

// 저장 버튼 문구를 1.5초 동안 바꿨다가 되돌림 (원본 동작)
function useFlash(): [boolean, () => void] {
  const [flash, setFlash] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const trigger = () => {
    setFlash(true);
    timers.current.push(window.setTimeout(() => setFlash(false), 1500));
  };
  return [flash, trigger];
}


function BranchEditor({
  slug,
  branch,
  onSave,
  onUploadImage,
  onDeleteImage,
  onSaveImageSettings,
}: {
  slug: string;
  branch: Branch;
  onSave: (patch: BranchPatch) => Promise<void>;
  onUploadImage: (slot: BranchImageSlot, file: File) => Promise<void>;
  onDeleteImage: (slot: BranchImageSlot) => Promise<void>;
  onSaveImageSettings: (slot: BranchImageSlot, settings: BranchImageSettings) => Promise<void>;
}) {
  const phone = useRef<HTMLInputElement>(null);
  const address = useRef<HTMLInputElement>(null);
  const hours = useRef<HTMLInputElement>(null);
  const region = useRef<HTMLSelectElement>(null);

  const [saved, flashSaved] = useFlash();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const save = async () => {
    if (saving) return;

    setSaving(true);
    setSaveError('');

    try {
      await onSave({
        phone: phone.current!.value,
        address: address.current!.value,
        hours: hours.current!.value,
        region: region.current!.value,
      });

      flashSaved();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : '저장 중 오류가 발생했습니다.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>지사 정보 편집</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF' }}>{`${slug}${branchSuffix(slug)} 설정`}</h2>
        </div>
        <button className="admin-save-btn" id="saveBtnBranch" onClick={save} disabled={saving}>{saving ? '저장 중...' : saved ? '저장 완료!' : '저장하기'}</button>
        {saveError && (<p role="alert" style={{ color: '#FCA5A5', fontSize: '13px' }}>{saveError}</p>)}
      </div>
      <div className="admin-card">
        <div className="admin-card-title">기본 연락처 및 정보</div>
        <div className="admin-field-label">대표 전화번호</div>
        <input className="admin-input" id="f-phone" defaultValue={branch.phone} ref={phone} />
        <div className="admin-field-label" style={{ marginTop: '12px' }}>주소</div>
        <input className="admin-input" id="f-address" defaultValue={branch.address} ref={address} />
        <div className="admin-field-label" style={{ marginTop: '12px' }}>영업시간</div>
        <input className="admin-input" id="f-hours" defaultValue={branch.hours || ''} ref={hours} />
        <div className="admin-field-label" style={{ marginTop: '12px' }}>권역</div>
        <select className="admin-input" id="f-region" defaultValue={branch.region} ref={region}>
          {BRANCH_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <BranchImageEditor slug={slug} branch={branch} onUpload={onUploadImage} onDelete={onDeleteImage} onSaveSettings={onSaveImageSettings} />
    </>
  );
}

export function CommonEditor({ benefitYear, onSave }: { benefitYear: string; onSave: (year: string) => void }) {
  const year = useRef<HTMLInputElement>(null);
  const [saved, flashSaved] = useFlash();

  return (
    <>
      <div className="admin-topbar">
        <div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>전국 공통 관리</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF' }}>사이트 공통 설정</h2>
          <p className="admin-management-description">여러 고객 화면에서 공통으로 사용하는 표시 기준을 관리합니다.</p>
        </div>
        <button className="admin-save-btn" id="saveBtnCommon" onClick={() => { onSave(year.current!.value); flashSaved(); }}>{saved ? '반영 완료!' : '전체 반영'}</button>
      </div>
      <div className="admin-card">
        <label className="admin-card-title" htmlFor="c-benefit-year">지원금 기준 연도</label>
        <input className="admin-input" id="c-benefit-year" defaultValue={benefitYear} ref={year} aria-describedby="c-benefit-year-help" style={{ maxWidth: '200px' }} />
        <p id="c-benefit-year-help" className="admin-management-description">기업 지원금 안내에 표시되는 기준연도입니다.</p>
      </div>
    </>
  );
}
