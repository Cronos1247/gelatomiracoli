create extension if not exists pg_net with schema extensions;
create or replace function wrestling.notify_data_request()
returns trigger
language plpgsql
security definer
set search_path = wrestling, public, extensions
as $$
begin
  begin
    perform net.http_post(
      url := 'https://urpxsbccqzarkzcoajwr.supabase.co/functions/v1/notify-data-request',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'id', new.id,
        'state', new.state,
        'weight_class', new.weight_class,
        'style', new.style,
        'division', new.division,
        'search_term', new.search_term,
        'gender', new.gender,
        'requested_from', new.requested_from,
        'created_at', new.created_at
      )
    );
  exception
    when others then
      raise notice 'notify-data-request trigger failed: %', sqlerrm;
  end;

  return new;
end;
$$;
drop trigger if exists notify_data_request_after_insert on wrestling.data_requests;
create trigger notify_data_request_after_insert
after insert on wrestling.data_requests
for each row
execute function wrestling.notify_data_request();
