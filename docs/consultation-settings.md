# 상담 신청 URL 통합 관리 — 구현 및 적용 보고

작업 브랜치: `admin-auth`. 운영 DB 변경, Edge Function 배포, 프론트엔드 운영 배포, main 병합은 실행하지 않았다.

## 변경 파일과 역할

| 파일 | 변경 내용 |
| --- | --- |
| `src/data/consultation.ts` | 기존 URL을 최초 기본값으로 유지. 공개 조회·관리자 저장 API, 상태 구분, 서비스별 fallback, 초기 조회 중 새 탭 이동 처리. |
| `src/App.tsx` | 공개 상담 URL snapshot을 조회해 HomePage에 전달. 관리자 저장 응답 확인 후 같은 App의 snapshot 갱신. |
| `src/pages/HomePage.tsx` | 공통 CTA와 서비스 상세·선택 모달의 URL 식별자 연결. 공개 조회 상태를 data attribute에 기록. |
| `src/components/home/ConsultationSection.tsx` | 고정 href 대신 공통 상담 콜백 사용. 기존 링크 문구·스타일 유지. |
| `src/components/admin/AdminPage.tsx` | 기존 사이트 공통 설정 안에 편집기 추가. 공통 설정 탭의 미저장 이동 경고 연결. 기존 연도 편집기 유지. |
| `src/components/admin/AdminRoute.tsx` | 기존 withSaveAuthorization과 인증 오류 처리로 상담 URL 저장. 세션 생성·연장 방식 유지. |
| `src/components/admin/ConsultationEditor.tsx` | 6개 입력, 현재 URL, 신청서 확인, 일괄 저장, 중복 방지, 취소, 성공·실패·재조회, 탭·사이트 복귀·브라우저 뒤로가기·페이지 종료 경고. |
| `src/components/admin/AdminPage.css` | 상담 설정 필드 간격, 긴 URL 줄바꿈, 저장 버튼 영역만 추가. |
| `supabase/functions/consultation-settings/index.ts` | 서버 환경의 service role로 새 함수 실행. 프론트엔드에 비밀키 전달하지 않음. |
| `supabase/functions/consultation-settings/handler.ts` | 공개 GET, 인증된 관리자 PATCH, URL만 응답, 단일 행 원자적 UPDATE, 서버 audit 기록. |
| `supabase/functions/consultation-settings/validation.ts` | 클라이언트와 서버에서 실행하는 동일한 고정 식별자·Google Forms URL 검증. |
| `supabase/functions/consultation-settings/deno.json` | 기존 함수와 같은 Supabase 라이브러리 고정 버전. |
| `supabase/functions/consultation-settings/handler.test.ts` | 서버 권한·원자적 저장·조회/저장 실패·유효성 검증 테스트. |
| `supabase/migrations/20261012014343_consultation_settings.sql` | CLI로 생성한 미적용 SQL. 단일 설정 행, 제약, 권한, 기존 URL seed. |
| `tests/consultation.test.ts` | URL 공격 방어, API 상태, 초기 클릭, 편집기 저장/취소/실패/중복·탭 이동 테스트. |
| `tests/customerProgramIntegration.test.ts` | 실제 고객 CTA·5개 상세 페이지·사업 모달 연결 검사. 기존 fixture에 새 prop 추가. |
| `tests/employmentPrograms.test.ts` | 기존 관리자 렌더링 fixture에 새 저장 prop 추가. |
| `tests/smartCare.test.ts` | 기존 관리자 탭 fixture에 새 저장 prop 추가. |
| `scripts/run-tests.cjs` | 신규 2개 테스트 suite 등록. |
| `scripts/verify-consultation-migration.cjs` | 운영 DB 없이 로컬 PostgreSQL에서 migration·권한·실패 보존 검사. |
| `docs/consultation-settings.md` | 이 보고서와 적용·검증 절차. |

`ProgramDetailPage.tsx`, `SmartCarePage.tsx`, `ProgramModal.tsx`, Header/Hero 등 기존 CTA 컴포넌트는 기존 onConsult prop을 그대로 재사용하므로 수정하지 않았다. 기존 SmartCare 상세에는 상단 상담 CTA 하나가 있고, 네 고용지원사업 상세에는 상·하단 두 CTA가 있다. 기존 배치와 개수는 유지했다.

## DB 구조와 권한

실제 `.env.local`의 프로젝트에 읽기 전용 SQL로 공통 설정 테이블 존재 여부를 확인했다. 이름에 setting을 포함하는 public 테이블은 없고, 기존 `branch_admins`와 `admin_sessions` 구조가 존재한다. 저장소에도 재사용 가능한 공통 설정 테이블/API가 없다. 지원금 기준 연도는 기존 App 상태이며 이번 기능과 별도로 유지한다.

