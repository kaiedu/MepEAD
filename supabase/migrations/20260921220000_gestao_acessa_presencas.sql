-- MEP EAD | O gestor administra as mesmas chamadas e presenças criadas no sistema.

alter table public.presencas_chamadas enable row level security;

drop policy if exists "Gestores administram chamadas de presenca" on public.presencas_chamadas;
create policy "Gestores administram chamadas de presenca"
on public.presencas_chamadas
for all
to authenticated
using (public.usuario_eh_gestor())
with check (public.usuario_eh_gestor());

alter table public.presencas enable row level security;

drop policy if exists "Gestores administram presencas" on public.presencas;
create policy "Gestores administram presencas"
on public.presencas
for all
to authenticated
using (public.usuario_eh_gestor())
with check (public.usuario_eh_gestor());

grant select, insert, update, delete on public.presencas_chamadas to authenticated;
grant select, insert, update, delete on public.presencas to authenticated;
