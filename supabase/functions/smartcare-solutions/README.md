# smartcare-solutions (소스 구현, 미배포)

`supabase/migrations-draft/20261008000000_smartcare_solutions.sql`의 `public.smartcare_solutions` 테이블을 전제로 한다.
이 테이블은 운영 DB에 아직 없다(미확인). 기존 `employment-programs` 함수와 코드를 공유하지 않아 각각 따로 배포된다.

## GET

인증 없이 4개 고정 서비스(burkman, coverletter, interview, aptitude)를 조회한다. 쿼리 문자열은 허용하지 않는다.
응답: `{ solutions: [{ id, display_order, stage, title, description, details, updated_at }] }` (display_order 순).
4개가 아니거나 DB 오류가 나면 500을 반환하고, 고객 화면은 정적 `SMART_SOLUTIONS`로 대체한다.
`updated_by`는 공개하지 않는다.

## PATCH

`Authorization: Bearer <Supabase Auth JWT>`, `x-admin-session-id`, 공개 `apikey`를 전달한다.
`employment-programs`와 같은 순서로 검증한다: JWT getUser → `branch_admins` 등록 → 본인 소유의 폐기되지 않은 2시간 이하 `admin_sessions`.
저장 직전 만료를 다시 확인하며 세션을 생성·연장하지 않는다.

```json
{ "solution_id": "interview", "patch": { "title": "AI 실전면접", "details": ["항목 1", "항목 2"] } }
```

| 필드 | 제한 |
| --- | --- |
| stage (단계명) | 1~30자 |
| title (서비스명) | 1~60자 |
| description (설명) | 1~500자 |
| details (상세 안내 목록) | 1~10개, 각 1~200자, 중복 불가 |

- 일반 텍스트만 허용한다: 빈 값·HTML 각괄호·코드펜스·실행 URL 스킴·제어문자 거부.
- id, display_order, updated_at, updated_by 및 기타 필드는 거부한다. 서비스 추가·삭제·순서 변경은 지원하지 않는다.
- 응답: `{ data: <row> }`. 대상 row가 없으면 404. 본문 최대 16KiB.
- 401=인증/세션 무효, 403=관리자 아님, 400=검증 위반, 413=본문 초과, 415=JSON 아님, 500/503=일반 서버 오류.

## 배포

배포 시 `verify_jwt=false`로 설정한다(공개 GET 호환). PATCH의 인증 검증은 함수 안에서 항상 실행한다.
테스트는 모의 DB/Auth만 사용한다: `npm test`.
