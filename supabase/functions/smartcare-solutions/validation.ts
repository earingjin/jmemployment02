// Independent copy of the employment-programs validation rules so neither function's deployment affects the other.
export const SOLUTION_IDS = ["burkman", "coverletter", "interview", "aptitude"] as const;
export type SolutionId = typeof SOLUTION_IDS[number];
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Rule = { max: number; array?: boolean; count?: number };
export const SOLUTION_RULES: Record<string, Rule> = {
  stage: { max: 30 }, title: { max: 60 }, description: { max: 500 },
  details: { max: 200, array: true, count: 10 },
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function solutionId(value: unknown): SolutionId {
  if (typeof value !== "string" || !(SOLUTION_IDS as readonly string[]).includes(value)) throw new HttpError(400, "Invalid solution ID");
  return value as SolutionId;
}

function text(value: unknown, rule: Rule): string {
  if (typeof value !== "string" || !value.trim() || value.length > rule.max ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || /```|\b(?:javascript|vbscript|data)\s*:/i.test(value)) {
    throw new HttpError(400, "Invalid content field");
  }
  return value;
}

export interface ValidPatch { solutionId: SolutionId; patch: Record<string, string | string[]> }
// Only content fields are editable. id/display_order/audit fields and service add/delete/reorder are rejected.
export function validatePatch(value: unknown): ValidPatch {
  if (!isRecord(value) || Object.keys(value).some(key => key !== "solution_id" && key !== "patch")) throw new HttpError(400, "Invalid request");
  const id = solutionId(value.solution_id);
  if (!isRecord(value.patch) || !Object.keys(value.patch).length) throw new HttpError(400, "Empty or invalid patch");
  const patch: ValidPatch["patch"] = Object.create(null);
  for (const [field, input] of Object.entries(value.patch)) {
    if (!Object.hasOwn(SOLUTION_RULES, field)) throw new HttpError(400, "Field cannot be modified");
    const rule = SOLUTION_RULES[field];
    if (rule.array) {
      if (!Array.isArray(input) || input.length < 1 || input.length > rule.count!) throw new HttpError(400, "Invalid content array");
      const items = input.map(item => text(item, rule));
      if (new Set(items).size !== items.length) throw new HttpError(400, "Duplicate detail item");
      patch[field] = items;
    } else { patch[field] = text(input, rule); }
  }
  return { solutionId: id, patch };
}

export async function readPatchBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new HttpError(415, "JSON required");
  const max = 16 * 1024;
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new HttpError(413, "Request too large");
  if (!request.body) throw new HttpError(400, "Invalid JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new HttpError(413, "Request too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new HttpError(400, "Invalid JSON"); }
}
