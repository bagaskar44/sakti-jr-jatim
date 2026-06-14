create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('ADMIN_KANWIL', 'VIEWER', 'ADMIN_LOKET')
  )
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create function public.handle_new_user_profile()
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

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create table public.revenue_import_batches (
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

create table public.revenue_swdkllj (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  unit_name text not null,
  parent_unit_name text not null,
  level text not null default 'DETAIL',
  kd numeric not null default 0,
  sw numeric not null default 0,
  denda numeric not null default 0,
  setor_adjustment numeric not null default 0,
  total numeric not null default 0,
  transaction_count numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.revenue_iwkbu (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  unit_name text not null,
  parent_unit_name text not null,
  level text not null default 'DETAIL',
  ask_last_year numeric not null default 0,
  iwkbu_last_year numeric not null default 0,
  ask_current_year numeric not null default 0,
  iwkbu_current_year numeric not null default 0,
  ask_activity_pct numeric not null default 0,
  iwkbu_activity_pct numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.revenue_iwkl_cabang (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  unit_name text not null,
  passenger_count numeric not null default 0,
  nominal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.revenue_iwkl_jenis (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.revenue_import_batches(id) on delete cascade,
  detail_type text not null,
  passenger_count numeric not null default 0,
  nominal numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.revenue_sync_logs (
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

create index revenue_import_batches_period_idx
  on public.revenue_import_batches(module, period_year, period_month);

create index revenue_import_batches_created_at_idx
  on public.revenue_import_batches(created_at desc);

create index revenue_swdkllj_batch_id_idx
  on public.revenue_swdkllj(batch_id);

create index revenue_swdkllj_unit_name_idx
  on public.revenue_swdkllj(unit_name);

create index revenue_swdkllj_parent_unit_name_idx
  on public.revenue_swdkllj(parent_unit_name);

create index revenue_swdkllj_level_idx
  on public.revenue_swdkllj(level);

create index revenue_iwkbu_batch_id_idx
  on public.revenue_iwkbu(batch_id);

create index revenue_iwkbu_unit_name_idx
  on public.revenue_iwkbu(unit_name);

create index revenue_iwkbu_parent_unit_name_idx
  on public.revenue_iwkbu(parent_unit_name);

create index revenue_iwkbu_level_idx
  on public.revenue_iwkbu(level);

create index revenue_iwkl_cabang_batch_id_idx
  on public.revenue_iwkl_cabang(batch_id);

create index revenue_iwkl_cabang_unit_name_idx
  on public.revenue_iwkl_cabang(unit_name);

create index revenue_iwkl_jenis_batch_id_idx
  on public.revenue_iwkl_jenis(batch_id);

create index revenue_iwkl_jenis_detail_type_idx
  on public.revenue_iwkl_jenis(detail_type);

create index revenue_sync_logs_period_idx
  on public.revenue_sync_logs(period_year, period_month);

create index revenue_sync_logs_created_at_idx
  on public.revenue_sync_logs(created_at desc);

create trigger trg_revenue_import_batches_updated_at
before update on public.revenue_import_batches
for each row
execute function public.set_updated_at();

alter table public.revenue_import_batches enable row level security;
alter table public.revenue_swdkllj enable row level security;
alter table public.revenue_iwkbu enable row level security;
alter table public.revenue_iwkl_cabang enable row level security;
alter table public.revenue_iwkl_jenis enable row level security;
alter table public.revenue_sync_logs enable row level security;

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
  false as is_drillable
from public.revenue_swdkllj swd
join public.revenue_import_batches batch
  on batch.id = swd.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'

union all

select
  null::uuid as id,
  swd.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  swd.parent_unit_name as unit_name,
  null::text as parent_unit_name,
  'PARENT_SUMMARY'::text as level,
  sum(swd.kd) as kd,
  sum(swd.sw) as sw,
  sum(swd.denda) as denda,
  sum(swd.setor_adjustment) as setor_adjustment,
  sum(swd.total) as total,
  sum(swd.transaction_count) as transaction_count,
  true as is_drillable
from public.revenue_swdkllj swd
join public.revenue_import_batches batch
  on batch.id = swd.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'
group by
  swd.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at,
  swd.parent_unit_name;

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
  false as is_drillable
from public.revenue_iwkbu iwk
join public.revenue_import_batches batch
  on batch.id = iwk.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'

union all

select
  null::uuid as id,
  iwk.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  iwk.parent_unit_name as unit_name,
  null::text as parent_unit_name,
  'PARENT_SUMMARY'::text as level,
  sum(iwk.ask_last_year) as ask_last_year,
  sum(iwk.iwkbu_last_year) as iwkbu_last_year,
  sum(iwk.ask_current_year) as ask_current_year,
  sum(iwk.iwkbu_current_year) as iwkbu_current_year,
  case
    when sum(iwk.ask_last_year) > 0 then
      ((sum(iwk.ask_current_year) - sum(iwk.ask_last_year)) / sum(iwk.ask_last_year)) * 100
    else 0
  end as ask_activity_pct,
  case
    when sum(iwk.iwkbu_last_year) > 0 then
      ((sum(iwk.iwkbu_current_year) - sum(iwk.iwkbu_last_year)) / sum(iwk.iwkbu_last_year)) * 100
    else 0
  end as iwkbu_activity_pct,
  true as is_drillable
from public.revenue_iwkbu iwk
join public.revenue_import_batches batch
  on batch.id = iwk.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed'
group by
  iwk.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at,
  iwk.parent_unit_name;

create view public.v_revenue_iwkl_cabang_monthly as
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
from public.revenue_iwkl_cabang iwkl
join public.revenue_import_batches batch
  on batch.id = iwkl.batch_id
where batch.module = 'pendapatan'
  and batch.status = 'processed';

create view public.v_revenue_iwkl_jenis_monthly as
select
  jenis.id,
  jenis.batch_id,
  batch.period_year,
  batch.period_month,
  batch.period_date,
  batch.created_at as uploaded_at,
  jenis.detail_type,
  jenis.passenger_count,
  jenis.nominal
from public.revenue_iwkl_jenis jenis
join public.revenue_import_batches batch
  on batch.id = jenis.batch_id
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
  from public.revenue_iwkl_cabang
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
from public.revenue_iwkl_cabang iwkl
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
    swd.parent_unit_name as unit_name,
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
  group by batch.period_year, batch.period_month, swd.parent_unit_name

  union all

  select
    batch.period_year,
    batch.period_month,
    iwk.parent_unit_name as unit_name,
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
  group by batch.period_year, batch.period_month, iwk.parent_unit_name

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
  from public.revenue_iwkl_cabang iwkl
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

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

grant select, insert, update, delete on public.revenue_import_batches to service_role;
grant select, insert, update, delete on public.revenue_swdkllj to service_role;
grant select, insert, update, delete on public.revenue_iwkbu to service_role;
grant select, insert, update, delete on public.revenue_iwkl_cabang to service_role;
grant select, insert, update, delete on public.revenue_iwkl_jenis to service_role;
grant select, insert, update, delete on public.revenue_sync_logs to service_role;

grant select on public.v_revenue_latest_batch to service_role;
grant select on public.v_revenue_overview_monthly to service_role;
grant select on public.v_revenue_source_composition to service_role;
grant select on public.v_revenue_by_unit_monthly to service_role;
grant select on public.v_revenue_swdkllj_monthly to service_role;
grant select on public.v_revenue_iwkbu_monthly to service_role;
grant select on public.v_revenue_iwkl_cabang_monthly to service_role;
grant select on public.v_revenue_iwkl_jenis_monthly to service_role;
