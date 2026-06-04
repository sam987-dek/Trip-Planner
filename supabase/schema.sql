-- Supabase schema for TripEase

-- 1. Create tables with appropriate foreign key references and CASCADE DELETE actions
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table if not exists public.itineraries (
  id uuid primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  content jsonb,
  created_at timestamptz default now()
);

create table if not exists public.budgets (
  id uuid primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  currency text,
  total numeric,
  created_at timestamptz default now()
);

create table if not exists public.saved_places (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  place jsonb,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS) on all tables
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.itineraries enable row level security;
alter table public.budgets enable row level security;
alter table public.saved_places enable row level security;

-- 3. Create RLS Policies to restrict data access to the authenticated owner
create policy "Allow users to read their own profile" 
  on public.users for select using (auth.uid() = id);
create policy "Allow users to insert their own profile" 
  on public.users for insert with check (auth.uid() = id);
create policy "Allow users to update their own profile" 
  on public.users for update using (auth.uid() = id);

create policy "Allow users to read their own trips" 
  on public.trips for select using (auth.uid() = user_id);
create policy "Allow users to insert their own trips" 
  on public.trips for insert with check (auth.uid() = user_id);
create policy "Allow users to update their own trips" 
  on public.trips for update using (auth.uid() = user_id);
create policy "Allow users to delete their own trips" 
  on public.trips for delete using (auth.uid() = user_id);

create policy "Allow users to read their own itineraries" 
  on public.itineraries for select using (
    exists (
      select 1 from public.trips 
      where trips.id = itineraries.trip_id and trips.user_id = auth.uid()
    )
  );
create policy "Allow users to insert their own itineraries" 
  on public.itineraries for insert with check (
    exists (
      select 1 from public.trips 
      where trips.id = trip_id and trips.user_id = auth.uid()
    )
  );
create policy "Allow users to update their own itineraries" 
  on public.itineraries for update using (
    exists (
      select 1 from public.trips 
      where trips.id = itineraries.trip_id and trips.user_id = auth.uid()
    )
  );
create policy "Allow users to delete their own itineraries" 
  on public.itineraries for delete using (
    exists (
      select 1 from public.trips 
      where trips.id = itineraries.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Allow users to manage their own budgets" 
  on public.budgets for all using (
    exists (
      select 1 from public.trips 
      where trips.id = budgets.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Allow users to manage their own saved places" 
  on public.saved_places for all using (auth.uid() = user_id);

-- 4. Automatically sync auth.users to public.users via Database Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

