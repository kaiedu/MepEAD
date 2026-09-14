-- MEP EAD | Matrícula institucional dos alunos e login por matrícula.
-- Formato: MEP-AAAA-NNNNNN (ex.: MEP-2026-100001).

create sequence if not exists public.mep_matricula_seq
    start with 100001
    increment by 1
    minvalue 100001;

alter table public.usuarios
    add column if not exists matricula text;

create or replace function public.gerar_matricula_aluno()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if lower(coalesce(new.perfil, '')) = 'aluno'
       and nullif(trim(coalesce(new.matricula, '')), '') is null then
        new.matricula := 'MEP-'
            || to_char(now(), 'YYYY')
            || '-'
            || lpad(nextval('public.mep_matricula_seq')::text, 6, '0');
    end if;

    if new.matricula is not null then
        new.matricula := upper(trim(new.matricula));
    end if;

    return new;
end;
$$;

drop trigger if exists definir_matricula_aluno on public.usuarios;
create trigger definir_matricula_aluno
before insert or update of perfil, matricula on public.usuarios
for each row
execute function public.gerar_matricula_aluno();

update public.usuarios
set matricula = 'MEP-'
    || to_char(now(), 'YYYY')
    || '-'
    || lpad(nextval('public.mep_matricula_seq')::text, 6, '0')
where lower(coalesce(perfil, '')) = 'aluno'
  and nullif(trim(coalesce(matricula, '')), '') is null;

create unique index if not exists usuarios_matricula_unique
    on public.usuarios (upper(matricula))
    where matricula is not null;

create index if not exists usuarios_matricula_login_idx
    on public.usuarios (matricula)
    where lower(perfil) = 'aluno' and ativo = true;

create or replace function public.resolver_email_por_matricula(p_matricula text)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select u.email
    from public.usuarios u
    where lower(u.perfil) = 'aluno'
      and u.ativo = true
      and regexp_replace(upper(u.matricula), '[^A-Z0-9]', '', 'g') =
          regexp_replace(upper(trim(coalesce(p_matricula, ''))), '[^A-Z0-9]', '', 'g')
      and trim(coalesce(p_matricula, '')) <> ''
    limit 1;
$$;

revoke all on function public.resolver_email_por_matricula(text) from public;
grant execute on function public.resolver_email_por_matricula(text) to anon, authenticated;

comment on column public.usuarios.matricula is
    'Identificador institucional automático no formato MEP-AAAA-NNNNNN.';
