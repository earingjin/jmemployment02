import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_EMBED_URL, PUBLIC_BRANCH, branchSuffix, mapEmbedUrl, naverMapSearchUrl, type BranchMap } from '../data/branches';
import { PRESS_NEWS, REVIEWS } from '../data/content';
import { findProgram } from '../data/programs';
import { ConsultationSection } from '../components/home/ConsultationSection';
import { EthicsSection } from '../components/home/EthicsSection';
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
  const [bdRegion, setBdRegion] = useState('전체');
  const [programModal, setProgramModal] = useState<{ open: boolean; programId: string | null; audience: Audience }>({ open: false, programId: null, audience: 'seeker' });
  const [reviewModal, setReviewModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [pressModal, setPressModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [mapModal, setMapModal] = useState<{ open: boolean; content: MapModalContent }>({
    open: false, content: { title: '위치 안내', address: '', embedUrl: DEFAULT_MAP_EMBED_URL, linkUrl: '#' }
  });
  const contactRef = useRef<HTMLElement>(null);

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

  const goToSection = (id: string) => {
    pushPath('/');
    setView('home');
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  const openProgramDetail = (programId: string, audience: Audience = 'seeker') => {
    if (!findProgram(programId)) return;
    setProgramModal({ open: true, programId, audience });
  };
  const closeProgramDetail = () => setProgramModal(m => ({ ...m, open: false }));

  // 원본 goToConsult(): 프로그램 모달만 닫고(다른 모달은 유지) 홈으로 돌아간 뒤 상담 영역으로 스크롤
  const goToConsult = () => {
    closeProgramDetail();
    pushPath('/');
    setView('home');
    setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  };

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
    <div id="publicPage" style={hidden ? { display: 'none' } : undefined}>
      <Header view={view} onNavigate={navigate} onConsult={goToConsult} />

      <div className={'page' + (view !== 'home' ? ' sub-mode' : '')}>
        <EmployerView active={view === 'employer'} benefitYear={benefitYear} onDetail={id => openProgramDetail(id, 'employer')} onConsult={goToConsult} />
        <BranchDirectoryView active={view === 'branch'} branches={branches} region={bdRegion} onRegion={setBdRegion} onOpenMap={openBranchMap} />
        {view === 'smartcare' && <SmartCarePage onBack={goHome} onConsult={goToConsult} />}
        {isProgramView(view) && <ProgramDetailPage key={view} programId={view} onBack={goHome} onConsult={goToConsult} />}

        <Hero onConsult={goToConsult} onBranch={() => openBranchDirectory()} onDetail={() => navigate('employment-support')} />
        <VideoGuide />
        {/* 기존 BenefitSection과 내용이 중복되어 Hero로 통합했다. 컴포넌트 파일은 삭제하지 않고 렌더링만 하지 않는다. */}
        {/* 사업 카드는 Header와 동일한 사업 상세 페이지로 이동한다 */}
        <ProgramSection onProgram={id => { if (isProgramView(id)) navigate(id); }} onEmployer={() => navigate('employer')} />
        <SmartCareSection onDetail={() => navigate('smartcare')} />
        <ReviewsSection onOpenReview={index => setReviewModal({ open: true, index })} />
        <NetworkSection onBranch={() => openBranchDirectory()} onConsult={goToConsult} onEmployer={() => navigate('employer')} />
        <NewsSection onOpenPress={index => setPressModal({ open: true, index })} />
        <ConsultationSection branches={branches} sectionRef={contactRef} />
        <EthicsSection />
        <Footer branches={branches} onBranch={region => openBranchDirectory(region)} onEthics={() => goToSection('ethics')} onAdmin={onShowAdmin} />
      </div>

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
