/* MEP EAD | Gestão de matérias e critérios de frequência. */
(() => {
    "use strict";

    const db = window.supabaseClient;
    const $ = id => document.getElementById(id);
    const state = { materias:[], cursos:[], editandoId:null, carregando:false };

    const esc = valor => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const nomeCurso = id => state.cursos.find(curso => String(curso.id) === String(id))?.nome || "Curso não encontrado";

    function mensagem(texto, tipo = "erro") {
        const elemento = $("materiaMensagem");
        if (!elemento) return;
        elemento.hidden = !texto;
        elemento.textContent = texto || "";
        elemento.className = `form-message ${tipo}`;
    }

    function preencherCursos() {
        [$("materiaFiltroCurso"), $("materiaCurso")].forEach((select, indice) => {
            if (!select) return;
            const atual = select.value;
            select.innerHTML = `<option value="">${indice === 0 ? "Todos os cursos" : "Selecione o curso"}</option>` +
                state.cursos.filter(curso => curso.ativo !== false).map(curso => `<option value="${esc(curso.id)}">${esc(curso.nome)}</option>`).join("");
            if ([...select.options].some(option => option.value === atual)) select.value = atual;
        });
    }

    async function carregarCursos() {
        const { data, error } = await db.from("cursos").select("id,nome,ativo").order("nome");
        if (error) throw error;
        state.cursos = data || [];
        preencherCursos();
    }

    function materiasFiltradas() {
        const cursoId = $("materiaFiltroCurso")?.value || "";
        const busca = String($("materiaBusca")?.value || "").trim().toLowerCase();
        return state.materias.filter(materia => {
            const cursoOk = !cursoId || String(materia.curso_id) === String(cursoId);
            const texto = `${materia.nome || ""} ${materia.descricao || ""} ${nomeCurso(materia.curso_id)}`.toLowerCase();
            return cursoOk && (!busca || texto.includes(busca));
        });
    }

    function renderizar() {
        const lista = $("materiasList");
        if (!lista) return;
        const filtradas = materiasFiltradas();
        $("materiasTotal").textContent = state.materias.length;
        $("materiasAtivas").textContent = state.materias.filter(item => item.ativa).length;
        $("materiasAulasPrevistas").textContent = state.materias.filter(item => item.ativa).reduce((total,item) => total + Number(item.aulas_previstas || 0), 0);
        $("materiasExibidas").textContent = `${filtradas.length} ${filtradas.length === 1 ? "matéria" : "matérias"}`;

        if (!filtradas.length) {
            lista.innerHTML = `<div class="materias-empty"><span>▤</span><strong>Nenhuma matéria encontrada</strong><p>Cadastre a grade ou ajuste os filtros utilizados.</p></div>`;
            return;
        }

        lista.innerHTML = filtradas.map(materia => `<article class="materia-row ${materia.ativa ? "" : "inativa"}">
            <div class="materia-row-mark"><span>${esc((materia.nome || "M").charAt(0).toUpperCase())}</span></div>
            <div class="materia-row-main"><small>${esc(nomeCurso(materia.curso_id))}</small><strong>${esc(materia.nome)}</strong><p>${esc(materia.descricao || "Sem descrição cadastrada.")}</p></div>
            <div class="materia-row-metric"><small>AULAS PREVISTAS</small><strong>${Number(materia.aulas_previstas || 0)}</strong></div>
            <div class="materia-row-metric"><small>FALTAS PERMITIDAS</small><strong>${Number(materia.faltas_permitidas || 0)}</strong></div>
            <span class="materia-status ${materia.ativa ? "ativa" : "inativa"}"><i></i>${materia.ativa ? "Ativa" : "Inativa"}</span>
            <div class="materia-row-actions"><button type="button" data-editar-materia="${esc(materia.id)}">Editar</button><button type="button" data-alternar-materia="${esc(materia.id)}">${materia.ativa ? "Desativar" : "Ativar"}</button></div>
        </article>`).join("");
    }

    async function carregarMaterias() {
        if (state.carregando) return;
        state.carregando = true;
        const lista = $("materiasList");
        if (lista) lista.innerHTML = `<div class="materias-loading"><i></i><span>Carregando matérias...</span></div>`;
        try {
            if (!state.cursos.length) await carregarCursos();
            const { data, error } = await db.from("materias").select("id,curso_id,nome,descricao,aulas_previstas,faltas_permitidas,ativa,created_at,updated_at").order("nome");
            if (error) throw error;
            state.materias = data || [];
            renderizar();
        } catch (erro) {
            console.error("MEP EAD | Erro ao carregar matérias:", erro);
            if (lista) lista.innerHTML = `<div class="materias-empty error"><span>!</span><strong>Não foi possível carregar</strong><p>${esc(erro.message || "Tente novamente.")}</p></div>`;
        } finally { state.carregando = false; }
    }

    function abrirModal(materia = null) {
        state.editandoId = materia?.id || null;
        $("materiaForm")?.reset();
        $("materiaModalTitulo").textContent = materia ? "Editar matéria" : "Nova matéria";
        $("salvarMateria").textContent = materia ? "Salvar alterações" : "Salvar matéria";
        $("materiaCurso").value = materia?.curso_id || "";
        $("materiaNome").value = materia?.nome || "";
        $("materiaDescricao").value = materia?.descricao || "";
        $("materiaAulas").value = materia?.aulas_previstas || 1;
        $("materiaFaltas").value = materia?.faltas_permitidas ?? 0;
        $("materiaAtiva").checked = materia ? materia.ativa !== false : true;
        mensagem("");
        const modal = $("materiaModal");
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("materia-modal-open");
        setTimeout(() => $("materiaNome")?.focus(), 50);
    }

    function fecharModal() {
        const modal = $("materiaModal");
        if (!modal) return;
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("materia-modal-open");
        state.editandoId = null;
    }

    async function salvar(evento) {
        evento.preventDefault();
        const cursoId = $("materiaCurso")?.value || "";
        const nome = String($("materiaNome")?.value || "").trim();
        const descricao = String($("materiaDescricao")?.value || "").trim();
        const aulas = Number($("materiaAulas")?.value || 0);
        const faltas = Number($("materiaFaltas")?.value || 0);
        if (!cursoId || nome.length < 2) return mensagem("Selecione o curso e informe o nome da matéria.");
        if (!Number.isInteger(aulas) || aulas < 1 || aulas > 500) return mensagem("Informe uma quantidade válida de aulas.");
        if (!Number.isInteger(faltas) || faltas < 0 || faltas > aulas) return mensagem("As faltas permitidas devem estar entre zero e a quantidade de aulas.");

        const botao = $("salvarMateria");
        botao.disabled = true;
        botao.textContent = "Salvando...";
        const dados = { curso_id:cursoId, nome, descricao:descricao || null, aulas_previstas:aulas, faltas_permitidas:faltas, ativa:$("materiaAtiva")?.checked === true, updated_at:new Date().toISOString() };
        try {
            const resposta = state.editandoId
                ? await db.from("materias").update(dados).eq("id", state.editandoId)
                : await db.from("materias").insert(dados);
            if (resposta.error) throw resposta.error;
            fecharModal();
            await carregarMaterias();
            await window.recarregarMateriasLives?.();
        } catch (erro) {
            mensagem(erro.code === "23505" ? "Já existe uma matéria com este nome no curso." : (erro.message || "Não foi possível salvar a matéria."));
        } finally {
            botao.disabled = false;
            botao.textContent = state.editandoId ? "Salvar alterações" : "Salvar matéria";
        }
    }

    async function alternar(id) {
        const materia = state.materias.find(item => String(item.id) === String(id));
        if (!materia) return;
        const { error } = await db.from("materias").update({ ativa:!materia.ativa, updated_at:new Date().toISOString() }).eq("id", materia.id);
        if (error) { window.alert(error.message || "Não foi possível alterar a matéria."); return; }
        await carregarMaterias();
        await window.recarregarMateriasLives?.();
    }

    function configurarEventos() {
        $("novaMateriaButton")?.addEventListener("click", () => abrirModal());
        $("fecharMateriaModal")?.addEventListener("click", fecharModal);
        $("cancelarMateria")?.addEventListener("click", fecharModal);
        $("materiaModalBackdrop")?.addEventListener("click", fecharModal);
        $("materiaForm")?.addEventListener("submit", salvar);
        $("materiaFiltroCurso")?.addEventListener("change", renderizar);
        $("materiaBusca")?.addEventListener("input", renderizar);
        $("materiasList")?.addEventListener("click", evento => {
            const editar = evento.target.closest("[data-editar-materia]");
            const alternarBotao = evento.target.closest("[data-alternar-materia]");
            if (editar) abrirModal(state.materias.find(item => String(item.id) === editar.dataset.editarMateria));
            if (alternarBotao) alternar(alternarBotao.dataset.alternarMateria);
        });
        document.addEventListener("keydown", evento => { if (evento.key === "Escape" && !$("materiaModal")?.hidden) fecharModal(); });
    }

    function iniciar() {
        if (!db || !$("page-materias")) return;
        configurarEventos();
        carregarMaterias();
    }

    window.MEPMaterias = { carregar:carregarMaterias };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", iniciar) : iniciar();
})();
