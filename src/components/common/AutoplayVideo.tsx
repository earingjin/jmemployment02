// 원본 <video controls autoplay muted loop playsinline preload="metadata"> 재현
// React는 muted를 속성(property)으로만 설정하므로, 원본과 같이 HTML 속성도 남도록 ref에서 추가한다(모바일 자동재생 조건 보존).
export function AutoplayVideo({ src, label }: { src: string; label: string }) {
  return (
    <video ref={el => { el?.setAttribute('muted', ''); }} controls autoPlay muted loop playsInline preload="metadata" aria-label={label}>
      <source src={src} type="video/mp4" />
      브라우저가 영상을 지원하지 않습니다.
    </video>
  );
}
