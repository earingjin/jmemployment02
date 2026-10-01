import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_EMBED_URL, PUBLIC_BRANCH, branchSuffix, mapEmbedUrl, naverMapSearchUrl, type BranchMap } from '../data/branches';
import { PRESS_NEWS, REVIEWS } from '../data/content';
import { findProgram } from '../data/programs';
import { ConsultationSection } from '../components/home/ConsultationSection';
import { openConsultationForm } from '../data/consultation';
import { LEGAL_CONTENT, type LegalContentId } from '../data/legal';
import { LegalModal } from '../components/modals/LegalModal';
import { Hero } from '../components/home/Hero';
import { NetworkSection } from '../components/home/NetworkSection';
import { NewsSection } from '../components/home/NewsSection';
import { ProgramSection } from '../components/home/ProgramSection';
import { ReviewsSection } from '../components/home/ReviewsSection';
import { SmartCareSection } from '../components/home/SmartCareSection';
import { VideoGuide } from '../components/home/VideoGuide';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { MapModal, type MapModalContent } from '../components/modals/MapModal';
import { PressModal } from '../components/modals/PressModal';
import { ProgramModal, type Audience } from '../components/modals/ProgramModal';
import { ReviewModal } from '../components/modals/ReviewModal';
import { BranchDirectoryView } from '../components/views/BranchDirectoryView';
import { EmployerView } from '../components/views/EmployerView';
import { VIEW_PATHS, isProgramView, viewFromPath, type View } from '../data/navigation';
import { ProgramDetailPage } from './ProgramDetailPage';
import { SmartCarePage } from './SmartCarePage';

export type { View };

// 현재 URL에 대응하는 화면 (URL ↔ View 매핑은 src/data/navigation.ts)
const currentView = () => viewFromPath(window.location.pathname);

// 같은 URL을 다시 누르면 history 항목을 중복으로 쌓지 않는다(뒤로가기 시 URL과 화면 불일치 방지)
const pushPath = (path: string) => { if (window.location.pathname !== path) window.history.pushState({}, '', path); };

