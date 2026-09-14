-- MEP EAD | Importa o último login conhecido de cada conta já existente.

insert into public.acessos_plataforma (usuario_id, acessado_em)
select u.id,
       au.last_sign_in_at
  from auth.users au
  join public.usuarios u on u.auth_id = au.id
 where au.last_sign_in_at is not null
   and not exists (
       select 1
         from public.acessos_plataforma acesso
        where acesso.usuario_id = u.id
          and acesso.acessado_em = au.last_sign_in_at
   );
