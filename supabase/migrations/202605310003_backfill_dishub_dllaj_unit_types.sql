update public.master_units
set unit_type = 'DISHUB'
where unit_type = 'LAINNYA'
  and (
    canonical_name ilike '%DISHUB%'
    or unit_name ilike '%DISHUB%'
  );

update public.master_units
set unit_type = 'DLLAJ'
where unit_type = 'LAINNYA'
  and (
    canonical_name ilike '%DLLAJ%'
    or unit_name ilike '%DLLAJ%'
  );
