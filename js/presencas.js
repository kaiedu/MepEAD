/* Presenças da Gestão. A tabela presencas é a fonte dos registros. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    let linhas = [], cursos = [], turmas = [];
    const $ = id => document.getElementById(id);
    const esc = valor => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const dataHora = valor => {
        if (!valor) return "Não respondeu";
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
    };

    function garantirPaginaPrincipal() {
        const pagina = $("page-presencas"), principal = document.querySelector("main.main");
        if (pagina && principal && pagina.parentElement !== principal) principal.appendChild(pagina);
    }

    function preencherFiltros() {
        const cursoFiltro = $("presencasFiltroCurso"), turmaFiltro = $("presencasFiltroTurma");
        if (cursoFiltro) cursoFiltro.innerHTML = `<option value="">Todos os cursos</option>${cursos.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("")}`;
        if (turmaFiltro) turmaFiltro.innerHTML = `<option value="">Todas as turmas</option>${turmas.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join("")}`;
    }

    function renderizar() {
        const lista = $("presencasLista"), vazio = $("presencasEmpty");
        if (!lista) return;
        const busca = $("presencasBusca")?.value.trim().toLowerCase() || "";
        const cursoId = $("presencasFiltroCurso")?.value || "";
        const turmaId = $("presencasFiltroTurma")?.value || "";
        const filtradas = linhas.filter(linha => {
            const texto = [linha.aluno.nome, linha.aluno.email, linha.curso.nome, linha.turma.nome, linha.live.titulo].join(" ").toLowerCase();
            return (!busca || texto.includes(busca)) && (!cursoId || linha.curso.id === cursoId) && (!turmaId || linha.turma.id === turmaId);
        });
        lista.innerHTML = filtradas.map(linha => `<tr>
            <td><strong>${esc(linha.aluno.nome || "Aluno")}</strong><small>${esc(linha.aluno.email || "")}</small></td>
            <td><strong>${esc(linha.curso.nome || "Curso não informado")}</strong><small>${esc(linha.turma.nome || "Turma não informada")}</small></td>
            <td>${esc(linha.live.titulo || "Live sem título")}</td>
            <td>${esc(linha.chamadaId || "—")}</td>
            <td><span class="presenca-status ${linha.presente ? "confirmada" : "ausente"}">${linha.presente ? "CONFIRMADA" : "NÃO RESPONDEU"}</span></td>
            <td>${esc(dataHora(linha.respondidoEm))}</td>
            <td><strong>${linha.percentual}%</strong><small>${linha.confirmadas}/${linha.total} respostas</small></td>
        </tr>`).join("");
        if (vazio) vazio.hidden = filtradas.length > 0;
    }

    function atualizarResumo() {
        const confirmadas = linhas.filter(linha => linha.presente).length;
        const porAlunoTurma = new Map();
        linhas.forEach(linha => porAlunoTurma.set(`${linha.turma.id}:${linha.aluno.id}`, linha.percentual));
        const media = porAlunoTurma.size ? Math.round([...porAlunoTurma.values()].reduce((soma, valor) => soma + valor, 0) / porAlunoTurma.size) : 0;
        $("presencasTotal").textContent = linhas.length;
        $("presencasConfirmadas").textContent = confirmadas;
        $("presencasMedia").textContent = `${media}%`;
    }

    async function carregarPresencas() {
        const lista = $("presencasLista"), vazio = $("presencasEmpty");
        if (!lista) return;
        lista.innerHTML = `<tr><td colspan="7" class="presencas-loading">Carregando presenças...</td></tr>`;
        if (vazio) vazio.hidden = true;
        try {
            /* Fonte principal: os campos reais informados da tabela presencas. */
            const { data: presencas, error } = await supabaseClient.from("presencas")
                .select("id,chamada_id,aula_id,turma_id,aluno_id,presente,respondido_em,created_at")
                .order("created_at", { ascending: false });
            if (error) throw error;

            const registros = presencas || [];
            const idsAlunos = [...new Set(registros.map(item => item.aluno_id).filter(Boolean))];
            const idsTurmas = [...new Set(registros.map(item => item.turma_id).filter(Boolean))];
            const idsAulas = [...new Set(registros.map(item => item.aula_id).filter(Boolean))];
            const [alunosResposta, turmasResposta, livesResposta, cursosResposta] = await Promise.all([
                idsAlunos.length ? supabaseClient.from("usuarios").select("id,nome,email").in("id", idsAlunos) : Promise.resolve({ data: [] }),
                idsTurmas.length ? supabaseClient.from("turmas").select("id,curso_id,nome").in("id", idsTurmas) : Promise.resolve({ data: [] }),
                idsAulas.length ? supabaseClient.from("lives").select("id,titulo").in("id", idsAulas) : Promise.resolve({ data: [] }),
                supabaseClient.from("cursos").select("id,nome").order("nome")
            ]);
            const erroRelacionamento = [alunosResposta, turmasResposta, livesResposta, cursosResposta].find(resposta => resposta.error)?.error;
            if (erroRelacionamento) throw erroRelacionamento;

            cursos = cursosResposta.data || [];
            turmas = turmasResposta.data || [];
            const alunosPorId = new Map((alunosResposta.data || []).map(item => [item.id, item]));
            const turmasPorId = new Map(turmas.map(item => [item.id, item]));
            const livesPorId = new Map((livesResposta.data || []).map(item => [item.id, item]));
            const cursosPorId = new Map(cursos.map(item => [item.id, item]));
            const totais = new Map(), confirmadas = new Map();
            registros.forEach(item => {
                const chave = `${item.turma_id}:${item.aluno_id}`;
                totais.set(chave, (totais.get(chave) || 0) + 1);
                if (item.presente === true) confirmadas.set(chave, (confirmadas.get(chave) || 0) + 1);
            });
            linhas = registros.map(item => {
                const turma = turmasPorId.get(item.turma_id) || {};
                const chave = `${item.turma_id}:${item.aluno_id}`;
                const total = totais.get(chave) || 0, confirmadasAluno = confirmadas.get(chave) || 0;
                return { aluno: alunosPorId.get(item.aluno_id) || {}, turma, curso: cursosPorId.get(turma.curso_id) || {}, live: livesPorId.get(item.aula_id) || {}, chamadaId: item.chamada_id, presente: item.presente === true, respondidoEm: item.respondido_em, total, confirmadas: confirmadasAluno, percentual: total ? Math.round(confirmadasAluno * 100 / total) : 0 };
            });
            preencherFiltros(); atualizarResumo(); renderizar();
            console.log("MEP EAD | PRESENÇAS | Registros reais carregados:", linhas.length);
        } catch (erro) {
            console.error("MEP EAD | PRESENÇAS | Erro ao carregar:", erro);
            lista.innerHTML = `<tr><td colspan="7" class="presencas-loading">Não foi possível carregar: ${esc(erro.message || "erro desconhecido")}</td></tr>`;
        }
    }

    garantirPaginaPrincipal();
    console.log("MEP EAD | PRESENÇAS | JS carregado");
    ["presencasBusca", "presencasFiltroCurso", "presencasFiltroTurma"].forEach(id => $(id)?.addEventListener(id === "presencasBusca" ? "input" : "change", renderizar));
    document.querySelector('[data-page="presencas"]')?.addEventListener("click", carregarPresencas);
    window.MEPGestaoPresencas = { carregar: carregarPresencas };
})();
