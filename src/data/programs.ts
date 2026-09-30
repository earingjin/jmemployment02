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

// 국민취업지원제도 수당 체계 (본부장 최종 확인 2026-09-30: "Ⅱ유형은 취업활동비용이고, 참여수당과 참여장려수당을 포함")
// 금액·지급조건은 고용24 국민취업지원제도 공식 안내(work24.go.kr)에서 확인되는 범위만 사용한다.
// 취업활동비용은 참여수당·참여장려수당을 포괄하는 상위 명칭이며, 서로 별개의 병렬 수당이 아니다.
// 취업성공수당은 취업활동비용의 하위 항목이 아닌 별도 수당이며, 모든 참여자가 자동으로 받는 것이 아니므로
// type을 "공통" 대신 지급대상이 제한됨을 알 수 있는 "Ⅰ·Ⅱ유형 일부 대상"으로 표기한다.
// headline: Hero/상세 페이지에서 금액을 우선 인지시키기 위한 대표 숫자. lines에 포함된 값을 그대로 발췌한 것이며 별도로 계산·합산하지 않는다.
// heroNote: Hero 카드용 한 줄 보조문구(세부 조건은 상세 페이지의 lines에서 확인). 새로운 정책 내용이 아니라 lines[1]의 축약 표현이다.
export const BENEFIT_GROUPS = [
  { type: 'Ⅰ유형', items: ['구직촉진수당'], sub: null, headline: '최대 360만원', heroNote: '부양가족 해당 시 추가 지원',
    lines: ['월 60만원 × 6개월 (최대 360만원)', '부양가족(18세 이하·70세 이상·중증장애인) 1인당 10만원 추가 (최대 40만원)'] },
  { type: 'Ⅱ유형', items: ['취업활동비용'], sub: '참여수당 · 참여장려수당', headline: null, heroNote: null,
    lines: ['참여수당: 기본 15만원 + 참여 프로그램에 따라 3~10만원 추가', '참여장려수당: 월 1회 2만원, 최대 5회 (총 10만원)'] },
  { type: 'Ⅰ·Ⅱ유형 일부 대상', items: ['취업성공수당'], sub: null, headline: '최대 150만원', heroNote: null,
    lines: ['6개월 근속 50만원 + 12개월 근속 100만원 (최대 150만원)', 'Ⅰ·Ⅱ유형 참여자 중 중위소득 60% 이하 등 요건 충족자'] }
];

const block = (heading: string, lines: string[], tone: 'blue' | 'gray' = 'gray', last = false): ProgramDetailBlock => tone === 'blue'
  ? { heading, lines, headingColor: "#1E50FF", background: "#F0F5FF", border: "1px solid #D4E2FF", marginBottom: !last }
  : { heading, lines, headingColor: "var(--text-primary)", background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: !last };

