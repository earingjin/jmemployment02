
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

import { loadCustomerConsultation, type ConsultationSnapshot } from './data/consultation';
import { usePublicBranchDirectory } from './data/publicBranches';

const AdminRoute = lazy(() =>
  import('./components/admin/AdminRoute').then(module => ({ default: module.AdminRoute }))
);

const currentPath = () => window.location.pathname.replace(/\/$/, '') || '/';

const API_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/branch-directory`;


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
  const [branches, setBranches] = useState(createInitialBranches);
  const publicDirectory = usePublicBranchDirectory(API_URL);
  useEffect(() => {
    if (publicDirectory.status === 'ready') {
      setBranches(current => ({ ...current, ...publicDirectory.branches }));
    }
  }, [publicDirectory.branches, publicDirectory.status]);
  const [consultationLoad, setConsultationLoad] = useState<Promise<ConsultationSnapshot>>(loadCustomerConsultation);
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

  const applySavedBranch = (saved: BranchRow): void => {
    setBranches(current => {
      const updated = mergeRows(current, [saved]);
      return updated;
    });
    void publicDirectory.refresh();
  };

  const applySavedBranchImage = (saved: BranchImageRow, slot: BranchImageSlot): void => {
    setBranches(current => {
      if (!current[saved.slug]) return current;
      const image = slot === 1
        ? { imagePath: saved.image_path, imageZoom: saved.image_zoom, imagePositionX: saved.image_position_x, imagePositionY: saved.image_position_y }
        : { imagePath2: saved.image_path_2, image2Zoom: saved.image_2_zoom, image2PositionX: saved.image_2_position_x, image2PositionY: saved.image_2_position_y };
      const updated = { ...current, [saved.slug]: { ...current[saved.slug], ...image } };
      return updated;
    });
    void publicDirectory.refresh();
  };

  if (pathname === '/admin') {
    return (
      <Suspense fallback={<div role="status">관리자 화면을 불러오는 중...</div>}>
        <AdminRoute
          visible={true}
          openSeq={0}
          branches={branches}
          benefitYear={benefitYear}
          onConsultationSaved={settings => setConsultationLoad(Promise.resolve({ settings, source: 'saved' }))}
          onBranchSaved={applySavedBranch}
          onBranchImageSaved={applySavedBranchImage}
          onSaveBenefitYear={setBenefitYear}
          onBack={() => {
            void publicDirectory.refresh();
            window.history.pushState({}, '', '/');
            setPathname('/');
            window.scrollTo({ top: 0 });
          }}
        />
      </Suspense>
    );
  }

  return <HomePage branches={publicDirectory.branches} branchStatus={publicDirectory.status} benefitYear={benefitYear} customerPrograms={customerPrograms} smartCareSolutions={smartCareSolutions} consultationLoad={consultationLoad} />;
}
