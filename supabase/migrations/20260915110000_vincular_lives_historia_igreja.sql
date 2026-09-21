-- MEP EAD | Vincula as duas aulas históricas à matéria A HISTÓRIA DA IGREJA.

do $$
declare
    v_materia_id constant uuid := 'cbe2e034-06b0-43b4-8a38-537d599144c2';
    v_curso_id constant uuid := '4304f3ac-e899-46d3-b6b3-b1b63617893d';
    v_lives_encontradas integer;
begin
    if not exists (
        select 1
          from public.materias
         where id = v_materia_id
           and curso_id = v_curso_id
           and ativa = true
    ) then
        raise exception 'A matéria A HISTÓRIA DA IGREJA não foi encontrada ativa no curso esperado.';
    end if;

    select count(*)
      into v_lives_encontradas
      from public.lives l
      join public.turmas t on t.id = l.turma_id
     where l.id in (
        'effec7c9-5da4-41d2-9039-bc7ea7bffa27'::uuid,
        'ce1a265e-761e-42a1-9cb6-46dcad9b1735'::uuid
     )
       and t.curso_id = v_curso_id;

    if v_lives_encontradas <> 2 then
        raise exception 'As duas lives históricas esperadas não foram encontradas no curso.';
    end if;

    update public.lives
       set materia_id = v_materia_id,
           updated_at = now()
     where id in (
        'effec7c9-5da4-41d2-9039-bc7ea7bffa27'::uuid,
        'ce1a265e-761e-42a1-9cb6-46dcad9b1735'::uuid
     );
end;
$$;
