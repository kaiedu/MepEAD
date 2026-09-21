-- MEP EAD | Matérias, vínculo das aulas e frequência acadêmica do aluno.

create table if not exists public.materias (
    id uuid primary key default gen_random_uuid(),
    curso_id uuid not null references public.cursos(id) on delete cascade,
    nome text not null,
    descricao text,
    aulas_previstas integer not null default 1,
    faltas_permitidas integer not null default 0,
    ativa boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint materias_nome_valido check (char_length(trim(nome)) between 2 and 120),
    constraint materias_aulas_previstas_validas check (aulas_previstas between 1 and 500),
    constraint materias_faltas_permitidas_validas check (faltas_permitidas between 0 and aulas_previstas)
);

create unique index if not exists materias_curso_nome_unique
    on public.materias (curso_id, lower(trim(nome)));

create index if not exists materias_curso_ativa_idx
    on public.materias (curso_id, ativa, nome);

alter table public.materias enable row level security;

drop policy if exists "Gestores administram materias" on public.materias;
create policy "Gestores administram materias"
on public.materias for all to authenticated
using (public.usuario_eh_gestor())
with check (public.usuario_eh_gestor());

grant select, insert, update, delete on public.materias to authenticated;

alter table public.lives
    add column if not exists materia_id uuid references public.materias(id) on delete restrict;

create index if not exists lives_materia_id_idx
    on public.lives (materia_id, turma_id, data_live);

create or replace function public.validar_materia_da_live()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_curso_turma uuid;
    v_curso_materia uuid;
begin
    if new.materia_id is null then
        return new;
    end if;

    select curso_id into v_curso_turma from public.turmas where id = new.turma_id;
    select curso_id into v_curso_materia from public.materias where id = new.materia_id and ativa = true;

    if v_curso_turma is null or v_curso_materia is null or v_curso_turma <> v_curso_materia then
        raise exception 'A matéria deve estar ativa e pertencer ao mesmo curso da turma.';
    end if;

    return new;
end;
$$;

drop trigger if exists validar_materia_da_live_trigger on public.lives;
create trigger validar_materia_da_live_trigger
before insert or update of turma_id, materia_id on public.lives
for each row execute function public.validar_materia_da_live();

create or replace function public.minha_frequencia_por_materia()
returns table (
    materia_id uuid,
    materia_nome text,
    materia_descricao text,
    curso_id uuid,
    curso_nome text,
    turma_id uuid,
    turma_nome text,
    aulas_previstas integer,
    faltas_permitidas integer,
    aula_id uuid,
    aula_titulo text,
    aula_data date,
    aula_horario time without time zone,
    aula_status text,
    chamada_id uuid,
    chamada_numero integer,
    chamada_aberta_em timestamptz,
    chamada_fechada_em timestamptz,
    respondeu boolean,
    respondido_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_aluno_id uuid;
begin
    select u.id into v_aluno_id
      from public.usuarios u
     where u.auth_id = auth.uid()
       and lower(u.perfil) = 'aluno'
       and u.ativo = true
     limit 1;

    if v_aluno_id is null then
        raise exception 'Aluno não encontrado ou acesso inativo.';
    end if;

    return query
    select m.id,
           m.nome,
           m.descricao,
           c.id,
           c.nome,
           t.id,
           t.nome,
           m.aulas_previstas,
           m.faltas_permitidas,
           l.id,
           l.titulo,
           l.data_live,
           l.horario_inicio,
           l.status,
           ch.id,
           ch.numero,
           ch.aberta_em,
           ch.fechada_em,
           coalesce(pr.respondeu, false),
           pr.respondido_em
      from public.turma_alunos ta
      join public.turmas t on t.id = ta.turma_id and t.ativa = true
      join public.cursos c on c.id = t.curso_id and c.ativo = true
      join public.materias m on m.curso_id = c.id and m.ativa = true
      left join public.lives l on l.turma_id = t.id and l.materia_id = m.id
      left join public.presencas_chamadas ch on ch.aula_id = l.id
      left join lateral (
          select bool_or(p.presente = true) as respondeu,
                 max(p.respondido_em) filter (where p.presente = true) as respondido_em
            from public.presencas p
           where p.chamada_id = ch.id
             and p.aluno_id = v_aluno_id
      ) pr on true
     where ta.aluno_id = v_aluno_id
       and ta.ativo = true
     order by c.nome, m.nome, t.nome, l.data_live nulls last,
              l.horario_inicio nulls last, ch.numero nulls last;
end;
$$;

revoke all on function public.minha_frequencia_por_materia() from public;
grant execute on function public.minha_frequencia_por_materia() to authenticated;

comment on table public.materias is
    'Grade de matérias por curso, com quantidade prevista de aulas e limite de faltas.';
comment on column public.lives.materia_id is
    'Matéria à qual a aula ao vivo pertence para cálculo acadêmico de frequência.';
