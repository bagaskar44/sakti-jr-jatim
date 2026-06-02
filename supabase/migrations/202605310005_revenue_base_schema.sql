create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('ADMIN_KANWIL', 'VIEWER', 'ADMIN_LOKET')
  )
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'VIEWER';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'VIEWER')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    execute '
      create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id)
    ';
  end if;
end $$;

create table if not exists public.revenue_import_batches (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'pendapatan',
  period_year integer not null,
  period_month integer not null,
  period_date date not null,
  spreadsheet_id text,
  status text not null default 'processed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revenue_import_batches_period_year_check check (
    period_year between 2000 and 2100
  ),
  constraint revenue_import_batches_period_month_check check (
    period_month between 1 and 12
  ),
  constraint revenue_import_batches_module_period_key unique (
    module,
    period_year,
    period_month
  )
);

create table if not exists public.revenue_swdkllj (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  unit_name text not null,
  parent_unit_name text,
  level text not null,
  kd numeric not null default 0,
  sw numeric not null default 0,
  denda numeric not null default 0,
  setor_adjustment numeric not null default 0,
  total numeric not null default 0,
  transaction_count numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_iwkbu (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  unit_name text not null,
  parent_unit_name text,
  level text not null,
  ask_last_year numeric not null default 0,
  iwkbu_last_year numeric not null default 0,
  ask_current_year numeric not null default 0,
  iwkbu_current_year numeric not null default 0,
  ask_activity_pct numeric not null default 0,
  iwkbu_activity_pct numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_iwkl (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  unit_name text not null,
  passenger_count numeric not null default 0,
  nominal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_iwkl_details (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  parent_unit_name text not null,
  detail_type text not null,
  passenger_count numeric not null default 0,
  nominal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_sync_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.revenue_import_batches(id) on delete set null,
  period_year integer not null,
  period_month integer not null,
  spreadsheet_id text,
  status text not null,
  message text,
  technical_error_count integer not null default 0,
  business_warning_count integer not null default 0,
  row_counts jsonb,
  totals jsonb,
  created_at timestamptz not null default now(),
  constraint revenue_sync_logs_period_year_check check (
    period_year between 2000 and 2100
  ),
  constraint revenue_sync_logs_period_month_check check (
    period_month between 1 and 12
  )
);

create index if not exists revenue_import_batches_period_idx
  on public.revenue_import_batches(module, period_year, period_month);

create index if not exists revenue_import_batches_created_at_idx
  on public.revenue_import_batches(created_at desc);

create index if not exists revenue_swdkllj_batch_id_idx
  on public.revenue_swdkllj(batch_id);

create index if not exists revenue_swdkllj_unit_name_idx
  on public.revenue_swdkllj(unit_name);

create index if not exists revenue_swdkllj_parent_unit_name_idx
  on public.revenue_swdkllj(parent_unit_name);

create index if not exists revenue_swdkllj_level_idx
  on public.revenue_swdkllj(level);

create index if not exists revenue_iwkbu_batch_id_idx
  on public.revenue_iwkbu(batch_id);

create index if not exists revenue_iwkbu_unit_name_idx
  on public.revenue_iwkbu(unit_name);

create index if not exists revenue_iwkbu_parent_unit_name_idx
  on public.revenue_iwkbu(parent_unit_name);

create index if not exists revenue_iwkbu_level_idx
  on public.revenue_iwkbu(level);

create index if not exists revenue_iwkl_batch_id_idx
  on public.revenue_iwkl(batch_id);

create index if not exists revenue_iwkl_unit_name_idx
  on public.revenue_iwkl(unit_name);

create index if not exists revenue_iwkl_details_batch_id_idx
  on public.revenue_iwkl_details(batch_id);

create index if not exists revenue_iwkl_details_parent_unit_name_idx
  on public.revenue_iwkl_details(parent_unit_name);

create index if not exists revenue_sync_logs_period_idx
  on public.revenue_sync_logs(period_year, period_month);

create index if not exists revenue_sync_logs_created_at_idx
  on public.revenue_sync_logs(created_at desc);

drop trigger if exists trg_revenue_import_batches_updated_at
  on public.revenue_import_batches;

create trigger trg_revenue_import_batches_updated_at
before update on public.revenue_import_batches
for each row
execute function public.set_updated_at();

alter table public.revenue_import_batches enable row level security;
alter table public.revenue_swdkllj enable row level security;
alter table public.revenue_iwkbu enable row level security;
alter table public.revenue_iwkl enable row level security;
alter table public.revenue_iwkl_details enable row level security;
alter table public.revenue_sync_logs enable row level security;

drop view if exists public.v_revenue_latest_batch cascade;
drop view if exists public.v_revenue_overview_monthly cascade;
drop view if exists public.v_revenue_source_composition cascade;
drop view if exists public.v_revenue_by_unit_monthly cascade;
drop view if exists public.v_revenue_swdkllj_monthly cascade;
drop view if exists public.v_revenue_iwkbu_monthly cascade;
drop view if exists public.v_revenue_iwkl_monthly cascade;
drop view if exists public.v_revenue_iwkl_detail_monthly cascade;

create view public.v_revenue_latest_batch as
select
  batch.id as batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.spreadsheet_id,
  batch.status,
  batch.created_at,
  batch.created_at as uploaded_at
from public.revenue_import_batches batch
where batch.module = 'pendapatan'
  and batch.status = 'processed'
order by batch.period_year desc, batch.period_month desc, batch.created_at desc
limit 1;

create view public.v_revenue_swdkllj_monthly as
select
  swd.id,
  swd.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  swd.unit_name,
  swd.parent_unit_name,
  swd.level,
  swd.kd,
  swd.sw,
  swd.denda,
  swd.setor_adjustment,
  swd.total,
  swd.transaction_count,
  swd.level = 'CABANG_SUMMARY' as is_drillable
from public.revenue_swdkllj swd
join public.revenue_import_batches batch
  on batch.id = swd.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed';

create view public.v_revenue_iwkbu_monthly as
select
  iwk.id,
  iwk.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  iwk.unit_name,
  iwk.parent_unit_name,
  iwk.level,
  iwk.ask_last_year,
  iwk.iwkbu_last_year,
  iwk.ask_current_year,
  iwk.iwkbu_current_year,
  iwk.ask_activity_pct,
  iwk.iwkbu_activity_pct,
  iwk.level = 'SUMMARY' as is_drillable
from public.revenue_iwkbu iwk
join public.revenue_import_batches batch
  on batch.id = iwk.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed';

create view public.v_revenue_iwkl_monthly as
select
  iwkl.id,
  iwkl.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  iwkl.unit_name,
  iwkl.passenger_count,
  iwkl.nominal,
  true as is_drillable
from public.revenue_iwkl iwkl
join public.revenue_import_batches batch
  on batch.id = iwkl.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed';

create view public.v_revenue_iwkl_detail_monthly as
select
  detail.id,
  detail.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  detail.parent_unit_name,
  detail.detail_type,
  detail.passenger_count,
  detail.nominal
from public.revenue_iwkl_details detail
join public.revenue_import_batches batch
  on batch.id = detail.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed';

create view public.v_revenue_overview_monthly as
with swdkllj as (
  select
    batch_id,
    sum(total) as swdkllj_total,
    sum(transaction_count) as swdkllj_transaction_count
  from public.revenue_swdkllj
  group by batch_id
),
iwkbu as (
  select
    batch_id,
    sum(iwkbu_current_year) as iwkbu_total,
    sum(iwkbu_last_year) as iwkbu_last_year_total
  from public.revenue_iwkbu
  group by batch_id
),
iwkl as (
  select
    batch_id,
    sum(nominal) as iwkl_total,
    sum(passenger_count) as iwkl_passenger_count
  from public.revenue_iwkl
  group by batch_id
)
select
  batch.id as batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  coalesce(swdkllj.swdkllj_total, 0) as swdkllj_total,
  coalesce(iwkbu.iwkbu_total, 0) as iwkbu_total,
  coalesce(iwkl.iwkl_total, 0) as iwkl_total,
  (
    coalesce(swdkllj.swdkllj_total, 0)
    + coalesce(iwkbu.iwkbu_total, 0)
    + coalesce(iwkl.iwkl_total, 0)
  ) as total_revenue,
  coalesce(swdkllj.swdkllj_transaction_count, 0) as swdkllj_transaction_count,
  coalesce(iwkl.iwkl_passenger_count, 0) as iwkl_passenger_count,
  case
    when coalesce(iwkbu.iwkbu_last_year_total, 0) > 0 then
      (
        (
          coalesce(iwkbu.iwkbu_total, 0)
          - coalesce(iwkbu.iwkbu_last_year_total, 0)
        )
        / coalesce(iwkbu.iwkbu_last_year_total, 0)
      ) * 100
    else null
  end as iwkbu_growth_pct
from public.revenue_import_batches batch
left join swdkllj on swdkllj.batch_id = batch.id
left join iwkbu on iwkbu.batch_id = batch.id
left join iwkl on iwkl.batch_id = batch.id
where batch.module = 'pendapatan'
  and batch.status = 'processed';

create view public.v_revenue_source_composition as
select
  batch.period_year,
  batch.period_month,
  'SWDKLLJ'::text as source_name,
  sum(swd.total) as amount
from public.revenue_swdkllj swd
join public.revenue_import_batches batch
  on batch.id = swd.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'
group by batch.period_year, batch.period_month

union all

select
  batch.period_year,
  batch.period_month,
  'IWKBU'::text as source_name,
  sum(iwk.iwkbu_current_year) as amount
from public.revenue_iwkbu iwk
join public.revenue_import_batches batch
  on batch.id = iwk.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'
group by batch.period_year, batch.period_month

union all

select
  batch.period_year,
  batch.period_month,
  'IWKL'::text as source_name,
  sum(iwkl.nominal) as amount
from public.revenue_iwkl iwkl
join public.revenue_import_batches batch
  on batch.id = iwkl.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'
group by batch.period_year, batch.period_month;

create view public.v_revenue_by_unit_monthly as
with unit_sources as (
  select
    batch.period_year,
    batch.period_month,
    swd.unit_name,
    sum(swd.total) as swdkllj_total,
    0::numeric as iwkbu_total,
    0::numeric as iwkl_total,
    sum(swd.transaction_count) as swdkllj_transaction_count,
    0::numeric as iwkl_passenger_count,
    0::numeric as iwkbu_last_year_total
  from public.revenue_swdkllj swd
  join public.revenue_import_batches batch
    on batch.id = swd.batch_id
  where batch.module = 'pendapatan'
    and batch.status = 'processed'
  group by batch.period_year, batch.period_month, swd.unit_name

  union all

  select
    batch.period_year,
    batch.period_month,
    iwk.unit_name,
    0::numeric as swdkllj_total,
    sum(iwk.iwkbu_current_year) as iwkbu_total,
    0::numeric as iwkl_total,
    0::numeric as swdkllj_transaction_count,
    0::numeric as iwkl_passenger_count,
    sum(iwk.iwkbu_last_year) as iwkbu_last_year_total
  from public.revenue_iwkbu iwk
  join public.revenue_import_batches batch
    on batch.id = iwk.batch_id
  where batch.module = 'pendapatan'
    and batch.status = 'processed'
  group by batch.period_year, batch.period_month, iwk.unit_name

  union all

  select
    batch.period_year,
    batch.period_month,
    iwkl.unit_name,
    0::numeric as swdkllj_total,
    0::numeric as iwkbu_total,
    sum(iwkl.nominal) as iwkl_total,
    0::numeric as swdkllj_transaction_count,
    sum(iwkl.passenger_count) as iwkl_passenger_count,
    0::numeric as iwkbu_last_year_total
  from public.revenue_iwkl iwkl
  join public.revenue_import_batches batch
    on batch.id = iwkl.batch_id
  where batch.module = 'pendapatan'
    and batch.status = 'processed'
  group by batch.period_year, batch.period_month, iwkl.unit_name
)
select
  period_year,
  period_month,
  unit_name,
  sum(swdkllj_total) as swdkllj_total,
  sum(iwkbu_total) as iwkbu_total,
  sum(iwkl_total) as iwkl_total,
  (
    sum(swdkllj_total)
    + sum(iwkbu_total)
    + sum(iwkl_total)
  ) as total_revenue,
  sum(swdkllj_transaction_count) as swdkllj_transaction_count,
  sum(iwkl_passenger_count) as iwkl_passenger_count,
  case
    when sum(iwkbu_last_year_total) > 0 then
      ((sum(iwkbu_total) - sum(iwkbu_last_year_total)) / sum(iwkbu_last_year_total)) * 100
    else null
  end as iwkbu_growth_pct
from unit_sources
group by period_year, period_month, unit_name;

update public.master_units unit
set is_active = false
where unit.unit_type = 'OPERATOR'
  and exists (
    select 1
    from public.revenue_iwkl_details detail
    where upper(trim(detail.detail_type)) = unit.canonical_name
  );

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

grant select, insert, update, delete on public.revenue_import_batches to service_role;
grant select, insert, update, delete on public.revenue_swdkllj to service_role;
grant select, insert, update, delete on public.revenue_iwkbu to service_role;
grant select, insert, update, delete on public.revenue_iwkl to service_role;
grant select, insert, update, delete on public.revenue_iwkl_details to service_role;
grant select, insert, update, delete on public.revenue_sync_logs to service_role;

grant select on public.v_revenue_latest_batch to service_role;
grant select on public.v_revenue_overview_monthly to service_role;
grant select on public.v_revenue_source_composition to service_role;
grant select on public.v_revenue_by_unit_monthly to service_role;
grant select on public.v_revenue_swdkllj_monthly to service_role;
grant select on public.v_revenue_iwkbu_monthly to service_role;
grant select on public.v_revenue_iwkl_monthly to service_role;
grant select on public.v_revenue_iwkl_detail_monthly to service_role;
