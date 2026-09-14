-- MEP EAD | Diferencia entradas e saídas no histórico da plataforma.

alter table public.acessos_plataforma
    add column if not exists tipo_evento text not null default 'entrada';

alter table public.acessos_plataforma
    drop constraint if exists acessos_plataforma_tipo_evento_check;

alter table public.acessos_plataforma
    add constraint acessos_plataforma_tipo_evento_check
    check (tipo_evento in ('entrada', 'saida'));

create index if not exists acessos_plataforma_tipo_evento_idx
    on public.acessos_plataforma (tipo_evento, acessado_em desc);

create or replace function public.registrar_acesso_plataforma()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario_id uuid;
    v_acesso_id bigint;
begin
    if auth.uid() is null then
        raise exception 'Sessão não encontrada.';
    end if;

    select u.id into v_usuario_id
      from public.usuarios u
     where u.auth_id = auth.uid()
       and u.ativo = true
     limit 1;

    if v_usuario_id is null then
        raise exception 'Usuário não encontrado ou acesso inativo.';
    end if;

    insert into public.acessos_plataforma (usuario_id, tipo_evento)
    values (v_usuario_id, 'entrada')
    returning id into v_acesso_id;

    return jsonb_build_object('success', true, 'id', v_acesso_id, 'tipo_evento', 'entrada');
end;
$$;

create or replace function public.registrar_saida_plataforma()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario_id uuid;
    v_acesso_id bigint;
begin
    if auth.uid() is null then
        raise exception 'Sessão não encontrada.';
    end if;

    select u.id into v_usuario_id
      from public.usuarios u
     where u.auth_id = auth.uid()
       and u.ativo = true
     limit 1;

    if v_usuario_id is null then
        raise exception 'Usuário não encontrado ou acesso inativo.';
    end if;

    insert into public.acessos_plataforma (usuario_id, tipo_evento)
    values (v_usuario_id, 'saida')
    returning id into v_acesso_id;

    return jsonb_build_object('success', true, 'id', v_acesso_id, 'tipo_evento', 'saida');
end;
$$;

drop function if exists public.listar_acessos_plataforma(integer);

create function public.listar_acessos_plataforma(p_limite integer default 3)
returns table (
    id bigint,
    usuario_id uuid,
    nome text,
    perfil text,
    foto_url text,
    tipo_evento text,
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
           a.tipo_evento,
           a.acessado_em
      from public.acessos_plataforma a
      join public.usuarios u on u.id = a.usuario_id
     order by a.acessado_em desc
     limit greatest(1, least(coalesce(p_limite, 3), 1000));
end;
$$;

revoke all on function public.registrar_saida_plataforma() from public;
revoke all on function public.listar_acessos_plataforma(integer) from public;
grant execute on function public.registrar_saida_plataforma() to authenticated;
grant execute on function public.listar_acessos_plataforma(integer) to authenticated;

comment on column public.acessos_plataforma.tipo_evento is
    'Evento de entrada no login ou saída pelo botão de logout.';
