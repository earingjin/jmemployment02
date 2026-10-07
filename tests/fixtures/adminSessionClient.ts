// Local-only SDK/Edge Function substitute. Never reads live credentials or makes network calls.
import type { FixedAdminSession } from '../../src/lib/supabase';

export class AdminSessionError extends Error {}
const auth = { user: { id: 'fixture-user' }, access_token: 'fixture-access' };
type Listener = (event: string, session: typeof auth | null) => void;
let listener: Listener | null = null;
export const fixture = {
  auth: null as typeof auth | null,
  calls: [] as { method: string; id?: string }[],
  signouts: 0,
  request: async (_method: string, _id?: string): Promise<FixedAdminSession | null> => null,
  reset() { this.auth = null; this.calls = []; this.signouts = 0; listener = null; },
  event(event: string) { listener?.(event, this.auth); },
};
export function getSupabaseAuthClient() {
  return { auth: {
    onAuthStateChange(callback: Listener) { listener = callback; return { data: { subscription: { unsubscribe() { listener = null; } } } }; },
    async getSession() { return { data: { session: fixture.auth }, error: null }; },
    async signOut() { fixture.signouts++; fixture.auth = null; fixture.event('SIGNED_OUT'); },
  } };
}
export async function loginAdmin() { fixture.auth = auth; fixture.event('SIGNED_IN'); }
export async function requestFixedAdminSession(method: string, id?: string) {
  fixture.calls.push({ method, id });
  return fixture.request(method, id);
}
