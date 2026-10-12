import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_BRANCHES, BRANCH_REGIONS, type BranchMap } from './branches';
import type { BranchDirectoryRow } from './branchDirectory';

export type PublicBranchStatus = 'loading' | 'ready' | 'error';

// Public membership must come from a fresh server response. The old shared
// cache is invalidated, never migrated into a public or administrator snapshot.
export function discardLegacyBranchCache(storage: Pick<Storage, 'removeItem'>) {
  try { storage.removeItem('jmcareer_demo_branches'); } catch { /* storage is optional */ }
}

export function publicBranchesFromResponse(value: unknown): BranchMap {
  if (!Array.isArray(value)) throw new Error('Invalid branch response');
  const branches: BranchMap = {};
  const seen = new Set<string>();
  const inRange = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('Invalid branch response');
    const row = item as BranchDirectoryRow;
    if (typeof row.slug !== 'string' || !ADMIN_BRANCHES.includes(row.slug) || seen.has(row.slug) ||
      !['phone', 'address', 'map_url', 'hours'].every(key => typeof (item as Record<string, unknown>)[key] === 'string') ||
      !BRANCH_REGIONS.includes(row.region) || typeof row.published !== 'boolean' ||
      !Array.isArray(row.program_ids) || !row.program_ids.every(id => typeof id === 'string') ||
      ![row.image_path, row.image_path_2].every(path => path === null || typeof path === 'string') ||
      ![row.image_zoom, row.image_2_zoom].every(zoom => inRange(zoom, 1, 3)) ||
      ![row.image_position_x, row.image_position_y, row.image_2_position_x, row.image_2_position_y]
        .every(position => inRange(position, 0, 100))) throw new Error('Invalid branch response');
    seen.add(row.slug);
    if (!row.published) continue;
    branches[row.slug] = {
      slug: row.slug, phone: row.phone, address: row.address, mapUrl: row.map_url,
      contactManagerName: '', contactManagerEmail: '',
      imagePath: row.image_path, imagePath2: row.image_path_2,
      imageZoom: row.image_zoom, imagePositionX: row.image_position_x, imagePositionY: row.image_position_y,
      image2Zoom: row.image_2_zoom, image2PositionX: row.image_2_position_x, image2PositionY: row.image_2_position_y,
      region: row.region, hours: row.hours, published: true, programIds: [...row.program_ids],
    };
  }
  return branches;
}

export function usePublicBranchDirectory(url: string) {
  const [branches, setBranches] = useState<BranchMap>({});
  const [status, setStatus] = useState<PublicBranchStatus>('loading');
  const request = useRef<{ generation: number; controller?: AbortController }>({ generation: 0 });
  const refresh = useCallback(async () => {
    request.current.controller?.abort();
    const generation = ++request.current.generation;
    const controller = new AbortController();
    request.current.controller = controller;
    setBranches({});
    setStatus('loading');
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Branch lookup failed');
      const next = publicBranchesFromResponse(await response.json());
      if (generation !== request.current.generation) return;
      setBranches(next);
      setStatus('ready');
    } catch {
      if (generation !== request.current.generation) return;
      setBranches({});
      setStatus('error');
    } finally { clearTimeout(timeout); }
  }, [url]);
  useEffect(() => {
    try { discardLegacyBranchCache(localStorage); } catch { /* browser storage may be unavailable */ }
    void refresh();
    return () => { ++request.current.generation; request.current.controller?.abort(); };
  }, [refresh]);
  return { branches, status, refresh };
}
