-- MEP EAD | Perfil pessoal do aluno e fotos de perfil.

alter table public.usuarios
    add column if not exists telefone text,
    add column if not exists telefone_secundario text,
    add column if not exists foto_path text,
    add column if not exists perfil_atualizado_em timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'fotos-perfil',
    'fotos-perfil',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Aluno envia sua foto de perfil" on storage.objects;
create policy "Aluno envia sua foto de perfil"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Aluno atualiza sua foto de perfil" on storage.objects;
create policy "Aluno atualiza sua foto de perfil"
on storage.objects for update to authenticated
using (
    bucket_id = 'fotos-perfil'
    and owner_id = auth.uid()::text
)
with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Aluno remove sua foto de perfil" on storage.objects;
create policy "Aluno remove sua foto de perfil"
on storage.objects for delete to authenticated
using (
    bucket_id = 'fotos-perfil'
    and owner_id = auth.uid()::text
);

create or replace function public.atualizar_meu_perfil(
    p_nome text,
    p_telefone text default null,
    p_telefone_secundario text default null,
    p_foto_url text default null,
    p_foto_path text default null,
    p_remover_foto boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_auth_id uuid := auth.uid();
    v_usuario public.usuarios%rowtype;
    v_nome text := trim(coalesce(p_nome, ''));
    v_telefone text := nullif(trim(coalesce(p_telefone, '')), '');
    v_telefone_secundario text := nullif(trim(coalesce(p_telefone_secundario, '')), '');
    v_foto_url text := nullif(trim(coalesce(p_foto_url, '')), '');
    v_foto_path text := nullif(trim(coalesce(p_foto_path, '')), '');
begin
    if v_auth_id is null then
        raise exception 'Sessão não encontrada.';
    end if;

    if char_length(v_nome) < 2 or char_length(v_nome) > 120 then
        raise exception 'Informe um nome válido.';
    end if;

    if char_length(coalesce(v_telefone, '')) > 30
       or char_length(coalesce(v_telefone_secundario, '')) > 30 then
        raise exception 'Telefone inválido.';
    end if;

    if v_foto_path is not null and v_foto_path not like v_auth_id::text || '/%' then
        raise exception 'Caminho da foto inválido.';
    end if;

    if v_foto_url is not null
       and v_foto_url not like '%/storage/v1/object/public/fotos-perfil/' || v_auth_id::text || '/%' then
        raise exception 'Endereço da foto inválido.';
    end if;

    update public.usuarios
    set nome = v_nome,
        telefone = v_telefone,
        telefone_secundario = v_telefone_secundario,
        foto_url = case when p_remover_foto then null else coalesce(v_foto_url, foto_url) end,
        foto_path = case when p_remover_foto then null else coalesce(v_foto_path, foto_path) end,
        perfil_atualizado_em = now()
    where auth_id = v_auth_id
      and lower(perfil) = 'aluno'
      and ativo = true
    returning * into v_usuario;

    if v_usuario.id is null then
        raise exception 'Aluno não encontrado ou acesso inativo.';
    end if;

    return jsonb_build_object(
        'id', v_usuario.id,
        'nome', v_usuario.nome,
        'email', v_usuario.email,
        'telefone', v_usuario.telefone,
        'telefone_secundario', v_usuario.telefone_secundario,
        'foto_url', v_usuario.foto_url,
        'foto_path', v_usuario.foto_path,
        'perfil_atualizado_em', v_usuario.perfil_atualizado_em
    );
end;
$$;

revoke all on function public.atualizar_meu_perfil(text, text, text, text, text, boolean) from public;
grant execute on function public.atualizar_meu_perfil(text, text, text, text, text, boolean) to authenticated;
