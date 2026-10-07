export const PROGRAM_IDS = ["employment-support", "job-leap", "future-experience", "field-training"] as const;
export type ProgramId = typeof PROGRAM_IDS[number];
export type Target = "program" | "section" | "benefit-group";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Rule = { max: number; nullable?: boolean; array?: boolean; count?: number; url?: boolean; date?: boolean };
const programRules: Record<string, Rule> = {
  label: { max: 100 },
  seeker_kind: { max: 300, nullable: true }, seeker_target: { max: 300, nullable: true },
  seeker_big: { max: 300, nullable: true }, seeker_sub: { max: 300, nullable: true },
  seeker_desc: { max: 2000, nullable: true }, employer_target: { max: 300, nullable: true },
  employer_amount: { max: 300, nullable: true }, employer_desc: { max: 2000, nullable: true },
  effective_date: { max: 10, nullable: true, date: true },
  source_name: { max: 200, nullable: true }, source_url: { max: 2000, nullable: true, url: true },
};
const sectionRules: Record<string, Rule> = { title: { max: 150 }, lines: { max: 1000, array: true, count: 30 } };
const benefitRules: Record<string, Rule> = {
  type_label: { max: 100 }, item_names: { max: 150, array: true, count: 10 },
  sub_label: { max: 300, nullable: true }, headline: { max: 300, nullable: true },
  hero_note: { max: 500, nullable: true }, hero_type: { max: 150 }, hero_bottom: { max: 300 },
  lines: { max: 1000, array: true, count: 30 },
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function programId(value: unknown): ProgramId {
  if (typeof value !== "string" || !(PROGRAM_IDS as readonly string[]).includes(value)) throw new HttpError(400, "Invalid program ID");
  return value as ProgramId;
}

function text(value: unknown, rule: Rule): string {
  if (typeof value !== "string" || !value.trim() || value.length > rule.max ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || /```|\b(?:javascript|vbscript|data)\s*:/i.test(value)) {
    throw new HttpError(400, "Invalid content field");
  }
  if (rule.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-") || !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
      new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value) throw new HttpError(400, "Invalid effective date");
  }
  if (rule.url) {
    let url: URL;
    try { url = new URL(value); } catch { throw new HttpError(400, "Invalid source URL"); }
    if (!/^https:\/\//i.test(value) || /\s|\\/.test(value) || url.protocol !== "https:" ||
      !url.hostname || url.username || url.password || (url.port && url.port !== "443")) throw new HttpError(400, "Invalid source URL");
  }
  return value;
}

export interface ValidPatch { programId: ProgramId; target: Target; key?: string; patch: Record<string, string | string[] | null> }
export function validatePatch(value: unknown): ValidPatch {
  if (!isRecord(value)) throw new HttpError(400, "Invalid request");
  const id = programId(value.program_id);
  if (value.target !== "program" && value.target !== "section" && value.target !== "benefit-group") throw new HttpError(400, "Invalid target");
  const target = value.target;
  const keyField = target === "section" ? "section_key" : target === "benefit-group" ? "benefit_key" : null;
  const allowed = ["program_id", "target", "patch", ...(keyField ? [keyField] : [])];
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new HttpError(400, "Unknown request field");
  let key: string | undefined;
  if (keyField) {
    if (typeof value[keyField] !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value[keyField])) throw new HttpError(400, "Invalid content key");
    key = value[keyField];
  }
  if (!isRecord(value.patch) || !Object.keys(value.patch).length) throw new HttpError(400, "Empty or invalid patch");
  const rules = target === "program" ? programRules : target === "section" ? sectionRules : benefitRules;
  const patch: ValidPatch["patch"] = Object.create(null);
  for (const [field, input] of Object.entries(value.patch)) {
    if (!Object.hasOwn(rules, field)) throw new HttpError(400, "Field cannot be modified");
    const rule = rules[field];
    if (input === null && rule.nullable) { patch[field] = null; continue; }
    if (rule.array) {
      if (!Array.isArray(input) || input.length < 1 || input.length > rule.count!) throw new HttpError(400, "Invalid content array");
      patch[field] = input.map(line => text(line, rule));
    } else { patch[field] = text(input, rule); }
  }
  return { programId: id, target, key, patch };
}

export async function readPatchBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new HttpError(415, "JSON required");
  const max = 64 * 1024;
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
