import { ModalCloseButton, ModalOverlay } from '../common/ModalOverlay';

export interface MapModalContent {
  title: string;
  address: string;
  embedUrl: string;
  linkUrl: string;
}

// 지사 위치(찾아오시는 길) 모달 (원본 openBranchMap)
// 내용은 모달을 여는 시점의 지사 정보로 채워진다.
export function MapModal({ open, content, onClose }: { open: boolean; content: MapModalContent; onClose: () => void }) {
  return (
    <ModalOverlay id="mapModalOverlay" className="map-modal-overlay" open={open} onClose={onClose}>
      <div className="map-modal">
        <ModalCloseButton onClick={onClose} />
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E50FF', background: '#F0F5FF', padding: '3px 10px', borderRadius: '9999px' }}>찾아오시는 길</span>
        <h3 id="mapModalTitle" style={{ fontSize: '22px', fontWeight: 800, margin: '10px 0' }}>{content.title}</h3>
        <div className="map-art">
          <iframe id="mapModalIframe" style={{ border: 0, width: '100%', height: '100%' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={content.embedUrl}></iframe>
        </div>
        <div id="mapModalAddress" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{content.address}</div>
        <a className="map-link-btn" id="mapModalLink" href={content.linkUrl} target="_blank" rel="noopener">지도 앱에서 보기 →</a>
      </div>
    </ModalOverlay>
  );
}
