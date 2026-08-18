/* =========================================================
   MEP EAD — PORTAL DO ALUNO
   Cada aula exibida corresponde a um registro de lives.
   Acesso: aluno/aula.html?id=lives.id
========================================================= */
(() => {
    "use strict";

    const supabaseClient = window.supabaseClient;
    const LIVE_SELECT = `
        id, turma_id, professor_id, titulo, descricao,
        youtube_url, youtube_video_id, data_live,
        horario_inicio, horario_fim, status, created_at, updated_at
    `;
    const state = { authUser: null, usuario: null, cursos: [], cursoAtual: null, turmaAtual: null, aulas: [] };
    const $ = (id) => document.getElementById(id);

    function texto(valor, alternativa = "") { return valor === null || valor === undefined || valor === "" ? alternativa : String(valor); }
    function normalizarTexto(valor) { return texto(valor).trim().toLowerCase().replaceAll("_", " "); }
    function escapeHtml(valor) {
        return texto(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }
    function formatarData(valor) {
        if (!valor) return "—";
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    function formatarHorario(valor) { return valor && /^\d{2}:\d{2}/.test(String(valor)) ? String(valor).slice(0, 5) : "—"; }
    function statusTexto(status) {
        const valor = normalizarTexto(status);
        if (["ao vivo", "live"].includes(valor)) return "AO VIVO";
        if (["agendada", "agendado"].includes(valor)) return "AGENDADA";
        if (["encerrada", "encerrado", "finalizada", "finalizado"].includes(valor)) return "ENCERRADA";
        return status ? texto(status).replaceAll("_", " ").toUpperCase() : "LIVE";
    }

    function mostrarToast(titulo, mensagem, tipo = "success") {
        const toast = $("portalToast");
        if (!toast) return;
        if ($("portalToastTitulo")) $("portalToastTitulo").textContent = titulo || "Aviso";
        if ($("portalToastMensagem")) $("portalToastMensagem").textContent = mensagem || "";
        if ($("portalToastIcon")) $("portalToastIcon").textContent = tipo === "success" ? "✓" : "!";
        toast.hidden = false;
        clearTimeout(toast._mepTimeout);
        toast._mepTimeout = setTimeout(() => { toast.hidden = true; }, 4500);
    }
    function mostrarErro(titulo, erro) {
        console.error(`MEP EAD | ${titulo}`, erro);
        mostrarToast(titulo, erro?.message || "Ocorreu um erro inesperado.", "error");
    }

    async function verificarSessao() {
        if (!supabaseClient) throw new Error("Cliente Supabase não encontrado.");
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) throw error;
        if (!data?.user) { window.location.href = "../index.html"; return null; }
        state.authUser = data.user;
        return data.user;
    }

    async function carregarUsuario() {
        const { data, error } = await supabaseClient.from("usuarios").select(`
            id, auth_id, nome, email, perfil, ativo, foto_url, primeiro_acesso
        `).eq("auth_id", state.authUser.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Usuário não encontrado na tabela usuarios.");
        if (normalizarTexto(data.perfil) !== "aluno") throw new Error("Este portal é exclusivo para alunos.");
        if (data.ativo === false) throw new Error("Seu acesso está desativado.");
        state.usuario = data;
        atualizarPerfil();
    }

    function atualizarPerfil() {
        const nome = state.usuario?.nome || state.usuario?.email || "Aluno";
        const primeiroNome = nome.trim().split(/\s+/)[0] || "Aluno";
        if ($("studentName")) $("studentName").textContent = nome;
        if ($("welcomeTitle")) $("welcomeTitle").textContent = `Bem-vindo(a), ${primeiroNome}`;
        if ($("profileInitial")) { $("profileInitial").textContent = primeiroNome.charAt(0).toUpperCase(); $("profileInitial").hidden = Boolean(state.usuario?.foto_url); }
        if ($("profileImage")) {
            $("profileImage").hidden = !state.usuario?.foto_url;
            if (state.usuario?.foto_url) $("profileImage").src = state.usuario.foto_url;
        }
    }

    async function carregarCursos() {
        const loading = $("cursosLoading");
        if (loading) loading.hidden = false;
        try {
            const { data, error } = await supabaseClient.from("turma_alunos").select(`
                id, turma_id, aluno_id, ativo, data_matricula,
                turmas (id, curso_id, nome, codigo, descricao, data_inicio, data_fim, ativa,
                    cursos (id, nome, descricao, imagem_url, ativo))
            `).eq("aluno_id", state.usuario.id).eq("ativo", true);
            if (error) throw error;
            const porCurso = new Map();
            for (const matricula of data || []) {
                const turma = matricula.turmas;
                const curso = turma?.cursos;
                if (!turma || !curso || curso.ativo === false) continue;
                if (!porCurso.has(curso.id)) porCurso.set(curso.id, { ...curso, turmas: [] });
                porCurso.get(curso.id).turmas.push({ ...turma, matricula });
            }
            state.cursos = [...porCurso.values()];
            renderizarCursos();
        } catch (erro) {
            state.cursos = [];
            renderizarCursos();
            mostrarErro("Erro ao carregar cursos", erro);
        } finally { if (loading) loading.hidden = true; }
    }

    function renderizarCursos() {
        const grade = $("cursosGrid"), vazio = $("cursosEmpty");
        if ($("cursosCount")) $("cursosCount").textContent = state.cursos.length === 1 ? "1 curso" : `${state.cursos.length} cursos`;
        if (!grade) return;
        grade.innerHTML = "";
        if (!state.cursos.length) { if (vazio) vazio.hidden = false; return; }
        if (vazio) vazio.hidden = true;
        for (const curso of state.cursos) {
            const card = document.createElement("article");
            card.className = "curso-card";
            const capa = curso.imagem_url
                ? `<img src="${escapeHtml(curso.imagem_url)}" alt="${escapeHtml(curso.nome || "Curso")}">`
                : `<div class="curso-card-cover-placeholder">MEP</div>`;
            card.innerHTML = `<div class="curso-card-cover">${capa}</div><div class="curso-card-content">
                <span class="eyebrow">CURSO</span><h3>${escapeHtml(curso.nome || "Curso")}</h3>
                <p>${escapeHtml(curso.descricao || "Acompanhe o conteúdo deste curso.")}</p>
                <button type="button" class="curso-acessar-button">Acessar curso →</button></div>`;
            card.querySelector(".curso-acessar-button").addEventListener("click", () => abrirCurso(curso));
            grade.appendChild(card);
        }
    }

    function escolherTurma(curso) { return curso?.turmas?.find((turma) => turma.ativa === true) || curso?.turmas?.[0] || null; }

    async function abrirCurso(curso) {
        const turma = escolherTurma(curso);
        if (!turma) { mostrarToast("Curso", "Nenhuma turma disponível para este curso.", "warning"); return; }
        state.cursoAtual = curso;
        state.turmaAtual = turma;
        $("portalHomeView").hidden = true;
        $("cursoViewSection").hidden = false;
        atualizarCabecalhoCurso();
        await carregarAulas();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function atualizarCabecalhoCurso() {
        const curso = state.cursoAtual, turma = state.turmaAtual;
        if ($("cursoViewTitulo")) $("cursoViewTitulo").textContent = curso?.nome || "Curso";
        if ($("cursoViewDescricao")) $("cursoViewDescricao").textContent = curso?.descricao || "Acompanhe o conteúdo do curso.";
        if ($("cursoViewTurma")) $("cursoViewTurma").textContent = turma?.nome || "—";
        if ($("cursoViewPeriodo")) $("cursoViewPeriodo").textContent = `${formatarData(turma?.data_inicio)} até ${formatarData(turma?.data_fim)}`;
    }

    async function carregarAulas() {
        if (!state.turmaAtual?.id) return;
        const loading = $("cursoAulasLoading");
        if (loading) loading.hidden = false;
        try {
            const { data, error } = await supabaseClient.from("lives").select(LIVE_SELECT).eq("turma_id", state.turmaAtual.id)
                .order("data_live", { ascending: true, nullsFirst: false }).order("horario_inicio", { ascending: true, nullsFirst: false });
            if (error) throw error;
            state.aulas = data || [];
            renderizarAulas();
            await atualizarIndicadoresCurso();
        } catch (erro) {
            state.aulas = [];
            renderizarAulas();
            mostrarErro("Erro ao carregar aulas", erro);
        } finally { if (loading) loading.hidden = true; }
    }

    function renderizarAulas() {
        const lista = $("cursoAulasList"), vazio = $("cursoAulasEmpty"), total = state.aulas.length;
        if ($("cursoAulasCount")) $("cursoAulasCount").textContent = total === 1 ? "1 aula" : `${total} aulas`;
        if ($("cursoViewTotalAulas")) $("cursoViewTotalAulas").textContent = String(total);
        if (!lista) return;
        lista.innerHTML = "";
        if (!total) { if (vazio) vazio.hidden = false; return; }
        if (vazio) vazio.hidden = true;
        state.aulas.forEach((live, indice) => {
            const card = document.createElement("article");
            card.className = "curso-aula-card";
            const horario = live.horario_inicio ? ` • ${escapeHtml(formatarHorario(live.horario_inicio))}` : "";
            card.innerHTML = `<div class="curso-aula-number">${String(indice + 1).padStart(2, "0")}</div>
                <div class="curso-aula-content"><span class="eyebrow">${escapeHtml(statusTexto(live.status))}</span>
                <h3>${escapeHtml(live.titulo || "Aula")}</h3><p>${escapeHtml(live.descricao || "Acesse para acompanhar esta aula.")}</p>
                <span class="curso-aula-date">${escapeHtml(formatarData(live.data_live))}${horario}</span></div>
                <button type="button" class="curso-aula-acessar-button" ${live.id ? "" : "disabled"}>Acessar aula →</button>`;
            card.querySelector(".curso-aula-acessar-button").addEventListener("click", () => abrirAula(live));
            lista.appendChild(card);
        });
    }

    function abrirAula(live) {
        if (!live?.id) { mostrarToast("Aula indisponível", "Não foi possível identificar a aula selecionada.", "error"); return; }
        window.location.href = `./aula.html?id=${encodeURIComponent(String(live.id).trim())}`;
    }

    async function atualizarIndicadoresCurso() {
        const total = state.aulas.length;
        let percentual = 0;
        try {
            const liveIds = state.aulas.map((live) => live.id).filter(Boolean);
            if (liveIds.length) {
                const { data: chamadas, error: erroChamadas } = await supabaseClient.from("presencas_chamadas").select("id, aula_id")
                    .in("aula_id", liveIds);
                if (erroChamadas) throw erroChamadas;
                const chamadaIds = (chamadas || []).map((chamada) => chamada.id);
                if (chamadaIds.length) {
                    const { data: respostas, error: erroRespostas } = await supabaseClient.from("presencas").select("chamada_id")
                        .eq("aluno_id", state.usuario.id).eq("presente", true).in("chamada_id", chamadaIds);
                    if (erroRespostas) throw erroRespostas;
                    percentual = Math.round((new Set((respostas || []).map((resposta) => resposta.chamada_id)).size / chamadaIds.length) * 100);
                }
            }
        } catch (erro) { console.warn("MEP EAD | Não foi possível calcular a frequência:", erro); }
        percentual = Math.max(0, Math.min(100, percentual));
        if ($("cursoViewFrequencia")) $("cursoViewFrequencia").textContent = `${percentual}%`;
        if ($("cursoProgressPercent")) $("cursoProgressPercent").textContent = `${percentual}%`;
        if ($("cursoProgressFill")) $("cursoProgressFill").style.width = `${percentual}%`;
        if ($("cursoProgressTexto")) $("cursoProgressTexto").textContent = total ? `${total} ${total === 1 ? "aula disponível" : "aulas disponíveis"}.` : "Nenhuma aula disponível.";
    }

    function voltarParaCursos() {
        state.cursoAtual = null; state.turmaAtual = null; state.aulas = [];
        $("cursoViewSection").hidden = true;
        $("aulaViewSection").hidden = true;
        $("portalHomeView").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    async function realizarLogout() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) { mostrarErro("Erro ao sair", error); return; }
        window.location.href = "../index.html";
    }
    function configurarEventos() {
        $("logoutButton")?.addEventListener("click", realizarLogout);
        $("voltarCursosButton")?.addEventListener("click", voltarParaCursos);
        $("voltarAulasButton")?.addEventListener("click", voltarParaCursos);
        $("voltarAulasFooterButton")?.addEventListener("click", voltarParaCursos);
    }
    async function inicializar() {
        try {
            configurarEventos();
            if (!await verificarSessao()) return;
            await carregarUsuario();
            await carregarCursos();
        } catch (erro) { mostrarErro("Erro ao carregar portal", erro); }
    }

    window.MEPPortal = { state, abrirCurso, abrirAula, carregarCursos, carregarAulas, realizarLogout };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializar);
    else inicializar();
})();
