/* Presenças da Gestão: alunos consolidados e frequência por turma. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    const LIMITE_PRESENCA = 60;
    let linhas = [], cursos = [], turmas = [];
    const $ = id => document.getElementById(id);
    const esc = valor => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
    const percentual = (confirmadas, total) => total ? Math.round(confirmadas * 100 / total) : null;
    const mesmoId = (a, b) => String(a ?? "") === String(b ?? "");

    function iniciais(nome) {
        return String(nome || "Aluno").trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join("").toUpperCase() || "A";
    }

    function avatarHtml(aluno, classe = "presenca-row-avatar") {
        return `<span class="${classe}">${aluno.foto_url ? `<img src="${esc(aluno.foto_url)}" alt="Foto de ${esc(aluno.nome || "aluno")}">` : esc(iniciais(aluno.nome))}</span>`;
    }

    function garantirPaginaPrincipal() {
        const pagina = $("page-presencas"), principal = document.querySelector("main.main");
        if (pagina && principal && pagina.parentElement !== principal) principal.appendChild(pagina);
    }

    function preencherFiltroTurmas() {
        const seletor = $("presencasFiltroTurma");
        if (!seletor) return;
        const cursoId = $("presencasFiltroCurso")?.value || "";
        const valorAtual = seletor.value;
        const opcoes = turmas.filter(turma => !cursoId || mesmoId(turma.curso_id, cursoId));
        seletor.innerHTML = `<option value="">Todas as turmas</option>${opcoes.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join("")}`;
        if (opcoes.some(turma => mesmoId(turma.id, valorAtual))) seletor.value = valorAtual;
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
            const texto = [linha.aluno.nome, linha.aluno.email, linha.aluno.matricula, linha.curso.nome, linha.turma.nome].join(" ").toLowerCase();
            return (!busca || texto.includes(busca)) && (!cursoId || mesmoId(linha.curso.id, cursoId)) && (!turmaId || mesmoId(linha.turma.id, turmaId));
        });
    }

    function agruparAlunos(lista) {
        const mapa = new Map();
        lista.forEach(linha => {
            const chave = String(linha.aluno.id);
            if (!mapa.has(chave)) mapa.set(chave, { aluno: linha.aluno, turmas: [] });
            mapa.get(chave).turmas.push(linha);
        });
        return [...mapa.values()].sort((a, b) => String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR"));
    }

    function mediaTurmas(lista) {
        const avaliadas = lista.filter(linha => linha.frequencia !== null);
        return avaliadas.length ? Math.round(avaliadas.reduce((soma, linha) => soma + linha.frequencia, 0) / avaliadas.length) : null;
    }

    function classeFrequencia(valor) {
        if (valor === null) return "neutra";
        return valor >= LIMITE_PRESENCA ? "aprovada" : "abaixo";
    }

    function rotuloFrequencia(valor) {
        return valor === null ? "Sem chamadas" : `${valor}%`;
    }

    function atualizarResumo(filtradas, agrupados) {
        const avaliadas = filtradas.filter(linha => linha.frequencia !== null);
        const media = avaliadas.length ? Math.round(avaliadas.reduce((soma, linha) => soma + linha.frequencia, 0) / avaliadas.length) : 0;
        if ($("presencasTotal")) $("presencasTotal").textContent = agrupados.length;
        if ($("presencasTurmas")) $("presencasTurmas").textContent = new Set(filtradas.map(linha => String(linha.turma.id))).size;
        if ($("presencasAptos")) $("presencasAptos").textContent = avaliadas.filter(linha => linha.frequencia >= LIMITE_PRESENCA).length;
        if ($("presencasMedia")) $("presencasMedia").textContent = `${media}%`;
    }

    function renderizar() {
        const lista = $("presencasLista"), vazio = $("presencasEmpty");
        if (!lista) return;
        const filtradas = obterFiltradas();
        const agrupados = agruparAlunos(filtradas);

        lista.innerHTML = agrupados.map(grupo => {
            const media = mediaTurmas(grupo.turmas);
            const avaliadas = grupo.turmas.filter(linha => linha.frequencia !== null);
            const aptas = avaliadas.filter(linha => linha.frequencia >= LIMITE_PRESENCA).length;
            const nomesTurmas = grupo.turmas.slice(0, 2).map(linha => linha.turma.nome || "Turma").join(" · ");
            return `<article class="presenca-aluno-row">
                <div class="presenca-row-profile">
                    ${avatarHtml(grupo.aluno)}
                    <div><span class="presenca-row-label">ALUNO</span><h3>${esc(grupo.aluno.nome || "Aluno sem nome")}</h3><small>${esc(grupo.aluno.email || "E-mail não informado")}</small></div>
                </div>
                <div class="presenca-row-info"><span>MATRÍCULA</span><strong class="presenca-matricula">${esc(grupo.aluno.matricula || "Não gerada")}</strong></div>
                <div class="presenca-row-info"><span>TURMAS ATIVAS</span><strong>${grupo.turmas.length} ${grupo.turmas.length === 1 ? "turma" : "turmas"}</strong><small title="${esc(nomesTurmas)}">${esc(nomesTurmas || "Nenhuma turma")}</small></div>
                <div class="presenca-row-frequency"><span>FREQUÊNCIA GERAL</span><strong class="${classeFrequencia(media)}">${rotuloFrequencia(media)}</strong><small>${avaliadas.length ? `${aptas}/${avaliadas.length} turmas com 60% ou mais` : "Aguardando chamadas"}</small></div>
                <div><span class="presenca-status ${classeFrequencia(media)}">${media === null ? "SEM DADOS" : media >= LIMITE_PRESENCA ? "REGULAR" : "ABAIXO DE 60%"}</span></div>
                <div class="presenca-row-action"><button type="button" data-gerenciar-presenca="${esc(grupo.aluno.id)}">Gerenciar <span>→</span></button></div>
            </article>`;
        }).join("");

        if (vazio) vazio.hidden = agrupados.length > 0;
        atualizarResumo(filtradas, agrupados);
    }

    function detalheAulas(linha) {
        if (!linha.aulas.length) return `<p class="presenca-sem-aulas">Nenhuma chamada foi realizada nesta turma.</p>`;
        return `<details class="presenca-turma-aulas">
            <summary>Ver resultado por aula <span>⌄</span></summary>
            <div>${linha.aulas.map(aula => `<article>
                <span><strong>${esc(aula.titulo || "Aula")}</strong><small>${aula.confirmadas}/${aula.total} chamadas respondidas</small></span>
                <b class="${aula.presente ? "aprovada" : "abaixo"}">${aula.percentual}% · ${aula.presente ? "Presença" : "Falta"}</b>
            </article>`).join("")}</div>
        </details>`;
    }

    function abrirGerenciamento(alunoId) {
        const turmasAluno = linhas.filter(linha => mesmoId(linha.aluno.id, alunoId));
        if (!turmasAluno.length) return;
        const aluno = turmasAluno[0].aluno;
        const media = mediaTurmas(turmasAluno);
        const chamadasRealizadas = turmasAluno.reduce((soma, linha) => soma + linha.total, 0);
        const chamadasRespondidas = turmasAluno.reduce((soma, linha) => soma + linha.confirmadas, 0);

        $("presencaAlunoNome").textContent = aluno.nome || "Aluno";
        $("presencaAlunoEmail").textContent = aluno.email || "E-mail não informado";
        $("presencaAlunoMatricula").textContent = `Matrícula ${aluno.matricula || "não gerada"}`;
        $("presencaAlunoTurmasTotal").textContent = turmasAluno.length;
        $("presencaAlunoMedia").textContent = rotuloFrequencia(media);
        $("presencaAlunoMedia").className = classeFrequencia(media);
        $("presencaAlunoAulas").textContent = `${chamadasRespondidas}/${chamadasRealizadas}`;
        $("presencaAlunoAvatar").innerHTML = aluno.foto_url ? `<img src="${esc(aluno.foto_url)}" alt="Foto de ${esc(aluno.nome || "aluno")}">` : esc(iniciais(aluno.nome));

        $("presencaAlunoTurmas").innerHTML = turmasAluno.map(linha => `<article class="presenca-turma-card">
            <div class="presenca-turma-main">
                <div><span>CURSO</span><h3>${esc(linha.curso.nome || "Curso não informado")}</h3><p>${esc(linha.turma.nome || "Turma não informada")}</p></div>
                <div class="presenca-turma-numeros"><span>AULAS COM PRESENÇA<strong>${linha.aulasComPresenca}/${linha.aulasAvaliadas}</strong></span><span>CHAMADAS RESPONDIDAS<strong>${linha.confirmadas}/${linha.total}</strong></span></div>
                <div class="presenca-turma-resultado"><span class="presenca-status ${classeFrequencia(linha.frequencia)}">${rotuloFrequencia(linha.frequencia)}</span><small>${linha.frequencia === null ? "Aguardando chamadas" : linha.frequencia >= LIMITE_PRESENCA ? "Frequência regular" : "Frequência abaixo do mínimo"}</small></div>
            </div>
            <div class="presenca-progress"><i style="width:${linha.frequencia ?? 0}%" class="${classeFrequencia(linha.frequencia)}"></i></div>
            ${detalheAulas(linha)}
        </article>`).join("");

        const modal = $("presencaAlunoModal");
        modal.hidden = false;
        document.body.classList.add("modal-open");
        $("fecharPresencaAluno")?.focus();
    }

    function fecharGerenciamento() {
        const modal = $("presencaAlunoModal");
        if (modal) modal.hidden = true;
        document.body.classList.remove("modal-open");
    }

    async function carregarPresencas() {
        const lista = $("presencasLista"), vazio = $("presencasEmpty");
        if (!lista) return;
        lista.innerHTML = `<div class="presencas-loading">Carregando alunos e frequências...</div>`;
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
            const matriculas = [...new Map((matriculasResposta.data || []).filter(item => item.aluno_id && item.turma_id).map(item => [`${item.aluno_id}:${item.turma_id}`, item])).values()];
            cursos = cursosResposta.data || [];
            turmas = turmasResposta.data || [];

            const idsAlunos = [...new Set(matriculas.map(item => item.aluno_id).filter(Boolean))];
            const alunosResposta = idsAlunos.length
                ? await supabaseClient.from("usuarios").select("id,nome,email,matricula,foto_url,telefone").in("id", idsAlunos)
                : { data: [], error: null };
            if (alunosResposta.error) throw alunosResposta.error;

            const alunosPorId = new Map((alunosResposta.data || []).map(item => [String(item.id), item]));
            const turmasPorId = new Map(turmas.map(item => [String(item.id), item]));
            const cursosPorId = new Map(cursos.map(item => [String(item.id), item]));
            const livesPorId = new Map(lives.map(item => [String(item.id), item]));
            const chamadasPorTurma = new Map();
            chamadas.forEach(chamada => {
                const chave = String(chamada.turma_id);
                if (!chamadasPorTurma.has(chave)) chamadasPorTurma.set(chave, []);
                chamadasPorTurma.get(chave).push(chamada);
            });

            const presencasConfirmadas = new Map();
            presencas.filter(item => item.presente === true).forEach(item => {
                const chave = `${item.chamada_id}:${item.aluno_id}`;
                const atual = presencasConfirmadas.get(chave);
                if (!atual || new Date(item.respondido_em || item.created_at) > new Date(atual.respondido_em || atual.created_at)) presencasConfirmadas.set(chave, item);
            });

            linhas = matriculas.map(matricula => {
                const turma = turmasPorId.get(String(matricula.turma_id)) || {};
                const curso = cursosPorId.get(String(turma.curso_id)) || {};
                const chamadasTurma = chamadasPorTurma.get(String(matricula.turma_id)) || [];
                const porAula = new Map();
                chamadasTurma.forEach(chamada => {
                    const chaveAula = String(chamada.aula_id || `chamada-${chamada.id}`);
                    const live = livesPorId.get(String(chamada.aula_id)) || { id: chamada.aula_id, titulo: "Aula" };
                    if (!porAula.has(chaveAula)) porAula.set(chaveAula, { id: chaveAula, titulo: live.titulo || "Aula", total: 0, confirmadas: 0 });
                    const aula = porAula.get(chaveAula);
                    aula.total++;
                    if (presencasConfirmadas.has(`${chamada.id}:${matricula.aluno_id}`)) aula.confirmadas++;
                });

                const confirmacoes = chamadasTurma.map(chamada => presencasConfirmadas.get(`${chamada.id}:${matricula.aluno_id}`)).filter(Boolean);
                const total = chamadasTurma.length;
                const confirmadas = confirmacoes.length;
                const aulas = [...porAula.values()].map(aula => {
                    const taxaChamadas = percentual(aula.confirmadas, aula.total) || 0;
                    return { ...aula, percentual: taxaChamadas, presente: taxaChamadas >= LIMITE_PRESENCA };
                });
                const aulasAvaliadas = aulas.length;
                const aulasComPresenca = aulas.filter(aula => aula.presente).length;
                return {
                    aluno: alunosPorId.get(String(matricula.aluno_id)) || { id: matricula.aluno_id },
                    turma, curso, aulas, total, confirmadas, aulasAvaliadas, aulasComPresenca,
                    frequencia: percentual(confirmadas, total)
                };
            }).sort((a,b) => String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR") || String(a.turma.nome || "").localeCompare(String(b.turma.nome || ""), "pt-BR"));

            preencherFiltros();
            renderizar();
            console.log("MEP EAD | PRESENÇAS | Alunos consolidados:", agruparAlunos(linhas).length);
        } catch (erro) {
            console.error("MEP EAD | PRESENÇAS | Erro ao carregar:", erro);
            lista.innerHTML = `<div class="presencas-loading">Não foi possível carregar: ${esc(erro.message || "erro desconhecido")}</div>`;
        }
    }

    garantirPaginaPrincipal();
    $("presencasBusca")?.addEventListener("input", renderizar);
    $("presencasFiltroCurso")?.addEventListener("change", () => { preencherFiltroTurmas(); renderizar(); });
    $("presencasFiltroTurma")?.addEventListener("change", renderizar);
    $("presencasLista")?.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-gerenciar-presenca]");
        if (botao) abrirGerenciamento(botao.dataset.gerenciarPresenca);
    });
    $("fecharPresencaAluno")?.addEventListener("click", fecharGerenciamento);
    $("fecharPresencaAlunoFooter")?.addEventListener("click", fecharGerenciamento);
    $("presencaAlunoModal")?.addEventListener("click", evento => { if (evento.target === evento.currentTarget) fecharGerenciamento(); });
    document.addEventListener("keydown", evento => { if (evento.key === "Escape" && !$("presencaAlunoModal")?.hidden) fecharGerenciamento(); });
    document.querySelector('[data-page="presencas"]')?.addEventListener("click", carregarPresencas);
    window.MEPGestaoPresencas = { carregar: carregarPresencas };
    console.log("MEP EAD | PRESENÇAS | JS carregado");
})();
