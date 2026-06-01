create extension if not exists pgcrypto;

do $$
begin
  create type public.master_unit_type as enum (
    'KANWIL',
    'CABANG',
    'KANTOR_PELAYANAN',
    'SAMSAT',
    'LOKET',
    'OPERATOR',
    'DISHUB',
    'DLLAJ',
    'LAINNYA'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.master_units (
  id uuid primary key default gen_random_uuid(),
  unit_name text not null,
  canonical_name text not null unique,
  unit_type public.master_unit_type not null default 'LAINNYA',
  parent_unit_id uuid references public.master_units(id) on delete set null,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_units_latitude_range check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  constraint master_units_longitude_range check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  ),
  constraint master_units_not_self_parent check (
    parent_unit_id is null or parent_unit_id <> id
  )
);

create table if not exists public.master_unit_aliases (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.master_units(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists master_units_parent_unit_id_idx
  on public.master_units(parent_unit_id);

create index if not exists master_units_unit_type_idx
  on public.master_units(unit_type);

create index if not exists master_units_is_active_idx
  on public.master_units(is_active);

create index if not exists master_unit_aliases_unit_id_idx
  on public.master_unit_aliases(unit_id);

create or replace function public.set_master_units_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_master_units_updated_at on public.master_units;

create trigger trg_master_units_updated_at
before update on public.master_units
for each row
execute function public.set_master_units_updated_at();

alter table public.master_units enable row level security;
alter table public.master_unit_aliases enable row level security;