// 공개 사이트 전체 (원본 #publicPage)
export function HomePage({ hidden, branches, benefitYear, onShowAdmin }: {
  hidden: boolean;
  branches: BranchMap;
  benefitYear: string;
  onShowAdmin: () => void;
}) {
  const [view, setView] = useState<View>(currentView);
  const publicRef = useRef<HTMLDivElement>(null);
  const [mobileProgramsOpen, setMobileProgramsOpen] = useState(false);
  const [stickyConsultVisible, setStickyConsultVisible] = useState(false);

  useEffect(() => {
    if (view !== 'home' || hidden) { setStickyConsultVisible(false); return; }
    const root = publicRef.current;
    const heroButton = root?.querySelector('.hero-consult-cta');
    const footer = root?.querySelector('footer');
    if (!heroButton || !footer) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    const update = () => {
      const heroRect = heroButton.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      // Start after the Hero CTA has scrolled above the viewport, never before it.
      setStickyConsultVisible(mobile.matches && heroRect.bottom <= 0 && footerRect.top >= window.innerHeight + 100);
    };
    let frameId: number | null = null;
    const observer = new IntersectionObserver(() => {
      // Observe callbacks can run before layout settles after navigation.
      // Defer the geometry check by one frame so the fixed CTA is updated reliably.
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(update);
    }, { rootMargin: '0px 0px 100px 0px' });
    observer.observe(heroButton);
    observer.observe(footer);
    mobile.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      mobile.removeEventListener('change', update);
    };
  }, [view, hidden]);
  const [bdRegion, setBdRegion] = useState('전체');
  const [legalModal, setLegalModal] = useState<LegalContentId | null>(null);
  const [programModal, setProgramModal] = useState<{ open: boolean; programId: string | null; audience: Audience }>({ open: false, programId: null, audience: 'seeker' });
  const [reviewModal, setReviewModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [pressModal, setPressModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [mapModal, setMapModal] = useState<{ open: boolean; content: MapModalContent }>({
    open: false, content: { title: '위치 안내', address: '', embedUrl: DEFAULT_MAP_EMBED_URL, linkUrl: '#' }
  });

  useEffect(() => {
    const onPopState = () => setView(currentView());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // 모든 화면 전환의 단일 진입점: URL 변경 + 화면 전환 + 상단 이동
  const navigate = (next: View) => {
    pushPath(VIEW_PATHS[next]);
    setView(next);
    scrollTop();
  };
  const goHome = () => navigate('home');
  // Footer 지사 목록에서는 해당 지사의 권역을 선택한 상태로 전국지사를 연다
  const openBranchDirectory = (region?: string) => {
    if (region) setBdRegion(region);
    navigate('branch');
  };

  const openProgramDetail = (programId: string, audience: Audience = 'seeker') => {
    if (!findProgram(programId)) return;
    setProgramModal({ open: true, programId, audience });
  };
  const closeProgramDetail = () => setProgramModal(m => ({ ...m, open: false }));

  // 원래 페이지와 모달 상태를 유지하며 상담 신청 폼을 새 탭에서 연다.
  const goToConsult = openConsultationForm;

  const openBranchMap = (branchName: string) => {
    const name = branchName || PUBLIC_BRANCH;
    const b = branches[name];
    setMapModal({
      open: true,
      content: {
        title: name === '본사' ? '찾아오시는 길' : name + branchSuffix(name) + ' 찾아오시는 길',
        address: b.address,
        embedUrl: mapEmbedUrl(b.address),
        linkUrl: (b.mapUrl && b.mapUrl.trim()) ? b.mapUrl.trim() : naverMapSearchUrl(b.address)
      }
    });
  };

  return (
    <div id="publicPage" ref={publicRef} style={hidden ? { display: 'none' } : undefined}>
      <Header view={view} onNavigate={navigate} onConsult={goToConsult} />

      <div className={'page' + (view !== 'home' ? ' sub-mode' : ' mobile-home')}>
        <EmployerView active={view === 'employer'} benefitYear={benefitYear} onDetail={id => openProgramDetail(id, 'employer')} onConsult={goToConsult} />
        <BranchDirectoryView active={view === 'branch'} branches={branches} region={bdRegion} onRegion={setBdRegion} onOpenMap={openBranchMap} />
        {view === 'smartcare' && <SmartCarePage onBack={goHome} onConsult={goToConsult} />}
        {isProgramView(view) && <ProgramDetailPage key={view} programId={view} onBack={goHome} onConsult={goToConsult} />}

        <Hero onConsult={goToConsult} onBranch={() => openBranchDirectory()} onDetail={() => navigate('employment-support')} />
        {view === 'home' && <>
          <section className="mobile-home-summary">
            <h2>국민취업지원제도, 누가 받을 수 있나요?</h2>
            <p>만 15~69세 구직자 중 유형별 요건을 충족한 분에게 취업지원서비스를 제공합니다. 소득·재산 등 요건에 따라 Ⅰ유형은 구직촉진수당, Ⅱ유형은 취업활동비용을 지원합니다.</p>
            <button type="button" onClick={() => navigate('employment-support')}>지원 대상 및 신청 절차 자세히 보기 →</button>
          </section>
          <section className="mobile-home-programs">
            <h2>취업지원 프로그램</h2>
            <p>구직자 유형과 희망 진로에 맞는 정부지원사업을 확인해 보세요.</p>
            <button type="button" aria-expanded={mobileProgramsOpen} aria-controls="home-program-list" onClick={() => setMobileProgramsOpen(open => !open)}>
              프로그램 {mobileProgramsOpen ? '접기' : '펼쳐 보기'} {mobileProgramsOpen ? '−' : '+'}
            </button>
          </section>
        </>}
        <VideoGuide />
        {/* 기존 BenefitSection과 내용이 중복되어 Hero로 통합했다. 컴포넌트 파일은 삭제하지 않고 렌더링만 하지 않는다. */}
        {/* 사업 카드는 Header와 동일한 사업 상세 페이지로 이동한다 */}
        <div id="home-program-list" className={'home-program-list' + (mobileProgramsOpen ? ' expanded' : '')}>
          <ProgramSection onProgram={id => { if (isProgramView(id)) navigate(id); }} onEmployer={() => navigate('employer')} />
        </div>
        {view === 'home' && <section className="mobile-home-smartcare">
          <h2>SmartCare</h2>
          <p>진단부터 서류 준비, 면접까지 취업 준비 과정을 지원합니다.</p>
          <button type="button" onClick={() => navigate('smartcare')}>SmartCare 자세히 보기 →</button>
        </section>}
        <SmartCareSection onDetail={() => navigate('smartcare')} />
        <ReviewsSection onOpenReview={index => setReviewModal({ open: true, index })} />
        <NetworkSection onBranch={() => openBranchDirectory()} onConsult={goToConsult} onEmployer={() => navigate('employer')} />
        <NewsSection onOpenPress={index => setPressModal({ open: true, index })} />
        <ConsultationSection />
        {view === 'home' && <section className="mobile-home-consult">
          <h2>취업 준비, 혼자 고민하지 마세요.</h2>
          <div className="mobile-home-consult-actions">
            <button type="button" onClick={goToConsult}>상담 신청하기 ↗</button>
            <button type="button" onClick={() => openBranchDirectory()}>전국 지사 안내 ↗</button>
          </div>
        </section>}
      <Footer onLegal={setLegalModal} onAdmin={onShowAdmin} />
      </div>

      {view === 'home' && stickyConsultVisible && <aside className="mobile-fixed-consult" aria-label="빠른 메뉴">
        <button type="button" onClick={goToConsult}>상담 신청 ↗</button>
        <button type="button" onClick={() => openBranchDirectory()}>전국 지사 ↗</button>
      </aside>}

      <LegalModal content={legalModal ? LEGAL_CONTENT[legalModal] : null} onClose={() => setLegalModal(null)} />
      <ProgramModal open={programModal.open} programId={programModal.programId} audience={programModal.audience}
        onClose={closeProgramDetail} onOpenDetail={openProgramDetail} onConsult={goToConsult} />
      <ReviewModal open={reviewModal.open} review={reviewModal.index === null ? null : REVIEWS[reviewModal.index]}
        onClose={() => setReviewModal(m => ({ ...m, open: false }))} />
      <MapModal open={mapModal.open} content={mapModal.content} onClose={() => setMapModal(m => ({ ...m, open: false }))} />
      <PressModal open={pressModal.open} press={pressModal.index === null ? null : PRESS_NEWS[pressModal.index]}
        onClose={() => setPressModal(m => ({ ...m, open: false }))} />
    </div>
  );
}