`public.consultation_settings`:

- `id`: 고정값 `consultation`, primary key.
- `urls`: JSONB, `default`, `employment-support`, `job-leap`, `future-experience`, `field-training`, `smartcare` 정확히 6개 문자열. 공통 URL 필수, 나머지 공란 허용.
- `updated_at`: 서버 수정 시각.
- `updated_by`: 검증된 관리자 auth.users ID. 초기 seed는 null.

6개 값을 한 행의 JSONB에 저장하고 UPDATE 한 번으로 교체한다. 따라서 일부 URL만 저장되는 중간 상태가 없다. 동시에 여러 관리자가 저장하면 마지막으로 커밋한 전체 snapshot이 적용된다.

RLS 활성화, public/anon/authenticated의 테이블 권한 없음, service_role만 SELECT·UPDATE 가능. INSERT·DELETE는 함수에 허용하지 않는다. 검증 함수도 public 실행 권한을 회수했다. SECURITY DEFINER를 사용하지 않는다. 공개 GET은 Edge Function을 통해 URL 6개만 응답한다. audit 컬럼은 공개하지 않는다.

PATCH는 기존 콘텐츠 함수와 동일하게 JWT `getUser` → `branch_admins` → 본인 소유·미폐기·미만료·2시간 이하 고정 `admin_sessions`를 검사한다. 저장 직전 만료를 다시 검사한다. 기존 세션을 만들거나 연장하지 않는다. 프론트엔드에서는 기존 `withSaveAuthorization`을 사용한다.

## URL 적용과 조회 상태

헤더(모바일 메뉴 포함), Hero, 메인 상담 영역, 메인 모바일 상담, 모바일 고정 상담, NetworkSection, 기업 지원금의 공통 CTA에는 default를 적용한다. 네 고용지원사업 상세는 기존 program ID, SmartCare 상세는 smartcare, 상세 모달은 선택된 program ID를 사용한다. `/senior-internship`의 기존 `field-training` 매핑을 유지한다.

개별 URL 공란은 default를 사용한다. 저장 설정 자체가 없으면 기존 코드 URL을 사용한다. 조회 실패 또는 비정상 snapshot도 기존 코드 URL로 보호한다. 조회 중 클릭은 즉시 빈 새 탭을 열어 팝업 차단을 피하고, 조회 완료 후 검증된 URL로 이동한다. 조회 제한은 10초이며 실패 시 안전한 기본값으로 완료한다. opener를 제거한다. 고객 화면·모달 상태는 유지한다.

`#publicPage`의 `data-consultation-source` 값으로 `loading`, `saved`, `missing`, `error`, `invalid`를 구분할 수 있다. error/invalid에는 콘솔 오류도 남긴다. 관리자 조회 오류는 기본값을 편집 가능한 정상 조회로 오인하지 않도록 입력을 표시하지 않고 재조회를 제공한다. 비정상 DB 값은 관리자에도 오류로 표시하므로 DB 관리자 점검이 필요하다.

고객 GET은 no-store이며 새로고침 때 최신 값을 가져온다. 이미 열린 고객 화면은 자동 갱신하지 않는다. 같은 App에서 관리자 저장 후 사이트로 돌아가면 서버 응답으로 확인된 새 snapshot을 사용한다. 저장 성공 메시지는 서버의 정상 응답과 유효한 설정 확인 이후 표시한다. DB UPDATE 실패 시 기존 행이 유지되며 편집기의 취소 기준값도 성공 응답 전에는 교체하지 않는다. 요청 응답이 네트워크에서 유실되는 경우에는 실제 DB 커밋 여부가 불확실할 수 있으므로 관리자 탭 재진입 후 현재 값을 다시 확인해야 한다.

Google Forms 검증은 HTTPS, 정확한 host, Forms 경로, 사용자정보·명시 포트·제어문자·역슬래시·fragment 차단, redirect 등 허용하지 않은 query key 차단을 포함한다. 실제 폼 공개 및 응답 수집 가능 여부는 문자열 검사로 확인하지 못하며 신청서 확인 버튼으로 확인한다.

## 운영 적용 절차 (아직 실행하지 않음)

1. 대상 프로젝트가 프론트엔드 `VITE_SUPABASE_URL`과 일치하는지 확인하고 DB 백업 및 기존 `branch_admins`/`admin_sessions`를 확인한다.
2. SQL Editor에서 **이 기능의 SQL 파일 하나만** 검토하고 실행한다: `supabase/migrations/20261012014343_consultation_settings.sql`. 전체를 transaction으로 실행한다. 다른 draft 마이그레이션은 함께 적용하지 않는다. 이 SQL은 1회 적용용이며 테이블이 이미 존재하면 중단하므로 중복 적용하지 않는다. 기존 프로젝트의 migration history 관리 방식에 맞춰 적용 이력을 기록한다.
3. 다음 조회로 seed와 RLS를 확인한다.

