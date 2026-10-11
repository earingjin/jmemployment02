// 지사 데이터 원본 (원본 index.html의 ADMIN_BRANCHES / DEFAULT_REGION_MAP / makeDefaultBranch 이관)

export const ADMIN_BRANCHES = ["본사","남부","동부","서부","북부","의정부","용인","인천","분당","거제","광주","진주","창원","대구","대전","천안","원주","마산","부산","홍성"];

export const BRANCH_REGIONS = ["수도권", "충청권", "호남권", "영남권", "강원·제주권"];

export const DEFAULT_REGION_MAP: Record<string, string> = {
  "본사": "수도권", "남부": "수도권", "동부": "수도권", "서부": "수도권", "북부": "수도권", "의정부": "수도권",
  "용인": "수도권", "인천": "수도권", "분당": "수도권",
  "대전": "충청권", "천안": "충청권", "홍성": "충청권",
  "광주": "호남권",
  "거제": "영남권", "진주": "영남권", "창원": "영남권", "대구": "영남권", "마산": "영남권", "부산": "영남권",
  "원주": "강원·제주권"
};

export const DEFAULT_BRANCH_HOURS = "평일 09:00~18:00 (점심 12:00~13:00)";

// 공개 화면의 기본 지사(상담 폼 기본 선택값)
export const PUBLIC_BRANCH = "본사";

export interface Branch {
  slug: string;
  phone: string;
  address: string;
  contactManagerName: string;
  contactManagerEmail: string;
  mapUrl: string;
  imagePath: string | null;
  imagePath2: string | null;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  image2Zoom: number;
  image2PositionX: number;
  image2PositionY: number;
  region: string;
  hours: string;
  published: boolean;
  programIds: string[];
}

export type BranchMap = Record<string, Branch>;

export function branchSuffix(name: string) { return name === "본사" ? "" : "지사"; }

export function makeDefaultBranch(name: string): Branch {
  const suffix = branchSuffix(name);
  const isHQ = name === "본사";
  return {
    slug: name,
    phone: isHQ ? "02-2284-0077" : "1588-0000",
    address: isHQ
      ? "서울시 성동구 왕십리로 58 서울지식산업센터 포휴 808호(성수동1가)"
      : name + suffix + " 주소를 입력해주세요",
    contactManagerName: "담당자",
    contactManagerEmail: "contact@jmcareer.co.kr",
    mapUrl: "",
    imagePath: null,
    imagePath2: null,
    imageZoom: 1,
    imagePositionX: 50,
    imagePositionY: 50,
    image2Zoom: 1,
    image2PositionX: 50,
    image2PositionY: 50,
    region: DEFAULT_REGION_MAP[name] || "수도권",
    hours: DEFAULT_BRANCH_HOURS,
    published: true,
    programIds: ["employment-support", "future-experience", "job-leap", "field-training"]
  };
}

export function createInitialBranches(): BranchMap {
  const data: BranchMap = {};
  ADMIN_BRANCHES.forEach(n => data[n] = makeDefaultBranch(n));
  return data;
}

// 지도 모달 기본 iframe 주소 (원본 정적 HTML의 초기 src)
export const DEFAULT_MAP_EMBED_URL = "https://www.google.com/maps?q=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EC%84%B1%EB%8F%99%EA%B5%AC%20%EC%99%95%EC%8B%AD%EB%A6%AC%EB%A1%9C%2058&output=embed";

export const mapEmbedUrl = (address: string) => 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed';

export const naverMapSearchUrl = (address: string) => 'https://map.naver.com/p/search/' + encodeURIComponent(address);
