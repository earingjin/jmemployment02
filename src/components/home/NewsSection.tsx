import { useState } from 'react';
import { NOTICES, PRESS_NEWS } from '../../data/content';

// 보도자료 / 공지사항 탭
export function NewsSection({ onOpenPress }: { onOpenPress: (index: number) => void }) {
  const [tab, setTab] = useState<'press' | 'notice'>('press');
  const isPress = tab === 'press';

  return (
    <section className="sec-news" id="pv-news-section">
      <div className="sec-news-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E50FF', textTransform: 'uppercase' }}>NOTICE &amp; PRESS</span>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.6px', marginTop: '2px' }}>제이엠커리어 소식</h2>
          </div>
          <div className="news-tab-bar">
            <button className={'news-tab-btn' + (isPress ? ' active' : '')} id="newsTabPress" onClick={() => setTab('press')}>보도자료</button>
            <button className={'news-tab-btn' + (!isPress ? ' active' : '')} id="newsTabNotice" onClick={() => setTab('notice')}>공지사항</button>
          </div>
        </div>

        <div id="pv-press-section" className="news-track-wrap" style={isPress ? undefined : { display: 'none' }}>
          <div className="news-track" id="pv-press-track">
            {PRESS_NEWS.map((n, i) => (
              <div key={i} className="news-card-item" onClick={() => onOpenPress(i)}>
                <div className="tagline">{`${n.category} · ${n.date}`}</div>
                <div className="title">{n.title}</div>
              </div>
            ))}
          </div>
        </div>
        <div id="pv-notice-panel" className="news-track-wrap" style={isPress ? { display: 'none' } : undefined}>
          <div className="news-track" id="pv-news-row">
            {/* 공지사항 카드는 원본에서도 클릭 동작이 없다 */}
            {NOTICES.map((n, i) => (
              <div key={i} className="news-card-item">
                <div className="tagline">{`공지 · ${n.date}`}</div>
                <div className="title">{n.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
