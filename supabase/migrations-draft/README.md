# migrations-draft (잠정안, 미실행)

운영 Supabase DB(`mpmgwkukrdgmzvoiwwcm`)에 접근하지 못한 상태에서 작성한 SQL이다.
기존 운영 DB 구조와 일치한다고 가정하지 않는다. `supabase db push`가 자동 적용하지 않도록
`supabase/migrations`가 아닌 이 폴더에 둔다.

적용 전 읽기 전용으로 확인할 항목:

1. `public.smartcare_solutions`, `public.smartcare_valid_text`, `public.smartcare_valid_details` 이름 충돌 여부
2. 기존 `employment_*` 테이블의 RLS 활성화 여부, 정책, anon/authenticated 권한
3. `updated_by`가 기존 테이블에서 `auth.users` FK인지 여부
4. `branch_admins`, `admin_sessions` 컬럼이 Edge Function이 조회하는 형태(`user_id`, `id,user_id,created_at,expires_at,revoked_at`)인지 여부

확인 후 승인되면 파일을 `supabase/migrations/`로 옮기거나 Supabase 대시보드 SQL Editor에서 실행한다.
