import registerVideo from '../../assets/구직등록 신청 영상.mp4';
import benefitVideo from '../../assets/국취신청.mp4';
import { AutoplayVideo } from '../common/AutoplayVideo';
import { useRef, useState } from 'react';

export const VIDEO_GUIDES = [
  { src: registerVideo, label: '구직등록 신청 안내 영상', number: '01', title: '구직등록 신청', caption: '먼저 구직등록부터 해요' },
  { src: benefitVideo, label: '국민취업지원 신청 안내 영상', number: '02', title: '국민취업지원 신청', caption: '구직촉진수당 신청 방법을 알아봐요' }
];

// Hero 바로 아래: 구직촉진수당 신청 영상 2종
export function VideoGuide() {
  return (
    <section className="benefit-videos-section" aria-labelledby="benefit-videos-title">
      <div className="benefit-videos-inner">
        <div className="benefit-videos-heading">
          <span className="eyebrow">VIDEO GUIDE</span>
          <h2 id="benefit-videos-title">구직촉진수당 신청, 영상으로 쉽게 시작하세요</h2>
        </div>
        <div className="benefit-video-grid">
          {VIDEO_GUIDES.map(v => (
            <article className="benefit-video-card" key={v.number}>
              <AutoplayVideo src={v.src} label={v.label} />
              <div className="benefit-video-card-info"><span className="benefit-video-number">{v.number}</span><strong>{v.title}</strong><span>{v.caption}</span></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MobileVideoGuide() {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const videosRef = useRef<HTMLVideoElement[]>([]);

  const stopVideos = () => {
    videosRef.current.forEach(video => video.pause());
  };

  const toggleOpen = () => {
    if (open) {
      stopVideos();
      setSelectedIndex(null);
    }
    setOpen(current => !current);
  };

  const selectVideo = (index: number) => {
    stopVideos();
    setSelectedIndex(index);
  };

  const selectedVideo = selectedIndex === null ? null : VIDEO_GUIDES[selectedIndex];

  return <section className="mobile-video-guide" aria-label="신청 안내 영상">
    <button type="button" className="mobile-video-guide-toggle" aria-expanded={open} aria-controls="mobile-video-guide-content" onClick={toggleOpen}>
      신청 안내 영상 {open ? '접기' : '펼쳐 보기'} {open ? '−' : '+'}
    </button>
    {open && <div className="mobile-video-guide-content" id="mobile-video-guide-content">
      <div className="mobile-video-guide-list" role="list">
        {VIDEO_GUIDES.map((video, index) => (
          <button type="button" role="listitem" className={selectedIndex === index ? 'active' : ''} key={video.number} onClick={() => selectVideo(index)}>
            <span>{video.number}</span>{video.title}
          </button>
        ))}
      </div>
      {selectedVideo && <div className="mobile-video-guide-player">
        <video key={selectedVideo.number} ref={video => { if (video) videosRef.current[selectedIndex!] = video; }} src={selectedVideo.src} controls playsInline preload="metadata" aria-label={selectedVideo.label} />
      </div>}
    </div>}
  </section>;
}