// 지원내용·참여자격·신청방법·신청창구·유의사항/제출서류: docs/콘텐츠기준_2026-09-30.html.html 기준
export const PROGRAMS: Program[] = [
  { id: "employment-support", label: "국민취업지원제도",
    seeker: { kind: "구직자·저소득층 대상", target: "만 15~69세 구직자, 유형별 요건 충족자", big: "1유형 · 2유형 · 공통", sub: "", desc: "취업지원서비스와 생계 지원을 함께 제공하는 한국형 실업부조로, 고용보험 사각지대의 저소득 구직자·특고·영세자영업자도 참여할 수 있습니다." },
    employer: null,
    detail: [
      ...BENEFIT_GROUPS.map(g => block(`${g.type} · ${g.items.join(' · ')}${g.sub ? ` (${g.sub})` : ''}`, g.lines, 'blue')),
      block("안내", ["제시 금액은 2026년 기준이며 지침 개정에 따라 변경될 수 있습니다."]),
      block("참여자격", ["만 15~69세 구직자, 유형별 요건 충족자", "중위소득 60% 이하 저소득 구직자 (Ⅰ유형)", "청년(15~34세, 소득 무관)·중장년(35~69세, 중위소득 100% 이하)·특정계층 (Ⅱ유형)"]),
      block("신청방법", ["① 고용24 회원가입 및 구직등록 (work24.go.kr)", "② 수급자격 신청 (온라인 또는 지사 방문)", "③ 수급자격 심사", "④ 상담사와 취업활동계획 수립", "⑤ 계획에 따라 구직활동 수행, 수당 지급"]),
      block("신청 창구", ["제이엠커리어 지사 방문 신청 또는 work24.go.kr 온라인 신청 지원"]),
      block("유의사항", ["소득·취업 사실을 허위로 신청하면 지원금 환수, 재참여 제한 등 불이익이 있습니다.", "취업성공수당은 실제 취업에 성공한 경우에 한해 지급되며, 재직증명서 등 근속 증빙 서류가 필요합니다."], 'gray', true)
    ] },
  { id: "job-leap", label: "청년일자리도약장려금",
    seeker: { kind: "청년 개인 지원 (비수도권 한정)", target: "비수도권 참여기업에서 6개월 이상 근속한 청년", big: "최대 720만원", sub: "", desc: "청년을 정규직 채용한 기업에 인건비를 지원하고, 비수도권 장기근속 청년에게는 개인 인센티브를 지급합니다. 2026년 수도권형·비수도권형으로 개편되었습니다." },
    employer: { target: "만 15~34세 청년을 정규직으로 신규 채용한 기업", amount: "고용유지 기간별 인건비 지원", desc: "6·9·12개월 고용유지 구간별로 순차 지급합니다. 비수도권은 기업·청년 개인 지원금 합산 최대 1,440만원입니다." },
    detail: [
      block("지원내용 및 금액", ["기업 지원 (수도권·비수도권 공통): 6·9·12개월 고용유지 구간별 인건비 순차 지급", "청년 개인 지원 (비수도권 한정): 최대 720만원, 6개월 이상 근속 시 신청 가능", "비수도권 합산 지원: 최대 1,440만원 (기업 + 청년 개인)", "지원 대상 청년 급여: 평균 월급여 450만원 이하, 최저임금 이상, 주 소정근로 28시간 이상", "2026년 개편으로 기존 유형Ⅰ·Ⅱ 구분이 수도권형·비수도권형으로 변경되었습니다."], 'blue'),
      block("참여자격", ["기업: 만 15~34세 청년을 정규직(기간의 정함 없는 근로계약)으로 신규 채용", "기업: 고용보험 가입, 주 소정근로 28시간 이상 보장, 채용 후 최소 6개월 이상 고용유지", "청년: 채용 전 실업 상태에서 신규 취업(이직자 제외)", "청년(수도권): 취업애로청년 요건 등 추가 조건 필요"]),
      block("신청방법", ["[기업] ① 채용 전 고용24에서 관할 운영기관 확인 후 참여신청", "② 운영기관 적격심사 후 지원협약 체결", "③ 정규직 채용 후 근로계약서 등 제출", "④ 6·9·12개월 고용유지 종료 후 2개월 내 지원금 신청", "[청년] 기업 1회차 지원금 지급 후 개인지원 별도 신청(비수도권)"]),
      block("신청 창구", ["제이엠커리어 지사에서 사업 참여신청부터 지원금 신청까지 안내"]),
      block("제출 서류", ["사업 참여신청서, 사업주 확인서, 근로계약서, 임금지급 증빙자료 등"], 'gray', true)
    ] },
  { id: "future-experience", label: "미래내일 일경험",
    seeker: { kind: "인턴형 참여수당", target: "만 15~34세 미취업 청년 (군 복무 이행 시 최대 39세)", big: "8주간 최대 450만원", sub: "", desc: "실무 경력이 부족한 미취업 청년에게 직무교육과 우수기업·공공기관 인턴십 경험을 제공하는 사업으로, 학력·경력과 무관하게 신청할 수 있습니다." },
    employer: null,
    detail: [
      block("지원내용 및 참여수당", ["인턴형 참여수당: 8주간 최대 450만원 (주당 약 35~37.5만원 + 사전교육 수당, 출석률에 따라 감액 가능)", "근무 조건: 주 25시간, 우수기업·공공기관에서 8주간 실무 인턴십", "운영 유형: 인턴형 · 프로젝트형 · 기업탐방형 (경영사무, 광고마케팅, IT 등)", "수료 혜택: 정상 수료 시 고용노동부 명의 수료증 발급", "참여수당 총액과 지급 방식은 공고별로 다를 수 있습니다."], 'blue'),
      block("참여자격", ["만 15~34세 미취업 청년 (군 복무 이행 시 최대 39세)", "학력·경력 무관 지원 가능", "주 30시간 미만 단시간 근로자도 참여 가능", "동일 사업연도 내 최대 2회까지 중복 참여 가능", "국민취업지원제도 참여자는 참여 가능하나 수당 중복 수령 불가"]),
      block("신청방법", ["① 청년일경험 포털(yw.work24.go.kr) 가입", "② 희망 직무·지역·운영기관으로 공고 검색", "③ 자기소개서 작성 및 필요 서류 업로드", "④ 운영기관 안내에 따라 기업 면접", "⑤ 사전교육 및 8주 인턴십 수행 후 수료증 발급"]),
      block("신청 창구", ["제이엠커리어 지사 상담 또는 yw.work24.go.kr 온라인 지원 안내"]),
      block("제출 서류", ["온라인 신청서, 이력서, 자기소개서 등 (단시간 근로자는 근로계약서 추가)"], 'gray', true)
    ] },
  { id: "field-training", label: "시니어인턴십",
    seeker: { kind: "만 60세 이상 구직자", target: "만 60세 이상, 참여신청서 제출 및 사전교육 이수", big: "만 60세 이상", sub: "", desc: "만 60세 이상 고령자를 채용하는 기업에 인건비 일부를 지원해 신규·계속고용을 유도하는 사업으로, 보건복지부·한국노인인력개발원과 연계해 운영합니다." },
    employer: { target: "만 60세 이상 고령자를 채용하는 기업", amount: "최대 550만원", desc: "일반형 기준 인턴지원금(3개월 최대 120만원) + 채용지원금(3개월 최대 150만원) 합산 기준입니다." },
    detail: [
      block("지원내용 및 금액 (일반형)", ["인턴지원금: 3개월 최대 120만원 (입사일부터 3개월, 월 급여의 50% 이내 최대 40만원)", "채용지원금: 3개월 최대 150만원 (인턴 종료 후 6개월 이상 계속고용 시, 월 급여 50% 이내 최대 50만원)", "일반형 합산 지원: 최대 550만원", "장기취업유지형: 18·24개월 각 80만원, 30·36개월 경과 시 각 60만원 추가", "숙련퇴직자가 청년사원 멘토로 참여하는 세대통합형은 1회 300만원 별도 지원"], 'blue'),
      block("참여자격", ["구직자: 만 60세 이상, 참여신청서 제출 및 사전교육 이수", "기업: 4대 사회보험 가입, 근로자 보호 규정 준수 사업장·비영리 단체", "경비원·미화·요양보호사·간병인 등 일부 단순노무직종 제외"]),
      block("신청방법", ["① 노인일자리여기 포털에서 인근 수행기관 검색", "② 수행기관 방문 후 1:1 구직 상담", "③ 경력·건강·자격증을 고려한 수요처(기업) 매칭", "④ 연계 기업 면접 후 근로계약 체결", "⑤ 인턴십 시작 및 수행기관에 서류 제출 후 지원금 신청"]),
      block("신청 창구", ["제이엠커리어 지사 방문 상담 및 수행기관 매칭 지원"]),
      block("제출 서류 (기업)", ["참여신청서, 사업자등록증 사본, 4대보험 사업장 가입내역확인서"], 'gray', true)
    ] }
];

