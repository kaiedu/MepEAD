-- MEP EAD | Snapshot seguro com os dados reais do professor autenticado.

create or replace function public.professor_portal_dados()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_professor public.usuarios%rowtype;
    v_resultado jsonb;
begin
    select u.*
      into v_professor
      from public.usuarios u
     where u.auth_id = auth.uid()
       and u.ativo = true
       and lower(trim(u.perfil)) = 'professor'
     limit 1;

    if v_professor.id is null then
        raise exception 'Professor autenticado não encontrado ou sem acesso ativo.';
    end if;

    with turmas_acessiveis as (
        select tp.turma_id
          from public.turma_professores tp
         where tp.professor_id = v_professor.id
        union
        select l.turma_id
          from public.lives l
         where l.professor_id = v_professor.id
    ),
    turmas_professor as (
        select t.*
          from public.turmas t
          join turmas_acessiveis ta on ta.turma_id = t.id
    ),
    lives_professor as (
        select l.*
          from public.lives l
         where l.professor_id = v_professor.id
            or exists (
                select 1
                  from public.turma_professores tp
                 where tp.professor_id = v_professor.id
                   and tp.turma_id = l.turma_id
            )
    )
    select jsonb_build_object(
        'professor', jsonb_build_object(
            'id', v_professor.id,
            'nome', v_professor.nome,
            'email', v_professor.email,
            'perfil', v_professor.perfil,
            'ativo', v_professor.ativo,
            'foto_url', v_professor.foto_url
        ),
        'vinculos', coalesce((
            select jsonb_agg(jsonb_build_object('turma_id', tp.turma_id) order by tp.turma_id)
              from public.turma_professores tp
             where tp.professor_id = v_professor.id
        ), '[]'::jsonb),
        'turmas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', t.id,
                'curso_id', t.curso_id,
                'nome', t.nome,
                'codigo', t.codigo,
                'descricao', t.descricao,
                'data_inicio', t.data_inicio,
                'data_fim', t.data_fim,
                'ativa', t.ativa
            ) order by t.nome)
              from turmas_professor t
        ), '[]'::jsonb),
        'cursos', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', c.id,
                'nome', c.nome,
                'descricao', c.descricao,
                'imagem_url', c.imagem_url,
                'ativo', c.ativo
            ) order by c.nome)
              from public.cursos c
             where exists (select 1 from turmas_professor t where t.curso_id = c.id)
        ), '[]'::jsonb),
        'materias', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', m.id,
                'curso_id', m.curso_id,
                'nome', m.nome,
                'descricao', m.descricao,
                'ativa', m.ativa
            ) order by m.nome)
              from public.materias m
             where exists (select 1 from turmas_professor t where t.curso_id = m.curso_id)
        ), '[]'::jsonb),
        'lives', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', l.id,
                'turma_id', l.turma_id,
                'materia_id', l.materia_id,
                'professor_id', l.professor_id,
                'titulo', l.titulo,
                'descricao', l.descricao,
                'data_live', l.data_live,
                'horario_inicio', l.horario_inicio,
                'horario_fim', l.horario_fim,
                'status', l.status,
                'created_at', l.created_at,
                'updated_at', l.updated_at
            ) order by l.data_live desc, l.horario_inicio desc)
              from lives_professor l
        ), '[]'::jsonb),
        'matriculas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'turma_id', ta.turma_id,
                'aluno_id', ta.aluno_id,
                'ativo', ta.ativo,
                'data_matricula', ta.data_matricula,
                'usuarios', jsonb_build_object(
                    'id', u.id,
                    'nome', u.nome,
                    'email', u.email,
                    'foto_url', u.foto_url
                )
            ) order by u.nome)
              from public.turma_alunos ta
              join public.usuarios u on u.id = ta.aluno_id
             where ta.ativo = true
               and exists (select 1 from turmas_professor t where t.id = ta.turma_id)
        ), '[]'::jsonb),
        'chamadas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', pc.id,
                'aula_id', pc.aula_id,
                'numero', pc.numero,
                'ativa', pc.ativa,
                'aberta_em', pc.aberta_em,
                'fechada_em', pc.fechada_em
            ) order by pc.aberta_em desc)
              from public.presencas_chamadas pc
             where exists (select 1 from lives_professor l where l.id = pc.aula_id)
        ), '[]'::jsonb),
        'atualizado_em', now()
    ) into v_resultado;

    return v_resultado;
end;
$$;

revoke all on function public.professor_portal_dados() from public;
grant execute on function public.professor_portal_dados() to authenticated;

