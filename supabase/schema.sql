-- IELTS Tool：登入後的收藏句、練習紀錄、SRS 狀態
-- 請在 Supabase Dashboard → SQL Editor 整段執行
--
-- 設計重點：同一句英文句子（sentence_text）常常出現在多篇不同的
-- Task 2 練習文章／檢視模式（例如 core patterns、by section、by
-- function、by dimension 各自有自己的 article_id）。若用
-- article_id + essay_index + sentence_index 這種「位置」當 key，
-- 同一句話會被拆成好幾筆各自獨立的收藏／正確率／記憶曲線紀錄。
-- 因此這三張表一律改用完整句子字串 sentence_text 當作使用者維度的
-- 唯一鍵，不再依賴文章 id 或句子在文章中的位置。

create extension if not exists "pgcrypto";

drop table if exists public.favorite_sentences;
drop table if exists public.practice_attempts;
drop table if exists public.srs_cards;

-- 收藏句（以 sentence_text 當 key）
create table public.favorite_sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sentence_text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, sentence_text)
);

-- 每次檢查答案的練習紀錄（以 sentence_text 當 key）
create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sentence_text text not null,
  practice_mode text not null check (practice_mode in ('single', 'multi')),
  is_correct boolean not null,
  accuracy_percent integer not null check (accuracy_percent >= 0 and accuracy_percent <= 100),
  wrong_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- 記憶曲線狀態（每句一列，以 sentence_text 當 key）
create table public.srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sentence_text text not null,
  ease_factor numeric(4, 2) not null default 2.50,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  success_count integer not null default 0,
  fail_count integer not null default 0,
  due_at timestamptz not null default now(),
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, sentence_text)
);

create index favorite_sentences_user_id_idx
  on public.favorite_sentences (user_id);

create index practice_attempts_user_created_idx
  on public.practice_attempts (user_id, created_at desc);

create index srs_cards_user_due_idx
  on public.srs_cards (user_id, due_at);

alter table public.favorite_sentences enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.srs_cards enable row level security;

-- 每人只能讀寫自己的資料
create policy "favorite_sentences_select_own"
  on public.favorite_sentences for select
  using (auth.uid() = user_id);

create policy "favorite_sentences_insert_own"
  on public.favorite_sentences for insert
  with check (auth.uid() = user_id);

create policy "favorite_sentences_delete_own"
  on public.favorite_sentences for delete
  using (auth.uid() = user_id);

create policy "practice_attempts_select_own"
  on public.practice_attempts for select
  using (auth.uid() = user_id);

create policy "practice_attempts_insert_own"
  on public.practice_attempts for insert
  with check (auth.uid() = user_id);

create policy "srs_cards_select_own"
  on public.srs_cards for select
  using (auth.uid() = user_id);

create policy "srs_cards_insert_own"
  on public.srs_cards for insert
  with check (auth.uid() = user_id);

create policy "srs_cards_update_own"
  on public.srs_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
