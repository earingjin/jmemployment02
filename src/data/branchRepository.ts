
import {
  ADMIN_BRANCHES,
  type Branch,
  type BranchMap,
} from './branches';

import { supabaseRequest } from '../lib/supabase';

// 데이터베이스의 전체 지사 구조
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

// 공개 화면에서 사용하는 컬럼만 선택
type PublicBranchRow = Pick<
  BranchRow,
  | 'slug'
  | 'phone'
  | 'address'
  | 'map_url'
  | 'region'
  | 'hours'
  | 'published'
  | 'program_ids'
>;

// DB 전체 데이터 → 기존 React 구조
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

// 공개 데이터 → 기존 React 구조
function toPublicBranch(row: PublicBranchRow): Branch {
  return {
    slug: row.slug,
    phone: row.phone,
    address: row.address,
    contactManagerName: '',
    contactManagerEmail: '',
    mapUrl: row.map_url,
    region: row.region,
    hours: row.hours,
    published: row.published,
    programIds: row.program_ids,
  };
}

// 공개 지사 정보 조회
// RLS 공개 조회 정책을 설정한 후 사용
export async function getBranches(): Promise<BranchMap> {
  const rows = await supabaseRequest<PublicBranchRow[]>(
    'public_branches?select=slug,phone,address,map_url,region,hours,published,program_ids'
  );

  const branches: BranchMap = {};

  for (const row of rows) {
    if (!ADMIN_BRANCHES.includes(row.slug)) {
      continue;
    }

    branches[row.slug] = toPublicBranch(row);
  }

  // 현재 단계에서는 기존 20개 지사의 완전한 조회를 요구
  const missing = ADMIN_BRANCHES.filter(
    slug => !branches[slug]
  );

  if (missing.length > 0) {
    throw new Error(
      `지사 데이터 조회 실패: ${missing.join(', ')}`
    );
  }

  return branches;
}

// 관리자 수정 허용 항목
export type BranchUpdate = Pick<
  Branch,
  'phone' | 'address' | 'hours' | 'region'
>;

// 관리자 인증 연결 후 사용할 저장 함수
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
