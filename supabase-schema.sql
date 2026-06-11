-- Run this in Supabase > SQL Editor

create table if not exists app_tenants (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '[]',
  last_auto_month text not null default '',
  updated_at timestamptz default now()
);

create table if not exists app_settings (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table app_tenants enable row level security;
alter table app_settings enable row level security;

create policy "own tenants" on app_tenants for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own settings" on app_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
