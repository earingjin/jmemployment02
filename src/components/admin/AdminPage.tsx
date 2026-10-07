import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BranchImageSlot, BranchImageSettings } from '../../data/branchDirectory';
import { BranchImageEditor } from './BranchImageEditor';
import { ADMIN_BRANCHES, BRANCH_REGIONS, branchSuffix, type Branch, type BranchMap } from '../../data/branches';

export type BranchPatch = Pick<Branch, 'phone' | 'address' | 'hours' | 'region'>;

// 관리자 대시보드 (원본 #adminPage)
// 원본과 동일하게 수정 내용은 현재 브라우저 메모리에만 반영된다(저장소·서버·인증 없음, 새로고침 시 초기화).
export function AdminPage({ visible, openSeq, branches, benefitYear, onSaveBranch, onSaveBenefitYear, onBack, accountActions, onUploadImage, onDeleteImage, onSaveImageSettings }: {
  visible: boolean;
  openSeq: number; // 관리자 화면을 열 때마다 증가 (원본 showAdmin()의 목록·편집기 재렌더링 시점)
  branches: BranchMap;
  benefitYear: string;
  onSaveBranch: (slug: string, patch: BranchPatch) => Promise<void>;
  onSaveBenefitYear: (year: string) => void;
  onBack: () => void;
  accountActions?: ReactNode;
  onUploadImage: (slug: string, slot: BranchImageSlot, file: File) => Promise<void>;
  onDeleteImage: (slug: string, slot: BranchImageSlot) => Promise<void>;
  onSaveImageSettings: (slug: string, slot: BranchImageSlot, settings: BranchImageSettings) => Promise<void>;
}) {
  const [activeSlug, setActiveSlug] = useState('본사');
  const [adminMode, setAdminMode] = useState<'branch' | 'common'>('branch');
  const [search, setSearch] = useState('');
  // 원본은 renderBranchList() 호출 시점에만 목록의 권역 표시를 갱신했다(저장 직후에는 갱신하지 않음). 그 시점을 보존한다.
  const [listRegions, setListRegions] = useState(() => regionsOf(branches));
  // 편집기는 원본 renderBranchEditor()/renderCommonEditor() 호출 시점마다 새로 그려져 저장하지 않은 입력이 초기화된다.
  const [branchEditorSeq, setBranchEditorSeq] = useState(0);
  const [commonEditorSeq, setCommonEditorSeq] = useState(0);
  const [seenOpenSeq, setSeenOpenSeq] = useState(openSeq);

  if (openSeq !== seenOpenSeq) {
    setSeenOpenSeq(openSeq);
    setListRegions(regionsOf(branches));
    setBranchEditorSeq(s => s + 1);
  }

  const changeMode = (mode: 'branch' | 'common') => {
    setAdminMode(mode);
    if (mode === 'branch') setBranchEditorSeq(s => s + 1); else setCommonEditorSeq(s => s + 1);
  };

  const q = search.trim();

  return (
    <div id="adminPage" style={visible ? { display: 'block' } : undefined}>
      <div className="admin-shell">
        <div className="admin-sidebar">
          <div className="admin-logo">
            <span style={{ color: '#1E50FF', fontWeight: 900, fontSize: '20px' }}>*</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>JMCAREER</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>본사 통합 관리자</div>
            </div>
          </div>
          <div style={{ padding: '12px' }}>
            <button onClick={onBack} style={{ width: '100%', background: '#334155', color: '#FFF', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>← 사이트로 돌아가기</button>
          </div>
          <div className="admin-mode-switch">
            <button className={'admin-mode-btn' + (adminMode === 'branch' ? ' active' : '')} id="modeBranchBtn" onClick={() => changeMode('branch')}>지사별 관리</button>
            <button className={'admin-mode-btn' + (adminMode === 'common' ? ' active' : '')} id="modeCommonBtn" onClick={() => changeMode('common')}>공통 콘텐츠</button>
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
        </div>

        <div className="admin-main">
          {accountActions}
          <div id="branchEditorView" style={{ display: adminMode === 'branch' ? 'block' : 'none' }}>
            <BranchEditor key={`${activeSlug}-${branchEditorSeq}`} slug={activeSlug} branch={branches[activeSlug]} onSave={patch => onSaveBranch(activeSlug, patch)} onUploadImage={(slot, file) => onUploadImage(activeSlug, slot, file)} onDeleteImage={slot => onDeleteImage(activeSlug, slot)} onSaveImageSettings={(slot, settings) => onSaveImageSettings(activeSlug, slot, settings)} />
          </div>
          <div id="commonEditorView" style={{ display: adminMode === 'common' ? 'block' : 'none' }}>
            {commonEditorSeq > 0 && <CommonEditor key={commonEditorSeq} benefitYear={benefitYear} onSave={onSaveBenefitYear} />}
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

function CommonEditor({ benefitYear, onSave }: { benefitYear: string; onSave: (year: string) => void }) {
  const year = useRef<HTMLInputElement>(null);
  const [saved, flashSaved] = useFlash();

  return (
    <>
      <div className="admin-topbar">
        <div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>전국 공통 관리</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF' }}>공통 설정</h2>
        </div>
        <button className="admin-save-btn" id="saveBtnCommon" onClick={() => { onSave(year.current!.value); flashSaved(); }}>{saved ? '반영 완료!' : '전체 반영'}</button>
      </div>
      <div className="admin-card">
        <div className="admin-card-title">지원금 기준 연도</div>
        <input className="admin-input" id="c-benefit-year" defaultValue={benefitYear} ref={year} style={{ maxWidth: '200px' }} />
      </div>
    </>
  );
}
