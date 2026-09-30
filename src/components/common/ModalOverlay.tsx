import type { ReactNode } from 'react';

// 원본 모달 공통 동작: 오버레이 자체를 클릭하면 닫힘, 열림 상태는 'open' 클래스로 표시
export function ModalOverlay({ id, className, open, onClose, children }: {
  id: string;
  className: 'map-modal-overlay' | 'program-modal-overlay';
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={className + (open ? ' open' : '')} id={id} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

// 모달 우상단 닫기 버튼 (지도·후기·스마트솔루션·보도자료 모달 공통)
export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return <button className="close-btn" style={{ position: 'absolute', top: '20px', right: '20px' }} onClick={onClick}>✕</button>;
}
