import type { Review } from '../../data/content';
import { ModalCloseButton, ModalOverlay } from '../common/ModalOverlay';

// 후기 상세 모달 (원본 openReview). review가 null이면 원본 초기 상태(빈 내용)
export function ReviewModal({ open, review, onClose }: { open: boolean; review: Review | null; onClose: () => void }) {
  return (
    <ModalOverlay id="reviewModalOverlay" className="map-modal-overlay" open={open} onClose={onClose}>
      <div className="review-modal">
        <ModalCloseButton onClick={onClose} />
        <div id="reviewModalTitle" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{review?.title}</div>
        <div id="reviewModalFull" style={{ fontSize: '14.5px', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '20px' }}>{review?.full}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
          <span id="reviewModalName">{review?.name}</span>
          <span id="reviewModalDate">{review?.date}</span>
        </div>
      </div>
    </ModalOverlay>
  );
}
