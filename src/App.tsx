import { useState } from 'react';
import { AdminPage, type BranchPatch } from './components/admin/AdminPage';
import { createInitialBranches } from './data/branches';
import { DEFAULT_BENEFIT_YEAR } from './data/content';
import { HomePage } from './pages/HomePage';

// 루트: 공개 사이트(#publicPage)와 관리자 화면(#adminPage)을 함께 유지하고 표시만 전환한다(원본 showAdmin/showPublic).
// 관리자에서 수정 가능한 데이터(지사 정보, 지원금 기준 연도)는 여기서 상태로 보관하며 현재 브라우저 메모리에만 존재한다.
export default function App() {
  const [branches, setBranches] = useState(createInitialBranches);
  const [benefitYear, setBenefitYear] = useState(DEFAULT_BENEFIT_YEAR);
  const [adminVisible, setAdminVisible] = useState(false);
  const [adminOpenSeq, setAdminOpenSeq] = useState(0);

  const showAdmin = () => { setAdminVisible(true); setAdminOpenSeq(s => s + 1); };
  const saveBranch = (slug: string, patch: BranchPatch) => setBranches(prev => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));

  return (
    <>
      <HomePage hidden={adminVisible} branches={branches} benefitYear={benefitYear} onShowAdmin={showAdmin} />
      <AdminPage visible={adminVisible} openSeq={adminOpenSeq} branches={branches} benefitYear={benefitYear}
        onSaveBranch={saveBranch} onSaveBenefitYear={setBenefitYear} onBack={() => setAdminVisible(false)} />
    </>
  );
}
