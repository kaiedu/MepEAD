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
    const state = {
        authUser: null, usuario: null, cursos: [], cursoAtual: null, turmaAtual: null, aulas: [],
        assinaturaProcessando:false, fotoPerfilArquivo:null, removerFotoPerfil:false, fotoPreviewUrl:null,
        canalStatusAulas:null, intervaloStatusAulas:null, timeoutStatusAulas:null, atualizandoStatusAulas:false
    };
    const recorte = { imagem:null, escalaBase:1, zoom:1, x:0, y:0, arrastando:false, ponteiroId:null, inicioX:0, inicioY:0, origemX:0, origemY:0 };
    const $ = (id) => document.getElementById(id);
    const INSTALACAO_CONCLUIDA_KEY = "mep_ead_pwa_instalado_v1";
    const INSTALACAO_ADIADA_KEY = "mep_ead_pwa_adiada_ate_v1";
    const PRAZO_NOVO_AVISO_MS = 30 * 24 * 60 * 60 * 1000;
    let eventoInstalacao = null;
    let portalProntoParaInstalacao = false;

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        eventoInstalacao = event;
        if (portalProntoParaInstalacao) oferecerInstalacao();
    });

    window.addEventListener("appinstalled", () => {
        salvarPreferenciaLocal(INSTALACAO_CONCLUIDA_KEY, "sim");
        eventoInstalacao = null;
        fecharAvisoInstalacao();
    });

    function texto(valor, alternativa = "") { return valor === null || valor === undefined || valor === "" ? alternativa : String(valor); }
    function normalizarTexto(valor) { return texto(valor).trim().toLowerCase().replaceAll("_", " "); }
    function escapeHtml(valor) {
        return texto(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }
    function dataDeCalendarioLocal(valor) {
        if (!valor) return null;
        const correspondencia = String(valor).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!correspondencia) {
            const data = new Date(valor);
            return Number.isNaN(data.getTime()) ? null : data;
        }
        const data = new Date(Number(correspondencia[1]), Number(correspondencia[2]) - 1, Number(correspondencia[3]));
        return Number.isNaN(data.getTime()) ? null : data;
    }
    function formatarData(valor) {
        if (!valor) return "—";
        const data = dataDeCalendarioLocal(valor);
        return !data ? "—" : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    function formatarHorario(valor) { return valor && /^\d{2}:\d{2}/.test(String(valor)) ? String(valor).slice(0, 5) : "—"; }
    function formatarDinheiro(valor) { return Number(valor || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }); }
    function statusTexto(status) {
        const valor = normalizarTexto(status);
        if (["ao vivo", "ao-vivo", "live"].includes(valor)) return "AO VIVO";
        if (["agendada", "agendado"].includes(valor)) return "AGENDADA";
        if (["encerrada", "encerrado", "finalizada", "finalizado"].includes(valor)) return "ENCERRADA";
        return status ? texto(status).replaceAll("_", " ").toUpperCase() : "LIVE";
    }

    function acessoDaAula(live) {
        const status = normalizarTexto(live?.status);
        if (["ao vivo", "ao-vivo", "live"].includes(status) && live?.id) {
            return { liberado: true, classe: "ao-vivo", texto: "Acessar aula →" };
        }
        if (["agendada", "agendado"].includes(status)) {
            return { liberado: false, classe: "agendada", texto: "A aula já vai começar" };
        }
        if (["encerrada", "encerrado", "finalizada", "finalizado"].includes(status)) {
            return { liberado: false, classe: "encerrada", texto: "A aula já foi encerrada" };
        }
        return { liberado: false, classe: "indisponivel", texto: "Aula indisponível" };
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

    function lerPreferenciaLocal(chave) {
        try { return window.localStorage.getItem(chave); }
        catch (_) { return null; }
    }

    function salvarPreferenciaLocal(chave, valor) {
        try { window.localStorage.setItem(chave, valor); }
        catch (_) { /* A instalação continua funcionando mesmo sem armazenamento local. */ }
    }

    function estaExecutandoComoAplicativo() {
        return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    function dispositivoIos() {
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    }

    function avisoInstalacaoFoiAdiado() {
        const ate = Number(lerPreferenciaLocal(INSTALACAO_ADIADA_KEY) || 0);
        return Number.isFinite(ate) && ate > Date.now();
    }

    function fecharAvisoInstalacao() {
        const overlay = $("instalacaoOverlay");
        if (!overlay) return;
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("instalacao-aberta");
    }

    function oferecerInstalacao() {
        if (!portalProntoParaInstalacao || estaExecutandoComoAplicativo()) {
            if (estaExecutandoComoAplicativo()) salvarPreferenciaLocal(INSTALACAO_CONCLUIDA_KEY, "sim");
            return;
        }
        if (lerPreferenciaLocal(INSTALACAO_CONCLUIDA_KEY) === "sim" || avisoInstalacaoFoiAdiado()) return;

        const ios = dispositivoIos();
        if (!eventoInstalacao && !ios) return;
        const overlay = $("instalacaoOverlay");
        if (!overlay) return;

        if ($("instalacaoIosInstrucao")) $("instalacaoIosInstrucao").hidden = !ios;
        if ($("instalacaoConfirmarButton")) {
            $("instalacaoConfirmarButton").textContent = ios ? "Entendi" : "Adicionar à tela inicial";
        }
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("instalacao-aberta");
        setTimeout(() => $("instalacaoConfirmarButton")?.focus(), 50);
    }

    async function confirmarInstalacao() {
        if (dispositivoIos() && !eventoInstalacao) {
            fecharAvisoInstalacao();
            salvarPreferenciaLocal(INSTALACAO_ADIADA_KEY, String(Date.now() + PRAZO_NOVO_AVISO_MS));
            return;
        }
        if (!eventoInstalacao) return;
        const promptInstalacao = eventoInstalacao;
        eventoInstalacao = null;
        fecharAvisoInstalacao();
        await promptInstalacao.prompt();
        const escolha = await promptInstalacao.userChoice;
        if (escolha?.outcome === "accepted") {
            salvarPreferenciaLocal(INSTALACAO_CONCLUIDA_KEY, "sim");
        } else {
            salvarPreferenciaLocal(INSTALACAO_ADIADA_KEY, String(Date.now() + PRAZO_NOVO_AVISO_MS));
        }
    }

    function adiarInstalacao() {
        salvarPreferenciaLocal(INSTALACAO_ADIADA_KEY, String(Date.now() + PRAZO_NOVO_AVISO_MS));
        fecharAvisoInstalacao();
    }

    function registrarAplicativo() {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("../sw.js", { scope:"../" })
            .catch(erro => console.warn("MEP EAD | Não foi possível registrar o aplicativo:", erro));
    }

    async function detalharErroDaFuncao(erro) {
        const contexto = erro?.context;
        if (contexto && typeof contexto.json === "function") {
            try {
                const resposta = await contexto.json();
                if (resposta?.message) return new Error(String(resposta.message));
            } catch (_) {
                /* A resposta pode não conter JSON; nesse caso usamos a mensagem original. */
            }
        }
        return erro instanceof Error ? erro : new Error("Não foi possível concluir esta operação.");
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
            id, auth_id, nome, email, perfil, ativo, foto_url, foto_path,
            telefone, telefone_secundario, perfil_atualizado_em, primeiro_acesso
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

    function atualizarNavegacaoPerfil(ativa) {
        document.querySelectorAll(".portal-nav-item").forEach(item => item.classList.remove("active"));
        const destino = ativa
            ? $("abrirPerfilNav")
            : document.querySelector('.portal-nav-item[href="#portalHomeView"]');
        destino?.classList.add("active");
    }

    function atualizarPreviewPerfil(url = "") {
        const imagem = $("perfilFotoImagem");
        const inicial = $("perfilFotoInicial");
        const nome = state.usuario?.nome || "Aluno";
        if (inicial) {
            inicial.textContent = nome.trim().charAt(0).toUpperCase() || "A";
            inicial.hidden = Boolean(url);
        }
        if (imagem) {
            imagem.hidden = !url;
            imagem.src = url || "";
        }
        if ($("removerPerfilFoto")) $("removerPerfilFoto").hidden = !url;
    }

    function formatarTelefone(valor) {
        const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);
        if (!numeros) return "";
        if (numeros.length <= 2) return `(${numeros}`;
        const ddd = numeros.slice(0, 2);
        const corpo = numeros.slice(2);
        if (corpo.length <= 4) return `(${ddd}) ${corpo}`;
        if (corpo.length <= 8) return `(${ddd}) ${corpo.slice(0, 4)}-${corpo.slice(4)}`;
        return `(${ddd}) ${corpo.slice(0, 5)}-${corpo.slice(5)}`;
    }

    function preencherFormularioPerfil() {
        if (!state.usuario) return;
        if ($("perfilNome")) $("perfilNome").value = state.usuario.nome || "";
        if ($("perfilEmail")) $("perfilEmail").value = state.usuario.email || state.authUser?.email || "";
        if ($("perfilTelefone")) $("perfilTelefone").value = formatarTelefone(state.usuario.telefone);
        if ($("perfilTelefoneSecundario")) $("perfilTelefoneSecundario").value = formatarTelefone(state.usuario.telefone_secundario);
        state.fotoPerfilArquivo = null;
        state.removerFotoPerfil = false;
        if (state.fotoPreviewUrl) URL.revokeObjectURL(state.fotoPreviewUrl);
        state.fotoPreviewUrl = null;
        atualizarPreviewPerfil(state.usuario.foto_url || "");
        if ($("perfilFotoArquivo")) $("perfilFotoArquivo").value = "";
        if ($("perfilFormMessage")) $("perfilFormMessage").hidden = true;
    }

    function abrirPerfil(event) {
        event?.preventDefault();
        preencherFormularioPerfil();
        if ($("portalHomeView")) $("portalHomeView").hidden = true;
        if ($("cursoViewSection")) $("cursoViewSection").hidden = true;
        if ($("aulaViewSection")) $("aulaViewSection").hidden = true;
        if ($("perfilAlunoView")) $("perfilAlunoView").hidden = false;
        atualizarNavegacaoPerfil(true);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#perfilAlunoView`);
        window.scrollTo({ top:0, behavior:"smooth" });
    }

    function fecharPerfil(event) {
        event?.preventDefault();
        if ($("perfilAlunoView")) $("perfilAlunoView").hidden = true;
        if ($("portalHomeView")) $("portalHomeView").hidden = false;
        atualizarNavegacaoPerfil(false);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#portalHomeView`);
        window.scrollTo({ top:0, behavior:"smooth" });
    }

    function selecionarFotoPerfil() {
        $("perfilFotoArquivo")?.click();
    }

    function limitarPosicaoRecorte() {
        const canvas = $("perfilRecorteCanvas");
        if (!canvas || !recorte.imagem) return;
        const escala = recorte.escalaBase * recorte.zoom;
        const largura = recorte.imagem.naturalWidth * escala;
        const altura = recorte.imagem.naturalHeight * escala;
        recorte.x = Math.min(0, Math.max(canvas.width - largura, recorte.x));
        recorte.y = Math.min(0, Math.max(canvas.height - altura, recorte.y));
    }

    function desenharRecorte() {
        const canvas = $("perfilRecorteCanvas");
        if (!canvas || !recorte.imagem) return;
        const contexto = canvas.getContext("2d");
        const escala = recorte.escalaBase * recorte.zoom;
        limitarPosicaoRecorte();
        contexto.clearRect(0, 0, canvas.width, canvas.height);
        contexto.imageSmoothingEnabled = true;
        contexto.imageSmoothingQuality = "high";
        contexto.drawImage(recorte.imagem, recorte.x, recorte.y, recorte.imagem.naturalWidth * escala, recorte.imagem.naturalHeight * escala);
    }

    function abrirRecorteFoto(arquivo) {
        const url = URL.createObjectURL(arquivo);
        const imagem = new Image();
        imagem.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = $("perfilRecorteCanvas");
            recorte.imagem = imagem;
            recorte.escalaBase = Math.max(canvas.width / imagem.naturalWidth, canvas.height / imagem.naturalHeight);
            recorte.zoom = 1;
            recorte.x = (canvas.width - imagem.naturalWidth * recorte.escalaBase) / 2;
            recorte.y = (canvas.height - imagem.naturalHeight * recorte.escalaBase) / 2;
            if ($("perfilFotoZoom")) $("perfilFotoZoom").value = "1";
            desenharRecorte();
            $("perfilRecorteModal").hidden = false;
            document.body.classList.add("perfil-recorte-aberto");
        };
        imagem.onerror = () => {
            URL.revokeObjectURL(url);
            mostrarToast("Foto inválida", "Não foi possível abrir esta imagem.", "error");
        };
        imagem.src = url;
    }

    function prepararFotoPerfil(event) {
        const arquivo = event.target.files?.[0];
        if (!arquivo) return;
        const permitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!permitidos.includes(arquivo.type)) {
            mostrarToast("Foto não aceita", "Escolha uma imagem JPG, PNG ou WebP.", "error");
            event.target.value = "";
            return;
        }
        if (arquivo.size > 5 * 1024 * 1024) {
            mostrarToast("Foto muito grande", "A imagem deve ter no máximo 5 MB.", "error");
            event.target.value = "";
            return;
        }
        abrirRecorteFoto(arquivo);
    }

    function fecharRecorteFoto() {
        if ($("perfilRecorteModal")) $("perfilRecorteModal").hidden = true;
        document.body.classList.remove("perfil-recorte-aberto");
        recorte.arrastando = false;
        recorte.ponteiroId = null;
        if ($("perfilFotoArquivo")) $("perfilFotoArquivo").value = "";
    }

    function alterarZoomRecorte(event) {
        if (!recorte.imagem) return;
        const canvas = $("perfilRecorteCanvas");
        const zoomAnterior = recorte.zoom;
        const escalaAnterior = recorte.escalaBase * zoomAnterior;
        const centroImagemX = (canvas.width / 2 - recorte.x) / escalaAnterior;
        const centroImagemY = (canvas.height / 2 - recorte.y) / escalaAnterior;
        recorte.zoom = Number(event.target.value || 1);
        const novaEscala = recorte.escalaBase * recorte.zoom;
        recorte.x = canvas.width / 2 - centroImagemX * novaEscala;
        recorte.y = canvas.height / 2 - centroImagemY * novaEscala;
        desenharRecorte();
    }

    function iniciarArrasteRecorte(event) {
        if (!recorte.imagem) return;
        recorte.arrastando = true;
        recorte.ponteiroId = event.pointerId;
        recorte.inicioX = event.clientX;
        recorte.inicioY = event.clientY;
        recorte.origemX = recorte.x;
        recorte.origemY = recorte.y;
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function moverRecorte(event) {
        if (!recorte.arrastando || event.pointerId !== recorte.ponteiroId) return;
        const canvas = $("perfilRecorteCanvas");
        const proporcaoX = canvas.width / canvas.getBoundingClientRect().width;
        const proporcaoY = canvas.height / canvas.getBoundingClientRect().height;
        recorte.x = recorte.origemX + (event.clientX - recorte.inicioX) * proporcaoX;
        recorte.y = recorte.origemY + (event.clientY - recorte.inicioY) * proporcaoY;
        desenharRecorte();
    }

    function finalizarArrasteRecorte(event) {
        if (event.pointerId !== recorte.ponteiroId) return;
        recorte.arrastando = false;
        recorte.ponteiroId = null;
    }

    async function confirmarRecorteFoto() {
        const origem = $("perfilRecorteCanvas");
        if (!origem || !recorte.imagem) return;
        const destino = document.createElement("canvas");
        destino.width = 512;
        destino.height = 512;
        const contexto = destino.getContext("2d");
        contexto.imageSmoothingEnabled = true;
        contexto.imageSmoothingQuality = "high";
        contexto.drawImage(origem, 0, 0, origem.width, origem.height, 0, 0, destino.width, destino.height);
        const blob = await new Promise(resolve => destino.toBlob(resolve, "image/webp", .9));
        if (!blob) {
            mostrarToast("Erro ao ajustar foto", "Não foi possível preparar a imagem.", "error");
            return;
        }
        if (state.fotoPreviewUrl) URL.revokeObjectURL(state.fotoPreviewUrl);
        state.fotoPreviewUrl = URL.createObjectURL(blob);
        state.fotoPerfilArquivo = blob;
        state.removerFotoPerfil = false;
        atualizarPreviewPerfil(state.fotoPreviewUrl);
        fecharRecorteFoto();
    }

    function removerFotoPerfil() {
        state.fotoPerfilArquivo = null;
        state.removerFotoPerfil = true;
        if (state.fotoPreviewUrl) URL.revokeObjectURL(state.fotoPreviewUrl);
        state.fotoPreviewUrl = null;
        if ($("perfilFotoArquivo")) $("perfilFotoArquivo").value = "";
        atualizarPreviewPerfil("");
    }

    function mensagemPerfil(mensagem, tipo = "success") {
        const campo = $("perfilFormMessage");
        if (!campo) return;
        campo.hidden = false;
        campo.className = `perfil-form-message ${tipo}`;
        campo.textContent = mensagem;
    }

    async function salvarPerfil(event) {
        event.preventDefault();
        const botao = $("salvarPerfilButton");
        const nome = $("perfilNome")?.value.trim() || "";
        if (nome.length < 2) {
            mensagemPerfil("Informe seu nome completo.", "error");
            return;
        }

        if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
        let novoFotoPath = null;
        let novaFotoUrl = null;
        const fotoPathAnterior = state.usuario?.foto_path || null;

        try {
            if (state.fotoPerfilArquivo) {
                const extensao = ({ "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" })[state.fotoPerfilArquivo.type];
                novoFotoPath = `${state.authUser.id}/perfil-${Date.now()}.${extensao}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from("fotos-perfil")
                    .upload(novoFotoPath, state.fotoPerfilArquivo, { cacheControl:"3600", upsert:false, contentType:state.fotoPerfilArquivo.type });
                if (uploadError) throw uploadError;
                novaFotoUrl = supabaseClient.storage.from("fotos-perfil").getPublicUrl(novoFotoPath).data.publicUrl;
            }

            const { data, error } = await supabaseClient.rpc("atualizar_meu_perfil", {
                p_nome:nome,
                p_telefone:$("perfilTelefone")?.value || null,
                p_telefone_secundario:$("perfilTelefoneSecundario")?.value || null,
                p_foto_url:novaFotoUrl,
                p_foto_path:novoFotoPath,
                p_remover_foto:state.removerFotoPerfil
            });
            if (error) throw error;

            if (fotoPathAnterior && (novoFotoPath || state.removerFotoPerfil)) {
                await supabaseClient.storage.from("fotos-perfil").remove([fotoPathAnterior]);
            }

            state.usuario = { ...state.usuario, ...(data || {}) };
            atualizarPerfil();
            preencherFormularioPerfil();
            mensagemPerfil("Perfil atualizado com sucesso.");
            mostrarToast("Perfil atualizado", "Seus dados foram salvos.", "success");
        } catch (erro) {
            if (novoFotoPath) await supabaseClient.storage.from("fotos-perfil").remove([novoFotoPath]);
            mensagemPerfil(erro?.message || "Não foi possível salvar seu perfil.", "error");
            console.error("MEP EAD | Erro ao atualizar perfil:", erro);
        } finally {
            if (botao) { botao.disabled = false; botao.textContent = "Salvar alterações"; }
        }
    }

    async function carregarCursos() {
        const loading = $("cursosLoading");
        if (loading) loading.hidden = false;
        try {
            const { data, error } = await supabaseClient.from("turma_alunos").select(`
                id, turma_id, aluno_id, ativo, data_matricula,
                turmas (id, curso_id, nome, codigo, descricao, data_inicio, data_fim, ativa,
                    cursos (id, nome, descricao, imagem_url, ativo,
                        mensalidade_ativa, mensalidade_valor, mensalidade_bloqueio_modo, mensalidade_carencia_dias))
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
            await carregarStatusFinanceiroCursos();
            renderizarCursos();
        } catch (erro) {
            state.cursos = [];
            renderizarCursos();
            mostrarErro("Erro ao carregar cursos", erro);
        } finally { if (loading) loading.hidden = true; }
    }

    async function carregarStatusFinanceiroCursos() {
        await Promise.all(state.cursos.map(async curso => {
            if (!curso.mensalidade_ativa) {
                curso.financeiro = { liberado:true, mensalidade_ativa:false, motivo:"curso_sem_mensalidade" };
                return;
            }
            const { data, error } = await supabaseClient.rpc("aluno_status_financeiro_curso", { p_curso_id:curso.id });
            curso.financeiro = error
                ? { liberado:curso.mensalidade_bloqueio_modo === "nao_bloquear", mensalidade_ativa:true, motivo:"status_indisponivel", valor:curso.mensalidade_valor }
                : (data || { liberado:false, mensalidade_ativa:true, motivo:"mensalidade_pendente", valor:curso.mensalidade_valor });
        }));
    }

    function resumoFinanceiro(curso) {
        if (!curso.mensalidade_ativa) return "";
        const financeiro = curso.financeiro || {};
        if (financeiro.assinatura_status === "authorized" && !financeiro.dias_atraso) return `<div class="curso-mensalidade-status em-dia"><strong>Mensalidade em dia</strong><span>${formatarDinheiro(curso.mensalidade_valor)} por mês</span></div>`;
        if (financeiro.liberado && financeiro.motivo === "periodo_de_tolerancia") return `<div class="curso-mensalidade-status atencao"><strong>Pagamento pendente</strong><span>Acesso em período de tolerância</span></div>`;
        if (!financeiro.liberado) return `<div class="curso-mensalidade-status bloqueada"><strong>Acesso temporariamente bloqueado</strong><span>Regularize a mensalidade para continuar</span></div>`;
        return `<div class="curso-mensalidade-status atencao"><strong>Mensalidade ${formatarDinheiro(curso.mensalidade_valor)}</strong><span>Assinatura mensal deste curso</span></div>`;
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
            const financeiro = curso.financeiro || { liberado:true };
            const precisaAssinar = curso.mensalidade_ativa && financeiro.assinatura_status !== "authorized";
            card.innerHTML = `<div class="curso-card-cover">${capa}</div><div class="curso-card-content">
                <span class="eyebrow">CURSO</span><h3>${escapeHtml(curso.nome || "Curso")}</h3>
                <p>${escapeHtml(curso.descricao || "Acompanhe o conteúdo deste curso.")}</p>
                ${resumoFinanceiro(curso)}
                <div class="curso-card-actions-portal">
                    ${precisaAssinar ? `<button type="button" class="curso-assinar-button">${financeiro.checkout_url ? "Continuar pagamento" : "Assinar mensalidade"}</button>` : ""}
                    <button type="button" class="curso-acessar-button" ${financeiro.liberado === false ? "disabled" : ""}>${financeiro.liberado === false ? "Aguardando regularização" : "Acessar curso →"}</button>
                </div></div>`;
            card.querySelector(".curso-assinar-button")?.addEventListener("click", () => iniciarAssinatura(curso));
            card.querySelector(".curso-acessar-button").addEventListener("click", () => abrirCurso(curso));
            grade.appendChild(card);
        }
    }

    function escolherTurma(curso) { return curso?.turmas?.find((turma) => turma.ativa === true) || curso?.turmas?.[0] || null; }

    async function abrirCurso(curso) {
        if (curso?.financeiro?.liberado === false) {
            mostrarToast("Mensalidade pendente", "Regularize a mensalidade deste curso para voltar a acessar as aulas.", "error");
            return;
        }
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
        atualizarCardFinanceiroCurso();
    }

    function atualizarCardFinanceiroCurso() {
        const card = $("cursoFinanceiroCard"), curso = state.cursoAtual, financeiro = curso?.financeiro || {};
        if (!card || !curso?.mensalidade_ativa) { if (card) card.hidden = true; return; }
        card.hidden = false;
        card.dataset.status = financeiro.liberado === false ? "bloqueado" : financeiro.assinatura_status === "authorized" ? "em-dia" : "pendente";
        if ($("cursoFinanceiroStatus")) $("cursoFinanceiroStatus").textContent = financeiro.assinatura_status === "authorized" ? "MENSALIDADE EM DIA" : "PLANO MENSAL";
        if ($("cursoFinanceiroTitulo")) $("cursoFinanceiroTitulo").textContent = `${formatarDinheiro(curso.mensalidade_valor)} por mês`;
        if ($("cursoFinanceiroDescricao")) $("cursoFinanceiroDescricao").textContent = financeiro.liberado === false
            ? "O acesso às aulas está pausado, mas seu histórico e progresso estão preservados."
            : financeiro.assinatura_status === "authorized" ? "Sua assinatura deste curso está ativa." : "Conclua a assinatura para manter sua mensalidade organizada.";
        const acao = $("cursoFinanceiroAcao");
        if (acao) { acao.hidden = financeiro.assinatura_status === "authorized"; acao.onclick = () => iniciarAssinatura(curso); }
    }

    async function iniciarAssinatura(curso) {
        if (!curso?.id || state.assinaturaProcessando) return;
        state.assinaturaProcessando = true;
        mostrarToast("Mensalidade", "Preparando o pagamento seguro...", "success");
        try {
            const { data, error } = await supabaseClient.functions.invoke("criar-assinatura", { body:{ curso_id:curso.id } });
            if (error) throw await detalharErroDaFuncao(error);
            if (!data?.success) throw new Error(data?.message || "Não foi possível iniciar a assinatura.");
            if (data.status === "authorized") {
                mostrarToast("Mensalidade em dia", "Sua assinatura já está ativa.", "success");
                await carregarCursos();
                return;
            }
            if (!data.checkout_url) throw new Error("O endereço de pagamento não foi gerado.");
            window.location.href = data.checkout_url;
        } catch (erro) { mostrarErro("Não foi possível abrir o pagamento", erro); }
        finally { state.assinaturaProcessando = false; }
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
            iniciarMonitoramentoAulas();
            await atualizarIndicadoresCurso();
        } catch (erro) {
            state.aulas = [];
            renderizarAulas();
            pararMonitoramentoAulas();
            mostrarErro("Erro ao carregar aulas", erro);
        } finally { if (loading) loading.hidden = true; }
    }

    async function atualizarStatusAulas() {
        if (state.atualizandoStatusAulas || !state.turmaAtual?.id || !state.aulas.length) return;
        state.atualizandoStatusAulas = true;
        try {
            const ids = state.aulas.map(live => live.id).filter(Boolean);
            if (!ids.length) return;
            const { data, error } = await supabaseClient.from("lives").select("id,status,updated_at").in("id", ids);
            if (error) throw error;
            const atualizacoes = new Map((data || []).map(live => [String(live.id), live]));
            let mudou = false;
            state.aulas = state.aulas.map(live => {
                const atualizada = atualizacoes.get(String(live.id));
                if (!atualizada || normalizarTexto(atualizada.status) === normalizarTexto(live.status)) return live;
                mudou = true;
                return { ...live, status: atualizada.status, updated_at: atualizada.updated_at };
            });
            if (mudou) renderizarAulas();
        } catch (erro) {
            console.warn("MEP EAD | Não foi possível atualizar o status das aulas:", erro);
        } finally {
            state.atualizandoStatusAulas = false;
        }
    }

    function agendarAtualizacaoStatusAulas() {
        clearTimeout(state.timeoutStatusAulas);
        state.timeoutStatusAulas = setTimeout(() => atualizarStatusAulas(), 120);
    }

    function pararMonitoramentoAulas() {
        clearInterval(state.intervaloStatusAulas);
        clearTimeout(state.timeoutStatusAulas);
        state.intervaloStatusAulas = null;
        state.timeoutStatusAulas = null;
        if (state.canalStatusAulas) supabaseClient.removeChannel?.(state.canalStatusAulas);
        state.canalStatusAulas = null;
    }

    function iniciarMonitoramentoAulas() {
        pararMonitoramentoAulas();
        if (!state.turmaAtual?.id) return;
        if (supabaseClient.channel) {
            state.canalStatusAulas = supabaseClient
                .channel(`status-aulas-portal-${state.turmaAtual.id}`)
                .on("postgres_changes", {
                    event: "UPDATE",
                    schema: "public",
                    table: "lives",
                    filter: `turma_id=eq.${state.turmaAtual.id}`
                }, agendarAtualizacaoStatusAulas)
                .subscribe(status => {
                    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                        console.warn("MEP EAD | Atualização em tempo real indisponível; mantendo verificação automática.");
                    }
                });
        }
        state.intervaloStatusAulas = setInterval(atualizarStatusAulas, 5000);
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
            const acesso = acessoDaAula(live);
            card.innerHTML = `<div class="curso-aula-number">${String(indice + 1).padStart(2, "0")}</div>
                <div class="curso-aula-content"><span class="eyebrow">${escapeHtml(statusTexto(live.status))}</span>
                <h3>${escapeHtml(live.titulo || "Aula")}</h3><p>${escapeHtml(live.descricao || "Acesse para acompanhar esta aula.")}</p>
                <span class="curso-aula-date">${escapeHtml(formatarData(live.data_live))}${horario}</span></div>
                <button type="button" class="curso-aula-acessar-button is-${acesso.classe}" ${acesso.liberado ? "" : "disabled"}>${escapeHtml(acesso.texto)}</button>`;
            if (acesso.liberado) card.querySelector(".curso-aula-acessar-button").addEventListener("click", () => abrirAula(live));
            lista.appendChild(card);
        });
    }

    function abrirAula(live) {
        if (state.cursoAtual?.financeiro?.liberado === false) { mostrarToast("Acesso bloqueado", "Regularize a mensalidade deste curso para acessar a aula.", "error"); return; }
        if (!live?.id) { mostrarToast("Aula indisponível", "Não foi possível identificar a aula selecionada.", "error"); return; }
        const acesso = acessoDaAula(live);
        if (!acesso.liberado) { mostrarToast("Aula indisponível", acesso.texto, "warning"); return; }
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
        pararMonitoramentoAulas();
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
        $("abrirPerfilNav")?.addEventListener("click", abrirPerfil);
        $("abrirPerfilButton")?.addEventListener("click", abrirPerfil);
        $("abrirPerfilMobile")?.addEventListener("click", abrirPerfil);
        $("fecharPerfilButton")?.addEventListener("click", fecharPerfil);
        $("cancelarPerfilButton")?.addEventListener("click", fecharPerfil);
        $("selecionarPerfilFoto")?.addEventListener("click", selecionarFotoPerfil);
        $("removerPerfilFoto")?.addEventListener("click", removerFotoPerfil);
        $("perfilFotoArquivo")?.addEventListener("change", prepararFotoPerfil);
        $("perfilFotoZoom")?.addEventListener("input", alterarZoomRecorte);
        $("perfilRecorteStage")?.addEventListener("pointerdown", iniciarArrasteRecorte);
        $("perfilRecorteStage")?.addEventListener("pointermove", moverRecorte);
        $("perfilRecorteStage")?.addEventListener("pointerup", finalizarArrasteRecorte);
        $("perfilRecorteStage")?.addEventListener("pointercancel", finalizarArrasteRecorte);
        $("confirmarRecorteFoto")?.addEventListener("click", confirmarRecorteFoto);
        $("cancelarRecorteFoto")?.addEventListener("click", fecharRecorteFoto);
        $("voltarRecorteFoto")?.addEventListener("click", fecharRecorteFoto);
        $("perfilTelefone")?.addEventListener("input", event => { event.target.value = formatarTelefone(event.target.value); });
        $("perfilTelefoneSecundario")?.addEventListener("input", event => { event.target.value = formatarTelefone(event.target.value); });
        $("perfilAlunoForm")?.addEventListener("submit", salvarPerfil);
        $("instalacaoConfirmarButton")?.addEventListener("click", confirmarInstalacao);
        $("instalacaoDepoisButton")?.addEventListener("click", adiarInstalacao);
        $("instalacaoBackdrop")?.addEventListener("click", adiarInstalacao);
        document.querySelector('.portal-nav-item[href="#portalHomeView"]')?.addEventListener("click", event => {
            if ($("perfilAlunoView") && !$("perfilAlunoView").hidden) fecharPerfil(event);
        });
        document.querySelector('.portal-nav-item[href="#cursosSection"]')?.addEventListener("click", event => {
            if ($("perfilAlunoView") && !$("perfilAlunoView").hidden) {
                fecharPerfil(event);
                setTimeout(() => $("cursosSection")?.scrollIntoView({ behavior:"smooth" }), 50);
            }
        });
        if (new URLSearchParams(window.location.search).get("pagamento") === "retorno") {
            setTimeout(() => mostrarToast("Assinatura recebida", "Estamos confirmando a situação da sua mensalidade. A atualização pode levar alguns instantes.", "success"), 600);
        }
        $("voltarCursosButton")?.addEventListener("click", voltarParaCursos);
        $("voltarAulasButton")?.addEventListener("click", voltarParaCursos);
        $("voltarAulasFooterButton")?.addEventListener("click", voltarParaCursos);
    }

    function sincronizarViewPeloHash() {
        if (window.location.hash === "#perfilAlunoView") {
            abrirPerfil();
        }
    }

    window.addEventListener("hashchange", sincronizarViewPeloHash);
    window.addEventListener("beforeunload", pararMonitoramentoAulas);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && state.turmaAtual?.id) atualizarStatusAulas();
    });

    async function inicializar() {
        try {
            configurarEventos();
            if (!await verificarSessao()) return;
            await carregarUsuario();
            await carregarCursos();
            portalProntoParaInstalacao = true;
            oferecerInstalacao();
            sincronizarViewPeloHash();
        } catch (erro) { mostrarErro("Erro ao carregar portal", erro); }
    }

    window.MEPPortal = { state, abrirCurso, abrirAula, abrirPerfil, carregarCursos, carregarAulas, atualizarStatusAulas, iniciarAssinatura, realizarLogout };
    registrarAplicativo();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializar);
    else inicializar();
})();
