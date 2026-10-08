import { ProgramDetailBlocks } from '../ProgramDetailBlocks';
import { PROGRAMS, type Program } from '../../data/programs';
import { ModalOverlay } from '../common/ModalOverlay';

export type Audience = 'seeker' | 'employer';

// 프로그램 상세 모달 (원본 openProgramDetail)
// programId가 null이면 원본 초기 상태(제목 '국민취업지원제도', 본문 비어 있음)
export function ProgramModal({ open, programId, audience, programs = PROGRAMS, onClose, onOpenDetail, onConsult }: {
  open: boolean;
  programId: string | null;
  audience: Audience;
  programs?: Program[];
  onClose: () => void;
  onOpenDetail: (programId: string, audience: Audience) => void;
  onConsult: () => void;
}) {
  const p = programId ? programs.find(program => program.id === programId) : undefined;
  const title = p ? p.label + (audience === 'employer' ? ' · 기업 지원금' : '') : '국민취업지원제도';

  let summary = null;
  if (p && audience === 'seeker' && p.seeker) {
    const sk = p.seeker;
    summary = (
      <div className="pm-summary">
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E50FF', marginBottom: '4px' }}>{sk.kind}</div>
        <div className="pm-sum-big">{sk.big}</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>{`대상 · ${sk.target}`}</div>
        <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>{sk.desc}</p>
      </div>
    );
  } else if (p && audience === 'employer' && p.employer) {
    const em = p.employer;
    summary = (
      <div className="pm-summary">
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E50FF', marginBottom: '4px' }}>기업 지원금</div>
        <div className="pm-sum-big">{em.amount}</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>{`대상 · ${em.target}`}</div>
        <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>{em.desc}</p>
      </div>
    );
  }

  let switcher = null;
  if (p && audience === 'seeker' && p.employer && p.employer.amount) {
    switcher = <button className="pm-switch" onClick={() => onOpenDetail(p.id, 'employer')}>기업 담당자이신가요? 기업 지원금 보기 →</button>;
  } else if (p && audience === 'employer' && p.seeker) {
    switcher = <button className="pm-switch" onClick={() => onOpenDetail(p.id, 'seeker')}>구직자 수당 보기 →</button>;
  }

  return (
    <ModalOverlay id="programModalOverlay" className="program-modal-overlay" open={open} onClose={onClose}>
      <div className="program-modal">
        <div className="pm-head">
          <h3 id="pmTitle">{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pm-body" id="pmBody">
          {summary}
          {p && <ProgramDetailBlocks blocks={p.detail} headingLevel={4} />}
          {switcher}
        </div>
        <div className="pm-foot">
          <button onClick={onConsult}>상담 신청하기</button>
        </div>
      </div>
    </ModalOverlay>
  );
}
