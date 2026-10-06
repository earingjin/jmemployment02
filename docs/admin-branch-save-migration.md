# 지사 PATCH 인증 전환 준비

현재 기본값은 AdminRoute.tsx의 BRANCH_SAVE_AUTH_MODE = 'legacy-password'다.
기존 App.tsx의 window.prompt와 x-admin-password 요청만 사용한다.
새 인증 헤더를 기존 비밀번호 요청에 추가하지 않으며 자동 fallback도 없다.

## 서버 전환과 동시에 적용할 변경

1. 사용자의 서버 전환 지시 후 branch-directory PATCH가 Supabase JWT와
   x-admin-session-id로 관리자 권한, 세션 소유권, 폐기 및 고정 만료를 검증하도록 서버를 전환한다.
   이번 작업에서는 Edge Function 및 DB를 변경하지 않았다.
2. AdminRoute.tsx의 BRANCH_SAVE_AUTH_MODE를 'admin-session'으로 변경한다.
   이때부터 저장 직전 useAdminSession.getSaveAuthorization이 기존 세션을 GET 검증하고
   Supabase SDK의 최신 access token을 사용한다. POST 및 만료 연장은 하지 않는다.
3. 전환 검증 후 App.tsx의 기존 saveBranch 함수 전체(window.prompt, x-admin-password 포함)와
   onSaveBranch={saveBranch} 전달을 제거한다. AdminRoute의 legacy 분기 및 해당 prop 요구도 제거한다.
   applySavedBranch와 onBranchSaved는 저장 응답을 공개 화면 상태와 기존 지사 캐시에 반영하므로 유지한다.

최종 요청 경로는 React → branch-directory Edge Function → DB다.
PATCH의 인증은 Authorization: Bearer <SDK access token> 및
x-admin-session-id: <서버 검증한 관리자 세션 ID>이며, Content-Type과 기존 공개 apikey도 전달한다.
비밀번호 헤더, DB REST PATCH, 인증값의 URL 전달 및 별도 토큰 저장은 사용하지 않는다.

401/403은 일반적인 한국어 안내와 관리자 로그아웃으로 처리한다.
500 계열, 네트워크 오류 및 잘못된 응답은 일반적인 서버 저장 오류로 처리한다.
프론트 검증은 UX 보조이며 최종 보안 경계는 서버의 PATCH 검증이다.
