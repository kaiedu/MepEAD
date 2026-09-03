-- MEP EAD | Atualizações de status das lives em tempo real.

do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'lives'
    ) then
        alter publication supabase_realtime add table public.lives;
    end if;
end;
$$;
