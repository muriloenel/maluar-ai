-- ============================================
-- Maluar AI — Supabase Schema
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  level text not null default 'iniciante' check (level in ('iniciante', 'intermediario', 'avancada')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  messages_today integer not null default 0,
  messages_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Nail Designer'),
    coalesce(new.raw_user_meta_data->>'level', 'iniciante')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Chats
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null default 'Novo chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chats_user on public.chats (user_id, updated_at desc);

-- 3. Messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_preview text,
  is_error boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_messages_chat on public.messages (chat_id, created_at asc);

-- 4. Favorites
create table public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null default 'chat' check (type in ('chat', 'post', 'recria')),
  content text not null,
  image_url text,
  saved_at timestamptz not null default now()
);

create index idx_favorites_user on public.favorites (user_id, saved_at desc);

-- 5. Post History
create table public.post_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  platform text,
  post_type text,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_post_history_user on public.post_history (user_id, created_at desc);

-- ============================================
-- Row Level Security (RLS)
-- Cada usuário só acessa seus próprios dados
-- ============================================

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.post_history enable row level security;

-- Profiles: user can read/update own profile
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Chats: user can CRUD own chats
create policy "Users can view own chats"
  on public.chats for select using (auth.uid() = user_id);

create policy "Users can create own chats"
  on public.chats for insert with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.chats for update using (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.chats for delete using (auth.uid() = user_id);

-- Messages: user can CRUD messages in own chats
create policy "Users can view own messages"
  on public.messages for select
  using (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

create policy "Users can create messages in own chats"
  on public.messages for insert
  with check (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

create policy "Users can delete own messages"
  on public.messages for delete
  using (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

-- Favorites: user can CRUD own favorites
create policy "Users can view own favorites"
  on public.favorites for select using (auth.uid() = user_id);

create policy "Users can create own favorites"
  on public.favorites for insert with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete using (auth.uid() = user_id);

-- Post History: user can CRUD own posts
create policy "Users can view own post history"
  on public.post_history for select using (auth.uid() = user_id);

create policy "Users can create own post history"
  on public.post_history for insert with check (auth.uid() = user_id);

create policy "Users can delete own post history"
  on public.post_history for delete using (auth.uid() = user_id);
