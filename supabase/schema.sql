-- Supabase schema for Navio AI Logistics
-- Creates normalized tables and RLS policies for authenticated users.
-- Run in Supabase SQL editor. Adjust bucket/policies as needed.

-- Orders (Pool)
create table if not exists public.orders (
  id uuid primary key,
  order_id text,
  document_number text,
  document_year text,
  document_type text,
  customer_reference_number text,
  document_date date,
  customer_number text,
  customer_name1 text,
  customer_name2 text,
  shipping_country_code text,
  shipping_country_name text,
  shipping_postcode text,
  shipping_city text,
  shipping_street text,
  total_weight_kg numeric,
  is_planned boolean default false,
  tour_id uuid references public.tours(id)
);

-- Tours
create table if not exists public.tours (
  id uuid primary key,
  name text not null,
  date date,
  status text,
  freight_status text,
  total_weight numeric,
  max_weight numeric,
  utilization numeric,
  estimated_distance_km numeric,
  driver_name text,
  vehicle_plate text,
  loaded_image_url text,
  loaded_note text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Tour stops (ordered)
create table if not exists public.tour_stops (
  id uuid primary key,
  tour_id uuid references public.tours(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  position int,
  created_at timestamptz default now()
);

-- Activities / audit
create table if not exists public.activities (
  id uuid primary key,
  timestamp timestamptz default now(),
  user_id text,
  user_name text,
  type text,
  description text,
  snapshot jsonb,
  is_restored boolean default false
);

-- Feedback table (already in use)
create table if not exists public.tour_feedback (
  id uuid primary key,
  tour_id text,
  rating text,
  comment text,
  user_name text,
  created_at timestamptz default now()
);

-- Basic RLS: authenticated users can read/write
alter table public.orders enable row level security;
alter table public.tours enable row level security;
alter table public.tour_stops enable row level security;
alter table public.activities enable row level security;
alter table public.tour_feedback enable row level security;

do $$
begin
  perform 1/0;
exception when division_by_zero then
  null;
end $$;

-- Policies
create policy if not exists orders_rw on public.orders
  for all to authenticated using (true) with check (true);

create policy if not exists tours_rw on public.tours
  for all to authenticated using (true) with check (true);

create policy if not exists tour_stops_rw on public.tour_stops
  for all to authenticated using (true) with check (true);

create policy if not exists activities_rw on public.activities
  for all to authenticated using (true) with check (true);

create policy if not exists feedback_rw on public.tour_feedback
  for all to authenticated using (true) with check (true);

-- Storage bucket policies (if not already set)
-- replace bucket_id with your bucket (e.g., tour_uploads)
-- create policy "public read tour_uploads" on storage.objects
--   for select to public using (bucket_id = 'tour_uploads');
-- create policy "auth write tour_uploads" on storage.objects
--   for insert to authenticated with check (bucket_id = 'tour_uploads');
