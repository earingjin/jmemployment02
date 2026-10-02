// 상담 신청 URL의 단일 설정값. 향후 관리자 설정 연동 시 이 설정을 교체한다.
export const CONSULTATION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeLKsOC3okBg0q4SXxxQnLc_W0eJtOFY20I5K_E0NjFhVs6rw/viewform?usp=dialog';

export function openConsultationForm() {
  window.open(CONSULTATION_FORM_URL, '_blank', 'noopener,noreferrer');
}
