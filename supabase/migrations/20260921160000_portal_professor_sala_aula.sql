-- MEP EAD | Sala operacional do professor: chamadas, presença e chat.

create or replace function public.professor_tem_acesso_live(p_live_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
          from public.usuarios u
          join public.lives l on l.id = p_live_id
         where u.auth_id = auth.uid()
           and u.ativo = true
           and lower(u.perfil) = 'professor'
           and (
               l.professor_id = u.id
               or exists (
                   select 1
                     from public.turma_professores tp
                    where tp.professor_id = u.id
                      and tp.turma_id = l.turma_id
               )
           )
    );
$$;

revoke all on function public.professor_tem_acesso_live(uuid) from public;
grant execute on function public.professor_tem_acesso_live(uuid) to authenticated;

drop policy if exists "Professores visualizam materias vinculadas" on public.materias;
create policy "Professores visualizam materias vinculadas"
on public.materias for select to authenticated
using (
    exists (
        select 1
          from public.usuarios u
         where u.auth_id = auth.uid()
           and u.ativo = true
           and lower(u.perfil) = 'professor'
           and (
               exists (
                   select 1 from public.turma_professores tp
                   join public.turmas t on t.id = tp.turma_id
                   where tp.professor_id = u.id and t.curso_id = materias.curso_id
               )
               or exists (
                   select 1 from public.lives l
                   join public.turmas t on t.id = l.turma_id
                   where l.professor_id = u.id and t.curso_id = materias.curso_id
               )
           )
    )
);

alter table public.presencas_chamadas enable row level security;
drop policy if exists "Professores visualizam chamadas vinculadas" on public.presencas_chamadas;
create policy "Professores visualizam chamadas vinculadas"
on public.presencas_chamadas for select to authenticated
using (public.professor_tem_acesso_live(aula_id));

alter table public.presencas enable row level security;
drop policy if exists "Professores visualizam presencas vinculadas" on public.presencas;
create policy "Professores visualizam presencas vinculadas"
on public.presencas for select to authenticated
using (public.professor_tem_acesso_live(aula_id));

alter table public.chat_mensagens enable row level security;
drop policy if exists "Professores visualizam chat vinculado" on public.chat_mensagens;
create policy "Professores visualizam chat vinculado"
on public.chat_mensagens for select to authenticated
using (public.professor_tem_acesso_live(live_id));

drop policy if exists "Professores enviam chat vinculado" on public.chat_mensagens;
create policy "Professores enviam chat vinculado"
on public.chat_mensagens for insert to authenticated
with check (
    aluno_id = (
        select u.id from public.usuarios u
         where u.auth_id = auth.uid()
           and u.ativo = true
           and lower(u.perfil) = 'professor'
         limit 1
    )
    and public.professor_tem_acesso_live(live_id)
);

grant select on public.materias, public.presencas_chamadas, public.presencas, public.chat_mensagens to authenticated;
grant insert on public.chat_mensagens to authenticated;

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
    if v_live.id is null then
        raise exception 'Aula não encontrada.';
    end if;
    if lower(replace(replace(trim(coalesce(v_live.status, '')), '-', '_'), ' ', '_')) <> 'ao_vivo' then
        raise exception 'A aula precisa estar ao vivo para abrir uma chamada.';
    end if;
    if exists (select 1 from public.presencas_chamadas where aula_id = p_aula_id and ativa = true) then
        raise exception 'Já existe uma chamada aberta nesta aula.';
    end if;

    select coalesce(max(numero), 0) + 1 into v_numero
      from public.presencas_chamadas
     where turma_id = v_live.turma_id;

    insert into public.presencas_chamadas (
        aula_id, turma_id, numero, ativa, aberta_em, fechada_em, duracao_segundos
    ) values (
        p_aula_id, v_live.turma_id, v_numero, true, now(), null,
        greatest(5, least(coalesce(p_duracao_segundos, 15), 120))
    ) returning * into v_chamada;

    insert into public.presencas (
        chamada_id, aula_id, turma_id, aluno_id, presente, respondido_em
    )
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

create or replace function public.professor_finalizar_chamada(p_chamada_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_chamada public.presencas_chamadas%rowtype;
begin
    select * into v_chamada from public.presencas_chamadas where id = p_chamada_id;
    if v_chamada.id is null then
        raise exception 'Chamada não encontrada.';
    end if;
    if not public.professor_tem_acesso_live(v_chamada.aula_id) then
        raise exception 'Você não tem acesso a esta chamada.';
    end if;

    update public.presencas_chamadas
       set ativa = false,
           fechada_em = coalesce(fechada_em, now())
     where id = p_chamada_id
       and ativa = true;

    return jsonb_build_object('id', p_chamada_id, 'finalizada', true);
end;
$$;

revoke all on function public.professor_abrir_chamada(uuid, integer) from public;
revoke all on function public.professor_finalizar_chamada(uuid) from public;
grant execute on function public.professor_abrir_chamada(uuid, integer) to authenticated;
grant execute on function public.professor_finalizar_chamada(uuid) to authenticated;
