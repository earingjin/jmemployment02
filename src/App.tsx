
import { lazy, Suspense, useEffect, useState } from 'react';
import type { BranchDirectoryRow as BranchRow, BranchImageRow } from './data/branchDirectory';
import {
  createInitialBranches,
  type BranchMap,
} from './data/branches';
import { DEFAULT_BENEFIT_YEAR } from './data/content';
import { HomePage } from './pages/HomePage';

const AdminRoute = lazy(() =>
  import('./components/admin/AdminRoute').then(module => ({ default: module.AdminRoute }))
);

const currentPath = () => window.location.pathname.replace(/\/$/, '') || '/';

const STORAGE_KEY = 'jmcareer_demo_branches';

const API_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/branch-directory`;


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

function mergeRows(
  current: BranchMap,
  rows: BranchRow[]
): BranchMap {
  const next = { ...current };

  for (const row of rows) {
    if (!next[row.slug]) continue;

    next[row.slug] = {
      ...next[row.slug],
      phone: row.phone,
      address: row.address,
      mapUrl: row.map_url,
      imagePath: row.image_path,
      region: row.region,
      hours: row.hours,
      published: row.published,
      programIds: row.program_ids,
    };
  }

  return next;
}

export default function App() {
  const [branches, setBranches] = useState(loadBranches);
  const [benefitYear, setBenefitYear] =
    useState(DEFAULT_BENEFIT_YEAR);

  const [pathname, setPathname] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPathname(currentPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBranches() {
      try {
        const response = await fetch(API_URL, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('지사 정보 조회 실패');
        }

        const rows = await response.json() as BranchRow[];

        if (cancelled) return;

        setBranches(current => {
          const next = mergeRows(current, rows);

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(next)
          );

          return next;
        });
      } catch (error) {
        console.error('Supabase 조회 실패:', error);
      }
    }

    fetchBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  const applySavedBranch = (saved: BranchRow): void => {
    setBranches(current => {
      const updated = mergeRows(current, [saved]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const applySavedBranchImage = (saved: BranchImageRow): void => {
    setBranches(current => {
      if (!current[saved.slug]) return current;
      const updated = { ...current, [saved.slug]: { ...current[saved.slug], imagePath: saved.image_path } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  if (pathname === '/admin') {
    return (
      <Suspense fallback={<div role="status">관리자 화면을 불러오는 중...</div>}>
        <AdminRoute
          visible={true}
          openSeq={0}
          branches={branches}
          benefitYear={benefitYear}
          onBranchSaved={applySavedBranch}
          onBranchImageSaved={applySavedBranchImage}
          onSaveBenefitYear={setBenefitYear}
          onBack={() => {
            window.history.pushState({}, '', '/');
            setPathname('/');
            window.scrollTo({ top: 0 });
          }}
        />
      </Suspense>
    );
  }

  return <HomePage branches={branches} benefitYear={benefitYear} />;
}
