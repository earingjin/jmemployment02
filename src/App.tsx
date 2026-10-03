
import { useState } from 'react';
import { AdminPage, type BranchPatch } from './components/admin/AdminPage';
import { createInitialBranches, type BranchMap } from './data/branches';
import { DEFAULT_BENEFIT_YEAR } from './data/content';
import { HomePage } from './pages/HomePage';

const STORAGE_KEY = 'jmcareer_demo_branches';

function loadBranches(): BranchMap {
  const defaults = createInitialBranches();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return defaults;

    const parsed = JSON.parse(saved) as BranchMap;

    return Object.fromEntries(
      Object.entries(defaults).map(([slug, branch]) => [
        slug,
        { ...branch, ...(parsed[slug] || {}) },
      ])
    ) as BranchMap;
  } catch {
    return defaults;
  }
}

export default function App() {
  const [branches, setBranches] = useState(loadBranches);
  const [benefitYear, setBenefitYear] = useState(DEFAULT_BENEFIT_YEAR);
  const [adminVisible, setAdminVisible] = useState(false);
  const [adminOpenSeq, setAdminOpenSeq] = useState(0);

  const showAdmin = () => {
    setAdminVisible(true);
    setAdminOpenSeq(s => s + 1);
  };

  const saveBranch = (slug: string, patch: BranchPatch) => {
    const updated = {
      ...branches,
      [slug]: {
        ...branches[slug],
        ...patch,
      },
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );

    setBranches(updated);
  };

  return (
    <>
      <HomePage
        hidden={adminVisible}
        branches={branches}
        benefitYear={benefitYear}
        onShowAdmin={showAdmin}
      />

      <AdminPage
        visible={adminVisible}
        openSeq={adminOpenSeq}
        branches={branches}
        benefitYear={benefitYear}
        onSaveBranch={saveBranch}
        onSaveBenefitYear={setBenefitYear}
        onBack={() => setAdminVisible(false)}
      />
    </>
  );
}
