/* =========================================================
   MEP EAD — AULA DO ALUNO

   Fluxo: aluno/aula.html?id=LIVE_ID -> lives.id
   A fonte das aulas é exclusivamente a tabela "lives".
========================================================= */
(function () {
    "use strict";

    const DEBUG = true;
    /* Os dados públicos da aula não incluem o link do vídeo.
       O YouTube só é consultado depois que o status for confirmado como ao vivo. */
    const LIVE_SELECT_BASE = `
        id, turma_id, professor_id, titulo, descricao,
        data_live, horario_inicio, horario_fim,
        status, created_at, updated_at
    `;
    const LIVE_SELECT_WITH_VIDEO = `
        id, turma_id, professor_id, titulo, descricao,
        data_live, horario_inicio, horario_fim,
        status, created_at, updated_at,
        youtube_url, youtube_video_id
    `;
    const CHAT_SELECT = `
        id, live_id, aluno_id, mensagem, created_at,
        aluno:usuarios!chat_mensagens_aluno_id_fkey(nome, foto_url)
    `;

    const state = {
        authUser: null,
        usuario: null,
        live: null,
        financeiro: null,
        chamada: null,
        participante: null,
        liveAoVivo: false,
        presencaProcessando: false,
        timeoutPresenca: null,
        intervaloContadorPresenca: null,
        intervaloStatusLive: null,
        timeoutStatusLive: null,
        canalStatusLive: null,
        atualizandoStatusLive: false,
        intervaloPresenca: null,
        canalPresenca: null,
        intervaloParticipacao: null,
        canalChat: null,
        chatAberto: true,
        chatEmTelaCheia: false,
        chatNaoLidas: 0,
        chatMensagensIds: new Set(),
        chatCarregado: false,
        timeoutAvisoChat: null
    };

    function log(...args) { if (DEBUG) console.log("MEP EAD |", ...args); }
    function warn(...args) { console.warn("MEP EAD |", ...args); }
    function erroLog(...args) { console.error("MEP EAD |", ...args); }
    function $(id) { return document.getElementById(id); }

    function normalizarTexto(value) {
        return String(value || "").trim().toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function obterIdDaLive() {
        const params = new URL(window.location.href).searchParams;
        const id = params.get("id") || params.get("live_id") || params.get("liveId");
        return id ? String(id).trim() : null;
    }

    function formatarData(valor) {
        if (!valor) return "—";
        const correspondencia = String(valor).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        const data = correspondencia
            ? new Date(Number(correspondencia[1]), Number(correspondencia[2]) - 1, Number(correspondencia[3]))
            : new Date(valor);
        return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleDateString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });
    }

    function formatarHorario(valor) {
        if (!valor) return "—";
        if (/^\d{2}:\d{2}/.test(String(valor))) return String(valor).slice(0, 5);
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleTimeString("pt-BR", {
            hour: "2-digit", minute: "2-digit"
        });
    }

    function segundosDoHorario(valor) {
        if (!valor) return null;
        if (/^\d{2}:\d{2}/.test(String(valor))) {
            const [hora, minuto = "0", segundo = "0"] = String(valor).split(":");
            return Number(hora) * 3600 + Number(minuto) * 60 + Number(segundo);
        }
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? null : Math.floor(data.getTime() / 1000);
    }

    function calcularDuracaoSegundos(inicio, fim) {
        const inicioSegundos = segundosDoHorario(inicio);
        const fimSegundos = segundosDoHorario(fim);
        if (inicioSegundos === null || fimSegundos === null) return 0;
        let duracao = fimSegundos - inicioSegundos;
        if (/^\d{2}:\d{2}/.test(String(inicio)) && duracao < 0) duracao += 86400;
        return Math.max(0, duracao);
    }

    function formatarDuracao(inicio, fim) {
        const minutos = Math.round(calcularDuracaoSegundos(inicio, fim) / 60);
        if (!minutos) return "—";
        if (minutos < 60) return `${minutos} min`;
        return minutos % 60 ? `${Math.floor(minutos / 60)}h ${minutos % 60}min` : `${minutos / 60}h`;
    }

    function construirDataHorario(data, horario) {
        if (!data || !horario) return null;
        const resultado = new Date(`${String(data).slice(0, 10)}T${String(horario).slice(0, 8)}`);
        return Number.isNaN(resultado.getTime()) ? null : resultado;
    }

    function extrairYoutubeId(valor) {
        const texto = String(valor || "").trim();
        if (!texto) return null;
        if (/^[a-zA-Z0-9_-]{6,}$/.test(texto)) return texto;
        try {
            const url = new URL(texto);
            if (url.searchParams.get("v")) return url.searchParams.get("v");
            const partes = url.pathname.split("/").filter(Boolean);
            if (url.hostname.includes("youtu.be")) return partes[0] || null;
            const indice = partes.findIndex(parte => parte === "embed" || parte === "live");
            return indice >= 0 ? partes[indice + 1] || null : null;
        } catch (_) {
            const match = texto.match(/(?:v=|youtu\.be\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{6,})/);
            return match ? match[1] : null;
        }
    }

    function mostrarToast(titulo, mensagem, tipo = "info") {
        const toast = $("portalToast");
        if (!toast) return;
        const icones = { error: "!", success: "✓", info: "i", warning: "!" };
        if ($("portalToastTitulo")) $("portalToastTitulo").textContent = titulo || "Aviso";
        if ($("portalToastMensagem")) $("portalToastMensagem").textContent = mensagem || "";
        if ($("portalToastIcon")) $("portalToastIcon").textContent = icones[tipo] || "i";
        toast.hidden = false;
        clearTimeout(toast._mepTimeout);
        toast._mepTimeout = setTimeout(() => { toast.hidden = true; }, 4500);
    }

    async function verificarSessao() {
        if (typeof supabaseClient === "undefined") throw new Error("Cliente Supabase não encontrado.");
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (!data?.session?.user) {
            window.location.href = "../index.html";
            return null;
        }
        state.authUser = data.session.user;
        return state.authUser;
    }

    async function carregarUsuario() {
        const { data, error } = await supabaseClient.from("usuarios").select(`
            id, auth_id, nome, email, perfil, ativo, foto_url, primeiro_acesso
        `).eq("auth_id", state.authUser.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Usuário não encontrado na tabela usuarios.");
        if (normalizarTexto(data.perfil) !== "aluno") throw new Error("Esta página é exclusiva para alunos.");
        if (data.ativo === false) throw new Error("Seu acesso está desativado.");
        state.usuario = data;
        atualizarPerfil();
        return data;
    }

    function atualizarPerfil() {
        const usuario = state.usuario;
        if (!usuario) return;
        const nome = usuario.nome || usuario.email || "Aluno";
        const inicial = nome.trim().charAt(0).toUpperCase() || "A";
        if ($("studentName")) $("studentName").textContent = nome;
        if ($("profileInitial")) { $("profileInitial").textContent = inicial; $("profileInitial").hidden = Boolean(usuario.foto_url); }
        if ($("profileImage") && usuario.foto_url) { $("profileImage").src = usuario.foto_url; $("profileImage").hidden = false; }
    }

    async function verificarAcessoTurma(live) {
        if (!state.usuario || !live?.turma_id) return true;
        const { data, error } = await supabaseClient.from("turma_alunos").select("id, aluno_id, turma_id, ativo")
            .eq("aluno_id", state.usuario.id).eq("turma_id", live.turma_id).maybeSingle();
        if (error) throw error;
        if (!data || data.ativo === false) throw new Error("Você não possui acesso à turma desta aula.");
        return true;
    }

    async function buscarLive(id, incluirVideo = false) {
        const campos = incluirVideo ? LIVE_SELECT_WITH_VIDEO : LIVE_SELECT_BASE;
        const { data, error } = await supabaseClient.from("lives").select(campos).eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("A aula não foi encontrada na tabela lives.");
        return data;
    }

    async function verificarAcessoFinanceiroLive(id) {
        const { data, error } = await supabaseClient.rpc("aluno_status_financeiro_live", { p_live_id:id });
        if (error) {
            warn("Não foi possível consultar a mensalidade da aula:", error);
            return true;
        }
        state.financeiro = data || null;
        if (data?.liberado === false) {
            throw new Error("O acesso a este curso está pausado por mensalidade pendente. Regularize pelo Portal do Aluno; sua matrícula e seu progresso continuam preservados.");
        }
        return true;
    }

    async function carregarLive() {
        const id = obterIdDaLive();
        if (!id) throw new Error("Nenhuma aula foi informada. O endereço precisa conter ?id=ID_DA_LIVE.");
        await verificarAcessoFinanceiroLive(id);
        const live = await buscarLive(id);
        await verificarAcessoTurma(live);
        state.live = live;
        atualizarInformacoesAula();
        await atualizarEstadoDaLive();
        return live;
    }

    function atualizarInformacoesAula() {
        const live = state.live;
        if (!live) return;
        const titulo = live.titulo || "Aula";
        const descricao = live.descricao || "Nenhuma descrição foi informada.";
        if ($("aulaViewTitulo")) $("aulaViewTitulo").textContent = titulo;
        if ($("aulaViewDescricao")) $("aulaViewDescricao").textContent = descricao;
        if ($("livePlayerTitulo")) $("livePlayerTitulo").textContent = titulo;
        if ($("aulaDetailsTitulo")) $("aulaDetailsTitulo").textContent = titulo;
        if ($("aulaDetailsDescricao")) $("aulaDetailsDescricao").textContent = descricao;
        if ($("aulaInfoData")) $("aulaInfoData").textContent = formatarData(live.data_live);
        if ($("aulaInfoHorario")) $("aulaInfoHorario").textContent = live.horario_fim
            ? `${formatarHorario(live.horario_inicio)} às ${formatarHorario(live.horario_fim)}`
            : formatarHorario(live.horario_inicio);
        if ($("aulaInfoDuracao")) $("aulaInfoDuracao").textContent = formatarDuracao(live.horario_inicio, live.horario_fim);
    }

    function obterStatusLive(live = state.live) { return normalizarTexto(live?.status); }
    function liveEstaAoVivo(live = state.live) {
        const status = obterStatusLive(live);
        /* Data e horário informam quando a aula está prevista, mas não liberam
           a transmissão. Apenas a ação do administrador/professor que muda o
           status para ao vivo autoriza o carregamento do player. */
        return ["ao vivo", "ao_vivo", "ao-vivo", "live"].includes(status);
    }

    function atualizarStatusVisual(rotulo, descricao) {
        if ($("aulaStatusLabel")) $("aulaStatusLabel").textContent = rotulo;
        if ($("aulaStatusDescricao")) $("aulaStatusDescricao").textContent = descricao;
        const ponto = $("aulaStatusDot") || $("aulaStatusIndicator");
        if (ponto) ponto.dataset.status = normalizarTexto(rotulo);
    }

    function esconder(elemento) { if (elemento) elemento.hidden = true; }
    function mostrar(elemento) { if (elemento) elemento.hidden = false; }

    function prepararPlayer() {
        const videoId = state.live?.youtube_video_id || extrairYoutubeId(state.live?.youtube_url);
        mostrar($("livePlayerSection"));
        if ($("livePlayerTitulo")) $("livePlayerTitulo").textContent = state.live?.titulo || "Transmissão ao vivo";
        const iframe = $("livePlayerIframe");
        if (iframe && videoId) {
            const origem = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&fs=0`;
            /* A consulta periódica da live não pode reiniciar o YouTube.
               Só definimos src quando o vídeo informado realmente mudou. */
            if (iframe.getAttribute("src") !== origem) iframe.src = origem;
            mostrar(iframe); esconder($("livePlayerPlaceholder"));
        } else {
            if (iframe) { iframe.removeAttribute("src"); esconder(iframe); }
            mostrar($("livePlayerPlaceholder"));
        }
    }

    function resetarPlayer() {
        esconder($("livePlayerSection"));
        const iframe = $("livePlayerIframe");
        if (iframe) { iframe.removeAttribute("src"); esconder(iframe); }
        esconder($("livePlayerPlaceholder"));
    }

    function formatarHoraChat(valor) {
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toLocaleTimeString("pt-BR", {
            hour: "2-digit", minute: "2-digit"
        });
    }

    function resumirNomeChat(valor) {
        const partes = String(valor || "Aluno").trim().split(/\s+/).filter(Boolean);
        return partes.slice(0, 2).join(" ") || "Aluno";
    }

    function obterAutorChat(mensagem) {
        const aluno = Array.isArray(mensagem?.aluno) ? mensagem.aluno[0] : mensagem?.aluno;
        const nomeCompleto = aluno?.nome || (mensagem?.aluno_id === state.usuario?.id ? state.usuario?.nome : "Aluno");
        const nome = resumirNomeChat(nomeCompleto);
        return { nome, fotoUrl: aluno?.foto_url || null };
    }

    function atualizarContadorChat() {
        const contador = $("liveChatUnreadCount");
        if (!contador) return;
        contador.textContent = state.chatNaoLidas > 99 ? "99+" : String(state.chatNaoLidas);
        contador.hidden = state.chatNaoLidas === 0;
    }

    function esconderAvisoChat() {
        clearTimeout(state.timeoutAvisoChat);
        state.timeoutAvisoChat = null;
        esconder($("liveChatNotification"));
    }

    function existePresencaAberta() {
        const overlay = $("presencaOverlay");
        return Boolean(overlay && !overlay.hidden);
    }

    function mostrarAvisoChat(mensagem) {
        if (!state.chatEmTelaCheia || state.chatAberto || existePresencaAberta()) return;
        const aviso = $("liveChatNotification");
        if (!aviso) return;
        const autor = obterAutorChat(mensagem);
        if ($("liveChatNotificationAuthor")) $("liveChatNotificationAuthor").textContent = `${autor.nome}:`;
        if ($("liveChatNotificationText")) $("liveChatNotificationText").textContent = String(mensagem.mensagem || "");
        mostrar(aviso);
        clearTimeout(state.timeoutAvisoChat);
        state.timeoutAvisoChat = setTimeout(esconderAvisoChat, 5000);
    }

    function adicionarMensagemChat(mensagem, { nova = false } = {}) {
        if (!mensagem?.id || state.chatMensagensIds.has(mensagem.id)) return;
        const lista = $("liveChatMessages");
        if (!lista) return;
        state.chatMensagensIds.add(mensagem.id);
        esconder($("liveChatEmpty"));

        const autor = obterAutorChat(mensagem);
        const item = document.createElement("article");
        item.className = "live-chat-message";
        item.dataset.messageId = mensagem.id;

        const avatar = document.createElement("div");
        avatar.className = "live-chat-message-avatar";
        avatar.textContent = (autor.nome || "A").trim().charAt(0).toUpperCase() || "A";

        const conteudo = document.createElement("div");
        const nome = document.createElement("strong");
        nome.className = "live-chat-message-author";
        nome.textContent = `${autor.nome}${formatarHoraChat(mensagem.created_at) ? ` · ${formatarHoraChat(mensagem.created_at)}` : ""}`;
        const texto = document.createElement("p");
        texto.className = "live-chat-message-text";
        texto.textContent = mensagem.mensagem || "";
        conteudo.append(nome, texto);
        item.append(avatar, conteudo);
        lista.append(item);
        lista.scrollTop = lista.scrollHeight;

        if (nova && mensagem.aluno_id !== state.usuario?.id && !state.chatAberto) {
            state.chatNaoLidas += 1;
            atualizarContadorChat();
            mostrarAvisoChat(mensagem);
        }
    }

    function limparMensagensChat() {
        const lista = $("liveChatMessages");
        if (lista) lista.replaceChildren();
        state.chatMensagensIds.clear();
        mostrar($("liveChatEmpty"));
    }

    async function carregarMensagensChat() {
        if (!state.live?.id) return;
        const { data, error } = await supabaseClient.from("chat_mensagens")
            .select(CHAT_SELECT)
            .eq("live_id", state.live.id)
            .order("created_at", { ascending: true })
            .limit(200);
        if (error) throw error;
        limparMensagensChat();
        (data || []).forEach(mensagem => adicionarMensagemChat(mensagem));
        state.chatCarregado = true;
    }

    async function completarAutorChat(mensagem) {
        if (mensagem?.aluno_id === state.usuario?.id) return { ...mensagem, aluno: state.usuario };
        const { data, error } = await supabaseClient.from("usuarios")
            .select("nome, foto_url")
            .eq("id", mensagem.aluno_id)
            .maybeSingle();
        if (error) warn("Não foi possível identificar o autor da mensagem:", error);
        return { ...mensagem, aluno: data || null };
    }

    function iniciarRealtimeChat() {
        if (!state.live?.id || state.canalChat || !supabaseClient.channel) return;
        state.canalChat = supabaseClient.channel(`chat-live-${state.live.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "chat_mensagens",
                filter: `live_id=eq.${state.live.id}`
            }, async ({ new: mensagem }) => {
                adicionarMensagemChat(await completarAutorChat(mensagem), { nova: true });
            })
            .subscribe(status => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    warn("Canal em tempo real do chat indisponível:", status);
                }
            });
    }

    function pararRealtimeChat() {
        if (!state.canalChat) return;
        supabaseClient.removeChannel?.(state.canalChat);
        state.canalChat = null;
    }

    async function iniciarChat() {
        if (!state.liveAoVivo || !state.live?.id || !state.usuario?.id) return;
        if (!state.chatCarregado) await carregarMensagensChat();
        iniciarRealtimeChat();
    }

    function pararChat() {
        pararRealtimeChat();
        esconderAvisoChat();
    }

    function atualizarCampoChat() {
        const campo = $("liveChatInput");
        const botao = $("liveChatSendButton");
        const contador = $("liveChatCharacterCount");
        const tamanho = String(campo?.value || "").length;
        if (contador) contador.textContent = `${tamanho}/1000`;
        if (botao) botao.disabled = !String(campo?.value || "").trim();
    }

    function moverChatParaTelaCheia(ativo) {
        const painel = $("liveChatPanel");
        const alternador = $("liveChatToggleButton");
        const aviso = $("liveChatNotification");
        const player = $("livePlayer");
        const layout = $("livePlayerLayout");
        const secao = $("livePlayerSection");
        if (!painel || !alternador || !aviso || !player || !layout || !secao) return;
        if (ativo) {
            player.append(painel, alternador, aviso);
        } else {
            layout.append(painel);
            secao.append(alternador, aviso);
        }
    }

    function atualizarVisibilidadeChat() {
        const painel = $("liveChatPanel");
        const alternador = $("liveChatToggleButton");
        if (painel) painel.hidden = !state.chatAberto;
        if (alternador) {
            alternador.hidden = state.chatAberto;
            alternador.setAttribute("aria-expanded", String(state.chatAberto));
            alternador.setAttribute("aria-label", state.chatAberto ? "Ocultar chat" : "Mostrar chat");
        }
        if (state.chatAberto) {
            state.chatNaoLidas = 0;
            atualizarContadorChat();
            esconderAvisoChat();
        }
    }

    function alternarChat() {
        state.chatAberto = !state.chatAberto;
        atualizarVisibilidadeChat();
    }

    async function enviarMensagemChat(evento) {
        evento?.preventDefault();
        const campo = $("liveChatInput");
        const botao = $("liveChatSendButton");
        const mensagem = String(campo?.value || "").trim();
        if (!mensagem || !state.live?.id || !state.usuario?.id) return;
        if (botao) { botao.disabled = true; botao.textContent = "Enviando..."; }
        try {
            const { data, error } = await supabaseClient.from("chat_mensagens").insert({
                live_id: state.live.id,
                aluno_id: state.usuario.id,
                mensagem
            }).select("id, live_id, aluno_id, mensagem, created_at").single();
            if (error) throw error;
            adicionarMensagemChat({ ...data, aluno: state.usuario }, { nova: true });
            campo.value = "";
            atualizarCampoChat();
            campo.focus();
        } catch (erro) {
            mostrarToast("Mensagem não enviada", erro.message || "Não foi possível enviar sua mensagem.", "error");
            erroLog("Erro ao enviar mensagem do chat:", erro);
        } finally {
            if (botao) botao.textContent = "Enviar";
            atualizarCampoChat();
        }
    }

    function mostrarAgendada() {
        atualizarStatusVisual("AGENDADA", "Esta aula ainda não começou.");
        mostrar($("aulaLockedCard")); esconder($("aulaUnavailableCard")); resetarPlayer();
        if ($("aulaAgendadaHorario")) $("aulaAgendadaHorario").textContent = state.live?.data_live && state.live?.horario_inicio
            ? `${formatarData(state.live.data_live)} às ${formatarHorario(state.live.horario_inicio)}` : "—";
    }

    function mostrarEncerrada() {
        atualizarStatusVisual("ENCERRADA", "Esta aula não está ao vivo.");
        esconder($("aulaLockedCard")); mostrar($("aulaUnavailableCard")); resetarPlayer();
        if ($("aulaUnavailableDescricao")) $("aulaUnavailableDescricao").textContent = "Esta transmissão já foi encerrada.";
    }

    async function mostrarAoVivo() {
        atualizarStatusVisual("AO VIVO", "A transmissão está acontecendo agora.");
        esconder($("aulaLockedCard")); esconder($("aulaUnavailableCard")); prepararPlayer();
        await iniciarParticipacao();
        /* Não reinicia a chamada de presença a cada atualização de status. */
        if (!state.intervaloPresenca) iniciarMonitoramentoPresenca();
        await iniciarChat();
    }

    async function atualizarEstadoDaLive() {
        if (!state.live) return;
        const status = obterStatusLive();
        state.liveAoVivo = liveEstaAoVivo();
        if (state.liveAoVivo) {
            /* Confirma novamente o status na mesma consulta que recebe o vídeo.
               Isso evita liberar um link se o status mudar durante a atualização. */
            const liveComVideo = await buscarLive(state.live.id, true);
            if (!liveEstaAoVivo(liveComVideo)) {
                state.live = liveComVideo;
                state.liveAoVivo = false;
                atualizarInformacoesAula();
                pararParticipacao(); pararMonitoramentoPresenca(); pararChat();
                const statusAtualizado = obterStatusLive(liveComVideo);
                if (["encerrada", "encerrado", "finalizada", "finalizado"].includes(statusAtualizado)) {
                    mostrarEncerrada();
                } else {
                    mostrarAgendada();
                }
                return;
            }
            state.live = liveComVideo;
            atualizarInformacoesAula();
            await mostrarAoVivo();
            return;
        }
        pararParticipacao(); pararMonitoramentoPresenca(); pararChat();
        if (["encerrada", "encerrado", "finalizada", "finalizado"].includes(status) ||
            (state.live.data_live && state.live.horario_fim && construirDataHorario(state.live.data_live, state.live.horario_fim) < new Date())) {
            mostrarEncerrada();
        } else {
            mostrarAgendada();
        }
    }

    async function atualizarStatusLive() {
        if (!state.live?.id) return;
        if (state.atualizandoStatusLive) {
            clearTimeout(state.timeoutStatusLive);
            state.timeoutStatusLive = setTimeout(() => {
                atualizarStatusLive().catch(erro => warn("Erro ao concluir atualização da live:", erro));
            }, 300);
            return;
        }
        state.atualizandoStatusLive = true;
        try {
            state.live = await buscarLive(state.live.id);
            atualizarInformacoesAula();
            await atualizarEstadoDaLive();
        } finally {
            state.atualizandoStatusLive = false;
        }
    }

    function agendarAtualizacaoStatusLive() {
        clearTimeout(state.timeoutStatusLive);
        state.timeoutStatusLive = setTimeout(() => {
            atualizarStatusLive().catch(erro => warn("Erro ao receber atualização da live:", erro));
        }, 120);
    }

    function iniciarRealtimeStatusLive() {
        if (!state.live?.id || state.canalStatusLive || !supabaseClient.channel) return;
        state.canalStatusLive = supabaseClient
            .channel(`status-aula-${state.live.id}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "lives",
                filter: `id=eq.${state.live.id}`
            }, agendarAtualizacaoStatusLive)
            .subscribe(status => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    warn("Atualização em tempo real da aula indisponível; mantendo verificação automática.", status);
                }
            });
    }

    function iniciarMonitoramentoLive() {
        pararMonitoramentoLive();
        iniciarRealtimeStatusLive();
        state.intervaloStatusLive = setInterval(() => atualizarStatusLive().catch(erro => warn("Erro ao atualizar a live:", erro)), 5000);
    }
    function pararMonitoramentoLive() {
        clearInterval(state.intervaloStatusLive);
        clearTimeout(state.timeoutStatusLive);
        state.intervaloStatusLive = null;
        state.timeoutStatusLive = null;
        if (state.canalStatusLive) supabaseClient.removeChannel?.(state.canalStatusLive);
        state.canalStatusLive = null;
    }

    function fecharOverlayPresenca() {
        clearTimeout(state.timeoutPresenca);
        clearInterval(state.intervaloContadorPresenca);
        state.timeoutPresenca = null;
        state.intervaloContadorPresenca = null;
        const overlay = $("presencaOverlay");
        if (overlay) { overlay.hidden = true; overlay.setAttribute("aria-hidden", "true"); }
    }

    function atualizarModoTelaCheia(expandido) {
        const player = $("livePlayer");
        player?.classList.toggle("mep-player-expandido", expandido);
        document.body.classList.toggle("mep-player-expandido-ativo", expandido);
        const botao = $("liveFullscreenButton");
        botao?.setAttribute("aria-label", expandido ? "Sair da tela cheia" : "Tela cheia");
        botao?.setAttribute("title", expandido ? "Sair da tela cheia" : "Tela cheia");
        state.chatEmTelaCheia = expandido;
        moverChatParaTelaCheia(expandido);
        atualizarVisibilidadeChat();
    }

    function liberarOrientacao() {
        try {
            screen.orientation?.unlock?.();
        } catch (_) {
            /* Alguns navegadores, como o Safari, não expõem esta API. */
        }
    }

    async function solicitarPaisagem() {
        try {
            await screen.orientation?.lock?.("landscape");
        } catch (_) {
            /* Com a orientação do manifesto liberada, o giro físico continua funcionando. */
        }
    }

    async function sairDaTelaCheiaParaPresenca() {
        atualizarModoTelaCheia(false);
        liberarOrientacao();
        if (!document.fullscreenElement || !document.exitFullscreen) return;
        try {
            await document.exitFullscreen();
        } catch (erro) {
            warn("Não foi possível sair da tela cheia para a chamada de presença:", erro);
        }
    }

    function mostrarPresenca(chamada, confirmada = false) {
        const overlay = $("presencaOverlay");
        if (!overlay) return;
        if ($("presencaModalTitulo")) $("presencaModalTitulo").textContent = confirmada ? "Presença confirmada" : "Confirme sua presença";
        if ($("presencaModalAula")) $("presencaModalAula").textContent = state.live?.titulo || "Aula";
        const status = $("presencaModalStatus");
        if (status) status.textContent = confirmada
            ? "Sua presença já foi registrada para esta chamada."
            : "O professor abriu uma chamada de presença. Confirme para registrar sua participação.";
        if ($("confirmarPresencaButton")) { $("confirmarPresencaButton").disabled = confirmada; $("confirmarPresencaButton").textContent = confirmada ? "✓ Presença confirmada" : "Confirmar presença"; }
        esconderAvisoChat();
        overlay.hidden = false; overlay.setAttribute("aria-hidden", "false"); state.chamada = chamada;

        clearTimeout(state.timeoutPresenca);
        clearInterval(state.intervaloContadorPresenca);
        if (!confirmada) {
            const fimDaJanela = Date.now() + 15000;
            const atualizarContador = () => {
                const segundosRestantes = Math.max(0, Math.ceil((fimDaJanela - Date.now()) / 1000));
                if (status) {
                    status.textContent = `Confirme sua presença. Esta caixa fechará em ${segundosRestantes}s.`;
                }
                if (segundosRestantes === 0) fecharOverlayPresenca();
            };
            atualizarContador();
            state.intervaloContadorPresenca = setInterval(atualizarContador, 250);
            state.timeoutPresenca = setTimeout(() => {
                fecharOverlayPresenca();
            }, 15000);
        }
    }

    async function alunoJaRespondeu(chamadaId) {
        if (!chamadaId || !state.usuario?.id) return false;
        const { data, error } = await supabaseClient.from("presencas")
            .select("id, chamada_id, aluno_id, presente, respondido_em")
            .eq("chamada_id", chamadaId)
            .eq("aluno_id", state.usuario.id)
            .maybeSingle();
        if (error) { warn("Erro ao verificar resposta de presença:", error); return false; }
        return data?.presente === true;
    }

    async function verificarChamadaPresenca() {
        if (!state.liveAoVivo || !state.live?.id || !state.usuario?.id) return;
        const { data, error } = await supabaseClient.from("presencas_chamadas").select(`
            id, aula_id, turma_id, numero, ativa,
            aberta_em, fechada_em, duracao_segundos, created_at
        `).eq("aula_id", state.live.id).eq("ativa", true)
            .order("aberta_em", { ascending: false }).limit(1);
        if (error) { warn("Erro ao verificar chamada de presença:", error); return; }
        const chamada = data?.[0];
        if (!chamada) {
            /* A janela do aluno continua por 15 segundos após aparecer,
               mesmo se o professor encerrar a chamada nesse intervalo. */
            if (state.timeoutPresenca) return;
            state.chamada = null;
            fecharOverlayPresenca();
            return;
        }
        const agora = Date.now(), inicio = chamada.aberta_em ? new Date(chamada.aberta_em).getTime() : null,
            fim = chamada.fechada_em ? new Date(chamada.fechada_em).getTime() : null;
        if ((inicio && agora < inicio) || (fim && agora >= fim)) { fecharOverlayPresenca(); return; }
        if (state.chamada?.id === chamada.id) return;
        state.chamada = chamada;
        if (await alunoJaRespondeu(chamada.id)) {
            fecharOverlayPresenca();
            return;
        }
        await sairDaTelaCheiaParaPresenca();
        mostrarPresenca(chamada);
    }

    function iniciarMonitoramentoPresenca() {
        pararMonitoramentoPresenca();
        verificarChamadaPresenca();
        iniciarRealtimePresenca();
        state.intervaloPresenca = setInterval(() => verificarChamadaPresenca().catch(erro => warn("Erro no monitoramento de presença:", erro)), 2000);
    }

    function iniciarRealtimePresenca() {
        if (!state.live?.id || !supabaseClient.channel) return;
        pararRealtimePresenca();
        state.canalPresenca = supabaseClient.channel(`presenca-aula-${state.live.id}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "presencas_chamadas",
                filter: `aula_id=eq.${state.live.id}`
            }, () => {
                verificarChamadaPresenca().catch(erro => warn("Erro ao atualizar presença em tempo real:", erro));
            })
            .subscribe((status) => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    warn("Canal em tempo real da presença indisponível:", status);
                }
            });
    }

    function pararRealtimePresenca() {
        if (!state.canalPresenca) return;
        supabaseClient.removeChannel?.(state.canalPresenca);
        state.canalPresenca = null;
    }

    function pararMonitoramentoPresenca() {
        clearInterval(state.intervaloPresenca);
        state.intervaloPresenca = null;
        pararRealtimePresenca();
        fecharOverlayPresenca();
    }

    async function confirmarPresenca() {
        if (state.presencaProcessando || !state.chamada?.id || !state.usuario?.id || !state.live?.id) return;
        state.presencaProcessando = true;
        const botao = $("confirmarPresencaButton");
        if (botao) { botao.disabled = true; botao.textContent = "Registrando..."; }
        try {
            if (await alunoJaRespondeu(state.chamada.id)) {
                fecharOverlayPresenca();
                mostrarToast("Presença confirmada", "Sua presença já estava registrada.", "success");
                return;
            }
            const { data: presencaExistente, error: erroBusca } = await supabaseClient
                .from("presencas")
                .select("id")
                .eq("chamada_id", state.chamada.id)
                .eq("aluno_id", state.usuario.id)
                .maybeSingle();

            if (erroBusca) throw erroBusca;

            const valoresConfirmacao = {
                presente: true,
                respondido_em: new Date().toISOString()
            };

            const { error } = presencaExistente
                ? await supabaseClient.from("presencas")
                    .update(valoresConfirmacao)
                    .eq("id", presencaExistente.id)
                : await supabaseClient.from("presencas").insert({
                    chamada_id: state.chamada.id,
                    aluno_id: state.usuario.id,
                    ...valoresConfirmacao
                });
            if (error) {
                if (await alunoJaRespondeu(state.chamada.id)) {
                    fecharOverlayPresenca();
                    mostrarToast("Presença confirmada", "Sua presença foi registrada.", "success");
                    return;
                }
                throw error;
            }
            fecharOverlayPresenca();
            mostrarToast("Presença confirmada", "Sua presença foi registrada no sistema.", "success");
        } catch (erro) {
            if (botao) { botao.disabled = false; botao.textContent = "Confirmar presença"; }
            mostrarToast("Não foi possível registrar", erro.message || "Ocorreu um erro ao registrar sua presença.", "error");
            erroLog("Erro ao confirmar presença:", erro);
        } finally { state.presencaProcessando = false; }
    }

    async function iniciarParticipacao() {
        if (!state.live?.id || !state.usuario?.id || state.participante) return;
        const { data: existente, error: erroBusca } = await supabaseClient.from("live_participantes").select(`
            id, live_id, aluno_id, entrou_em, saiu_em, ultimo_ping, segundos_assistidos, percentual_assistido
        `).eq("live_id", state.live.id).eq("aluno_id", state.usuario.id).maybeSingle();
        if (erroBusca) throw erroBusca;
        const agora = new Date().toISOString();
        if (existente) {
            const { data, error } = await supabaseClient.from("live_participantes").update({ ultimo_ping: agora, saiu_em: null }).eq("id", existente.id).select().maybeSingle();
            if (error) throw error;
            state.participante = data || existente;
        } else {
            const { data, error } = await supabaseClient.from("live_participantes").insert({
                live_id: state.live.id, aluno_id: state.usuario.id, entrou_em: agora, ultimo_ping: agora,
                segundos_assistidos: 0, percentual_assistido: 0
            }).select().single();
            if (error) throw error;
            state.participante = data;
        }
        iniciarMonitoramentoParticipacao();
    }

    async function atualizarParticipacao() {
        if (!state.participante?.id || !state.live?.id) return;
        const entrouEm = new Date(state.participante.entrou_em || Date.now());
        const segundos = Math.max(0, Math.floor((Date.now() - entrouEm.getTime()) / 1000));
        const duracao = calcularDuracaoSegundos(state.live.horario_inicio, state.live.horario_fim);
        const percentual = duracao ? Math.min(100, Number(((segundos / duracao) * 100).toFixed(2))) : 0;
        const { data, error } = await supabaseClient.from("live_participantes").update({
            ultimo_ping: new Date().toISOString(), segundos_assistidos: segundos, percentual_assistido: percentual
        }).eq("id", state.participante.id).select().maybeSingle();
        if (error) throw error;
        if (data) state.participante = data;
    }

    function iniciarMonitoramentoParticipacao() {
        pararParticipacao();
        atualizarParticipacao().catch(erro => warn("Erro ao atualizar participação:", erro));
        state.intervaloParticipacao = setInterval(() => atualizarParticipacao().catch(erro => warn("Erro ao atualizar participação:", erro)), 15000);
    }
    function pararParticipacao() { clearInterval(state.intervaloParticipacao); state.intervaloParticipacao = null; }

    async function registrarSaidaLive() {
        if (!state.participante?.id) return;
        const { data, error } = await supabaseClient.from("live_participantes").update({
            saiu_em: new Date().toISOString(), ultimo_ping: new Date().toISOString()
        }).eq("id", state.participante.id).select().maybeSingle();
        if (error) { warn("Não foi possível registrar saída:", error); return; }
        if (data) state.participante = data;
    }

    async function telaCheia() {
        const player = $("livePlayer");
        if (!player) return;
        const expandido = player.classList.contains("mep-player-expandido") || document.fullscreenElement === player;

        if (expandido) {
            atualizarModoTelaCheia(false);
            liberarOrientacao();
            if (document.fullscreenElement && document.exitFullscreen) {
                try { await document.exitFullscreen(); } catch (_) { /* O fallback visual já foi encerrado. */ }
            }
            return;
        }

        atualizarModoTelaCheia(true);
        if (player.requestFullscreen) {
            try { await player.requestFullscreen(); } catch (_) { /* Mantém o fallback que funciona no iPhone. */ }
        } else if (player.webkitRequestFullscreen) {
            try { player.webkitRequestFullscreen(); } catch (_) { /* Mantém o fallback visual. */ }
        }
        await solicitarPaisagem();
    }

    function voltarParaAulas() { limparEstado(); window.location.href = "./index.html"; }
    async function logout() {
        await limparEstado();
        const { error } = await supabaseClient.auth.signOut();
        if (error) { mostrarToast("Erro ao sair", error.message, "error"); return; }
        window.location.href = "../index.html";
    }
    async function limparEstado() {
        pararMonitoramentoLive();
        pararMonitoramentoPresenca();
        pararParticipacao();
        pararChat();
        await registrarSaidaLive();
    }

    function configurarEventos() {
        $("voltarAulasButton")?.addEventListener("click", voltarParaAulas);
        $("voltarAulasFooterButton")?.addEventListener("click", voltarParaAulas);
        $("logoutButton")?.addEventListener("click", logout);
        $("confirmarPresencaButton")?.addEventListener("click", confirmarPresenca);
        $("liveFullscreenButton")?.addEventListener("click", telaCheia);
        document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement && $("livePlayer")?.classList.contains("mep-player-expandido")) {
                atualizarModoTelaCheia(false);
                liberarOrientacao();
            }
        });
        $("liveChatCloseButton")?.addEventListener("click", alternarChat);
        $("liveChatToggleButton")?.addEventListener("click", alternarChat);
        $("liveChatForm")?.addEventListener("submit", enviarMensagemChat);
        $("liveChatInput")?.addEventListener("input", atualizarCampoChat);
        $("liveChatInput")?.addEventListener("keydown", evento => {
            if (evento.key === "Enter" && !evento.shiftKey) enviarMensagemChat(evento);
        });
        $("presencaOverlayBackdrop")?.addEventListener("click", evento => evento.preventDefault());
    }

    async function inicializar() {
        try {
            configurarEventos();
            if (!await verificarSessao()) return;
            await carregarUsuario();
            await carregarLive();
            iniciarMonitoramentoLive();
            log("Página da aula carregada.", { live_id: state.live?.id, turma_id: state.live?.turma_id, aluno_id: state.usuario?.id });
        } catch (erro) {
            erroLog("Erro ao inicializar aula:", erro);
            mostrarToast("Não foi possível carregar a aula", erro.message || "Ocorreu um erro ao carregar esta aula.", "error");
            if ($("aulaViewTitulo")) $("aulaViewTitulo").textContent = "Não foi possível carregar a aula";
            if ($("aulaViewDescricao")) $("aulaViewDescricao").textContent = erro.message || "Verifique o acesso à aula e tente novamente.";
            atualizarStatusVisual("INDISPONÍVEL", erro.message || "A aula não está disponível.");
        }
    }

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            atualizarStatusLive().catch(erro => warn("Erro ao retomar atualização da aula:", erro));
            if (state.liveAoVivo) {
                atualizarParticipacao().catch(erro => warn("Erro ao atualizar participação:", erro));
                verificarChamadaPresenca().catch(erro => warn("Erro ao verificar presença:", erro));
            }
        }
    });
    window.addEventListener("pagehide", () => { pararMonitoramentoLive(); pararChat(); registrarSaidaLive(); });

    window.MEP_AULA = {
        state, obterIdDaLive, carregarLive, atualizarStatusLive, liveEstaAoVivo, verificarChamadaPresenca,
        confirmarPresenca, iniciarParticipacao, atualizarParticipacao, iniciarChat,
        enviarMensagemChat, alternarChat, voltarParaAulas, logout
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializar);
    else inicializar();
})();
