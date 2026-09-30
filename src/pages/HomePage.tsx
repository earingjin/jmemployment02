import { useRef, useState } from 'react';
import { DEFAULT_MAP_EMBED_URL, PUBLIC_BRANCH, branchSuffix, mapEmbedUrl, naverMapSearchUrl, type BranchMap } from '../data/branches';
import { PRESS_NEWS, REVIEWS, SMART_SOLUTIONS, type SmartSolutionKey } from '../data/content';
import { findProgram } from '../data/programs';
import { ConsultationSection } from '../components/home/ConsultationSection';
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
import { SmartSolutionModal } from '../components/modals/SmartSolutionModal';
import { BranchDirectoryView } from '../components/views/BranchDirectoryView';
import { EmployerView } from '../components/views/EmployerView';

// 원본 showView()의 화면 상태. 'home' 이외에는 .page에 sub-mode가 붙어 홈 섹션이 숨겨진다(라우터 없음, URL 변화 없음).
export type View = 'home' | 'branch' | 'employer';

// 공개 사이트 전체 (원본 #publicPage)
export function HomePage({ hidden, branches, benefitYear, onShowAdmin }: {
  hidden: boolean;
  branches: BranchMap;
  benefitYear: string;
  onShowAdmin: () => void;
}) {
  const [view, setView] = useState<View>('home');
  const [bdRegion, setBdRegion] = useState('전체');
  const [programModal, setProgramModal] = useState<{ open: boolean; programId: string | null; audience: Audience }>({ open: false, programId: null, audience: 'seeker' });
  const [reviewModal, setReviewModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [pressModal, setPressModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [aiModal, setAiModal] = useState<{ open: boolean; key: SmartSolutionKey | null }>({ open: false, key: null });
  const [mapModal, setMapModal] = useState<{ open: boolean; content: MapModalContent }>({
    open: false, content: { title: '위치 안내', address: '', embedUrl: DEFAULT_MAP_EMBED_URL, linkUrl: '#' }
  });
  const contactRef = useRef<HTMLElement>(null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const openBranchDirectory = (region?: string) => {
    if (region) setBdRegion(region);
    setView('branch');
    scrollTop();
  };
  const closeBranchDirectory = () => setView('home');
  const goHome = () => { closeBranchDirectory(); scrollTop(); };
  const openEmployerPage = () => { setView('employer'); scrollTop(); };

  const openProgramDetail = (programId: string, audience: Audience = 'seeker') => {
    if (!findProgram(programId)) return;
    setProgramModal({ open: true, programId, audience });
  };
  const closeProgramDetail = () => setProgramModal(m => ({ ...m, open: false }));

  // 원본 goToConsult(): 프로그램 모달만 닫고(다른 모달은 유지) 홈으로 돌아간 뒤 상담 영역으로 스크롤
  const goToConsult = () => {
    closeProgramDetail();
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
      <Header view={view} onHome={goHome} onProgram={id => openProgramDetail(id)} onEmployer={openEmployerPage}
        onBranch={() => openBranchDirectory()} onConsult={goToConsult} />

      <div className={'page' + (view !== 'home' ? ' sub-mode' : '')}>
        <EmployerView active={view === 'employer'} benefitYear={benefitYear} onDetail={id => openProgramDetail(id, 'employer')} onConsult={goToConsult} />
        <BranchDirectoryView active={view === 'branch'} branches={branches} region={bdRegion} onRegion={setBdRegion} onOpenMap={openBranchMap} />

        <Hero benefitYear={benefitYear} onConsult={goToConsult} onBranch={() => openBranchDirectory()} onProgram={id => openProgramDetail(id)} />
        <VideoGuide />
        <ProgramSection onProgram={id => openProgramDetail(id)} onEmployer={openEmployerPage} />
        <SmartCareSection onOpen={key => setAiModal({ open: true, key })} />
        <ReviewsSection onOpenReview={index => setReviewModal({ open: true, index })} />
        <NetworkSection onBranch={() => openBranchDirectory()} onConsult={goToConsult} onEmployer={openEmployerPage} />
        <NewsSection onOpenPress={index => setPressModal({ open: true, index })} />
        <ConsultationSection branches={branches} sectionRef={contactRef} />
        <Footer branches={branches} onBranch={region => openBranchDirectory(region)} onAdmin={onShowAdmin} />
      </div>

      <ProgramModal open={programModal.open} programId={programModal.programId} audience={programModal.audience}
        onClose={closeProgramDetail} onOpenDetail={openProgramDetail} onConsult={goToConsult} />
      <ReviewModal open={reviewModal.open} review={reviewModal.index === null ? null : REVIEWS[reviewModal.index]}
        onClose={() => setReviewModal(m => ({ ...m, open: false }))} />
      <MapModal open={mapModal.open} content={mapModal.content} onClose={() => setMapModal(m => ({ ...m, open: false }))} />
      <SmartSolutionModal open={aiModal.open} solution={SMART_SOLUTIONS.find(s => s.key === aiModal.key) ?? null}
        onClose={() => setAiModal(m => ({ ...m, open: false }))} onConsult={goToConsult} />
      <PressModal open={pressModal.open} press={pressModal.index === null ? null : PRESS_NEWS[pressModal.index]}
        onClose={() => setPressModal(m => ({ ...m, open: false }))} />
    </div>
  );
}
