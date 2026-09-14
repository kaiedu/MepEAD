-- MEP EAD | Corrige o registro de entrada após remover os eventos de saída.

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

    select u.id
      into v_usuario_id
      from public.usuarios u
     where u.auth_id = auth.uid()
       and u.ativo = true
     limit 1;

    if v_usuario_id is null then
        raise exception 'Usuário não encontrado ou acesso inativo.';
    end if;

    insert into public.acessos_plataforma (usuario_id)
    values (v_usuario_id)
    returning id into v_acesso_id;

    return jsonb_build_object('success', true, 'id', v_acesso_id);
end;
$$;

revoke all on function public.registrar_acesso_plataforma() from public;
grant execute on function public.registrar_acesso_plataforma() to authenticated;
