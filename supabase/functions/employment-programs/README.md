# employment-programs (소스 구현, 미배포)

실제 DB/기존 Edge Function/프론트는 변경하지 않는다.
현재 DB에서 `employment_program_sections.updated_at`은 이미 존재한다.
배포 전에 `employment_program_sections.updated_by`와
`employment_benefit_groups.updated_by`(uuid)를 별도 승인된 DB 작업으로 추가해야 한다.
이 함수는 모든 대상에 updated_at/updated_by가 존재하는 전제이며, 없다면 PATCH가 500으로 실패한다.
저장소에 기존 Supabase 스키마·마이그레이션 정의가 없으므로 이 작업에서 마이그레이션을 만들지 않았다.

## GET

인증 없이 고객 공개 콘텐츠를 조회한다. 쿼리는 선택적인 `program_id` 하나만 허용한다.
응답: `{ programs: [...], sections: [...], benefit_groups: [...] }`.
프로그램은 employment-support, job-leap, future-experience, field-training으로 제한한다.
콘텐츠 및 화면 구성용 key/display_order/variant를 명시적으로 선택하며
내부 bigint id와 updated_by는 공개하지 않는다. 오류·빈 결과·대량 결과를 혼동하지 않는다.
응답은 JSON이며 HTML/JS/CSS 실행·렌더링 기능이 없다. 소비자는 모든 콘텐츠를 일반 텍스트로 표시해야 한다.

## PATCH

Authorization: Bearer (Supabase Auth JWT), x-admin-session-id 및 기존 apikey를 전달한다.
JWT getUser 검증 → branch_admins 등록 확인 → 동일 사용자의 admin_sessions 검증 순서다.
폐기/만료/유효하지 않은 날짜/2시간을 초과하는 세션을 거부한다.
관리자 세션 생성·수정·연장 없이 저장 직전 만료를 다시 확인한다.

요청은 한 번에 기존 row 하나를 수정한다:

```json
{
  "program_id": "employment-support",
  "target": "section",
  "section_key": "existing-section-key",
  "patch": { "title": "지원 내용", "lines": ["검증된 정책 안내 문구"] }
}
```

- target=program: section_key/benefit_key 없음. label, seeker_kind/target/big/sub/desc,
  employer_target/amount/desc, effective_date, source_name, source_url만 허용.
- target=section: 기존 section_key로 선택. title/lines만 허용.
- target=benefit-group: 기존 benefit_key로 선택. type_label, item_names, sub_label,
  headline, hero_note, hero_type, hero_bottom, lines만 허용. hero_type은 문자열 콘텐츠 라벨이다.
- 응답: `{ target, data }`. 대상 row가 없으면 404. 삽입/upsert/삭제를 지원하지 않는다.
- program_id·section_key·benefit_key는 selector만 허용하며 patch에서는 거부한다.
- display_order, variant, id, updated_at, updated_by 및 기타 모든 미허용 필드를 거부한다.
- updated_at은 서버 시각, updated_by는 검증된 Auth 사용자 ID로 기록한다.
- 한 요청당 한 UPDATE로 처리하여 여러 row 저장 중 부분 성공을 만들지 않는다.

## 입력 한도

application/json, 최대 64KiB(실제 스트림 크기도 검사), 비어 있지 않은 patch.
키는 소문자 영숫자/하이픈/밑줄 1~64자이며 기존 DB row에만 적용한다.
일반 텍스트는 빈 값·HTML 각괄호·코드펜스·실행 URL 스킴·제어문자를 거부한다.
null은 DB의 nullable 콘텐츠 필드에만 허용한다.

| 필드 | 최대 길이/개수 |
| --- | --- |
| label/type_label | 120자 |
| title/kind/big/source_name/headline/hero_type | 200자 |
| sub/employer_amount/sub_label/hero_bottom | 500자 |
| target/hero_note | 1000자 |
| desc | 4000자 |
| lines | 1~30개, 각 2000자 |
| item_names | 1~20개, 각 200자 |
| source_url | 2048자, HTTPS 절대 URL, 인증정보·공백·백슬래시·비표준 포트 금지 |
| effective_date | 실제 존재하는 YYYY-MM-DD 날짜 또는 null |

401=인증/고정 세션 무효, 403=관리자 아님, 400=계약/검증 위반,
413=본문 초과, 415=JSON 아님, 404=기존 콘텐츠 없음, 500/503=일반 서버 오류.
서버 오류 상세·JWT·비밀키를 응답 또는 로그에 출력하지 않는다.

## 배포 및 검증

배포는 별도 작업이다. 기존 함수와 같은 수동 JWT 검증 방식이므로 배포 시
이 함수만 verify_jwt=false로 설정해야 한다(공개 GET 및 publishable key 호환).
PATCH의 세 가지 인증 검증은 함수에서 항상 실행한다.
Deno에서 deno.json의 고정 SDK 버전을 사용한다. 로컬 프론트 TS 검사에서는 기존 설치 SDK 타입을 사용한다.
테스트는 모의 DB/Auth를 사용하며 실제 서버 데이터를 수정하지 않는다.

저장소 루트에서 재실행: `node supabase/functions/employment-programs/run-tests.cjs`.
기존 esbuild와 Node 내장 테스트 러너만 사용하며 패키지를 추가하지 않는다.
Deno 런타임의 실제 배포 검증은 별도이며, 로컬 테스트가 DB 컬럼 배포 준비를 대신하지 않는다.
