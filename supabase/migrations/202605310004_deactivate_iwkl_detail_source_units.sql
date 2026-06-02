do $$
begin
  if to_regclass('public.master_units') is not null
     and to_regclass('public.revenue_iwkl_details') is not null then
    update public.master_units unit
    set is_active = false
    where unit.unit_type = 'OPERATOR'
      and exists (
        select 1
        from public.revenue_iwkl_details detail
        where upper(trim(detail.detail_type)) = unit.canonical_name
      );
  end if;
end $$;