create or replace function public.professor_sala_dados(p_live_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_resultado jsonb;
begin
    if not public.professor_tem_acesso_live(p_live_id) then
        raise exception 'Você não tem acesso a esta aula.';
    end if;

    update public.presencas_chamadas pc
       set ativa = false,
           fechada_em = coalesce(pc.fechada_em, pc.aberta_em + make_interval(secs => coalesce(pc.duracao_segundos, 15)))
     where pc.aula_id = p_live_id
       and pc.ativa = true
       and pc.aberta_em + make_interval(secs => coalesce(pc.duracao_segundos, 15)) <= now();

    select jsonb_build_object(
        'live', jsonb_build_object(
            'id', l.id,
            'turma_id', l.turma_id,
            'materia_id', l.materia_id,
            'professor_id', l.professor_id,
            'titulo', l.titulo,
            'descricao', l.descricao,
            'data_live', l.data_live,
            'horario_inicio', l.horario_inicio,
            'horario_fim', l.horario_fim,
            'status', l.status,
            'updated_at', l.updated_at
        ),
        'turma', jsonb_build_object(
            'id', t.id,
            'curso_id', t.curso_id,
            'nome', t.nome,
            'codigo', t.codigo,
            'descricao', t.descricao,
            'ativa', t.ativa
        ),
        'curso', jsonb_build_object('id', c.id, 'nome', c.nome),
        'materia', case when m.id is null then null else jsonb_build_object('id', m.id, 'nome', m.nome) end,
        'total_alunos', (
            select count(*)
              from public.turma_alunos ta
             where ta.turma_id = l.turma_id
               and ta.ativo = true
        ),
        'chamadas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', pc.id,
                'aula_id', pc.aula_id,
                'turma_id', pc.turma_id,
                'numero', pc.numero,
                'ativa', pc.ativa,
                'aberta_em', pc.aberta_em,
                'fechada_em', pc.fechada_em,
                'duracao_segundos', pc.duracao_segundos
            ) order by pc.numero desc)
              from public.presencas_chamadas pc
             where pc.aula_id = l.id
        ), '[]'::jsonb),
        'presencas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', p.id,
                'chamada_id', p.chamada_id,
                'aluno_id', p.aluno_id,
                'presente', p.presente,
                'respondido_em', p.respondido_em
            ))
              from public.presencas p
             where p.aula_id = l.id
        ), '[]'::jsonb),
        'chat', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', cm.id,
                'live_id', cm.live_id,
                'aluno_id', cm.aluno_id,
                'mensagem', cm.mensagem,
                'created_at', cm.created_at,
                'autor', jsonb_build_object(
                    'nome', u.nome,
                    'foto_url', u.foto_url,
                    'perfil', u.perfil
                )
            ) order by cm.created_at)
              from public.chat_mensagens cm
              left join public.usuarios u on u.id = cm.aluno_id
             where cm.live_id = l.id
        ), '[]'::jsonb),
        'atualizado_em', now()
    )
      into v_resultado
      from public.lives l
      join public.turmas t on t.id = l.turma_id
      join public.cursos c on c.id = t.curso_id
      left join public.materias m on m.id = l.materia_id
     where l.id = p_live_id;

    if v_resultado is null then
        raise exception 'Aula não encontrada.';
    end if;

    return v_resultado;
end;
$$;

revoke all on function public.professor_sala_dados(uuid) from public;
grant execute on function public.professor_sala_dados(uuid) to authenticated;

-- Uma chamada vencida não pode impedir a abertura da próxima.
create or replace function public.professor_abrir_chamada(
    p_aula_id uuid,
    p_duracao_segundos integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_live public.lives%rowtype;
    v_chamada public.presencas_chamadas%rowtype;
    v_numero integer;
    v_total integer := 0;
begin
    if not public.professor_tem_acesso_live(p_aula_id) then
        raise exception 'Você não tem acesso a esta aula.';
    end if;

    perform pg_advisory_xact_lock(hashtext(p_aula_id::text));

    select * into v_live from public.lives where id = p_aula_id;
    if v_live.id is null then raise exception 'Aula não encontrada.'; end if;
    if lower(replace(replace(trim(coalesce(v_live.status, '')), '-', '_'), ' ', '_')) <> 'ao_vivo' then
        raise exception 'A aula precisa estar ao vivo para abrir uma chamada.';
    end if;

    update public.presencas_chamadas pc
       set ativa = false,
           fechada_em = coalesce(pc.fechada_em, pc.aberta_em + make_interval(secs => coalesce(pc.duracao_segundos, 15)))
     where pc.aula_id = p_aula_id
       and pc.ativa = true
       and pc.aberta_em + make_interval(secs => coalesce(pc.duracao_segundos, 15)) <= now();

    if exists (select 1 from public.presencas_chamadas where aula_id = p_aula_id and ativa = true) then
        raise exception 'Já existe uma chamada aberta nesta aula.';
    end if;

    select coalesce(max(numero), 0) + 1 into v_numero
      from public.presencas_chamadas
     where turma_id = v_live.turma_id;

    insert into public.presencas_chamadas (aula_id, turma_id, numero, ativa, aberta_em, fechada_em, duracao_segundos)
    values (p_aula_id, v_live.turma_id, v_numero, true, now(), null, greatest(5, least(coalesce(p_duracao_segundos, 15), 120)))
    returning * into v_chamada;

    insert into public.presencas (chamada_id, aula_id, turma_id, aluno_id, presente, respondido_em)
    select v_chamada.id, p_aula_id, v_live.turma_id, ta.aluno_id, false, null
      from public.turma_alunos ta
     where ta.turma_id = v_live.turma_id
       and ta.ativo = true
    on conflict do nothing;

    get diagnostics v_total = row_count;

    return jsonb_build_object(
        'id', v_chamada.id,
        'numero', v_chamada.numero,
        'aberta_em', v_chamada.aberta_em,
        'duracao_segundos', v_chamada.duracao_segundos,
        'total_alunos', v_total
    );
end;
$$;

revoke all on function public.professor_abrir_chamada(uuid, integer) from public;
grant execute on function public.professor_abrir_chamada(uuid, integer) to authenticated;
