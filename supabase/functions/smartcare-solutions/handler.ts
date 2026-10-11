import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, readPatchBody, SOLUTION_IDS, validatePatch } from "./validation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-admin-session-id",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const solutionFields = "id,display_order,stage,title,description,details,updated_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

// Same three checks as employment-programs PATCH: verified JWT, branch_admins membership, owned unrevoked fixed session.
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

// Client creation is injected for local tests. Production uses server secrets only.
export function createHandler(createDatabase: () => SupabaseClient, now: () => number = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET" && request.method !== "PATCH") return reply({ error: "Method not allowed" }, 405);
    try {
      if (new URL(request.url).search) throw new HttpError(400, "Invalid query");
      const db = createDatabase();
      if (request.method === "GET") {
        const { data, error } = await db.from("smartcare_solutions").select(solutionFields)
          .in("id", [...SOLUTION_IDS]).order("display_order").limit(SOLUTION_IDS.length + 1);
        if (error || !data || data.length !== SOLUTION_IDS.length) throw new HttpError(500, "Content lookup failed");
        return reply({ solutions: data });
      }

      const { userId, expires } = await authorize(db, request, now);
      const body = validatePatch(await readPatchBody(request));
      // Only UPDATE one existing row. Audit fields never come from the request.
      const writeTime = now();
      if (expires <= writeTime) throw new HttpError(401, "Unauthorized");
      const { data, error } = await db.from("smartcare_solutions")
        .update({ ...body.patch, updated_at: new Date(writeTime).toISOString(), updated_by: userId })
        .eq("id", body.solutionId).select(solutionFields).maybeSingle();
      if (error) throw new HttpError(500, "Content update failed");
      if (!data) throw new HttpError(404, "Content not found");
      return reply({ data });
    } catch (error) {
      if (error instanceof HttpError) return reply({ error: error.message }, error.status);
      return reply({ error: "Service unavailable" }, 500);
    }
  };
}
