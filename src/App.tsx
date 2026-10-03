
import { useEffect, useState } from 'react';
import { AdminPage, type BranchPatch } from './components/admin/AdminPage';
import {
  createInitialBranches,
  type BranchMap,
} from './data/branches';
import { DEFAULT_BENEFIT_YEAR } from './data/content';
import { HomePage } from './pages/HomePage';

const STORAGE_KEY = 'jmcareer_demo_branches';

const API_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/branch-directory`;

interface BranchRow {
  slug: string;
  phone: string;
  address: string;
  map_url: string;
  region: string;
  hours: string;
  published: boolean;
  program_ids: string[];
}

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

  const [adminVisible, setAdminVisible] = useState(false);
  const [adminOpenSeq, setAdminOpenSeq] = useState(0);

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

  const showAdmin = () => {
    setAdminVisible(true);
    setAdminOpenSeq(s => s + 1);
  };

  const saveBranch = async (
    slug: string,
    patch: BranchPatch
  ): Promise<void> => {
    const password = window.prompt('관리자 저장 비밀번호를 입력하세요.');

    if (password === null) {
      throw new Error('저장이 취소되었습니다.');
    }

    if (!password.trim()) {
      throw new Error('비밀번호를 입력해야 합니다.');
    }

    const response = await fetch(API_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({
        slug,
        ...patch,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('관리자 비밀번호가 올바르지 않습니다.');
      }

      throw new Error(`서버 저장 실패 (${response.status})`);
    }

    const saved = await response.json() as BranchRow;

    const updated = mergeRows(branches, [saved]);

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
