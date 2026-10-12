import { BranchSaveAuthError, type BranchSaveAuthorization } from './branchDirectory';
import { CONSULTATION_IDS, validFormUrl, validateSettings, type ConsultationId, type ConsultationSettings } from '../../supabase/functions/consultation-settings/validation';
export const CONSULTATION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeLKsOC3okBg0q4SXxxQnLc_W0eJtOFY20I5K_E0NjFhVs6rw/viewform?usp=dialog';
export { CONSULTATION_IDS, validFormUrl, validateSettings };
export type { ConsultationId, ConsultationSettings };
export const initialConsultationSettings = (): ConsultationSettings => Object.fromEntries(CONSULTATION_IDS.map(id => [id, id === 'default' ? CONSULTATION_FORM_URL : ''])) as ConsultationSettings;
export type ConsultationSnapshot = { settings: ConsultationSettings; source: 'saved' | 'missing' | 'error' | 'invalid' };
export function consultationUrl(settings: ConsultationSettings, id: string = 'default'): string {
  const specific = settings[id as ConsultationId];
  return id !== 'default' && validFormUrl(specific) ? specific : validFormUrl(settings.default) ? settings.default : CONSULTATION_FORM_URL;
}
export function createConsultationApi(config: { url: string; key: string }, request: typeof fetch = fetch) {
  const endpoint = () => {
    if (!config.url || !config.key) throw new Error('상담 설정 연결을 확인해주세요.');
    return config.url.replace(/\/$/, '') + '/functions/v1/consultation-settings';
  };
  const parse = (body: unknown): ConsultationSnapshot => {
    if (!body || typeof body !== 'object' || !('settings' in body)) throw new Error('잘못된 상담 설정 응답');
    if (body.settings === null) return { settings: initialConsultationSettings(), source: 'missing' };
    try { return { settings: validateSettings(body.settings), source: 'saved' }; }
    catch { return { settings: initialConsultationSettings(), source: 'invalid' }; }
  };
  return {
    async load(signal?: AbortSignal): Promise<ConsultationSnapshot> {
      const response = await request(endpoint(), { cache: 'no-store', redirect: 'error', signal, headers: { apikey: config.key } });
      if (!response.ok) throw new Error('상담 신청 URL을 조회하지 못했습니다. 다시 시도해주세요.');
      return parse(await response.json());
    },
    async save(settings: ConsultationSettings, authorization: BranchSaveAuthorization): Promise<ConsultationSettings> {
      const values = validateSettings(settings);
      const response = await request(endpoint(), { method: 'PATCH', redirect: 'error', headers: {
        apikey: config.key, 'Content-Type': 'application/json', Authorization: `Bearer ${authorization.accessToken}`, 'x-admin-session-id': authorization.adminSessionId,
      }, body: JSON.stringify({ settings: values }) });
      if (response.status === 401 || response.status === 403) throw new BranchSaveAuthError('관리자 인증을 확인해주세요. 다시 로그인해주세요.');
      if (!response.ok) throw new Error('상담 신청 URL을 저장하지 못했습니다. 기존 설정은 유지됩니다.');
      const result = parse(await response.json());
      if (result.source !== 'saved') throw new Error('저장 응답을 확인하지 못했습니다. 다시 조회해주세요.');
      return result.settings;
    },
  };
}
const api = () => createConsultationApi({ url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY });
export const loadConsultationSettings = (signal?: AbortSignal) => api().load(signal);
export const saveConsultationSettings = (settings: ConsultationSettings, authorization: BranchSaveAuthorization) => api().save(settings, authorization);
export async function loadCustomerConsultation(): Promise<ConsultationSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try { return await loadConsultationSettings(controller.signal); }
  catch { return { settings: initialConsultationSettings(), source: 'error' }; }
  finally { clearTimeout(timeout); }
}
export function openConsultationForm(url = CONSULTATION_FORM_URL) {
  window.open(validFormUrl(url) ? url : CONSULTATION_FORM_URL, '_blank', 'noopener,noreferrer');
}
export function openLoadedConsultation(snapshot: Promise<ConsultationSnapshot>, id = 'default') {
  const tab = window.open('about:blank', '_blank');
  if (!tab) return;
  tab.opener = null;
  // The temporary same-origin blank tab permits a referrer policy before navigation.
  if (tab.document) {
    const meta = tab.document.createElement('meta');
    meta.name = 'referrer'; meta.content = 'no-referrer';
    tab.document.head.appendChild(meta);
  }
  void snapshot.then(value => { if (!tab.closed) tab.location.replace(consultationUrl(value.settings, id)); });
}
