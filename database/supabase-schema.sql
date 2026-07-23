create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  membership_id text not null unique,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  email text not null,
  mobile_number text not null,
  activation_date date not null,
  expiration_date date not null,
  preferred_visit_date date,
  preferred_visit_time time,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists registrations_created_at_idx on public.registrations (created_at desc);
create index if not exists registrations_email_idx on public.registrations (lower(email));
create index if not exists registrations_mobile_idx on public.registrations (mobile_number);

create table if not exists public.email_outbox (
  id text primary key,
  type text not null,
  registration_id uuid references public.registrations(id) on delete set null,
  provider text not null,
  status text not null,
  message jsonb not null,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

alter table public.registrations enable row level security;
alter table public.email_outbox enable row level security;

-- This app uses SUPABASE_SERVICE_ROLE_KEY from Vercel API functions only.
-- Do not expose the service role key in frontend code.
