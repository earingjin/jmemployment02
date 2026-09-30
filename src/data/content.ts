// 홈 화면 콘텐츠 데이터 원본 (원본 index.html의 commonData / AI_FEATURES / 정적 HTML 통계 이관)

// 지원금 기준 연도 기본값. 관리자 '공통 콘텐츠'에서 현재 브라우저 안에서만 변경된다.
export const DEFAULT_BENEFIT_YEAR = "2026";

// 원본 commonData.benefitNotice. 원본에서도 화면에 렌더링되지 않는다(#pv-benefit-notice는 비어 있는 숨김 요소).
export const BENEFIT_NOTICE = "※ 금액은 2026년 기준 최대 지원액이며, 소득·재산 등 참여 요건에 따라 달라질 수 있습니다.";

export interface Review {
  name: string;
  date: string;
  badge: string;
  title: string;
  excerpt: string;
  full: string;
}

export const REVIEWS: Review[] = [
  { name: "김ㅇㅇ (26세)", date: "2026-01-14", badge: "국민취업지원제도", title: "방향만 바꿨을 뿐인데 서류 통과율이 달라졌습니다", excerpt: "혼자 자소서 붙잡고 있었는데, 상담사님이랑 방향부터 다시 잡으니까 서류 통과율이 확 달라졌어요.", full: "혼자 자소서 붙잡고 있었는데, 상담사님이랑 방향부터 다시 잡으니까 서류 통과율이 확 달라졌어요. 제 강점에 맞는 회사만 골라 지원하니 면접 연락이 오기 시작했습니다." },
  { name: "이ㅇㅇ (29세)", date: "2026-02-03", badge: "미래내일 일경험", title: "이력서에 쓸 말이 생겼다는 것만으로도 큰 위안이었습니다", excerpt: "일 경험이 없어서 늘 서류에서 걸렸는데, 인턴형으로 6개월 채우고 나니 이력서에 쓸 말이 생겼어요.", full: "일 경험이 없어서 늘 서류에서 걸렸는데, 인턴형으로 6개월 채우고 나니 이력서에 쓸 말이 생겼어요. 담당 상담사님이 기업 연결부터 서류까지 같이 챙겨주셨습니다." },
  { name: "박ㅇㅇ (24세)", date: "2026-02-20", badge: "청년일자리도약장려금", title: "중소기업 취업, 이렇게 든든할 줄 몰랐습니다", excerpt: "중소기업이라 망설였는데 장려금 설명 듣고 나서 회사도 저도 부담이 훨씬 줄었어요.", full: "중소기업이라 망설였는데 장려금 설명 듣고 나서 회사도 저도 부담이 훨씬 줄었어요. 지원 조건이 복잡했는데 상담 한 번으로 명쾌하게 정리됐습니다." },
  { name: "최ㅇㅇ (31세)", date: "2026-03-05", badge: "재취업 컨설팅", title: "막막했던 마음이 구체적인 계획으로 바뀌었습니다", excerpt: "퇴사하고 6개월 넘게 방황했는데, 여기서 버크만 진단받고 방향을 다시 잡았어요.", full: "퇴사하고 6개월 넘게 방황했는데, 여기서 버크만 진단받고 방향을 다시 잡았어요. 막연히 불안하기만 했던 마음이, 구체적인 실행 계획으로 바뀌니까 훨씬 편해졌습니다." }
];

// 후기 섹션 하단 통계 (원본 정적 HTML #pv-stats-strip)
export const STATS = [
  { num: "3,412", label: "누적 상담 건수" },
  { num: "78%", label: "재취업 연계율" },
  { num: "126개사", label: "협약 기업" },
  { num: "92%", label: "상담 만족도" }
];

export interface PressNews {
  category: string;
  date: string;
  title: string;
  detail: string;
}

