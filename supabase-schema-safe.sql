-- ============================================
-- Maluar AI — Schema SEGURO (pode re-executar)
-- ============================================

-- 1. Profiles
create table if not exists public.profiles (
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Chats
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null default 'Novo chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chats_user on public.chats (user_id, updated_at desc);

-- 3. Messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_preview text,
  is_error boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_chat on public.messages (chat_id, created_at asc);

-- 4. Favorites
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null default 'chat' check (type in ('chat', 'post', 'recria')),
  content text not null,
  image_url text,
  saved_at timestamptz not null default now()
);

create index if not exists idx_favorites_user on public.favorites (user_id, saved_at desc);

-- 5. Post History
create table if not exists public.post_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  platform text,
  post_type text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_history_user on public.post_history (user_id, created_at desc);

-- ============================================
-- RLS
-- ============================================

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.post_history enable row level security;

-- Drop e recria policies (idempotente)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can view own chats" on public.chats;
create policy "Users can view own chats"
  on public.chats for select using (auth.uid() = user_id);

drop policy if exists "Users can create own chats" on public.chats;
create policy "Users can create own chats"
  on public.chats for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own chats" on public.chats;
create policy "Users can update own chats"
  on public.chats for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own chats" on public.chats;
create policy "Users can delete own chats"
  on public.chats for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own messages" on public.messages;
create policy "Users can view own messages"
  on public.messages for select
  using (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

drop policy if exists "Users can create messages in own chats" on public.messages;
create policy "Users can create messages in own chats"
  on public.messages for insert
  with check (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
  on public.messages for delete
  using (exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()));

drop policy if exists "Users can view own favorites" on public.favorites;
create policy "Users can view own favorites"
  on public.favorites for select using (auth.uid() = user_id);

drop policy if exists "Users can create own favorites" on public.favorites;
create policy "Users can create own favorites"
  on public.favorites for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
  on public.favorites for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own post history" on public.post_history;
create policy "Users can view own post history"
  on public.post_history for select using (auth.uid() = user_id);

drop policy if exists "Users can create own post history" on public.post_history;
create policy "Users can create own post history"
  on public.post_history for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own post history" on public.post_history;
create policy "Users can delete own post history"
  on public.post_history for delete using (auth.uid() = user_id);

-- ============================================
-- RPC: Incremento atômico de mensagens
-- ============================================
create or replace function public.increment_message_count(user_id_param uuid)
returns void as $$
begin
  update public.profiles
  set messages_today = messages_today + 1
  where id = user_id_param;
end;
$$ language plpgsql security definer;
