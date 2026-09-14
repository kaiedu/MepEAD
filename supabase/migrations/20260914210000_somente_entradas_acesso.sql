-- MEP EAD | Histórico definitivo: somente logins autenticados.

drop function if exists public.registrar_saida_plataforma();
drop function if exists public.listar_acessos_plataforma(integer);

delete from public.acessos_plataforma
 where tipo_evento = 'saida';

drop index if exists public.acessos_plataforma_tipo_evento_idx;

alter table public.acessos_plataforma
    drop constraint if exists acessos_plataforma_tipo_evento_check,
    drop column if exists tipo_evento;

create function public.listar_acessos_plataforma(p_limite integer default 3)
returns table (
    id bigint,
    usuario_id uuid,
    nome text,
    perfil text,
    foto_url text,
    acessado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null or not exists (
        select 1
          from public.usuarios gestor
         where gestor.auth_id = auth.uid()
           and lower(gestor.perfil) = 'gestor'
           and gestor.ativo = true
    ) then
        raise exception 'Acesso permitido somente para gestores.';
    end if;

    return query
    select a.id,
           a.usuario_id,
           u.nome,
           u.perfil,
           u.foto_url,
           a.acessado_em
      from public.acessos_plataforma a
      join public.usuarios u on u.id = a.usuario_id
     order by a.acessado_em desc
     limit greatest(1, least(coalesce(p_limite, 3), 1000));
end;
$$;

revoke all on function public.listar_acessos_plataforma(integer) from public;
grant execute on function public.listar_acessos_plataforma(integer) to authenticated;

comment on table public.acessos_plataforma is
    'Registra somente logins autenticados na plataforma MEP EAD.';