export const findProgram = (id: string) => PROGRAMS.find(p => p.id === id);

export type ProgramCardVariant = 'pink' | 'green' | 'yellow' | 'peach';

export interface ProgramCard {
  variant: ProgramCardVariant;
  // 카드 클릭 시 여는 상세 모달의 프로그램 id (원본 onclick 값 그대로)
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
  { variant: 'green', openProgramId: 'job-leap', hiddenBadge: '만 15~34세',
    category: '청년 · 기업', title: '청년일자리도약장려금',
    description: '청년 정규직 채용 기업에 인건비, 비수도권 근속 청년엔 인센티브', amount: '청년 개인 최대 720만원' },
  { variant: 'yellow', openProgramId: 'future-experience', hiddenBadge: '비수도권 정규직',
    category: '미취업 청년', title: '미래내일 일경험',
    description: '직무교육과 우수기업 인턴십으로 취업 역량 강화', amount: '8주 참여수당 최대 450만원' },
  // 네 번째 카드: description은 체크리스트 항목, amount는 '기업 지원금 안내' 버튼 문구로 표시된다(원본 동작).
  { variant: 'peach', openProgramId: 'field-training', hiddenBadge: '만 60세 이상 & 기업',
    category: '만 60세 이상', title: '시니어인턴십',
    description: '고령자 채용 기업에 인건비 지원, 시니어 재취업 촉진', amount: '기업 지원 최대 550만원' }
];
