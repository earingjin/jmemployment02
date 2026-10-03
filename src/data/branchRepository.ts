
import {
  ADMIN_BRANCHES,
  type Branch,
  type BranchMap,
} from './branches';

import { supabaseRequest } from '../lib/supabase';

// Supabase DB의 컬럼 구조
interface BranchRow {
  slug: string;
  phone: string;
  address: string;
  contact_manager_name: string;
  contact_manager_email: string;
  map_url: string;
  region: string;
  hours: string;
  published: boolean;
  program_ids: string[];
}

// DB 데이터 → React에서 사용하는 데이터
function toBranch(row: BranchRow): Branch {
  return {
    slug: row.slug,
    phone: row.phone,
    address: row.address,
    contactManagerName: row.contact_manager_name,
    contactManagerEmail: row.contact_manager_email,
    mapUrl: row.map_url,
    region: row.region,
    hours: row.hours,
    published: row.published,
    programIds: row.program_ids,
  };
}

// 전체 지사 조회
// 공개 조회 정책이 준비된 후 App.tsx에 연결할 예정
export async function getBranches(): Promise<BranchMap> {
  const rows = await supabaseRequest<BranchRow[]>(
    'branches?select=*&order=slug.asc'
  );

  const branches: BranchMap = {};

  for (const row of rows) {
    if (!ADMIN_BRANCHES.includes(row.slug)) {
      continue;
    }

    branches[row.slug] = toBranch(row);
  }

  // RLS로 조회가 차단된 상태를 정상 데이터로 오인하지 않음
  const missing = ADMIN_BRANCHES.filter(
    slug => !branches[slug]
  );

  if (missing.length > 0) {
    throw new Error(
      `지사 데이터를 모두 조회하지 못했습니다: ${missing.join(', ')}`
    );
  }

  return branches;
}

// 관리자 화면에서 수정할 수 있는 항목
export type BranchUpdate = Pick<
  Branch,
  'phone' | 'address' | 'hours' | 'region'
>;

// 지사 정보 저장
// 인증 기능 구현 후 유효한 관리자 accessToken을 전달
export async function updateBranch(
  slug: string,
  patch: BranchUpdate,
  accessToken: string
): Promise<Branch> {
  if (!ADMIN_BRANCHES.includes(slug)) {
    throw new Error('존재하지 않는 지사입니다.');
  }

  if (!accessToken.trim()) {
    throw new Error('관리자 인증이 필요합니다.');
  }

  const rows = await supabaseRequest<BranchRow[]>(
    `branches?slug=eq.${encodeURIComponent(slug)}&select=*`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        phone: patch.phone,
        address: patch.address,
        hours: patch.hours,
        region: patch.region,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (rows.length !== 1) {
    throw new Error('지사 정보가 저장되지 않았습니다.');
  }

  return toBranch(rows[0]);
}