export const PRESS_NEWS: PressNews[] = [
  { category: "보도자료", date: "2026.03.15", title: "JMCAREER, 2026년 청년 취업지원 우수기관 선정", detail: "JMCAREER가 고용노동부 주관 2026년 청년 취업지원 우수기관으로 선정되었습니다. 전국 지사의 상담 데이터와 재취업 연계 성과를 바탕으로 우수성을 인정받았습니다." },
  { category: "MOU체결", date: "2026.05.02", title: "JMCAREER, 주요 대학과 취업지원 업무협약 체결", detail: "JMCAREER는 전국 주요 대학과 재학생 및 졸업생을 위한 취업지원 업무협약(MOU)을 체결했습니다." },
  { category: "보도자료", date: "2026.06.20", title: "JMCAREER, 전국 지사 네트워크 통합 운영", detail: "JMCAREER가 전국 지사 체계를 완비하며 전문 취업지원 접근성을 크게 높였습니다." }
];

// 공지사항 (원본 commonData.news)
export const NOTICES = [
  { date: "2026.09.01", title: "2026 하반기 청년 일자리도약장려금 신청 안내" },
  { date: "2026.08.20", title: "미래내일 일경험 참여기업 모집 공고" },
  { date: "2026.08.05", title: "JMCAREER 채용설명회 개최 안내" }
];

// 스마트 솔루션 (원본 정적 카드 HTML + AI_FEATURES 모달 데이터를 하나로 합침)
// 카드 제목과 모달 제목은 원본에서도 동일한 문구였다.
export type SmartSolutionKey = 'burkman' | 'coverletter' | 'interview' | 'aptitude';

export interface SmartSolution {
  key: SmartSolutionKey;
  title: string;
  card: { category: string; summary: string; feature: string };
  modal: { desc: string; list: string[] };
}

export const SMART_SOLUTIONS: SmartSolution[] = [
  { key: 'burkman', title: "버크만 성격검사",
    card: { category: "진단도구", summary: "빠르고 깊이있게 나만의 강점과 컬러풀한 행동 패턴을 분석합니다.", feature: "강점·직무적합도" },
    modal: {
      desc: "국제적으로 검증된 버크만 진단으로, 나도 몰랐던 강점과 행동 패턴을 정확히 짚어드립니다.",
      list: [
        "성격·행동 유형에 대한 정밀 분석",
        "대인관계 스타일과 스트레스 반응 패턴 진단",
        "관심 직무와의 적합도 연결",
        "진단 결과를 바탕으로 한 커리어 방향 제안"
      ] } },
  { key: 'coverletter', title: "AI 자기소개서",
    card: { category: "AI 서류완성", summary: "합격 빅데이터 기반 맞춤형 전략 첨삭 및 스토리라인을 완성합니다.", feature: "무제한 첨삭 연계" },
    modal: {
      desc: "JMCAREER AI는 실제 합격 빅데이터를 바탕으로 자기소개서를 전략적으로 완성합니다.",
      list: [
        "실제 합격 자소서 데이터를 학습한 맞춤 첨삭",
        "지원 직무별 핵심 키워드 자동 제안",
        "문항별 강점 도출 및 스토리라인 구성",
        "상담사와 함께하는 무제한 첨삭 연계"
      ] } },
  { key: 'interview', title: "AI 실전면접",
    card: { category: "AI 실전면접", summary: "1분 자기소개, 텍스트면접, AI 휴먼면접으로 실전과 동일한 환경을 연습합니다.", feature: "실전 답변 피드백" },
    modal: {
      desc: "1분 자기소개, 텍스트기반면접, AI휴먼면접 등 다양한 모드에서 실전과 동일한 면접을 준비해드립니다.",
      list: [
        "1분 자기소개 · 텍스트기반면접 · AI휴먼면접 지원",
        "지원 직무별 예상 질문 자동 생성",
        "답변의 논리성·설득력 AI 분석",
        "상담사의 실제 면접관 시각 피드백 반영"
      ] } },
  { key: 'aptitude', title: "AI NCS / 인적성검사",
    card: { category: "인적성·NCS", summary: "NCS 문항 기반 기업별 출제 유형에 맞춰 모의고사를 직접 구성합니다.", feature: "약점 진단 & 보완" },
    modal: {
      desc: "방대한 NCS 문항을 바탕으로 각 기업별 출제 유형에 맞게 문항을 구성하고 커리어방향을 제시합니다.",
      list: [
        "NCS 문항 데이터베이스 보유",
        "기업별 출제 유형에 맞춘 AI 맞춤 문항 구성",
        "성향·역량 진단을 통한 강점/보완점 분석",
        "진단 결과를 바탕으로 한 전문 상담사 매칭"
      ] } }
];
