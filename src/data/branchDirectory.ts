import type { Branch } from './branches';

export interface BranchDirectoryRow {
  slug: string;
  phone: string;
  address: string;
  map_url: string;
  image_path: string | null;
  region: string;
  hours: string;
  published: boolean;
  program_ids: string[];
}

export interface BranchSaveAuthorization {
  accessToken: string;
  adminSessionId: string;
}

export class BranchSaveAuthError extends Error {}

// Prepared for the server migration. Never falls back to password authentication.
export async function saveAuthenticatedBranch(
  slug: string,
  patch: Pick<Branch, 'phone' | 'address' | 'hours' | 'region'>,
  authorization: BranchSaveAuthorization
): Promise<BranchDirectoryRow> {
  const { accessToken, adminSessionId } = authorization;
  if (!accessToken || !adminSessionId) {
    throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
  }
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/branch-directory`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        'x-admin-session-id': adminSessionId,
      },
      body: JSON.stringify({ slug, ...patch }),
    });
    if (response.status === 401) {
      throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
    if (response.status === 403) {
      throw new BranchSaveAuthError('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
    }
    if (!response.ok) throw new Error('저장 실패');
    const saved = await response.json() as BranchDirectoryRow;
    if (!saved || saved.slug !== slug || typeof saved.phone !== 'string' || typeof saved.address !== 'string' ||
      typeof saved.map_url !== 'string' || typeof saved.region !== 'string' || typeof saved.hours !== 'string' ||
      (typeof saved.image_path !== 'string' && saved.image_path !== null) ||
      typeof saved.published !== 'boolean' || !Array.isArray(saved.program_ids) ||
      !saved.program_ids.every(id => typeof id === 'string')) {
      throw new Error('저장 응답 오류');
    }
    return saved;
  } catch (cause) {
    if (cause instanceof BranchSaveAuthError) throw cause;
    throw new Error('서버 저장 중 오류가 발생했습니다.');
  }
}


export interface BranchImageRow {
  slug: string;
  image_path: string | null;
}

export function branchImagePublicUrl(imagePath: string | null): string | null {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!imagePath || !baseUrl) return null;
  const segments = imagePath.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) return null;
  try {
    return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/branch-images/${segments.map(encodeURIComponent).join('/')}`;
  } catch { return null; }
}

export function uploadBranchImage(slug: string, file: File, authorization: BranchSaveAuthorization): Promise<BranchImageRow> {
  const body = new FormData();
  body.append('slug', slug);
  body.append('file', file);
  return requestBranchImage(slug, 'POST', body, authorization);
}

export function deleteBranchImage(slug: string, authorization: BranchSaveAuthorization): Promise<BranchImageRow> {
  return requestBranchImage(slug, 'DELETE', JSON.stringify({ slug }), authorization);
}

async function requestBranchImage(
  slug: string,
  method: 'POST' | 'DELETE',
  body: FormData | string,
  { accessToken, adminSessionId }: BranchSaveAuthorization
): Promise<BranchImageRow> {
  if (!accessToken || !adminSessionId) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/branch-image`, {
      method,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        'x-admin-session-id': adminSessionId,
        ...(method === 'DELETE' ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
    });
    if (response.status === 401) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
    if (response.status === 403) throw new BranchSaveAuthError('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
    if (!response.ok) throw new Error('사진 처리 실패');
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('slug' in result) || result.slug !== slug ||
      !('image_path' in result) || (typeof result.image_path !== 'string' && result.image_path !== null) ||
      (method === 'POST' && !result.image_path) || (method === 'DELETE' && result.image_path !== null)) {
      throw new Error('사진 응답 오류');
    }
    return { slug, image_path: result.image_path };
  } catch (cause) {
    if (cause instanceof BranchSaveAuthError) throw cause;
    throw new Error('사진 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}
