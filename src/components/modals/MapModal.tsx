import { useCallback, useEffect, useRef, useState } from 'react';
import { branchImagePublicUrl } from '../../data/branchDirectory';
import { ModalCloseButton, ModalOverlay } from '../common/ModalOverlay';
import './MapModal.css';

export interface MapModalContent {
  title: string;
  address: string;
  embedUrl: string;
  linkUrl: string;
  imagePath: string | null;
  imagePath2: string | null;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  image2Zoom: number;
  image2PositionX: number;
  image2PositionY: number;
}

// 지사 위치(찾아오시는 길) 모달 (원본 openBranchMap)
// 내용은 모달을 여는 시점의 지사 정보로 채워진다.
export function MapModal({ open, content, onClose }: { open: boolean; content: MapModalContent; onClose: () => void }) {
  const [expanded, setExpanded] = useState<1 | 2 | null>(null);
  const photos = ([
    { slot: 1, path: content.imagePath, zoom: content.imageZoom ?? 1, x: content.imagePositionX ?? 50, y: content.imagePositionY ?? 50 },
    { slot: 2, path: content.imagePath2, zoom: content.image2Zoom ?? 1, x: content.image2PositionX ?? 50, y: content.image2PositionY ?? 50 },
  ] as const).flatMap(photo => {
    const url = branchImagePublicUrl(photo.path);
    return url ? [{ ...photo, url }] : [];
  });
  const expandedPhoto = photos.find(photo => photo.slot === expanded);
  const closeImage = useCallback(() => setExpanded(null), []);
  useEffect(() => { setExpanded(null); }, [open, content.imagePath, content.imagePath2]);
  const closeMap = () => { setExpanded(null); onClose(); };

  return (
    <>
    <ModalOverlay id="mapModalOverlay" className="map-modal-overlay" open={open} onClose={closeMap}>
      <div className={'map-modal' + (photos.length ? ' map-modal-with-photo' : '')} role="dialog" aria-modal="true" aria-labelledby="mapModalTitle" aria-hidden={!!expandedPhoto || undefined}>
        <ModalCloseButton onClick={closeMap} />
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E50FF', background: '#F0F5FF', padding: '3px 10px', borderRadius: '9999px' }}>찾아오시는 길</span>
        <h3 id="mapModalTitle" style={{ fontSize: '22px', fontWeight: 800, margin: '10px 0' }}>{content.title}</h3>
        {photos.length > 0 && <div className="map-branch-photos">
          {photos.map(photo => <button key={photo.slot} type="button" className="map-branch-photo" aria-haspopup="dialog"
            aria-label={content.title + ' 사진 ' + photo.slot + ' 크게 보기'} onClick={() => setExpanded(photo.slot)}>
            <img src={photo.url} alt={content.title + ' 사진 ' + photo.slot}
              style={{ objectPosition: photo.x + '% ' + photo.y + '%', transform: 'scale(' + photo.zoom + ')', transformOrigin: photo.x + '% ' + photo.y + '%' }} />
          </button>)}
        </div>}
        <div className="map-art">
          <iframe id="mapModalIframe" title={content.title + ' 지도'} style={{ border: 0, width: '100%', height: '100%' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={content.embedUrl}></iframe>
        </div>
        <div id="mapModalAddress" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{content.address}</div>
        <a className="map-link-btn" id="mapModalLink" href={content.linkUrl} target="_blank" rel="noopener">지도 앱에서 보기 →</a>
      </div>
    </ModalOverlay>
    {open && expandedPhoto && <MapImageViewer src={expandedPhoto.url} title={content.title + ' 사진 ' + expandedPhoto.slot}
      zoom={expandedPhoto.zoom} positionX={expandedPhoto.x} positionY={expandedPhoto.y} onClose={closeImage} />}
    </>
  );
}

function MapImageViewer({ src, title, zoom, positionX, positionY, onClose }: {
  src: string; title: string; zoom: number; positionX: number; positionY: number; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (element?.open) element.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return (
    <dialog ref={dialog} className="map-image-viewer" aria-label={title + ' 대표사진 확대'}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <button type="button" className="map-image-viewer-close" aria-label="확대 사진 닫기" onClick={onClose}>×</button>
      <div className="map-image-viewer-frame">
        <img src={src} alt={title + ' 대표사진 확대'} style={{ objectPosition: positionX + '% ' + positionY + '%',
          transform: 'scale(' + zoom + ')', transformOrigin: positionX + '% ' + positionY + '%' }} />
      </div>
    </dialog>
  );
}
