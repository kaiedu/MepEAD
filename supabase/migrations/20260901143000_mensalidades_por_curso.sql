-- MEP EAD | Mensalidades recorrentes por curso.
-- A matrícula, o progresso e a presença nunca são apagados por inadimplência.

alter table public.cursos
    add column if not exists mensalidade_ativa boolean not null default false,
    add column if not exists mensalidade_valor numeric(10,2),
    add column if not exists mensalidade_bloqueio_modo text not null default 'nao_bloquear',
    add column if not exists mensalidade_carencia_dias integer not null default 0,
    add column if not exists mensalidade_configurada_em timestamptz,
    add column if not exists mercadopago_plano_id text,
    add column if not exists mercadopago_plano_status text;

alter table public.cursos drop constraint if exists cursos_mensalidade_valor_check;
alter table public.cursos add constraint cursos_mensalidade_valor_check
    check (mensalidade_valor is null or mensalidade_valor > 0);

alter table public.cursos drop constraint if exists cursos_mensalidade_bloqueio_modo_check;
alter table public.cursos add constraint cursos_mensalidade_bloqueio_modo_check
    check (mensalidade_bloqueio_modo in ('nao_bloquear', 'imediato', 'apos_dias'));

alter table public.cursos drop constraint if exists cursos_mensalidade_carencia_dias_check;
alter table public.cursos add constraint cursos_mensalidade_carencia_dias_check
    check (mensalidade_carencia_dias between 0 and 365);

create table if not exists public.assinaturas_curso (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.usuarios(id) on delete cascade,
    curso_id uuid not null references public.cursos(id) on delete cascade,
    mercadopago_assinatura_id text unique,
    referencia_externa text not null unique,
    status text not null default 'pending',
    email_pagador text,
    valor_mensal numeric(10,2) not null,
    checkout_url text,
    proxima_cobranca_em timestamptz,
    ultimo_pagamento_status text,
    ultimo_pagamento_em timestamptz,
    inadimplente_desde timestamptz,
    status_atualizado_em timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint assinaturas_curso_aluno_curso_unique unique (aluno_id, curso_id),
    constraint assinaturas_curso_valor_check check (valor_mensal > 0)
);

