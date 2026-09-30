import type { PressNews } from '../../data/content';
import { ModalCloseButton, ModalOverlay } from '../common/ModalOverlay';

// 보도자료 상세 모달 (원본 openPressDetail)
export function PressModal({ open, press, onClose }: { open: boolean; press: PressNews | null; onClose: () => void }) {
  return (
    <ModalOverlay id="pressModalOverlay" className="map-modal-overlay" open={open} onClose={onClose}>
      <div className="course-modal">
        <ModalCloseButton onClick={onClose} />
        <div id="pressModalTagline" style={{ fontSize: '12px', fontWeight: 700, color: '#1E50FF', marginBottom: '6px' }}>{press && `${press.category} · ${press.date}`}</div>
        <h3 id="pressModalTitle" style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>{press?.title}</h3>
        <div id="pressModalDetail" style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{press?.detail}</div>
      </div>
    </ModalOverlay>
  );
}
