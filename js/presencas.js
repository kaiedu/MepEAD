/* Presenças da Gestão: uma linha por aluno e por turma. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    let linhas = [], cursos = [], turmas = [];
    const $ = id => document.getElementById(id);
    const esc = valor => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const percentual = (confirmadas, total) => total ? Math.round(confirmadas * 100 / total) : null;
    const dataHora = valor => {
        if (!valor) return "Nenhuma confirmação";
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
    };

    function garantirPaginaPrincipal() {
        const pagina = $("page-presencas"), principal = document.querySelector("main.main");
        if (pagina && principal && pagina.parentElement !== principal) principal.appendChild(pagina);
    }

    function preencherFiltroTurmas() {
        const seletor = $("presencasFiltroTurma");
        if (!seletor) return;
        const cursoId = $("presencasFiltroCurso")?.value || "";
        const valorAtual = seletor.value;
        const opcoes = turmas.filter(turma => !cursoId || turma.curso_id === cursoId);
        seletor.innerHTML = `<option value="">Todas as turmas</option>${opcoes.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join("")}`;
        if (opcoes.some(turma => String(turma.id) === valorAtual)) seletor.value = valorAtual;
    }

    function preencherFiltros() {
        const cursoFiltro = $("presencasFiltroCurso");
        if (cursoFiltro) cursoFiltro.innerHTML = `<option value="">Todos os cursos</option>${cursos.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("")}`;
        preencherFiltroTurmas();
    }

    function obterFiltradas() {
        const busca = $("presencasBusca")?.value.trim().toLowerCase() || "";
        const cursoId = $("presencasFiltroCurso")?.value || "";
        const turmaId = $("presencasFiltroTurma")?.value || "";
        return linhas.filter(linha => {
            const aulas = linha.aulas.map(aula => aula.titulo).join(" ");
            const texto = [linha.aluno.nome, linha.aluno.email, linha.curso.nome, linha.turma.nome, aulas].join(" ").toLowerCase();
            return (!busca || texto.includes(busca)) && (!cursoId || linha.curso.id === cursoId) && (!turmaId || linha.turma.id === turmaId);
        });
    }

    function detalheAulas(linha) {
        const aulas = linha.aulas.filter(aula => aula.total > 0);
        if (!aulas.length) return `<span class="presencas-sem-chamada">Nenhuma chamada realizada</span>`;
        const resumo = aulas.slice(0, 2).map(aula => aula.titulo || "Aula").join(" · ");
        return `<details class="presencas-aulas-detail">
            <summary><strong>${aulas.length} ${aulas.length === 1 ? "aula" : "aulas"}</strong><small>${esc(resumo)}${aulas.length > 2 ? "…" : ""}</small></summary>
            <div class="presencas-aulas-list">${aulas.map(aula => `<div>
                <span><strong>${esc(aula.titulo || "Aula")}</strong><small>${aula.confirmadas}/${aula.total} chamadas confirmadas</small></span>
                <b class="${aula.percentual === 100 ? "completo" : ""}">${aula.percentual ?? 0}%</b>
            </div>`).join("")}</div>
        </details>`;
    }

    function atualizarResumo(filtradas) {
        const confirmadas = filtradas.reduce((soma, linha) => soma + linha.confirmadas, 0);
        const comChamadas = filtradas.filter(linha => linha.total > 0);
        const media = comChamadas.length
            ? Math.round(comChamadas.reduce((soma, linha) => soma + (linha.percentual || 0), 0) / comChamadas.length)
            : 0;
        if ($("presencasTotal")) $("presencasTotal").textContent = filtradas.length;
        if ($("presencasConfirmadas")) $("presencasConfirmadas").textContent = confirmadas;
        if ($("presencasMedia")) $("presencasMedia").textContent = `${media}%`;
    }

    function renderizar() {
        const lista = $("presencasLista"), vazio = $("presencasEmpty");
        if (!lista) return;
        const filtradas = obterFiltradas();
        lista.innerHTML = filtradas.map(linha => `<tr>
            <td><strong>${esc(linha.aluno.nome || "Aluno")}</strong><small>${esc(linha.aluno.email || "")}</small></td>
            <td><strong>${esc(linha.curso.nome || "Curso não informado")}</strong><small>${esc(linha.turma.nome || "Turma não informada")}</small></td>
            <td>${detalheAulas(linha)}</td>
            <td><strong>${linha.confirmadas}/${linha.total}</strong><small>${linha.total === 1 ? "chamada realizada" : "chamadas realizadas"}</small></td>
            <td>${esc(dataHora(linha.ultimaConfirmacao))}</td>
            <td><span class="presenca-status ${linha.percentual === 100 ? "confirmada" : "ausente"}">${linha.percentual === null ? "SEM CHAMADAS" : `${linha.percentual}%`}</span><small>${linha.confirmadas} confirmações</small></td>
        </tr>`).join("");
        if (vazio) vazio.hidden = filtradas.length > 0;
        atualizarResumo(filtradas);
    }

    async function carregarPresencas() {
        const lista = $("presencasLista"), vazio = $("presencasEmpty");
        if (!lista) return;
        lista.innerHTML = `<tr><td colspan="6" class="presencas-loading">Carregando presenças por aluno e turma...</td></tr>`;
        if (vazio) vazio.hidden = true;
        try {
            const [chamadasResposta, presencasResposta, cursosResposta, turmasResposta, livesResposta, matriculasResposta] = await Promise.all([
                supabaseClient.from("presencas_chamadas").select("id,aula_id,turma_id,numero,aberta_em,created_at"),
                supabaseClient.from("presencas").select("id,chamada_id,aluno_id,presente,respondido_em,created_at"),
                supabaseClient.from("cursos").select("id,nome").order("nome"),
                supabaseClient.from("turmas").select("id,curso_id,nome").order("nome"),
                supabaseClient.from("lives").select("id,turma_id,titulo,data_live").order("data_live"),
                supabaseClient.from("turma_alunos").select("aluno_id,turma_id,ativo").eq("ativo", true)
            ]);
            const respostas = [chamadasResposta, presencasResposta, cursosResposta, turmasResposta, livesResposta, matriculasResposta];
            const erro = respostas.find(resposta => resposta.error)?.error;
            if (erro) throw erro;

            const chamadas = chamadasResposta.data || [];
            const presencas = presencasResposta.data || [];
            const lives = livesResposta.data || [];
            const matriculas = [...new Map((matriculasResposta.data || [])
                .filter(item => item.aluno_id && item.turma_id)
                .map(item => [`${item.aluno_id}:${item.turma_id}`, item])).values()];
            cursos = cursosResposta.data || [];
            turmas = turmasResposta.data || [];

            const idsAlunos = [...new Set(matriculas.map(item => item.aluno_id).filter(Boolean))];
            const alunosResposta = idsAlunos.length
                ? await supabaseClient.from("usuarios").select("id,nome,email").in("id", idsAlunos)
                : { data: [], error: null };
            if (alunosResposta.error) throw alunosResposta.error;

            const alunosPorId = new Map((alunosResposta.data || []).map(item => [item.id, item]));
            const turmasPorId = new Map(turmas.map(item => [item.id, item]));
            const cursosPorId = new Map(cursos.map(item => [item.id, item]));
            const livesPorId = new Map(lives.map(item => [item.id, item]));
            const chamadasPorTurma = new Map();
            chamadas.forEach(chamada => {
                if (!chamadasPorTurma.has(chamada.turma_id)) chamadasPorTurma.set(chamada.turma_id, []);
                chamadasPorTurma.get(chamada.turma_id).push(chamada);
            });
            const presencasConfirmadas = new Map();
            presencas.filter(item => item.presente === true).forEach(item => {
                const chave = `${item.chamada_id}:${item.aluno_id}`;
                const atual = presencasConfirmadas.get(chave);
                if (!atual || new Date(item.respondido_em || item.created_at) > new Date(atual.respondido_em || atual.created_at)) presencasConfirmadas.set(chave, item);
            });

            linhas = matriculas.map(matricula => {
                const turma = turmasPorId.get(matricula.turma_id) || {};
                const curso = cursosPorId.get(turma.curso_id) || {};
                const chamadasTurma = chamadasPorTurma.get(matricula.turma_id) || [];
                const porAula = new Map();
                chamadasTurma.forEach(chamada => {
                    const live = livesPorId.get(chamada.aula_id) || { id:chamada.aula_id, titulo:"Aula" };
                    if (!porAula.has(chamada.aula_id)) porAula.set(chamada.aula_id, { id:chamada.aula_id, titulo:live.titulo || "Aula", total:0, confirmadas:0 });
                    const aula = porAula.get(chamada.aula_id);
                    aula.total++;
                    if (presencasConfirmadas.has(`${chamada.id}:${matricula.aluno_id}`)) aula.confirmadas++;
                });
                const confirmacoes = chamadasTurma.map(chamada => presencasConfirmadas.get(`${chamada.id}:${matricula.aluno_id}`)).filter(Boolean);
                const ultima = confirmacoes.sort((a,b) => new Date(b.respondido_em || b.created_at) - new Date(a.respondido_em || a.created_at))[0];
                const total = chamadasTurma.length;
                const confirmadas = confirmacoes.length;
                const aulas = [...porAula.values()].map(aula => ({ ...aula, percentual:percentual(aula.confirmadas, aula.total) }));
                return { aluno:alunosPorId.get(matricula.aluno_id) || { id:matricula.aluno_id }, turma, curso, aulas, total, confirmadas, percentual:percentual(confirmadas,total), ultimaConfirmacao:ultima?.respondido_em || ultima?.created_at || null };
            }).sort((a,b) => String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR") || String(a.turma.nome || "").localeCompare(String(b.turma.nome || ""), "pt-BR"));

            preencherFiltros();
            renderizar();
            console.log("MEP EAD | PRESENÇAS | Alunos/turmas consolidados:", linhas.length);
        } catch (erro) {
            console.error("MEP EAD | PRESENÇAS | Erro ao carregar:", erro);
            lista.innerHTML = `<tr><td colspan="6" class="presencas-loading">Não foi possível carregar: ${esc(erro.message || "erro desconhecido")}</td></tr>`;
        }
    }

    garantirPaginaPrincipal();
    $("presencasBusca")?.addEventListener("input", renderizar);
    $("presencasFiltroCurso")?.addEventListener("change", () => { preencherFiltroTurmas(); renderizar(); });
    $("presencasFiltroTurma")?.addEventListener("change", renderizar);
    document.querySelector('[data-page="presencas"]')?.addEventListener("click", carregarPresencas);
    window.MEPGestaoPresencas = { carregar:carregarPresencas };
    console.log("MEP EAD | PRESENÇAS | JS carregado");
})();
