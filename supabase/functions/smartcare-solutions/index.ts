import { createClient } from "@supabase/supabase-js";
import { createHandler } from "./handler.ts";
import { HttpError } from "./validation.ts";

// Local declaration keeps the frontend TS checker isolated from Deno runtime types.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): unknown;
};

Deno.serve(createHandler(() => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new HttpError(503, "Server not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}));
