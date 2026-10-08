import type { ReactNode } from 'react';
import type { SmartSolution, SmartSolutionKey } from '../../data/content';
import { ModalCloseButton, ModalOverlay } from '../common/ModalOverlay';

// 모달 상단 아이콘 (원본 AI_FEATURES[key].icon, 카드 일러스트와 다름)
const MODAL_ICONS: Record<SmartSolutionKey, ReactNode> = {
  burkman: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path></svg>,
  coverletter: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  interview: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="10" r="1"></circle><circle cx="13" cy="10" r="1"></circle></svg>,
  aptitude: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
};

// 스마트 솔루션 설명 모달 (원본 openAIFeature). 실제 AI 기능과 연결되어 있지 않은 안내용 모달이다.
export function SmartSolutionModal({ open, solution, onClose, onConsult }: {
  open: boolean;
  solution: SmartSolution | null;
  onClose: () => void;
  onConsult: () => void;
}) {
  return (
    <ModalOverlay id="aiFeatureModalOverlay" className="map-modal-overlay" open={open} onClose={onClose}>
      <div className="ai-modal" data-smartcare-id={solution?.key}>
        <ModalCloseButton onClick={onClose} />
        <div className="ai-modal-icon" id="aiModalIcon">{solution && MODAL_ICONS[solution.key]}</div>
        <h3 id="aiModalTitle" data-smartcare-field="title" style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>{solution?.title}</h3>
        <p id="aiModalDesc" data-smartcare-field="description" style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{solution?.modal.desc}</p>
        <ul id="aiModalList">{solution?.modal.list.map((li, index) => <li key={li} data-smartcare-field="details" data-smartcare-index={index}>{li}</li>)}</ul>
        <button className="ai-modal-cta" onClick={onConsult}>상담 신청하기</button>
      </div>
    </ModalOverlay>
  );
}
