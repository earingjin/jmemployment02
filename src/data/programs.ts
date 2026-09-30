// 취업지원 프로그램 데이터 원본
// - PROGRAMS: 원본 commonData.programs + PROGRAM_DETAILS 를 프로그램 단위로 합친 것
//   (GNB 메뉴, 프로그램 상세 모달, 기업 지원금 화면이 모두 이 배열을 사용)
// - PROGRAM_CARDS: 홈 "2026 핵심 취업지원 프로그램" 카드 문구
//   원본은 정적 HTML 문구를 applyProgramCardCopy()가 덮어썼으므로, 실제로 화면에 보이던 최종 문구(applyProgramCardCopy 값)를 원본으로 삼았다.

export interface SeekerBenefit {
  kind: string;
  target: string;
  big: string;
  sub: string;
  desc: string;
}

export interface EmployerBenefit {
  target: string;
  amount: string;
  desc: string;
}

// 상세 모달 하단 안내 박스 (원본 PROGRAM_DETAILS HTML을 구조화)
export interface ProgramDetailBlock {
  heading: string;
  headingColor: string;
  background: string;
  border?: string;
  marginBottom?: boolean;
  lines: string[];
}

export interface Program {
  id: string;
  label: string;
  seeker: SeekerBenefit | null;
  employer: EmployerBenefit | null;
  detail: ProgramDetailBlock[];
}

export const PROGRAMS: Program[] = [
  { id: "employment-support", label: "국민취업지원제도",
    seeker: { kind: "구직촉진수당", target: "15~69세 구직자", big: "월 60만원", sub: "총 최대 510만원", desc: "구직촉진수당 월 60만원 × 최대 6개월(360만원)에 취업성공수당 최대 150만원을 더해 총 최대 510만원을 지원합니다." },
    employer: null,
    detail: [
      { heading: "Ⅰ 유형 (구직촉진수당)", headingColor: "#1E50FF", background: "#F0F5FF", border: "1px solid #D4E2FF", marginBottom: true,
        lines: ["구직촉진수당 월 60만원 × 최대 6개월 (최대 360만원)", "+ 부양가족 1인당 10만원씩 월 최대 40만원 추가", "+ 취업 후 1년 근속 시 취업성공수당 최대 150만원 추가"] },
      { heading: "Ⅱ 유형 (취업활동비용)", headingColor: "var(--text-primary)", background: "#F5F5F4",
        lines: ["직업훈련 참여 시 훈련수당 월 최대 28.4만원 + 취업역량평가 및 집중 취업알선"] }
    ] },
  { id: "job-leap", label: "청년 일자리도약장려금",
    seeker: { kind: "근속 인센티브", target: "비수도권 기업 취업 청년", big: "최대 720만원", sub: "2년간 분할 지급", desc: "비수도권 기업에 정규직으로 취업해 계속 근무하면, 근속 기간에 따라 청년 본인에게 인센티브를 나눠 지급합니다." },
    employer: { target: "취업애로청년을 정규직으로 채용한 중소기업", amount: "최대 720만원", desc: "만 15~34세 취업애로청년을 정규직으로 신규 채용하고 고용을 유지하면 인건비를 지원합니다." },
    detail: [
      { heading: "청년 근속 인센티브 최대 720만원", headingColor: "#854D0E", background: "#F0F5FF", border: "1px solid #D4E2FF", marginBottom: true,
        lines: ["6개월 근속 시 360만원, 12개월 근속 시 180만원, 24개월 근속 시 180만원을 분할 지급합니다."] }
    ] },
  { id: "future-experience", label: "미래내일 일경험",
    seeker: { kind: "참여수당", target: "만 15~34세 미취업 청년", big: "월 150만원", sub: "인턴 기간 동안", desc: "기업에서 인턴으로 일하며 참여수당을 받고, 직무 경험을 이력서에 완성할 수 있습니다." },
    employer: { target: "청년에게 일경험을 제공하는 기업·기관", amount: "최대 3,700만원", desc: "청년 일경험 프로그램을 운영하는 기업에 운영비와 참여 청년 수당을 전액 지원합니다." },
    detail: [
      { heading: "청년 인턴형 직무 경험", headingColor: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: true,
        lines: ["만 15~34세 청년이 실제 우수 기업에서 실무를 수행하며, 매월 150만원의 참여수당을 지원받습니다."] }
    ] },
  { id: "field-training", label: "시니어인턴십",
    seeker: { kind: "인턴 급여", target: "만 60세 이상", big: "월 215만원+", sub: "인턴 급여 · 계속고용 연계", desc: "기업 인턴으로 일하며 급여를 받고, 인턴 후 계속고용으로 연결됩니다." },
    employer: { target: "만 60세 이상을 인턴으로 채용하는 기업", amount: "최대 550만원", desc: "인턴지원금 120만원 + 채용지원금 150만원 + 장기취업유지지원금 280만원을 지원합니다." },
    detail: [
      { heading: "시니어 참여자 급여 + 기업지원금 최대 550만원", headingColor: "#9A3412", background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: true,
        lines: ["만 60세 이상 구직자의 안정적인 일자리와 기업의 고용부담 완화를 함께 지원합니다."] }
    ] }
];

export const findProgram = (id: string) => PROGRAMS.find(p => p.id === id);

export type ProgramCardVariant = 'pink' | 'green' | 'yellow' | 'peach';

export interface ProgramCard {
  variant: ProgramCardVariant;
  // 카드 클릭 시 여는 상세 모달의 프로그램 id (원본 onclick 값 그대로)
  // 주의: 원본에서 2·3번째 카드는 표시 문구와 onclick 대상이 서로 엇갈려 있다. 1단계에서는 그대로 보존한다.
  openProgramId: string;
  category: string;
  title: string;
  description: string;
  amount: string;
  // 원본 정적 HTML에 남아 있으나 CSS(display:none)로 숨겨진 배지 문구
  hiddenBadge: string;
}

export const PROGRAM_CARDS: ProgramCard[] = [
  { variant: 'pink', openProgramId: 'employment-support', hiddenBadge: '만 15~69세',
    category: '구직자 · 저소득층', title: '국민취업지원제도',
    description: '취업지원과 생계비를 함께 지원하는 한국형 실업부조', amount: '구직촉진수당 월 최대 60만원' },
  { variant: 'green', openProgramId: 'future-experience', hiddenBadge: '만 15~34세',
    category: '청년 · 기업', title: '청년일자리도약장려금',
    description: '청년 정규직 채용 기업에 인건비, 비수도권 근속 청년엔 인센티브', amount: '청년 개인 최대 720만원' },
  { variant: 'yellow', openProgramId: 'job-leap', hiddenBadge: '비수도권 정규직',
    category: '미취업 청년', title: '미래내일 일경험',
    description: '직무교육과 우수기업 인턴십으로 취업 역량 강화', amount: '8주 참여수당 최대 450만원' },
  // 네 번째 카드: description은 체크리스트 항목, amount는 '기업 지원금 안내' 버튼 문구로 표시된다(원본 동작).
  { variant: 'peach', openProgramId: 'field-training', hiddenBadge: '만 60세 이상 & 기업',
    category: '만 60세 이상', title: '시니어인턴십',
    description: '고령자 채용 기업에 인건비 지원, 시니어 재취업 촉진', amount: '기업 지원 최대 550만원' }
];
