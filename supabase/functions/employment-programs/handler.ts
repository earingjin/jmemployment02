import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, PROGRAM_IDS, programId, readPatchBody, validatePatch, type Target } from "./validation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-admin-session-id",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const programFields = "id,label,seeker_kind,seeker_target,seeker_big,seeker_sub,seeker_desc,employer_target,employer_amount,employer_desc,effective_date,source_name,source_url,updated_at";
const sectionFields = "program_id,section_key,title,lines,display_order,variant,updated_at";
const benefitFields = "program_id,benefit_key,type_label,item_names,sub_label,headline,hero_note,hero_type,hero_bottom,lines,display_order,updated_at";
const targets: Record<Target, { table: string; id: string; fields: string }> = {
  program: { table: "employment_programs", id: "id", fields: programFields },
  section: { table: "employment_program_sections", id: "program_id", fields: sectionFields },
  "benefit-group": { table: "employment_benefit_groups", id: "program_id", fields: benefitFields },
} as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

// Client creation is injected for local tests. Production uses server secrets only.
export function createHandler(createDatabase: () => SupabaseClient, now: () => number = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET" && request.method !== "PATCH") return reply({ error: "Method not allowed" }, 405);
    try {
      const db = createDatabase();
      if (request.method === "GET") {
        const params = new URL(request.url).searchParams;
        if ([...params.keys()].some(key => key !== "program_id") || params.getAll("program_id").length > 1) throw new HttpError(400, "Invalid query");
        const ids = params.has("program_id") ? [programId(params.get("program_id"))] : [...PROGRAM_IDS];
        const [programs, sections, benefits] = await Promise.all([
          db.from("employment_programs").select(programFields).in("id", ids).limit(5),
          db.from("employment_program_sections").select(sectionFields).in("program_id", ids).order("program_id").order("display_order").limit(501),
          db.from("employment_benefit_groups").select(benefitFields).in("program_id", ids).order("program_id").order("display_order").limit(501),
        ]);
        if (programs.error || sections.error || benefits.error || !programs.data || !sections.data || !benefits.data ||
          sections.data.length > 500 || benefits.data.length > 500) throw new HttpError(500, "Content lookup failed");
        return reply({ programs: programs.data, sections: sections.data, benefit_groups: benefits.data });
      }

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

      if (new URL(request.url).search) throw new HttpError(400, "Invalid query");
      const body = validatePatch(await readPatchBody(request));
      const target = targets[body.target];
      // Only UPDATE existing rows, scoped by the allowed program and immutable content key.
      // Audit fields never come from the request. One row/update avoids partial multi-table saves.
      const writeTime = now();
      if (expires <= writeTime) throw new HttpError(401, "Unauthorized");
      let update = db.from(target.table).update({ ...body.patch, updated_at: new Date(writeTime).toISOString(), updated_by: auth.user.id }).eq(target.id, body.programId);
      if (body.target === "section") update = update.eq("section_key", body.key);
      if (body.target === "benefit-group") update = update.eq("benefit_key", body.key);
      const { data, error } = await update.select(target.fields).maybeSingle();
      if (error) throw new HttpError(500, "Content update failed");
      if (!data) throw new HttpError(404, "Content not found");
      return reply({ target: body.target, data });
    } catch (error) {
      if (error instanceof HttpError) return reply({ error: error.message }, error.status);
      return reply({ error: "Service unavailable" }, 500);
    }
  };
}
