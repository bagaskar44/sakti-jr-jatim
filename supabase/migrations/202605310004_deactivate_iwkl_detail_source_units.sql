update public.master_units unit
set is_active = false
where unit.unit_type = 'OPERATOR'
  and exists (
    select 1
    from public.revenue_iwkl_details detail
    where upper(trim(detail.detail_type)) = unit.canonical_name
  );
