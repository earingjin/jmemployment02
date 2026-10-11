import { BENEFIT_GROUPS, PROGRAMS } from './programs';
import { adaptCustomerPrograms, type CustomerProgramData } from './customerProgramAdapter';
import { loadPublicEmploymentPrograms, type PublicEmploymentPrograms } from './publicEmploymentPrograms';

export function getCustomerProgramFallback(): CustomerProgramData {
  return { programs: structuredClone(PROGRAMS), benefitGroups: structuredClone(BENEFIT_GROUPS) };
}
export type CustomerProgramLoadResult = CustomerProgramData & { source: 'api' | 'fallback' };
// Composition only; no customer component imports this module in phase 1.
export async function loadCustomerProgramsWithFallback(
  load: (signal?: AbortSignal) => Promise<PublicEmploymentPrograms> = loadPublicEmploymentPrograms,
  signal?: AbortSignal,
): Promise<CustomerProgramLoadResult> {
  try {
    return { ...adaptCustomerPrograms(await load(signal)), source: 'api' };
  } catch (cause) {
    // Cancellation is caller intent, not an API failure to hide with static content.
    if (signal?.aborted) throw cause;
    return { ...getCustomerProgramFallback(), source: 'fallback' };
  }
}
