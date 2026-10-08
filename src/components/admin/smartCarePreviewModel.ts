import type { SmartSolution } from '../../data/content';
import type { ContentValue, ContentValues } from '../../data/employmentPrograms';
import { SMARTCARE_FIELDS, smartCareFieldError, toSmartSolutions, type SmartCareId, type SmartCareRow } from '../../data/smartCare';

export type SmartCarePreviewScreen = 'home' | 'detail' | 'modal';
export const SMARTCARE_PREVIEW_SCREENS: { id: SmartCarePreviewScreen; label: string }[] = [
  { id: 'home', label: '홈 SmartCare 섹션' },
  { id: 'detail', label: 'SmartCare 상세페이지' },
  { id: 'modal', label: '서비스 안내 모달' },
];
// Where each editable field is shown on the real customer components.
export const SMARTCARE_FIELD_SCREENS: Record<string, SmartCarePreviewScreen[]> = {
  stage: ['home', 'detail'], title: ['home', 'detail', 'modal'],
  description: ['detail', 'modal'], details: ['detail', 'modal'],
};
export function smartCareFieldNotice(name: string): string {
  const screens = SMARTCARE_FIELD_SCREENS[name] ?? [];
  return '고객 반영 위치: ' + SMARTCARE_PREVIEW_SCREENS.filter(screen => screens.includes(screen.id)).map(screen => screen.label).join(' · ');
}
export interface SmartCarePreviewChange {
  solutionId: SmartCareId; field: string; label: string;
  before: ContentValue; after: ContentValue; screens: SmartCarePreviewScreen[];
  // Detail items whose position on screen is exact (changed or added at that index).
  changedIndexes: number[]; removedItems: string[];
}
export interface SmartCarePreviewData {
  selectedId: SmartCareId; solutions: SmartSolution[] | null; changes: SmartCarePreviewChange[]; error: string;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Drafts are applied to a copy; the saved rows and the editor state are never modified.
export function buildSmartCarePreview(rows: readonly SmartCareRow[], selectedId: SmartCareId, draft: ContentValues | undefined): SmartCarePreviewData {
  const base = rows.find(row => row.id === selectedId);
  const changes: SmartCarePreviewChange[] = [];
  if (base && draft) {
    for (const field of SMARTCARE_FIELDS) {
      if (!Object.hasOwn(draft, field.name)) continue;
      const before = base[field.name as keyof SmartCareRow] as ContentValue;
      const after = draft[field.name];
      if (same(before, after)) continue;
      const beforeItems = Array.isArray(before) ? before : [];
      const afterItems = Array.isArray(after) ? after : [];
      changes.push({ solutionId: selectedId, field: field.name, label: field.label, before, after,
        screens: SMARTCARE_FIELD_SCREENS[field.name],
        changedIndexes: field.array ? afterItems.flatMap((item, index) => item !== beforeItems[index] ? [index] : []) : [],
        removedItems: field.array ? beforeItems.filter(item => !afterItems.includes(item)) : [] });
    }
  }
  const invalid = changes.map(change => smartCareFieldError(change.field, change.after)).find(Boolean) ?? '';
  if (invalid) return { selectedId, solutions: null, changes, error: invalid };
  const merged = rows.map(row => row.id === selectedId && draft ? { ...row, ...draft } as SmartCareRow : row);
  return { selectedId, solutions: toSmartSolutions(merged), changes, error: '' };
}
export function smartCareChangeSelectors(change: SmartCarePreviewChange, screen: SmartCarePreviewScreen): string[] {
  if (!change.screens.includes(screen)) return [];
  const scope = `[data-smartcare-id="${change.solutionId}"]`;
  if (change.field !== 'details') return [`${scope} [data-smartcare-field="${change.field}"]`];
  return change.changedIndexes.map(index => `${scope} [data-smartcare-field="details"][data-smartcare-index="${index}"]`);
}
export function affectedSmartCareScreens(changes: readonly SmartCarePreviewChange[]): SmartCarePreviewScreen[] {
  return SMARTCARE_PREVIEW_SCREENS.map(screen => screen.id).filter(screen => changes.some(change => change.screens.includes(screen)));
}
export function smartCarePreviewTabAtKey(screens: SmartCarePreviewScreen[], current: SmartCarePreviewScreen, key: string): SmartCarePreviewScreen | undefined {
  const index = screens.indexOf(current);
  if (!screens.length) return;
  if (key === 'Home') return screens[0];
  if (key === 'End') return screens[screens.length - 1];
  if (key === 'ArrowRight') return screens[(index + 1) % screens.length];
  if (key === 'ArrowLeft') return screens[(index - 1 + screens.length) % screens.length];
}