```sql
select id, urls, updated_at, updated_by from public.consultation_settings;
select relrowsecurity from pg_class where oid = 'public.consultation_settings'::regclass;
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'consultation_settings';
```

4. 승인된 배포 담당자가 새 Edge Function 하나만 배포한다. 공개 GET 때문에 gateway JWT 검증은 끄되 PATCH 인증 검사는 함수 안에서 수행한다. CLI help에서 옵션을 확인했다.

```powershell
npx.cmd --yes supabase@2.120.0 functions deploy consultation-settings --project-ref <대상-project-ref> --no-verify-jwt
```

5. 서버 `SUPABASE_URL`와 `SUPABASE_SERVICE_ROLE_KEY`를 기존 함수와 동일한 서버 환경에서 사용한다. service role을 VITE 변수로 설정하지 않는다. 공개 GET이 URL 6개만 반환하는지, 비로그인 PATCH·비관리자 PATCH·폐기/만료 세션 PATCH가 거부되는지 확인한다. Supabase 보안 advisors도 배포 환경에서 확인한다.
6. 기능 도입을 위한 프론트엔드 배포를 1회 진행한다. 이후 URL 변경은 관리자 저장만으로 반영되며 코드 수정·재배포가 필요 없다.
7. 관리자 저장 후 새로고침과 다른 브라우저 조회, 5개 상세·사업 모달·공통 CTA·모바일 고정 CTA, 기존 연도·지사/이미지·고용지원사업·SmartCare 저장을 실제 환경에서 점검한다. 사용되는 Google Forms가 공개돼 있고 응답을 받는지도 확인한다.

## 실행한 검증

- `npm.cmd run lint`: TypeScript 검사 통과.
- `npm.cmd test`: 246개 중 244개 통과, 실패 0, 기존 2개 skip (`EMPLOYMENT_PROGRAMS_SNAPSHOT` 미제공으로 실제 콘텐츠 snapshot 비교 테스트 생략).
- `npm.cmd run build`: Vite production build 성공. 기존 vite.config.ts의 `__dirname` 관련 향후 configLoader 경고가 남는다.
- `node scripts/verify-consultation-migration.cjs <임시-PGlite-설치경로>`: 로컬 PostgreSQL에서 SQL 실행·seed·URL 제약·anon/authenticated 읽기/쓰기 거부·service_role 단일 UPDATE·실패 보존·DELETE 거부 통과.
- 실제 운영 DB 구조 조회: 읽기 전용으로 실행. migration 및 신규 함수는 적용하지 않았다.

로컬 DB 검증 재현 예시(프로젝트 의존성 변경 없음):

```powershell
$sqlCheckDir = Join-Path $env:TEMP 'jmcareer-consultation-sql-check'
npm.cmd install --prefix $sqlCheckDir --no-save --package-lock=false @electric-sql/pglite@0.3.14
node scripts/verify-consultation-migration.cjs $sqlCheckDir
```

브라우저 런타임 연결 및 available browser 조회를 시도했으나 연결된 브라우저가 없었다. 따라서 실제 DOM 클릭·화면 크기별 시각 검증·별도 브라우저의 영구 저장 조회는 수행하지 못했다. 신규 운영 함수가 미배포이므로 실제 관리자 로그인 후 상담 URL 저장·운영 DB 새로고침 유지도 미검증이다. 대신 실제 React 컴포넌트 콜백/편집기 상태·모의 Auth/DB 서버 handler·로컬 PostgreSQL로 기능과 권한을 검증했다. 지사/이미지의 운영 저장은 수행하지 않았고, 기존 렌더링 및 auth/session·고용지원사업·SmartCare 관련 회귀 suite는 통과했다.

## 기존 기능 영향

고객 레이아웃·문구·색상·상담 CTA 개수·서비스 경로·네비게이션·사업 콘텐츠·지사/이미지 데이터·로그인/비밀번호 정책·세션 유지/연장 정책은 변경하지 않았다. 지원금 기준 연도의 기존 입력·반영 동작은 그대로 둔다. 새 저장 API는 상담 설정만 변경한다. 기존 모달·상세 컴포넌트의 onConsult 계약도 유지한다.

공식 권한 문서: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). 실제 browser/운영 검증은 위 절차를 수행한 뒤 완료 여부를 판단해야 한다.