create table if not exists public.pagamentos_mensalidades (
    id uuid primary key default gen_random_uuid(),
    assinatura_id uuid not null references public.assinaturas_curso(id) on delete cascade,
    mercadopago_pagamento_id text,
    mercadopago_pagamento_autorizado_id text,
    status text not null,
    valor numeric(10,2),
    moeda text not null default 'BRL',
    pago_em timestamptz,
    vencimento_em timestamptz,
    detalhe_status text,
    dados_processador jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists pagamentos_mensalidades_mp_pagamento_unique
    on public.pagamentos_mensalidades (mercadopago_pagamento_id)
    where mercadopago_pagamento_id is not null;

create unique index if not exists pagamentos_mensalidades_mp_autorizado_unique
    on public.pagamentos_mensalidades (mercadopago_pagamento_autorizado_id)
    where mercadopago_pagamento_autorizado_id is not null;

create index if not exists assinaturas_curso_status_idx on public.assinaturas_curso (status);
create index if not exists assinaturas_curso_curso_idx on public.assinaturas_curso (curso_id);
create index if not exists pagamentos_mensalidades_assinatura_idx on public.pagamentos_mensalidades (assinatura_id, created_at desc);

create or replace function public.mensalidades_atualizar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists assinaturas_curso_updated_at on public.assinaturas_curso;
create trigger assinaturas_curso_updated_at
before update on public.assinaturas_curso
for each row execute function public.mensalidades_atualizar_updated_at();

drop trigger if exists pagamentos_mensalidades_updated_at on public.pagamentos_mensalidades;
create trigger pagamentos_mensalidades_updated_at
before update on public.pagamentos_mensalidades
for each row execute function public.mensalidades_atualizar_updated_at();

alter table public.assinaturas_curso enable row level security;
alter table public.pagamentos_mensalidades enable row level security;

drop policy if exists "Aluno visualiza suas assinaturas" on public.assinaturas_curso;
create policy "Aluno visualiza suas assinaturas"
on public.assinaturas_curso for select to authenticated
using (aluno_id = public.usuario_atual_id());

drop policy if exists "Gestor gerencia assinaturas" on public.assinaturas_curso;
create policy "Gestor gerencia assinaturas"
on public.assinaturas_curso for all to authenticated
using (public.usuario_e_gestor())
with check (public.usuario_e_gestor());

drop policy if exists "Aluno visualiza seus pagamentos" on public.pagamentos_mensalidades;
create policy "Aluno visualiza seus pagamentos"
on public.pagamentos_mensalidades for select to authenticated
using (exists (
    select 1 from public.assinaturas_curso a
    where a.id = pagamentos_mensalidades.assinatura_id
      and a.aluno_id = public.usuario_atual_id()
));

drop policy if exists "Gestor gerencia pagamentos" on public.pagamentos_mensalidades;
create policy "Gestor gerencia pagamentos"
on public.pagamentos_mensalidades for all to authenticated
using (public.usuario_e_gestor())
with check (public.usuario_e_gestor());

create or replace function public.aluno_status_financeiro_curso(p_curso_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_aluno_id uuid;
    v_curso public.cursos%rowtype;
    v_assinatura public.assinaturas_curso%rowtype;
    v_matricula_em timestamptz;
    v_inicio_pendencia timestamptz;
    v_liberado boolean := false;
    v_motivo text := 'mensalidade_pendente';
    v_dias_atraso integer := 0;
begin
    v_aluno_id := public.usuario_atual_id();

    if v_aluno_id is null then
        return jsonb_build_object('liberado', false, 'motivo', 'usuario_nao_identificado');
    end if;

    select c.* into v_curso from public.cursos c where c.id = p_curso_id;
    if not found then
        return jsonb_build_object('liberado', false, 'motivo', 'curso_nao_encontrado');
    end if;

    select min(ta.data_matricula) into v_matricula_em
    from public.turma_alunos ta
    join public.turmas t on t.id = ta.turma_id
    where ta.aluno_id = v_aluno_id
      and ta.ativo = true
      and t.curso_id = p_curso_id;

    if v_matricula_em is null then
        return jsonb_build_object('liberado', false, 'motivo', 'sem_matricula');
    end if;

    select a.* into v_assinatura
    from public.assinaturas_curso a
    where a.aluno_id = v_aluno_id and a.curso_id = p_curso_id
    limit 1;

    if v_curso.mensalidade_ativa is not true then
        v_liberado := true;
        v_motivo := 'curso_sem_mensalidade';
    elsif v_curso.mensalidade_bloqueio_modo = 'nao_bloquear' then
        v_liberado := true;
        v_motivo := 'politica_sem_bloqueio';
    elsif v_assinatura.id is not null
          and lower(coalesce(v_assinatura.status, '')) = 'authorized'
          and v_assinatura.inadimplente_desde is null then
        v_liberado := true;
        v_motivo := 'mensalidade_em_dia';
    else
        v_inicio_pendencia := coalesce(
            v_assinatura.inadimplente_desde,
            v_curso.mensalidade_configurada_em,
            v_assinatura.created_at,
            v_matricula_em,
            now()
        );
        v_dias_atraso := greatest(0, floor(extract(epoch from (now() - v_inicio_pendencia)) / 86400)::integer);

        if v_curso.mensalidade_bloqueio_modo = 'apos_dias'
           and now() < v_inicio_pendencia + make_interval(days => v_curso.mensalidade_carencia_dias) then
            v_liberado := true;
            v_motivo := 'periodo_de_tolerancia';
        else
            v_liberado := false;
            v_motivo := 'acesso_bloqueado_por_mensalidade';
        end if;
    end if;

    return jsonb_build_object(
        'liberado', v_liberado,
        'motivo', v_motivo,
        'mensalidade_ativa', v_curso.mensalidade_ativa,
        'valor', v_curso.mensalidade_valor,
        'bloqueio_modo', v_curso.mensalidade_bloqueio_modo,
        'carencia_dias', v_curso.mensalidade_carencia_dias,
        'dias_atraso', v_dias_atraso,
        'assinatura_id', v_assinatura.id,
        'assinatura_status', coalesce(v_assinatura.status, 'sem_assinatura'),
        'checkout_url', v_assinatura.checkout_url,
        'proxima_cobranca_em', v_assinatura.proxima_cobranca_em,
        'ultimo_pagamento_status', v_assinatura.ultimo_pagamento_status,
        'ultimo_pagamento_em', v_assinatura.ultimo_pagamento_em
    );
end;
$$;

create or replace function public.aluno_tem_acesso_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((public.aluno_status_financeiro_curso(p_curso_id)->>'liberado')::boolean, false);
$$;

revoke all on function public.aluno_status_financeiro_curso(uuid) from public;
revoke all on function public.aluno_tem_acesso_curso(uuid) from public;
grant execute on function public.aluno_status_financeiro_curso(uuid) to authenticated;
grant execute on function public.aluno_tem_acesso_curso(uuid) to authenticated;

create or replace function public.aluno_status_financeiro_live(p_live_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_curso_id uuid;
begin
    select t.curso_id into v_curso_id
    from public.lives l
    join public.turmas t on t.id = l.turma_id
    where l.id = p_live_id;

    if v_curso_id is null then
        return jsonb_build_object('liberado', false, 'motivo', 'aula_nao_encontrada');
    end if;
    return public.aluno_status_financeiro_curso(v_curso_id) || jsonb_build_object('curso_id', v_curso_id);
end;
$$;

revoke all on function public.aluno_status_financeiro_live(uuid) from public;
grant execute on function public.aluno_status_financeiro_live(uuid) to authenticated;

-- O vídeo da live só é devolvido se a matrícula e a situação financeira permitirem.
create or replace function public.aluno_live_ao_vivo(p_live_id uuid)
returns table(
    id uuid, turma_id uuid, titulo text, descricao text, data_live date,
    horario_inicio time without time zone, horario_fim time without time zone,
    status text, youtube_url text, youtube_video_id text
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
    where u.auth_id = auth.uid() and lower(u.perfil) = 'aluno' and u.ativo = true
    limit 1;

    if v_aluno_id is null then
        raise exception 'Aluno não encontrado ou acesso inativo.';
    end if;

    return query
    select l.id, l.turma_id, l.titulo, l.descricao, l.data_live,
           l.horario_inicio, l.horario_fim, l.status, l.youtube_url, l.youtube_video_id
    from public.lives l
    join public.turmas t on t.id = l.turma_id
    join public.turma_alunos ta on ta.turma_id = l.turma_id
        and ta.aluno_id = v_aluno_id and ta.ativo = true
    where l.id = p_live_id
      and l.status = 'ao_vivo'
      and public.aluno_tem_acesso_curso(t.curso_id);
end;
$$;

revoke all on function public.aluno_live_ao_vivo(uuid) from public;
grant execute on function public.aluno_live_ao_vivo(uuid) to authenticated;

-- Substitui a política ampla anterior e preserva acesso de gestores e professores.
drop policy if exists "Permitir visualizar lives" on public.lives;
drop policy if exists "Visualizar lives conforme acesso" on public.lives;
create policy "Visualizar lives conforme acesso"
on public.lives for select to authenticated
using (
    public.usuario_eh_gestor()
    or exists (
        select 1 from public.usuarios u
        where u.auth_id = auth.uid() and u.ativo = true and u.id = lives.professor_id
    )
    or exists (
        select 1
        from public.turma_professores tp
        join public.usuarios u on u.id = tp.professor_id
        where tp.turma_id = lives.turma_id and u.auth_id = auth.uid() and u.ativo = true
    )
    or exists (
        select 1
        from public.turma_alunos ta
        join public.usuarios u on u.id = ta.aluno_id
        join public.turmas t on t.id = ta.turma_id
        where ta.turma_id = lives.turma_id
          and ta.ativo = true
          and u.auth_id = auth.uid()
          and u.ativo = true
          and public.aluno_tem_acesso_curso(t.curso_id)
    )
);

-- Configuração inicial solicitada: Teologia, R$ 50,00, sem bloqueio automático.
update public.cursos
set mensalidade_ativa = true,
    mensalidade_valor = 50.00,
    mensalidade_bloqueio_modo = 'nao_bloquear',
    mensalidade_carencia_dias = 0,
    mensalidade_configurada_em = coalesce(mensalidade_configurada_em, now())
where lower(nome) like '%teologia%';

grant select on public.assinaturas_curso, public.pagamentos_mensalidades to authenticated;
grant insert, update, delete on public.assinaturas_curso, public.pagamentos_mensalidades to authenticated;
