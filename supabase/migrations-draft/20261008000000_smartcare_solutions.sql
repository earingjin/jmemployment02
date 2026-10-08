-- SmartCare CMS 마이그레이션 (미실행)
-- 운영 DB 확인 결과(2026-10-08)에 맞춘 권한 원칙:
--   employment_* / admin_sessions와 같이 RLS 활성화 + 정책 없음 + service_role만 테이블 권한.
--   공개 GET과 관리자 PATCH는 모두 smartcare-solutions Edge Function(service_role)만 수행한다.
-- 제약 한도는 supabase/functions/smartcare-solutions/validation.ts 및 src/data/smartCare.ts와 같다.
-- 이 파일은 새 객체(smartcare_*)만 만들고 기존 테이블·함수·정책을 변경하지 않는다.
-- 다시 실행해도 안전하다: 함수는 같은 정의로 교체, 테이블·seed는 이미 있으면 건너뛰고, 권한은 같은 상태로 다시 설정한다.

begin;

-- 일반 텍스트 검증. NULL 입력도 false를 반환해 CHECK가 NULL(=통과)로 평가되지 않게 한다.
create or replace function public.smartcare_valid_text(value text, max_length integer)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    value ~ '\S'
    and char_length(value) <= max_length
    -- 함수/클라이언트와 같이 탭·LF·CR만 허용하고 나머지 제어문자와 HTML 꺾쇠를 거부한다.
    and value !~ '[<>\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'
    and value !~* '(```|\y(javascript|vbscript|data)\s*:)',
    false);
$$;

-- 상세 안내: 1차원, 1~10개, 각 항목 1~200자 일반 텍스트, 중복 없음.
create or replace function public.smartcare_valid_details(items text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    array_ndims(items) = 1
    and cardinality(items) between 1 and 10
    and (select bool_and(public.smartcare_valid_text(item, 200)) from unnest(items) as item)
    and (select count(distinct item) = count(*) from unnest(items) as item),
    false);
$$;

create table if not exists public.smartcare_solutions (
  id text primary key check (id in ('burkman', 'coverletter', 'interview', 'aptitude')),
  display_order smallint not null unique check (display_order between 1 and 4),
  -- id와 순서의 짝을 고정해 순서 변경을 DB에서도 막는다.
  constraint smartcare_solutions_fixed_order check (
    (id = 'burkman' and display_order = 1) or (id = 'coverletter' and display_order = 2) or
    (id = 'interview' and display_order = 3) or (id = 'aptitude' and display_order = 4)),
  stage text not null check (public.smartcare_valid_text(stage, 30)),
  title text not null check (public.smartcare_valid_text(title, 60)),
  description text not null check (public.smartcare_valid_text(description, 500)),
  details text[] not null check (public.smartcare_valid_details(details)),
  updated_at timestamptz not null default now(),
  -- Edge Function이 검증된 관리자 Auth 사용자 ID만 기록한다. seed row는 NULL.
  updated_by uuid null references auth.users (id) on delete set null
);

alter table public.smartcare_solutions enable row level security;

-- Supabase 기본 권한(anon/authenticated 자동 GRANT)을 제거하고 service_role에 필요한 권한만 준다.
-- Edge Function은 SELECT(GET, PATCH 결과 반환)와 UPDATE만 사용한다. INSERT/DELETE는 주지 않는다.
revoke all on table public.smartcare_solutions from public, anon, authenticated, service_role;
grant select, update on table public.smartcare_solutions to service_role;

-- 함수는 기본적으로 PUBLIC 실행 권한이 있어 /rest/v1/rpc로 노출될 수 있으므로 회수한다.
-- CHECK 평가 시 UPDATE를 수행하는 service_role에 실행 권한이 필요하다.
revoke all on function public.smartcare_valid_text(text, integer) from public, anon, authenticated;
revoke all on function public.smartcare_valid_details(text[]) from public, anon, authenticated;
grant execute on function public.smartcare_valid_text(text, integer) to service_role;
grant execute on function public.smartcare_valid_details(text[]) to service_role;

-- 초기값: src/data/content.ts SMART_SOLUTIONS와 동일 (tests/smartCare.test.ts가 일치 여부를 검사).
-- 이미 있는 row(관리자가 수정한 내용 포함)는 덮어쓰지 않는다.
insert into public.smartcare_solutions (id, display_order, stage, title, description, details) values
  ('burkman', 1, '진단', '버크만 성격검사',
    '국제적으로 검증된 버크만 진단으로, 나도 몰랐던 강점과 행동 패턴을 정확히 짚어드립니다.',
    array['성격·행동 유형에 대한 정밀 분석', '대인관계 스타일과 스트레스 반응 패턴 진단', '관심 직무와의 적합도 연결', '진단 결과를 바탕으로 한 커리어 방향 제안']),
  ('coverletter', 2, '서류 준비', 'AI 자기소개서',
    'JMCAREER AI는 실제 합격 빅데이터를 바탕으로 자기소개서를 전략적으로 완성합니다.',
    array['실제 합격 자소서 데이터를 학습한 맞춤 첨삭', '지원 직무별 핵심 키워드 자동 제안', '문항별 강점 도출 및 스토리라인 구성', '상담사와 함께하는 무제한 첨삭 연계']),
  ('interview', 3, '면접 준비', 'AI 실전면접',
    '1분 자기소개, 텍스트기반면접, AI휴먼면접 등 다양한 모드에서 실전과 동일한 면접을 준비해드립니다.',
    array['1분 자기소개 · 텍스트기반면접 · AI휴먼면접 지원', '지원 직무별 예상 질문 자동 생성', '답변의 논리성·설득력 AI 분석', '상담사의 실제 면접관 시각 피드백 반영']),
  ('aptitude', 4, '역량 확인', 'AI NCS / 인적성검사',
    '방대한 NCS 문항을 바탕으로 각 기업별 출제 유형에 맞게 문항을 구성하고 커리어방향을 제시합니다.',
    array['NCS 문항 데이터베이스 보유', '기업별 출제 유형에 맞춘 AI 맞춤 문항 구성', '성향·역량 진단을 통한 강점/보완점 분석', '진단 결과를 바탕으로 한 전문 상담사 매칭'])
on conflict (id) do nothing;

commit;
