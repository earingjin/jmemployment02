import { ADMIN_BRANCHES, BRANCH_REGIONS, branchSuffix, type BranchMap } from '../../data/branches';

// 서브뷰: 전국지사 안내 (원본 #branchDirectory, renderBranchDirectory())
// 원본은 권역을 바꿀 때마다 탭·카드를 innerHTML로 새로 만들었다(전환 애니메이션 없이 즉시 변경). key에 권역을 넣어 같은 동작을 유지한다.
export function BranchDirectoryView({ active, branches, region, onRegion, onOpenMap }: {
  active: boolean;
  branches: BranchMap;
  region: string;
  onRegion: (region: string) => void;
  onOpenMap: (branchName: string) => void;
}) {
  const all = ADMIN_BRANCHES.filter(n => branches[n] && branches[n].published);
  const branchCount = all.filter(n => n !== '본사').length;
  const regionRank = (r: string) => { const i = BRANCH_REGIONS.indexOf(r); return i < 0 ? 99 : i; };
  const sorted = all.map((n, i) => ({ n, i })).sort((a, b) =>
    regionRank(branches[a.n].region) - regionRank(branches[b.n].region) || a.i - b.i).map(x => x.n);
  const list = region === '전체' ? sorted : sorted.filter(n => branches[n].region === region);

  return (
    <div id="branchDirectory" className={'subpage' + (active ? ' active' : '')}>
      <section className="bd-hero">
        <div className="bd-eyebrow">전국 네트워크</div>
        <h1>전국지사 안내</h1>
        <p id="bdSubcopy">{`전국 ${branchCount}개 지사에서 방문 상담과 서면 신청을 지원합니다.`}</p>
      </section>
      <div className="bd-tabs" id="bdTabs">
        {['전체', ...BRANCH_REGIONS].map(r => {
          const cnt = r === '전체' ? branchCount : all.filter(n => branches[n].region === r).length;
          return <button key={`${region}-${r}`} className={'bd-tab' + (r === region ? ' active' : '')} onClick={() => onRegion(r)}>{r}<span className="cnt">{cnt}</span></button>;
        })}
      </div>
      <div className="bd-grid" id="bdGrid">
        {list.length ? list.map(n => {
          const b = branches[n];
          const tel = String(b.phone || '').replace(/[^0-9+]/g, '');
          return (
            <div key={`${region}-${n}`} className="bd-card" onClick={() => onOpenMap(n)} title={`${n + branchSuffix(n)} 찾아오시는 길`}>
              <span className="bd-region">{b.region}</span>
              <div className="bd-name">{n + branchSuffix(n)}</div>
              <div className="bd-addr">{b.address}</div>
              <a className="bd-phone" href={`tel:${tel}`} onClick={e => e.stopPropagation()}>{b.phone}</a>
              <div className="bd-hours">{b.hours}</div>
            </div>
          );
        }) : <div style={{ padding: '40px', textAlign: 'center', color: '#78716C' }}>이 권역에는 아직 등록된 지사가 없습니다.</div>}
      </div>
    </div>
  );
}
