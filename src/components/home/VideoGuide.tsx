import registerVideo from '../../assets/구직등록 신청 영상.mp4';
import benefitVideo from '../../assets/국취신청.mp4';
import { AutoplayVideo } from '../common/AutoplayVideo';

const VIDEOS = [
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
          {VIDEOS.map(v => (
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
