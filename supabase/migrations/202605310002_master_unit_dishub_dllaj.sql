alter type public.master_unit_type add value if not exists 'DISHUB';
alter type public.master_unit_type add value if not exists 'DLLAJ';

update public.master_units child
set parent_unit_id = parent.id
from public.master_units parent
where parent.canonical_name = 'KANTOR WILAYAH JAWA TIMUR'
  and child.parent_unit_id is null
  and child.unit_type in ('CABANG', 'KANTOR_PELAYANAN')
  and child.id <> parent.id;
