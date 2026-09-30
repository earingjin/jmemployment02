// 화면(View) ↔ URL ↔ GNB 메뉴 매핑 (History API 기반, 라우터 패키지 없음)
// 사업 상세 View 이름은 PROGRAMS의 program id를 그대로 사용하고, URL slug는 여기서만 별도로 매핑한다.
// (예: 시니어인턴십 program id는 'field-training', URL은 '/senior-internship')

export type ProgramView = 'employment-support' | 'job-leap' | 'future-experience' | 'field-training';
export type View = 'home' | ProgramView | 'employer' | 'branch' | 'smartcare';

export const PROGRAM_VIEWS: ProgramView[] = ['employment-support', 'job-leap', 'future-experience', 'field-training'];

export const isProgramView = (view: string): view is ProgramView => (PROGRAM_VIEWS as string[]).includes(view);

export const VIEW_PATHS: Record<View, string> = {
  'home': '/',
  'employment-support': '/employment-support',
  'job-leap': '/job-leap',
  'future-experience': '/future-experience',
  'field-training': '/senior-internship',
  'employer': '/employer-support',
  'branch': '/branches',
  'smartcare': '/smartcare'
};

export const viewFromPath = (pathname: string): View =>
  (Object.keys(VIEW_PATHS) as View[]).find(v => VIEW_PATHS[v] === pathname) ?? 'home';

// Header GNB (순서 = 화면 표시 순서)
export const NAV_ITEMS: { label: string; view: View }[] = [
  { label: '홈', view: 'home' },
  { label: '국민취업지원제도', view: 'employment-support' },
  { label: '청년 일자리도약장려금', view: 'job-leap' },
  { label: '미래내일 일경험', view: 'future-experience' },
  { label: '시니어인턴십', view: 'field-training' },
  { label: '기업 지원금', view: 'employer' },
  { label: '전국지사', view: 'branch' }
];
