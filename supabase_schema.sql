-- Cymer 무물방 데이터베이스 스키마
-- Supabase SQL Editor에서 그대로 실행하세요

create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_name text not null default '익명',
  is_anonymous boolean not null default true,
  parent_id uuid references posts(id),
  is_repost boolean not null default false,
  reply_count integer not null default 0,
  password_salt text,
  password_hash text,
  created_at timestamptz not null default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  body text not null,
  author_name text not null default '익명',
  is_anonymous boolean not null default true,
  password_salt text,
  password_hash text,
  created_at timestamptz not null default now()
);

create index idx_posts_created_at on posts(created_at desc);
create index idx_replies_post_id on replies(post_id);

-- Row Level Security 활성화 (anon key로 읽기/쓰기는 가능하나, service key는 API 서버에서만 사용)
alter table posts enable row level security;
alter table replies enable row level security;

-- API 서버(service role)는 RLS를 우회하므로 별도 정책 불필요.
-- 만약 클라이언트에서 직접 anon key로 접근할 계획이 있다면 아래 정책을 추가하세요:
-- create policy "Allow public read" on posts for select using (true);
-- create policy "Allow public read" on replies for select using (true);

-- ===== 기존 DB에 이미 posts/replies 테이블이 있는 경우, 아래 마이그레이션만 새 쿼리 탭에서 실행하세요 =====
-- alter table posts add column if not exists password_salt text;
-- alter table posts add column if not exists password_hash text;
-- alter table replies add column if not exists password_salt text;
-- alter table replies add column if not exists password_hash text;
