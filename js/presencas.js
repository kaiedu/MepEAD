/* Presenças da Gestão: alunos consolidados e frequência por turma. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    const LIMITE_PRESENCA = 60;
    let linhas = [], cursos = [], turmas = [], lives = [];
    const correcao = { chamadas:[], alunos:[], registros:new Map(), originais:new Map(), alteracoes:new Map(), carregando:false, salvando:false };
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
        preencherTurmasCorrecao();
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

    function dataAula(valor) {
        if (!valor) return "Data não informada";
        const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : String(valor);
    }

    function alternarAreaPresencas(area) {
        const correcaoAtiva = area === "correcao";
        if ($("presencasVisaoGeral")) $("presencasVisaoGeral").hidden = correcaoAtiva;
        if ($("presencasCorrecao")) $("presencasCorrecao").hidden = !correcaoAtiva;
        $("presencasTabResumo")?.classList.toggle("active", !correcaoAtiva);
        $("presencasTabCorrecao")?.classList.toggle("active", correcaoAtiva);
        $("presencasTabResumo")?.setAttribute("aria-selected", String(!correcaoAtiva));
        $("presencasTabCorrecao")?.setAttribute("aria-selected", String(correcaoAtiva));
    }

    function preencherTurmasCorrecao() {
        const seletor = $("correcaoPresencaTurma");
        if (!seletor) return;
        const valorAtual = seletor.value;
        const cursosPorId = new Map(cursos.map(curso => [String(curso.id), curso.nome]));
        seletor.innerHTML = `<option value="">Selecione uma turma</option>${turmas.map(turma => {
            const curso = cursosPorId.get(String(turma.curso_id));
            return `<option value="${esc(turma.id)}">${esc(curso ? `${curso} · ${turma.nome}` : turma.nome)}</option>`;
        }).join("")}`;
        if (turmas.some(turma => mesmoId(turma.id, valorAtual))) seletor.value = valorAtual;
        preencherAulasCorrecao();
    }

    function preencherAulasCorrecao() {
        const seletorTurma = $("correcaoPresencaTurma"), seletorAula = $("correcaoPresencaAula");
        if (!seletorAula) return;
        const turmaId = seletorTurma?.value || "";
        const valorAtual = seletorAula.value;
        const aulasDaTurma = lives.filter(live => mesmoId(live.turma_id, turmaId));
        seletorAula.disabled = !turmaId;
        seletorAula.innerHTML = turmaId
            ? `<option value="">Selecione uma aula / live</option>${aulasDaTurma.map(live => `<option value="${esc(live.id)}">${esc(live.titulo || "Aula sem título")} · ${esc(dataAula(live.data_live))}</option>`).join("")}`
            : `<option value="">Selecione primeiro a turma</option>`;
        if (aulasDaTurma.some(live => mesmoId(live.id, valorAtual))) seletorAula.value = valorAtual;
        if ($("atualizarCorrecaoPresenca")) $("atualizarCorrecaoPresenca").disabled = !seletorAula.value;
    }

    function limparMatrizCorrecao(mensagem) {
        correcao.chamadas = [];
        correcao.alunos = [];
        correcao.registros = new Map();
        correcao.originais = new Map();
        correcao.alteracoes = new Map();
        if ($("correcaoPresencaContexto")) $("correcaoPresencaContexto").hidden = true;
        if ($("correcaoPresencaTabela")) { $("correcaoPresencaTabela").hidden = true; $("correcaoPresencaTabela").innerHTML = ""; }
        if ($("correcaoPresencaFooter")) $("correcaoPresencaFooter").hidden = true;
        if ($("correcaoPresencaFeedback")) { $("correcaoPresencaFeedback").hidden = false; $("correcaoPresencaFeedback").className = "presencas-correcao-feedback"; $("correcaoPresencaFeedback").textContent = mensagem; }
        if ($("salvarCorrecaoPresenca")) $("salvarCorrecaoPresenca").disabled = true;
    }

    function chaveCorrecao(chamadaId, alunoId) {
        return `${chamadaId}:${alunoId}`;
    }

    function atualizarResumoLinhaCorrecao(linha) {
        if (!linha) return;
        const caixas = [...linha.querySelectorAll("input[data-correcao-chave]")];
        const respondidas = caixas.filter(caixa => caixa.checked).length;
        const taxa = percentual(respondidas, caixas.length) || 0;
        const numero = linha.querySelector("[data-correcao-percentual]");
        const situacao = linha.querySelector("[data-correcao-situacao]");
        if (numero) { numero.textContent = `${respondidas}/${caixas.length} · ${taxa}%`; numero.className = taxa >= LIMITE_PRESENCA ? "aprovada" : "abaixo"; }
        if (situacao) { situacao.textContent = taxa >= LIMITE_PRESENCA ? "PRESENÇA" : "FALTA"; situacao.className = `presenca-status ${taxa >= LIMITE_PRESENCA ? "aprovada" : "abaixo"}`; }
    }

    function atualizarContadorAlteracoes() {
        if ($("correcaoPresencaAlteracoes")) $("correcaoPresencaAlteracoes").textContent = correcao.alteracoes.size;
        if ($("salvarCorrecaoPresenca")) $("salvarCorrecaoPresenca").disabled = !correcao.alteracoes.size || correcao.salvando;
    }

    function renderizarMatrizCorrecao() {
        const tabela = $("correcaoPresencaTabela"), footer = $("correcaoPresencaFooter");
        if (!tabela) return;
        if (!correcao.chamadas.length) {
            limparMatrizCorrecao("Esta aula ainda não possui chamadas de presença registradas.");
            return;
        }
        if (!correcao.alunos.length) {
            limparMatrizCorrecao("Nenhum aluno ativo está cadastrado nesta turma.");
            return;
        }

        tabela.innerHTML = `<table class="presencas-ponto-table">
            <thead><tr><th class="presencas-ponto-aluno">Aluno</th>${correcao.chamadas.map(chamada => `<th title="Chamada ${esc(chamada.numero || "—")}"><span>CHAMADA</span><b>#${esc(chamada.numero || "—")}</b></th>`).join("")}<th class="presencas-ponto-resultado">Resultado da aula</th></tr></thead>
            <tbody>${correcao.alunos.map(aluno => `<tr data-correcao-aluno="${esc(aluno.id)}">
                <td class="presencas-ponto-aluno"><div>${avatarHtml(aluno, "presencas-ponto-avatar")}<span><strong>${esc(aluno.nome || "Aluno sem nome")}</strong><small>${esc(aluno.matricula || aluno.email || "Sem matrícula")}</small></span></div></td>
                ${correcao.chamadas.map(chamada => {
                    const chave = chaveCorrecao(chamada.id, aluno.id);
                    return `<td><label class="presencas-ponto-check" title="${esc(aluno.nome || "Aluno")} · Chamada #${esc(chamada.numero || "—")}"><input type="checkbox" data-correcao-chave="${esc(chave)}" aria-label="Confirmar ${esc(aluno.nome || "aluno")} na chamada ${esc(chamada.numero || "—")}" ${correcao.originais.get(chave) ? "checked" : ""}><span>✓</span></label></td>`;
                }).join("")}
                <td class="presencas-ponto-resultado"><strong data-correcao-percentual>0/${correcao.chamadas.length} · 0%</strong><span data-correcao-situacao class="presenca-status abaixo">FALTA</span></td>
            </tr>`).join("")}</tbody>
        </table>`;
        tabela.querySelectorAll("tbody tr").forEach(atualizarResumoLinhaCorrecao);
        tabela.hidden = false;
        if (footer) footer.hidden = false;
        if ($("correcaoPresencaFeedback")) $("correcaoPresencaFeedback").hidden = true;
        atualizarContadorAlteracoes();
    }

    async function carregarMatrizCorrecao() {
        const turmaId = $("correcaoPresencaTurma")?.value || "";
        const aulaId = $("correcaoPresencaAula")?.value || "";
        if (!turmaId || !aulaId || correcao.carregando) {
            if (!aulaId) limparMatrizCorrecao(turmaId ? "Selecione uma aula para abrir a lista de presença." : "Selecione uma turma e uma aula para abrir a lista de presença.");
            return;
        }
        correcao.carregando = true;
        limparMatrizCorrecao("Carregando alunos e chamadas da aula...");
        try {
            const [chamadasResposta, matriculasResposta] = await Promise.all([
                supabaseClient.from("presencas_chamadas").select("id,aula_id,turma_id,numero,aberta_em,created_at").eq("aula_id", aulaId).order("numero", { ascending:true }),
                supabaseClient.from("turma_alunos").select("aluno_id,turma_id,ativo").eq("turma_id", turmaId).eq("ativo", true)
            ]);
            if (chamadasResposta.error) throw chamadasResposta.error;
            if (matriculasResposta.error) throw matriculasResposta.error;
            const chamadas = chamadasResposta.data || [];
            const alunoIds = [...new Set((matriculasResposta.data || []).map(item => item.aluno_id).filter(Boolean))];
            const [alunosResposta, registrosResposta] = await Promise.all([
                alunoIds.length ? supabaseClient.from("usuarios").select("id,nome,email,matricula,foto_url").in("id", alunoIds) : Promise.resolve({ data:[], error:null }),
                chamadas.length ? supabaseClient.from("presencas").select("id,chamada_id,aluno_id,presente,respondido_em,created_at").in("chamada_id", chamadas.map(chamada => chamada.id)) : Promise.resolve({ data:[], error:null })
            ]);
            if (alunosResposta.error) throw alunosResposta.error;
            if (registrosResposta.error) throw registrosResposta.error;

            correcao.chamadas = chamadas;
            correcao.alunos = (alunosResposta.data || []).sort((a,b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
            correcao.registros = new Map();
            (registrosResposta.data || []).forEach(registro => correcao.registros.set(chaveCorrecao(registro.chamada_id, registro.aluno_id), registro));
            correcao.originais = new Map();
            correcao.alunos.forEach(aluno => correcao.chamadas.forEach(chamada => {
                const chave = chaveCorrecao(chamada.id, aluno.id);
                correcao.originais.set(chave, correcao.registros.get(chave)?.presente === true);
            }));
            correcao.alteracoes = new Map();

            const aula = lives.find(item => mesmoId(item.id, aulaId)) || {};
            const turma = turmas.find(item => mesmoId(item.id, turmaId)) || {};
            if ($("correcaoPresencaTitulo")) $("correcaoPresencaTitulo").textContent = aula.titulo || "Aula";
            if ($("correcaoPresencaDetalhes")) $("correcaoPresencaDetalhes").textContent = `${turma.nome || "Turma"} · ${dataAula(aula.data_live)}`;
            if ($("correcaoPresencaChamadas")) $("correcaoPresencaChamadas").textContent = chamadas.length;
            if ($("correcaoPresencaAlunos")) $("correcaoPresencaAlunos").textContent = correcao.alunos.length;
            if ($("correcaoPresencaAlteracoes")) $("correcaoPresencaAlteracoes").textContent = "0";
            if ($("correcaoPresencaContexto")) $("correcaoPresencaContexto").hidden = false;
            renderizarMatrizCorrecao();
        } catch (erro) {
            console.error("MEP EAD | PRESENÇAS | Erro ao abrir correção:", erro);
            limparMatrizCorrecao(`Não foi possível abrir a lista: ${erro.message || "erro desconhecido"}`);
        } finally {
            correcao.carregando = false;
        }
    }

    function registrarAlteracaoCorrecao(caixa) {
        const chave = caixa.dataset.correcaoChave;
        if (!chave) return;
        if (caixa.checked === correcao.originais.get(chave)) correcao.alteracoes.delete(chave);
        else correcao.alteracoes.set(chave, caixa.checked);
        atualizarResumoLinhaCorrecao(caixa.closest("tr"));
        atualizarContadorAlteracoes();
    }

    async function salvarCorrecaoPresenca() {
        if (!correcao.alteracoes.size || correcao.salvando) return;
        const botao = $("salvarCorrecaoPresenca");
        correcao.salvando = true;
        if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
        try {
            const alteracoes = [];
            correcao.alteracoes.forEach((presente, chave) => {
                const [chamadaId, alunoId] = chave.split(":");
                alteracoes.push({ chamada_id:chamadaId, aluno_id:alunoId, presente });
            });
            const { data, error } = await supabaseClient.functions.invoke("corrigir-presencas", { body:{
                turma_id: $("correcaoPresencaTurma").value,
                aula_id: $("correcaoPresencaAula").value,
                alteracoes
            }});
            if (error) {
                let detalhe = null;
                try { detalhe = await error.context?.json?.(); } catch (_) { /* usa a mensagem padrão */ }
                throw new Error(detalhe?.message || error.message || "A função de correção recusou a atualização.");
            }
            if (!data?.success || Number(data.atualizadas) !== alteracoes.length) {
                throw new Error(data?.message || "O Supabase não confirmou todas as alterações.");
            }

            await carregarPresencas();
            await carregarMatrizCorrecao();
            if ($("correcaoPresencaFeedback")) {
                $("correcaoPresencaFeedback").hidden = false;
                $("correcaoPresencaFeedback").className = "presencas-correcao-feedback success";
                $("correcaoPresencaFeedback").textContent = "Correções salvas. As frequências e os relatórios já foram atualizados.";
            }
        } catch (erro) {
            console.error("MEP EAD | PRESENÇAS | Erro ao salvar correção:", erro);
            if ($("correcaoPresencaFeedback")) {
                $("correcaoPresencaFeedback").hidden = false;
                $("correcaoPresencaFeedback").className = "presencas-correcao-feedback error";
                $("correcaoPresencaFeedback").textContent = `Não foi possível salvar: ${erro.message || "erro desconhecido"}`;
            }
        } finally {
            correcao.salvando = false;
            if (botao) botao.textContent = "Salvar alterações";
            atualizarContadorAlteracoes();
        }
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
            lives = livesResposta.data || [];
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
    $("presencasTabResumo")?.addEventListener("click", () => alternarAreaPresencas("resumo"));
    $("presencasTabCorrecao")?.addEventListener("click", () => alternarAreaPresencas("correcao"));
    $("correcaoPresencaTurma")?.addEventListener("change", () => {
        preencherAulasCorrecao();
        limparMatrizCorrecao("Selecione uma aula para abrir a lista de presença.");
    });
    $("correcaoPresencaAula")?.addEventListener("change", () => {
        if ($("atualizarCorrecaoPresenca")) $("atualizarCorrecaoPresenca").disabled = !$("correcaoPresencaAula").value;
        carregarMatrizCorrecao();
    });
    $("atualizarCorrecaoPresenca")?.addEventListener("click", carregarMatrizCorrecao);
    $("correcaoPresencaTabela")?.addEventListener("change", evento => {
        const caixa = evento.target.closest("input[data-correcao-chave]");
        if (caixa) registrarAlteracaoCorrecao(caixa);
    });
    $("salvarCorrecaoPresenca")?.addEventListener("click", salvarCorrecaoPresenca);
    $("presencasLista")?.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-gerenciar-presenca]");
        if (botao) abrirGerenciamento(botao.dataset.gerenciarPresenca);
    });
    $("fecharPresencaAluno")?.addEventListener("click", fecharGerenciamento);
    $("fecharPresencaAlunoFooter")?.addEventListener("click", fecharGerenciamento);
    $("presencaAlunoModal")?.addEventListener("click", evento => { if (evento.target === evento.currentTarget) fecharGerenciamento(); });
    document.addEventListener("keydown", evento => { if (evento.key === "Escape" && !$("presencaAlunoModal")?.hidden) fecharGerenciamento(); });
    document.querySelector('[data-page="presencas"]')?.addEventListener("click", carregarPresencas);
    window.MEPGestaoPresencas = { carregar: carregarPresencas, carregarCorrecao: carregarMatrizCorrecao };
    console.log("MEP EAD | PRESENÇAS | JS carregado");
})();
