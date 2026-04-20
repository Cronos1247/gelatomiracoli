do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournaments_name_date_key'
      and conrelid = 'wrestling.tournaments'::regclass
  ) then
    alter table wrestling.tournaments
    add constraint tournaments_name_date_key unique (name, date);
  end if;
end
$$;
