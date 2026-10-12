export const CONSULTATION_IDS = ['default', 'employment-support', 'job-leap', 'future-experience', 'field-training', 'smartcare'] as const;
export type ConsultationId = typeof CONSULTATION_IDS[number];
export type ConsultationSettings = Record<ConsultationId, string>;
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function validFormUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return false;
  if (!/^https:\/\/(?:docs\.google\.com\/forms\/d\/[A-Za-z0-9_/-]+|forms\.gle\/[A-Za-z0-9_-]+\/?)(?:\?[^#]*)?$/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash &&
      ((url.hostname === 'docs.google.com' && /^\/forms\/d\/[A-Za-z0-9_/-]+$/.test(url.pathname)) ||
       (url.hostname === 'forms.gle' && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))) &&
      [...url.searchParams.keys()].every(key => key === 'usp' || key === 'embedded' || key === 'pli' || /^entry\.\d+$/.test(key));
  } catch { return false; }
}
export function validateSettings(value: unknown): ConsultationSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).length !== CONSULTATION_IDS.length || Object.keys(value).some(key => !(CONSULTATION_IDS as readonly string[]).includes(key))) throw new HttpError(400, 'Invalid settings');
  const result = {} as ConsultationSettings;
  for (const id of CONSULTATION_IDS) {
    const input = (value as Record<string, unknown>)[id];
    if (typeof input !== 'string') throw new HttpError(400, 'Invalid URL');
    const url = input.trim();
    if (!(id !== 'default' && url === '') && !validFormUrl(url)) throw new HttpError(400, 'Invalid Google Forms URL');
    result[id] = url;
  }
  return result;
}
