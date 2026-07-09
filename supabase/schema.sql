-- Pacewell public schema
-- Generated from live Supabase schema inspection.
-- Review before running against any existing production database.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    age integer not null,
    primary_activity text not null,
    activity_level text not null check (
        activity_level = any (
            array[
                'light'::text,
                'moderate'::text,
                'active'::text,
                'athlete'::text
            ]
        )
    ),
    health_goals text[] not null default '{}',
    created_at timestamp with time zone not null default now(),
    units text not null default 'metric' check (
        units = any (
            array[
                'metric'::text,
                'imperial'::text
            ]
        )
    ),
    marketing_opt_in boolean not null default false,
    avatar_url text
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────
-- daily_checkins
-- ─────────────────────────────────────────────────────────────

create table if not exists public.daily_checkins (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    mood integer not null check (mood >= 1 and mood <= 5),
    energy integer not null check (energy >= 1 and energy <= 5),
    stress integer not null check (stress >= 1 and stress <= 5),
    sleep_hours numeric not null check (sleep_hours >= 0 and sleep_hours <= 24),
    sleep_quality integer not null check (sleep_quality >= 1 and sleep_quality <= 5),
    notes text,
    created_at timestamp with time zone not null default now(),
    nutrition_quality integer not null default 3 check (
        nutrition_quality >= 1 and nutrition_quality <= 5
    ),
    water_intake_glasses integer not null default 6 check (
        water_intake_glasses >= 0
    ),
    unique (user_id, date)
);

alter table public.daily_checkins enable row level security;

drop policy if exists "Users can manage own checkins" on public.daily_checkins;
create policy "Users can manage own checkins"
on public.daily_checkins
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- activity_logs
-- ─────────────────────────────────────────────────────────────

create table if not exists public.activity_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    activity_type text not null check (
        activity_type = any (
            array[
                'running'::text,
                'cycling'::text,
                'swimming'::text,
                'walking'::text,
                'strength'::text,
                'yoga'::text,
                'tennis'::text,
                'golf'::text,
                'other'::text
            ]
        )
    ),
    duration_minutes integer not null check (duration_minutes > 0),
    perceived_exertion integer not null check (
        perceived_exertion >= 1 and perceived_exertion <= 5
    ),
    notes text,
    source text not null check (
        source = any (
            array[
                'manual'::text,
                'healthkit'::text,
                'health_connect'::text,
                'wearable'::text
            ]
        )
    ),
    created_at timestamp with time zone not null default now()
);

alter table public.activity_logs enable row level security;

drop policy if exists "Users can manage own activity logs" on public.activity_logs;
create policy "Users can manage own activity logs"
on public.activity_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- health_metrics
-- ─────────────────────────────────────────────────────────────

create table if not exists public.health_metrics (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    avg_heart_rate integer,
    min_heart_rate integer,
    max_heart_rate integer,
    resting_heart_rate integer,
    hrv integer,
    step_count integer,
    source text not null default 'wearable',
    created_at timestamp with time zone not null default now(),
    weight_kg numeric,
    unique (user_id, date)
);

alter table public.health_metrics enable row level security;

drop policy if exists "Users can manage own health metrics" on public.health_metrics;
create policy "Users can manage own health metrics"
on public.health_metrics
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- ai_insights
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ai_insights (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    insight_type text not null check (
        insight_type = any (
            array[
                'trend'::text,
                'correlation'::text,
                'anomaly'::text,
                'prediction'::text,
                'recovery'::text,
                'sleep'::text,
                'activity'::text,
                'nutrition'::text,
                'stress'::text,
                'heart_rate'::text,
                'steps'::text,
                'weight'::text,
                'pattern'::text
            ]
        )
    ),
    content text not null,
    data_range_start date not null,
    data_range_end date not null,
    created_at timestamp with time zone not null default now(),
    title text
);

alter table public.ai_insights enable row level security;

drop policy if exists "Users can manage own insights" on public.ai_insights;
drop policy if exists "Users can read own insights" on public.ai_insights;

create policy "Users can read own insights"
on public.ai_insights
for select
using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Storage: avatars bucket
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'avatars',
    'avatars',
    true,
    5242880,
    array[
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- Public read access for avatars.
-- This allows avatar_url to display images directly in the app.

drop policy if exists "Public read access" on storage.objects;
create policy "Public read access"
on storage.objects
for select
to public
using (
    bucket_id = 'avatars'
);


-- Users can upload only into their own folder:
-- <auth.uid()>/avatar.png

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
);


-- Users can update only their own avatar object.
-- The WITH CHECK prevents moving/renaming the object into another user's folder.

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
);


-- Users can delete only their own avatar object.

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
);