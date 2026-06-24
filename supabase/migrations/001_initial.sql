-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects (группировка аккаунтов по клиентам/проектам)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- Social accounts (подключённые аккаунты)
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok')),
  platform_user_id text not null,
  username text not null,
  avatar_url text,
  access_token text not null,
  token_expires_at timestamptz,
  refresh_token text,
  followers_count integer default 0,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique(platform, platform_user_id)
);

-- Posts (публикации)
create table posts (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references accounts(id) on delete cascade,
  platform_post_id text not null,
  platform text not null,
  post_type text not null check (post_type in ('reel', 'image', 'carousel', 'tiktok_video', 'story')),
  caption text,
  thumbnail_url text,
  permalink text,
  published_at timestamptz,
  -- Metrics
  views_count bigint default 0,
  likes_count bigint default 0,
  comments_count bigint default 0,
  shares_count bigint default 0,
  saves_count bigint default 0,
  reach_count bigint default 0,
  impressions_count bigint default 0,
  -- Internal
  tags text[] default '{}',
  notes text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique(platform, platform_post_id)
);

-- Metrics snapshots (история метрик для трекинга динамики)
create table metrics_snapshots (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  snapshot_at timestamptz default now(),
  views_count bigint default 0,
  likes_count bigint default 0,
  comments_count bigint default 0,
  shares_count bigint default 0,
  saves_count bigint default 0,
  reach_count bigint default 0
);

-- Trigger words / keywords per project
create table trigger_words (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  word text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  unique(project_id, word)
);

-- Indexes
create index idx_posts_account_id on posts(account_id);
create index idx_posts_published_at on posts(published_at desc);
create index idx_posts_tags on posts using gin(tags);
create index idx_metrics_post_id on metrics_snapshots(post_id);
create index idx_accounts_project_id on accounts(project_id);

-- RLS (Row Level Security) — включаем для продакшена
alter table projects enable row level security;
alter table accounts enable row level security;
alter table posts enable row level security;
alter table metrics_snapshots enable row level security;
alter table trigger_words enable row level security;

-- Пока открытые политики (настрой под свою auth систему)
create policy "Allow all" on projects for all using (true);
create policy "Allow all" on accounts for all using (true);
create policy "Allow all" on posts for all using (true);
create policy "Allow all" on metrics_snapshots for all using (true);
create policy "Allow all" on trigger_words for all using (true);
