import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError, validateSettings } from './validation.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-admin-session-id', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
async function authorize(db: SupabaseClient, request: Request, now: () => number) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!bearer) throw new HttpError(401, "Unauthorized");
  const { data: auth, error: authError } = await db.auth.getUser(bearer[1]);
  if (authError || !auth?.user) throw new HttpError(401, "Unauthorized");
  const { data: admin, error: adminError } = await db.from("branch_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (adminError) throw new HttpError(500, "Authorization check failed");
  if (!admin || admin.user_id !== auth.user.id) throw new HttpError(403, "Forbidden");

  const sessionId = request.headers.get("x-admin-session-id") ?? "";
  if (!uuid.test(sessionId)) throw new HttpError(401, "Unauthorized");
  const { data: session, error: sessionError } = await db.from("admin_sessions")
    .select("id,user_id,created_at,expires_at,revoked_at").eq("id", sessionId).eq("user_id", auth.user.id).maybeSingle();
  if (sessionError) throw new HttpError(500, "Authorization check failed");
  const created = Date.parse(session?.created_at);
  const expires = Date.parse(session?.expires_at);
  if (!session || session.id !== sessionId || session.user_id !== auth.user.id || session.revoked_at ||
    !Number.isFinite(created) || !Number.isFinite(expires) || expires <= created || expires - created > 2 * 60 * 60 * 1000 || expires <= now()) throw new HttpError(401, "Unauthorized");
  return { userId: auth.user.id as string, expires };
}


export function createHandler(createDatabase: () => SupabaseClient, now: () => number = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!['GET', 'PATCH'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
    try {
      if (new URL(request.url).search) throw new HttpError(400, 'Invalid query');
      const db = createDatabase();
      if (request.method === 'GET') {
        const { data, error } = await db.from('consultation_settings').select('urls').eq('id', 'consultation').maybeSingle();
        if (error) throw new HttpError(500, 'Settings lookup failed');
        // Public response contains only the six URLs. Audit columns stay private.
        return reply({ settings: data?.urls ?? null });
      }
      const { userId, expires } = await authorize(db, request, now);
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw new HttpError(400, 'Invalid content type');
      const reader = request.body?.getReader();
      if (!reader) throw new HttpError(400, 'Missing body');
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 20000) { await reader.cancel(); throw new HttpError(413, 'Request too large'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const raw = new TextDecoder().decode(bytes);
      let body;
      try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid JSON'); }
      if (!body || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'settings')) throw new HttpError(400, 'Invalid request');
      const urls = validateSettings(body.settings);
      const writeTime = now();
      if (expires <= writeTime) throw new HttpError(401, 'Unauthorized');
      // One row contains all six values: one UPDATE, one atomic commit, no partial save.
      const { data, error } = await db.from('consultation_settings').update({ urls, updated_at: new Date(writeTime).toISOString(), updated_by: userId }).eq('id', 'consultation').select('urls').maybeSingle();
      if (error) throw new HttpError(500, 'Settings update failed');
      if (!data) throw new HttpError(409, 'Settings migration required');
      return reply({ settings: data.urls });
    } catch (error) {
      return error instanceof HttpError ? reply({ error: error.message }, error.status) : reply({ error: 'Service unavailable' }, 500);
    }
  };
}
