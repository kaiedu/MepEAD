/* MEP EAD | Gestão de mensalidades recorrentes por curso. */
(() => {
    "use strict";
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) return;

    let cursos = [], assinaturas = [];
    const $ = id => document.getElementById(id);
    const esc = valor => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const dinheiro = valor => Number(valor || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
    const data = valor => {
        if (!valor) return "—";
        const objeto = new Date(valor);
        return Number.isNaN(objeto.getTime()) ? "—" : objeto.toLocaleDateString("pt-BR");
    };

    function regraTexto(curso) {
        if (!curso.mensalidade_ativa) return "Acesso livre";
        if (curso.mensalidade_bloqueio_modo === "imediato") return "Bloqueio imediato";
        if (curso.mensalidade_bloqueio_modo === "apos_dias") return `Bloquear após ${curso.mensalidade_carencia_dias || 0} dias`;
        return "Não bloquear";
    }

    function statusInfo(statusOriginal) {
        const status = String(statusOriginal || "pending").toLowerCase();
        if (status === "authorized") return { texto:"ATIVA", classe:"aprovada" };
        if (status === "paused") return { texto:"PAUSADA", classe:"pendente" };
        if (["cancelled","canceled"].includes(status)) return { texto:"CANCELADA", classe:"cancelada" };
        if (["recycling","rejected","atrasada"].includes(status)) return { texto:"EM ATRASO", classe:"atrasada" };
        if (["approved","processed"].includes(status)) return { texto:"APROVADO", classe:"aprovada" };
        return { texto:"PENDENTE", classe:"pendente" };
    }

    function assinaturaAtrasada(assinatura) {
        return Boolean(assinatura.inadimplente_desde) || ["recycling","rejected","atrasada"].includes(String(assinatura.ultimo_pagamento_status || "").toLowerCase());
    }

    function acessoInfo(assinatura) {
        const curso = assinatura.cursos || cursos.find(item => item.id === assinatura.curso_id) || {};
        if (!curso.mensalidade_ativa || curso.mensalidade_bloqueio_modo === "nao_bloquear") return { texto:"LIBERADO", classe:"aprovada", detalhe:"Sem bloqueio automático" };
        if (assinatura.status === "authorized" && !assinaturaAtrasada(assinatura)) return { texto:"LIBERADO", classe:"aprovada", detalhe:"Mensalidade em dia" };
        if (curso.mensalidade_bloqueio_modo === "apos_dias" && assinatura.inadimplente_desde) {
            const limite = new Date(assinatura.inadimplente_desde);
            limite.setDate(limite.getDate() + Number(curso.mensalidade_carencia_dias || 0));
            if (Date.now() < limite.getTime()) return { texto:"TOLERÂNCIA", classe:"pendente", detalhe:`Acesso até ${data(limite)}` };
        }
        return { texto:"BLOQUEADO", classe:"atrasada", detalhe:"Histórico acadêmico preservado" };
    }

    function mostrarMensagem(mensagem, tipo = "success") {
        const campo = $("mensalidadeFormMessage");
        if (!campo) return;
        campo.hidden = false;
        campo.className = `form-message ${tipo}`;
        campo.textContent = mensagem;
    }

    function mostrarFeedback(mensagem, tipo = "") {
        const campo = $("mensalidadesFeedback");
        if (!campo) return;
        campo.className = `mensalidades-feedback ${tipo}`.trim();
        campo.textContent = mensagem;
    }

    function renderizarCursos() {
        const lista = $("mensalidadesCursosLista");
        if (!lista) return;
        lista.innerHTML = cursos.map(curso => {
            const total = assinaturas.filter(item => item.curso_id === curso.id).length;
            const ativas = assinaturas.filter(item => item.curso_id === curso.id && item.status === "authorized").length;
            const integrado = Boolean(curso.mercadopago_plano_id);
            return `<tr>
                <td><strong>${esc(curso.nome || "Curso")}</strong><small>${curso.ativo === false ? "Curso inativo" : "Curso ativo"}</small></td>
                <td><strong>${curso.mensalidade_ativa ? dinheiro(curso.mensalidade_valor) : "Sem cobrança"}</strong><small>${curso.mensalidade_ativa ? "por mês" : "acesso financeiro livre"}</small></td>
                <td><span class="mensalidade-badge ${curso.mensalidade_ativa ? "ativa" : ""}">${esc(regraTexto(curso).toUpperCase())}</span></td>
                <td><strong>${ativas}/${total}</strong><small>ativas / cadastradas</small></td>
                <td><span class="mensalidade-badge ${integrado ? "aprovada" : "pendente"}">${integrado ? "CONECTADA" : curso.mensalidade_ativa ? "PENDENTE" : "NÃO NECESSÁRIA"}</span></td>
                <td><button type="button" class="mensalidade-config-button" data-configurar-mensalidade="${esc(curso.id)}">Configurar</button></td>
            </tr>`;
        }).join("") || `<tr><td colspan="6" class="mensalidades-loading">Nenhum curso cadastrado.</td></tr>`;
    }

    function assinaturasFiltradas() {
        const busca = String($("mensalidadesBusca")?.value || "").trim().toLowerCase();
        const status = $("mensalidadesStatusFiltro")?.value || "";
        return assinaturas.filter(item => {
            const emAtraso = assinaturaAtrasada(item);
            const texto = [item.usuarios?.nome,item.usuarios?.email,item.cursos?.nome].join(" ").toLowerCase();
            return (!busca || texto.includes(busca)) && (!status || (status === "atrasada" ? emAtraso : item.status === status));
        });
    }

    function renderizarAssinaturas() {
        const lista = $("mensalidadesAssinaturasLista");
        if (!lista) return;
        const filtradas = assinaturasFiltradas();
        lista.innerHTML = filtradas.map(item => {
            const status = statusInfo(assinaturaAtrasada(item) ? "atrasada" : item.status);
            const acesso = acessoInfo(item);
            return `<tr>
                <td><strong>${esc(item.usuarios?.nome || "Aluno")}</strong><small>${esc(item.usuarios?.email || item.email_pagador || "")}</small></td>
                <td><strong>${esc(item.cursos?.nome || "Curso")}</strong><small>${dinheiro(item.valor_mensal)} / mês</small></td>
                <td><span class="mensalidade-badge ${status.classe}">${status.texto}</span></td>
                <td><strong>${esc(statusInfo(item.ultimo_pagamento_status).texto)}</strong><small>${data(item.ultimo_pagamento_em)}</small></td>
                <td><strong>${data(item.proxima_cobranca_em)}</strong><small>${item.proxima_cobranca_em ? "cobrança programada" : "a definir"}</small></td>
                <td><span class="mensalidade-badge ${acesso.classe}">${acesso.texto}</span><small>${esc(acesso.detalhe)}</small></td>
            </tr>`;
        }).join("") || `<tr><td colspan="6" class="mensalidades-loading">Nenhuma assinatura encontrada para este filtro.</td></tr>`;
    }

    function atualizarResumo() {
        const cursosAtivos = cursos.filter(item => item.mensalidade_ativa);
        const ativas = assinaturas.filter(item => item.status === "authorized" && !assinaturaAtrasada(item));
        const pendentes = assinaturas.filter(item => item.status !== "authorized" || assinaturaAtrasada(item));
        const receita = ativas.reduce((soma, item) => soma + Number(item.valor_mensal || 0), 0);
        if ($("mensalidadesCursosAtivos")) $("mensalidadesCursosAtivos").textContent = cursosAtivos.length;
        if ($("mensalidadesAssinaturasAtivas")) $("mensalidadesAssinaturasAtivas").textContent = ativas.length;
        if ($("mensalidadesPendentes")) $("mensalidadesPendentes").textContent = pendentes.length;
        if ($("mensalidadesReceita")) $("mensalidadesReceita").textContent = dinheiro(receita);
    }

    async function carregar() {
        const cursosLista = $("mensalidadesCursosLista"), assinaturasLista = $("mensalidadesAssinaturasLista");
        if (cursosLista) cursosLista.innerHTML = `<tr><td colspan="6" class="mensalidades-loading">Carregando configurações financeiras...</td></tr>`;
        if (assinaturasLista) assinaturasLista.innerHTML = `<tr><td colspan="6" class="mensalidades-loading">Carregando assinaturas...</td></tr>`;
        mostrarFeedback("Carregando informações financeiras...");

        let cursosResposta;
        let assinaturasResposta;

        try {
            [cursosResposta, assinaturasResposta] = await Promise.all([
                supabaseClient.from("cursos").select("id,nome,ativo,mensalidade_ativa,mensalidade_valor,mensalidade_bloqueio_modo,mensalidade_carencia_dias,mensalidade_configurada_em,mercadopago_plano_id,mercadopago_plano_status").order("nome"),
                supabaseClient.from("assinaturas_curso").select("id,aluno_id,curso_id,status,email_pagador,valor_mensal,proxima_cobranca_em,ultimo_pagamento_status,ultimo_pagamento_em,inadimplente_desde,usuarios!assinaturas_curso_aluno_id_fkey(id,nome,email),cursos!assinaturas_curso_curso_id_fkey(id,nome,mensalidade_ativa,mensalidade_bloqueio_modo,mensalidade_carencia_dias)").order("updated_at", { ascending:false })
            ]);
        } catch (erro) {
            console.error("MEP EAD | Falha de conexão no Financeiro:", erro);
            const mensagem = erro?.message || "falha de conexão com o banco";
            mostrarFeedback(`Não foi possível carregar o Financeiro: ${mensagem}`, "error");
            if (cursosLista) cursosLista.innerHTML = `<tr><td colspan="6" class="mensalidades-loading">Falha ao carregar os cursos.</td></tr>`;
            if (assinaturasLista) assinaturasLista.innerHTML = `<tr><td colspan="6" class="mensalidades-loading">Falha ao carregar as assinaturas.</td></tr>`;
            return;
        }

        const erros = [];

        if (cursosResposta.error) {
            console.error("MEP EAD | Erro ao carregar cursos no Financeiro:", cursosResposta.error);
            erros.push(`cursos: ${cursosResposta.error.message}`);
            cursos = [];
            if (cursosLista) cursosLista.innerHTML = `<tr><td colspan="6" class="mensalidades-loading">Não foi possível consultar os cursos.</td></tr>`;
        } else {
            cursos = cursosResposta.data || [];
            renderizarCursos();
        }

        if (assinaturasResposta.error) {
            console.error("MEP EAD | Erro ao carregar assinaturas no Financeiro:", assinaturasResposta.error);
            erros.push(`assinaturas: ${assinaturasResposta.error.message}`);
            assinaturas = [];
            if (assinaturasLista) assinaturasLista.innerHTML = `<tr><td colspan="6" class="mensalidades-loading">As assinaturas ainda não puderam ser consultadas.</td></tr>`;
        } else {
            assinaturas = assinaturasResposta.data || [];
            renderizarAssinaturas();
        }

        atualizarResumo();

        if (erros.length) {
            mostrarFeedback(`O Financeiro abriu, mas parte dos dados não pôde ser carregada. ${erros.join(" | ")}`, "error");
        } else if (!cursos.length) {
            mostrarFeedback("O Financeiro está funcionando, mas não há cursos cadastrados para configurar.");
        } else {
            mostrarFeedback(`${cursos.length} curso(s) carregado(s). Você já pode configurar valores e regras de acesso.`, "success");
        }
    }

    function atualizarNotaPolitica() {
        const tipoCobranca = $("mensalidadeTipoCobranca")?.value || "sem_cobranca";
        const modo = $("mensalidadeBloqueioModo")?.value || "nao_bloquear";
        const grupo = $("mensalidadeCarenciaGroup");
        if (grupo) grupo.hidden = tipoCobranca === "sem_cobranca" || modo !== "apos_dias";
        const nota = $("mensalidadePolicyNote");
        if (!nota) return;
        if (tipoCobranca === "sem_cobranca") nota.textContent = "Este curso ficará sem cobrança. O aluno terá acesso normalmente, sem precisar realizar pagamento.";
        else if (modo === "imediato") nota.textContent = "Quando uma mensalidade ficar inadimplente, somente este curso será bloqueado imediatamente. Matrícula, presença e progresso serão preservados.";
        else if (modo === "apos_dias") nota.textContent = `O aluno continuará acessando por ${$("mensalidadeCarenciaDias")?.value || 7} dias após o início da pendência. Depois disso, somente este curso será bloqueado.`;
        else nota.textContent = "O aluno continuará acessando o curso mesmo que uma cobrança fique pendente.";
    }

    function atualizarCamposCobranca() {
        const semCobranca = $("mensalidadeTipoCobranca")?.value !== "mensalidade";
        const valorGroup = $("mensalidadeValorGroup");
        const bloqueioGroup = $("mensalidadeBloqueioGroup");
        if (valorGroup) valorGroup.hidden = semCobranca;
        if (bloqueioGroup) bloqueioGroup.hidden = semCobranca;
        if (semCobranca && $("mensalidadeBloqueioModo")) {
            $("mensalidadeBloqueioModo").value = "nao_bloquear";
        }
        atualizarNotaPolitica();
    }

    function abrirModal(cursoId) {
        const curso = cursos.find(item => String(item.id) === String(cursoId));
        if (!curso) return;
        $("mensalidadeCursoId").value = curso.id;
        $("mensalidadeCursoNome").textContent = curso.nome || "Curso";
        $("mensalidadeTipoCobranca").value = curso.mensalidade_ativa === true ? "mensalidade" : "sem_cobranca";
        $("mensalidadeValor").value = curso.mensalidade_valor ?? "";
        $("mensalidadeBloqueioModo").value = curso.mensalidade_bloqueio_modo || "nao_bloquear";
        $("mensalidadeCarenciaDias").value = String(curso.mensalidade_carencia_dias || 7);
        $("mensalidadeFormMessage").hidden = true;
        atualizarCamposCobranca();
        $("mensalidadeCursoModal").hidden = false;
    }

    function fecharModal() { if ($("mensalidadeCursoModal")) $("mensalidadeCursoModal").hidden = true; }

    async function salvar(event) {
        event.preventDefault();
        const botao = $("salvarMensalidadeButton");
        const ativa = $("mensalidadeTipoCobranca").value === "mensalidade";
        const valor = Number($("mensalidadeValor").value);
        if (ativa && (!Number.isFinite(valor) || valor <= 0)) { mostrarMensagem("Informe um valor mensal válido.", "error"); return; }
        if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
        try {
            const { data: resposta, error } = await supabaseClient.functions.invoke("configurar-mensalidade", { body:{
                curso_id: $("mensalidadeCursoId").value,
                ativa,
                valor,
                bloqueio_modo: ativa ? $("mensalidadeBloqueioModo").value : "nao_bloquear",
                carencia_dias: Number($("mensalidadeCarenciaDias").value || 0)
            }});
            if (error) throw error;
            if (!resposta?.success) throw new Error(resposta?.message || "Não foi possível salvar.");
            mostrarMensagem(resposta.aviso || "Configuração salva com sucesso.");
            await carregar();
            setTimeout(fecharModal, 900);
        } catch (erro) { mostrarMensagem(erro.message || "Não foi possível salvar a mensalidade.", "error"); }
        finally { if (botao) { botao.disabled = false; botao.textContent = "Salvar configuração"; } }
    }

    document.addEventListener("click", event => {
        const botao = event.target.closest("[data-configurar-mensalidade]");
        if (botao) abrirModal(botao.dataset.configurarMensalidade);
    });
    $("mensalidadeCursoForm")?.addEventListener("submit", salvar);
    $("fecharMensalidadeModal")?.addEventListener("click", fecharModal);
    $("cancelarMensalidadeModal")?.addEventListener("click", fecharModal);
    $("mensalidadeTipoCobranca")?.addEventListener("change", atualizarCamposCobranca);
    $("mensalidadeBloqueioModo")?.addEventListener("change", atualizarNotaPolitica);
    $("mensalidadeCarenciaDias")?.addEventListener("change", atualizarNotaPolitica);
    $("mensalidadesBusca")?.addEventListener("input", renderizarAssinaturas);
    $("mensalidadesStatusFiltro")?.addEventListener("change", renderizarAssinaturas);
    $("atualizarMensalidadesButton")?.addEventListener("click", carregar);
    document.querySelector('[data-page="mensalidades"]')?.addEventListener("click", carregar);
    document.addEventListener("DOMContentLoaded", carregar);
    window.MEPMensalidades = { carregar };
})();
