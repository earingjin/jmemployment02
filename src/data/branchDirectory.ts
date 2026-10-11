import type { Branch } from './branches';

export type BranchImageSlot = 1 | 2;
export interface BranchImageSettings { zoom: number; positionX: number; positionY: number; }
export interface BranchImageFields {
  image_path: string | null;
  image_path_2: string | null;
  image_zoom: number;
  image_position_x: number;
  image_position_y: number;
  image_2_zoom: number;
  image_2_position_x: number;
  image_2_position_y: number;
}

function validImageFields(value: unknown): value is BranchImageFields {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const inRange = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  return (typeof row.image_path === 'string' || row.image_path === null) &&
    (typeof row.image_path_2 === 'string' || row.image_path_2 === null) &&
    inRange(row.image_zoom, 1, 3) && inRange(row.image_2_zoom, 1, 3) &&
    [row.image_position_x, row.image_position_y, row.image_2_position_x, row.image_2_position_y].every(v => inRange(v, 0, 100));
}

export interface BranchDirectoryRow extends BranchImageFields {
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
      !validImageFields(saved) ||
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


export interface BranchImageRow extends BranchImageFields {
  slug: string;
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

export function uploadBranchImage(slug: string, slot: BranchImageSlot, file: File, authorization: BranchSaveAuthorization): Promise<BranchImageRow> {
  const body = new FormData();
  body.append('slug', slug);
  body.append('slot', String(slot));
  body.append('file', file);
  return requestBranchImage(slug, slot, 'POST', body, authorization);
}

export function deleteBranchImage(slug: string, slot: BranchImageSlot, authorization: BranchSaveAuthorization): Promise<BranchImageRow> {
  return requestBranchImage(slug, slot, 'DELETE', JSON.stringify({ slug, slot }), authorization);
}

export function saveBranchImageSettings(slug: string, slot: BranchImageSlot, settings: BranchImageSettings, authorization: BranchSaveAuthorization): Promise<BranchImageRow> {
  if (!Number.isFinite(settings.zoom) || settings.zoom < 1 || settings.zoom > 3 ||
    ![settings.positionX, settings.positionY].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) {
    throw new Error('확대율은 1~3배, 사진 위치는 0~100 사이여야 합니다.');
  }
  return requestBranchImage(slug, slot, 'PATCH', JSON.stringify({ slug, slot, zoom: settings.zoom, position_x: settings.positionX, position_y: settings.positionY }), authorization);
}

async function requestBranchImage(
  slug: string,
  slot: BranchImageSlot,
  method: 'POST' | 'DELETE' | 'PATCH',
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
        ...(method !== 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
    });
    if (response.status === 401) throw new BranchSaveAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
    if (response.status === 403) throw new BranchSaveAuthError('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
    if (!response.ok) throw new Error('사진 처리 실패');
    const result: unknown = await response.json();
    if (!validImageFields(result) || !('slug' in result) || result.slug !== slug ||
      (method === 'POST' && !(slot === 1 ? result.image_path : result.image_path_2)) ||
      (method === 'DELETE' && (slot === 1 ? result.image_path : result.image_path_2) !== null)) {
      throw new Error('사진 응답 오류');
    }
    return { slug, image_path: result.image_path, image_path_2: result.image_path_2,
      image_zoom: result.image_zoom, image_position_x: result.image_position_x, image_position_y: result.image_position_y,
      image_2_zoom: result.image_2_zoom, image_2_position_x: result.image_2_position_x, image_2_position_y: result.image_2_position_y };

  } catch (cause) {
    if (cause instanceof BranchSaveAuthError) throw cause;
    throw new Error('사진 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}
