
import { lazy, Suspense, useEffect, useState } from 'react';
import type { BranchDirectoryRow as BranchRow, BranchImageRow, BranchImageSlot } from './data/branchDirectory';
import {
  createInitialBranches,
  type BranchMap,
} from './data/branches';
import { DEFAULT_BENEFIT_YEAR } from './data/content';
import { HomePage } from './pages/HomePage';
import { getCustomerProgramFallback, loadCustomerProgramsWithFallback } from './data/customerProgramFallback';
import { getSmartCareFallback, loadSmartCareWithFallback } from './data/smartCare';

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
      imagePath2: row.image_path_2,
      imageZoom: row.image_zoom,
      imagePositionX: row.image_position_x,
      imagePositionY: row.image_position_y,
      image2Zoom: row.image_2_zoom,
      image2PositionX: row.image_2_position_x,
      image2PositionY: row.image_2_position_y,
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
  const [customerPrograms, setCustomerPrograms] = useState(getCustomerProgramFallback);
  // One SmartCare snapshot shared by the home section, detail page and guide modal.
  const [smartCareSolutions, setSmartCareSolutions] = useState(getSmartCareFallback);

  useEffect(() => {
    const controller = new AbortController();
    // Defer one microtask so StrictMode's discarded effect never starts a second GET.
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      try {
        // Independent loads: a slow or failed SmartCare GET never delays employment content (and vice versa).
        await Promise.all([
          loadCustomerProgramsWithFallback(undefined, controller.signal)
            .then(data => { if (!controller.signal.aborted) setCustomerPrograms(data); }),
          loadSmartCareWithFallback(undefined, controller.signal)
            .then(data => { if (!controller.signal.aborted) setSmartCareSolutions(data.solutions); }),
        ]);
      } catch {
        // Cancellation keeps the initial static snapshot and never updates an unmounted App.
      }
    });
    return () => controller.abort();
  }, []);
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

  const applySavedBranchImage = (saved: BranchImageRow, slot: BranchImageSlot): void => {
    setBranches(current => {
      if (!current[saved.slug]) return current;
      const image = slot === 1
        ? { imagePath: saved.image_path, imageZoom: saved.image_zoom, imagePositionX: saved.image_position_x, imagePositionY: saved.image_position_y }
        : { imagePath2: saved.image_path_2, image2Zoom: saved.image_2_zoom, image2PositionX: saved.image_2_position_x, image2PositionY: saved.image_2_position_y };
      const updated = { ...current, [saved.slug]: { ...current[saved.slug], ...image } };
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

  return <HomePage branches={branches} benefitYear={benefitYear} customerPrograms={customerPrograms} smartCareSolutions={smartCareSolutions} />;
}
