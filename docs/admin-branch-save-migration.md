# 현재 지사 저장·공개 조회 흐름

현재 지사 저장은 비밀번호 헤더 방식에서 Supabase JWT와 관리자 세션 ID 방식으로 전환되어 있다.
`BRANCH_SAVE_AUTH_MODE`, 비밀번호 prompt, `x-admin-password` 및 비밀번호 방식 fallback은 현재 구현에 없다.

## 관리자 저장

1. `src/components/admin/AdminRoute.tsx`는 `useAdminSession.withSaveAuthorization`으로 저장을 감싼다.
2. `src/components/admin/useAdminSession.ts`의 `getSaveAuthorization`은 기존 관리자 세션을 GET 검증하고
   Supabase SDK의 access token과 서버 검증된 관리자 세션 ID를 반환한다. 저장을 위해 세션을 생성하거나 연장하지 않는다.
3. `src/data/branchDirectory.ts`의 `saveAuthenticatedBranch`는 `branch-directory` Edge Function에 PATCH를 보낸다.
   허용된 지사 필드와 slug를 본문으로 전달하고, 저장 응답의 형태와 지사 식별자를 검증한다.

요청 헤더는 `Authorization: Bearer <SDK access token>`, `x-admin-session-id`, `Content-Type`, 공개 `apikey`다.
인증값을 URL에 넣거나 비밀번호 헤더 및 직접 DB REST PATCH를 사용하지 않는다.
401/403은 관리자 로그아웃 안내로, 그 밖의 실패는 일반적인 저장 오류로 처리한다.
프론트 검증은 UX 보조이며 서버의 JWT·관리자 등록·세션 소유권·만료·폐기 검증이 최종 보안 경계다.

## 공개 지사와 관리자 편집 상태

`src/App.tsx`의 기본 지사 20개는 관리자 편집 상태의 초기값으로만 사용한다.
공개 화면은 `src/data/publicBranches.ts`가 검증한 최신 공개 GET 응답으로 목록 전체를 교체한다.
응답에 없는 지사와 비공개 행은 표시하지 않으며, 정상 빈 배열은 빈 목록으로 처리한다.
조회 실패 시 기본값이나 이전 캐시를 표시하지 않고 실패 안내를 제공한다.

이전 `jmcareer_demo_branches` 캐시는 읽거나 마이그레이션하지 않고 무효화한다. 새 공개 목록을 localStorage에 저장하지 않는다.
관리자 지사·이미지 저장 성공 후 편집 상태를 갱신하고 공개 GET을 다시 수행한다.
저장 응답만으로 공개 목록을 확정하지 않으며, 공개 재조회가 실패해도 이전 공개 캐시를 복원하지 않는다.

## 배포 소스와 검증 한계

`admin-login`, `admin-session`, `branch-directory`, `branch-image`의 서버 소스는 현재 저장소에 없다.
2차 점검에서 운영 배포 소스를 읽어 검증했으며, 이 문서 갱신은 서버 코드·인증 정책·DB 변경을 포함하지 않는다.
고정 세션 재생성 조건, 로그인 요청 제한, 이미지 실제 내용 검증 및 쓰기 직전 세션 재검사는 별도 보안 개선 항목이다.
