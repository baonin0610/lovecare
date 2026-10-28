-- ========================================================
-- LoveCare Database Schema for Supabase (PostgreSQL 24/7)
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Couples Table
create table if not exists public.couples (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null default 'Tổ Ấm Của Chúng Mình',
  caretaker_id text,
  lover_id text,
  target_water_ml integer not null default 2000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Users Table
create table if not exists public.users (
  id text primary key,
  username text unique not null,
  password text not null,
  name text not null,
  role text not null check (role in ('caretaker', 'lover')),
  avatar text default '',
  couple_id uuid references public.couples(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Reminders Table
create table if not exists public.reminders (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('water', 'meal')),
  time text not null, -- 'HH:mm'
  water_amount_ml integer,
  meal_category text,
  message text,
  enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Checkins Table (Daily Photo Verifications)
create table if not exists public.checkins (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id text references public.users(id) on delete set null,
  user_name text not null,
  reminder_id uuid references public.reminders(id) on delete set null,
  type text not null check (type in ('water', 'meal')),
  title text not null,
  water_amount_ml integer,
  meal_category text,
  photo_url text not null,
  note text,
  date text not null, -- 'YYYY-MM-DD'
  time text not null, -- 'HH:mm'
  reactions jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Nudges Table (Buzz alerts)
create table if not exists public.nudges (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  sender_id text not null,
  sender_name text not null,
  message text,
  reminder_title text,
  type text default 'water',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indices for ultra-fast queries
create index if not exists idx_checkins_date on public.checkins(couple_id, date);
create index if not exists idx_reminders_couple on public.reminders(couple_id);

-- Enable Realtime for live updates between iPhone & PC
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.reminders;
alter publication supabase_realtime add table public.nudges;

-- ========================================================
-- 6. Storage Bucket & RLS Policies for 'checkins'
-- ========================================================
-- Create 'checkins' bucket if not already created
insert into storage.buckets (id, name, public)
values ('checkins', 'checkins', true)
on conflict (id) do update set public = true;

-- Allow public viewing and downloading of checkin photos
create policy "Allow public viewing of checkins"
on storage.objects for select
to public
using (bucket_id = 'checkins');

-- Allow public uploading of checkin photos
create policy "Allow public uploading of checkins"
on storage.objects for insert
to public
with check (bucket_id = 'checkins');

-- Allow public deleting of checkin photos
create policy "Allow public deleting of checkins"
on storage.objects for delete
to public
using (bucket_id = 'checkins');
