create extension if not exists pgcrypto;

create table if not exists chat_users (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references chat_users(id) on delete cascade,
  title text not null,
  hero text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations
  add column if not exists hero text;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sequence bigint generated always as identity,
  client_message_id text,
  role text not null check (role in ('user', 'assistant', 'system')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on conversations (user_id, updated_at desc);

create index if not exists conversations_user_hero_updated_idx
  on conversations (user_id, hero, updated_at desc);

create index if not exists messages_conversation_created_idx
  on messages (conversation_id, created_at asc);

create index if not exists messages_conversation_created_id_idx
  on messages (conversation_id, created_at asc, id asc);

create index if not exists messages_conversation_sequence_idx
  on messages (conversation_id, sequence asc);

create unique index if not exists messages_conversation_client_message_idx
  on messages (conversation_id, client_message_id)
  where client_message_id is not null;

create or replace function touch_conversation_updated_at()
returns trigger as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_touch_conversation_updated_at on messages;

create trigger messages_touch_conversation_updated_at
after insert on messages
for each row
execute function touch_conversation_updated_at();
