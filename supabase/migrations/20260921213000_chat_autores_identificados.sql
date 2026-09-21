-- MEP EAD | Identificação segura dos autores do chat para alunos e professores.

create or replace function public.chat_usuario_tem_acesso_live(p_live_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.professor_tem_acesso_live(p_live_id)
        or exists (
            select 1
              from public.lives l
              join public.turma_alunos ta on ta.turma_id = l.turma_id and ta.ativo = true
              join public.usuarios u on u.id = ta.aluno_id
             where l.id = p_live_id
               and u.auth_id = auth.uid()
               and u.ativo = true
               and lower(trim(u.perfil)) = 'aluno'
        );
$$;

revoke all on function public.chat_usuario_tem_acesso_live(uuid) from public;
grant execute on function public.chat_usuario_tem_acesso_live(uuid) to authenticated;

create or replace function public.chat_mensagens_com_autores(
    p_live_id uuid,
    p_limite integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_resultado jsonb;
begin
    if not public.chat_usuario_tem_acesso_live(p_live_id) then
        raise exception 'Você não tem acesso ao chat desta aula.';
    end if;

    select coalesce(jsonb_agg(mensagem.item order by mensagem.created_at), '[]'::jsonb)
      into v_resultado
      from (
          select cm.created_at, jsonb_build_object(
              'id', cm.id,
              'live_id', cm.live_id,
              'aluno_id', cm.aluno_id,
              'mensagem', cm.mensagem,
              'created_at', cm.created_at,
              'autor', jsonb_build_object(
                  'id', u.id,
                  'nome', u.nome,
                  'foto_url', u.foto_url,
                  'perfil', u.perfil
              )
          ) as item
            from public.chat_mensagens cm
            join public.usuarios u on u.id = cm.aluno_id
           where cm.live_id = p_live_id
           order by cm.created_at desc
           limit greatest(1, least(coalesce(p_limite, 200), 500))
      ) mensagem;

    return v_resultado;
end;
$$;

revoke all on function public.chat_mensagens_com_autores(uuid, integer) from public;
grant execute on function public.chat_mensagens_com_autores(uuid, integer) to authenticated;

create or replace function public.chat_mensagem_com_autor(p_mensagem_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_live_id uuid;
    v_resultado jsonb;
begin
    select cm.live_id into v_live_id
      from public.chat_mensagens cm
     where cm.id = p_mensagem_id;

    if v_live_id is null or not public.chat_usuario_tem_acesso_live(v_live_id) then
        raise exception 'Você não tem acesso a esta mensagem.';
    end if;

    select jsonb_build_object(
        'id', cm.id,
        'live_id', cm.live_id,
        'aluno_id', cm.aluno_id,
        'mensagem', cm.mensagem,
        'created_at', cm.created_at,
        'autor', jsonb_build_object(
            'id', u.id,
            'nome', u.nome,
            'foto_url', u.foto_url,
            'perfil', u.perfil
        )
    ) into v_resultado
      from public.chat_mensagens cm
      join public.usuarios u on u.id = cm.aluno_id
     where cm.id = p_mensagem_id;

    return v_resultado;
end;
$$;

revoke all on function public.chat_mensagem_com_autor(uuid) from public;
grant execute on function public.chat_mensagem_com_autor(uuid) to authenticated;
