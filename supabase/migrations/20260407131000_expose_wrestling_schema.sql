grant usage on schema wrestling to anon, authenticated, service_role;
grant select on all tables in schema wrestling to anon, authenticated;
grant select, insert, update, delete on all tables in schema wrestling to service_role;
grant all on all routines in schema wrestling to anon, authenticated, service_role;
grant all on all sequences in schema wrestling to anon, authenticated, service_role;
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, wrestling';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
