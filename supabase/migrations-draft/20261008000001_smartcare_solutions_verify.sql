-- SmartCare 마이그레이션 적용 후 확인용 (읽기 전용 SELECT만 포함).
-- 각 쿼리를 따로 실행하고 주석의 기대값과 비교한다.

-- 1) 실행 전: 이름 충돌 확인. 기대값: 0 rows (실행 후에는 테이블 1 + 함수 2)
select 'table' as kind, table_name as name from information_schema.tables
  where table_schema = 'public' and table_name like 'smartcare%'
union all
select 'function', p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'smartcare%';

-- 2) seed 4건과 순서. 기대값: burkman 1, coverletter 2, interview 3, aptitude 4 / 상세 안내 각 4개 / updated_by NULL
select id, display_order, stage, title, cardinality(details) as detail_count, updated_by
  from public.smartcare_solutions order by display_order;

-- 3) RLS. 기대값: relrowsecurity = true, 정책 0개
select relrowsecurity from pg_class where oid = 'public.smartcare_solutions'::regclass;
select count(*) as policies from pg_policies where schemaname = 'public' and tablename = 'smartcare_solutions';

-- 4) 테이블 권한. 기대값: service_role의 SELECT, UPDATE만 (anon/authenticated 없음)
select grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'smartcare_solutions' order by grantee, privilege_type;

-- 5) 함수 실행 권한. 기대값: anon/authenticated false, service_role true
select r.rolname,
  has_function_privilege(r.rolname, 'public.smartcare_valid_text(text, integer)', 'execute') as valid_text,
  has_function_privilege(r.rolname, 'public.smartcare_valid_details(text[])', 'execute') as valid_details
from pg_roles r where r.rolname in ('anon', 'authenticated', 'service_role');

-- 6) 제약 동작(쓰기 없음). 기대값: true, false, false, false, true, false, false
select public.smartcare_valid_text('정상 문구', 30),
       public.smartcare_valid_text('   ', 30),
       public.smartcare_valid_text('<b>x</b>', 30),
       public.smartcare_valid_text('javascript:alert(1)', 30),
       public.smartcare_valid_text(E'줄\n바꿈', 30),
       public.smartcare_valid_details(array['같음', '같음']),
       public.smartcare_valid_details(array[]::text[]);
