export type LegalContentId = 'ethics' | 'terms' | 'privacy';

export interface LegalContent {
  title: string;
  sections: { heading?: string; body: string }[];
}

// 확정된 본문으로 교체할 콘텐츠 데이터. 관리자 연동은 별도 작업으로 진행한다.
export const LEGAL_CONTENT: Record<LegalContentId, LegalContent> = {
  ethics: {
    title: '취업윤리경영 및 직업상담사 윤리',
    sections: [
      { heading: '취업윤리경영', body: '본문 추후 작성 예정입니다.' },
      { heading: '직업상담사 윤리', body: '본문 추후 작성 예정입니다.' }
    ]
  },
  terms: { title: '이용약관', sections: [{ body: '이용약관 본문은 추후 확정하여 안내할 예정입니다.' }] },
  privacy: { title: '개인정보취급방침', sections: [{ body: '개인정보취급방침 본문은 추후 확정하여 안내할 예정입니다.' }] }
};
