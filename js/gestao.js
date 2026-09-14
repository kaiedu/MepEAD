/* =========================================
   MEP EAD
   GESTÃO
========================================= */


/* =========================================
   ELEMENTOS
========================================= */

const pageTitle =
    document.getElementById("pageTitle");

const userName =
    document.getElementById("userName");

const userAvatar =
    document.getElementById("userAvatar");

const logoutButton =
    document.getElementById("logoutButton");

const navItems =
    document.querySelectorAll("[data-page]");

const pages =
    document.querySelectorAll(".page");


/* =========================================
   INICIALIZAÇÃO
========================================= */

window.addEventListener("DOMContentLoaded", async () => {

    console.log("MEP EAD | Área de Gestão");

    await verificarAcesso();

});


/* =========================================
   PROTEGER ÁREA
========================================= */

async function verificarAcesso() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );

            voltarLogin();

            return;

        }


        const session =
            data.session;


        if (!session) {

            console.warn(
                "Usuário não autenticado."
            );

            voltarLogin();

            return;

        }


        console.log(
            "Sessão encontrada:",
            session.user.email
        );


        /* ================================
           BUSCAR PERFIL
        ================================= */

        const {
            data: usuario,
            error: erroUsuario
        } = await supabaseClient
            .from("usuarios")
            .select(
                "id, auth_id, nome, email, perfil, ativo"
            )
            .eq(
                "auth_id",
                session.user.id
            )
            .maybeSingle();


        if (erroUsuario) {

            console.error(
                "Erro ao buscar usuário:",
                erroUsuario
            );

            voltarLogin();

            return;

        }


        if (!usuario) {

            console.warn(
                "Perfil não encontrado."
            );

            await supabaseClient.auth.signOut();

            voltarLogin();

            return;

        }


        /* ================================
           VERIFICAR ATIVO
        ================================= */

        if (!usuario.ativo) {

            alert(
                "Seu acesso ao MEP EAD está desativado."
            );

            await supabaseClient.auth.signOut();

            voltarLogin();

            return;

        }


        /* ================================
           VERIFICAR PERFIL
        ================================= */

        if (usuario.perfil !== "gestor") {

            alert(
                "Você não possui permissão para acessar esta área."
            );

            voltarLogin();

            return;

        }


        /* ================================
           CARREGAR USUÁRIO
        ================================= */

        carregarUsuario(usuario);


        console.log(
            "Acesso autorizado."
        );


        /* ================================
           CARREGAR DASHBOARD
        ================================= */

        await carregarDashboard();


        /* ================================
           RESTAURAR PÁGINA DA URL
        ================================= */

        const paginaInicial =
            window.location.hash
                .replace("#", "")
                .trim();


        if (
            paginaInicial &&
            document.getElementById(`page-${paginaInicial}`)
        ) {

            mudarPagina(paginaInicial, false);

        }


    }

    catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        voltarLogin();

    }

}


/* =========================================
   CARREGAR USUÁRIO
========================================= */

function carregarUsuario(usuario) {

    if (userName) {

        userName.textContent =
            usuario.nome || "Administrador";

    }


    if (userAvatar) {

        const nome =
            usuario.nome || "A";

        userAvatar.textContent =
            nome
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================
   CARREGAR DASHBOARD
========================================= */

async function carregarDashboard() {
    await carregarDashboardCompleto();
}


/* =========================================
   TOTAL DE CURSOS
========================================= */

async function carregarTotalCursos() {

    const elemento =
        document.getElementById("totalCursos");


    if (!elemento) {
        return;
    }


    try {

        const {
            count,
            error
        } = await supabaseClient
            .from("cursos")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            );


        if (error) {

            console.error(
                "Erro ao carregar cursos:",
                error
            );

            elemento.textContent = "0";

            return;

        }


        elemento.textContent =
            count ?? 0;

    }

    catch (erro) {

        console.error(
            "Erro ao carregar total de cursos:",
            erro
        );

        elemento.textContent = "0";

    }

}


/* =========================================
   TOTAL DE ALUNOS
========================================= */

async function carregarTotalAlunos() {

    const elemento =
        document.getElementById("totalAlunos");


    if (!elemento) {
        return;
    }


    try {

        const {
            count,
            error
        } = await supabaseClient
            .from("usuarios")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "perfil",
                "aluno"
            );


        if (error) {

            console.error(
                "Erro ao carregar alunos:",
                error
            );

            elemento.textContent = "0";

            return;

        }


        elemento.textContent =
            count ?? 0;

    }

    catch (erro) {

        console.error(
            "Erro ao carregar total de alunos:",
            erro
        );

        elemento.textContent = "0";

    }

}


/* =========================================
   TOTAL DE PROFESSORES
========================================= */

async function carregarTotalProfessores() {

    const elemento =
        document.getElementById(
            "totalProfessores"
        );


    if (!elemento) {
        return;
    }


    try {

        const {
            count,
            error
        } = await supabaseClient
            .from("usuarios")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "perfil",
                "professor"
            );


        if (error) {

            console.error(
                "Erro ao carregar professores:",
                error
            );

            elemento.textContent = "0";

            return;

        }


        elemento.textContent =
            count ?? 0;

    }

    catch (erro) {

        console.error(
            "Erro ao carregar total de professores:",
            erro
        );

        elemento.textContent = "0";

    }

}


/* =========================================
   TOTAL DE LIVES
========================================= */

async function carregarTotalLives() {

    const elemento =
        document.getElementById(
            "totalLives"
        );


    if (!elemento) {
        return;
    }


    try {

        const {
            count,
            error
        } = await supabaseClient
            .from("lives")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            );


        if (error) {

            console.error(
                "Erro ao carregar lives:",
                error
            );

            elemento.textContent = "0";

            return;

        }


        elemento.textContent =
            count ?? 0;

    }

    catch (erro) {

        console.error(
            "Erro ao carregar total de lives:",
            erro
        );

        elemento.textContent = "0";

    }

}


/* =========================================
   NAVEGAÇÃO
========================================= */

navItems.forEach(item => {

    item.addEventListener(
        "click",
        event => {

            event.preventDefault();


            const page =
                item.dataset.page;


            if (!page) {
                return;
            }


            mudarPagina(page);

        }
    );

});


/* =========================================
   MUDAR PÁGINA
========================================= */

function mudarPagina(page, atualizarUrl = true) {

    const pagina =
        document.getElementById(
            `page-${page}`
        );


    if (!pagina) {
        return;
    }

    /* ================================
       BOTÕES
    ================================= */

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    document
        .querySelectorAll(
            `.nav-item[data-page="${page}"]`
        )
        .forEach(item => {

            item.classList.add(
                "active"
            );

        });


    /* ================================
       PÁGINAS
    ================================= */

    pages.forEach(section => {

        section.classList.remove(
            "active"
        );

    });


    pagina.classList.add(
        "active"
    );


    if (atualizarUrl) {

        window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}#${page}`
        );

    }


    /* A lista pode ter sido atualizada por um modal, filtro ou
       uma nova versão publicada. Ao abrir Cursos, renderizamos
       novamente os dados reais vindos do Supabase. */
    if (
        page === "cursos" &&
        typeof window.carregarCursos === "function"
    ) {

        window.carregarCursos().catch(
            erro => console.error(
                "MEP EAD | Não foi possível atualizar os cursos:",
                erro
            )
        );

    }

    if (
        page === "dashboard" &&
        typeof carregarDashboardCompleto === "function"
    ) {
        carregarDashboardCompleto().catch(
            erro => console.error(
                "MEP EAD | Não foi possível atualizar o Dashboard:",
                erro
            )
        );
    }


    /* ================================
       TÍTULOS
    ================================= */

    const titulos = {

        dashboard: "Dashboard",

        cursos: "Cursos",

        turmas: "Turmas",

        mensalidades: "Financeiro",

        alunos: "Alunos",

        professores: "Professores",

        lives: "Lives",

        presencas: "Presenças",

        relatorios: "Relatórios",

        configuracoes: "Configurações"

    };


    if (pageTitle) {

        pageTitle.textContent =
            titulos[page] ||
            "Dashboard";

    }

}


/* =========================================
   DASHBOARD OPERACIONAL
========================================= */

let dashboardCarregando = false;

function definirTextoDashboard(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = String(valor ?? "");
}

function escaparDashboard(valor) {
    return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function normalizarStatusDashboard(valor) {
    return String(valor || "").trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

function formatarDataDashboard(valor) {
    const partes = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!partes) return "Data não informada";
    return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

function instanteDashboard(live) {
    const data = String(live?.data_live || "").slice(0, 10);
    const horario = String(live?.horario_inicio || "00:00").slice(0, 5);
    const instante = new Date(`${data}T${horario}:00`);
    return Number.isNaN(instante.getTime()) ? Number.MAX_SAFE_INTEGER : instante.getTime();
}

function atualizarSaudacaoDashboard() {
    const hora = new Date().getHours();
    const periodo = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const primeiroNome = String(userName?.textContent || "Gestor").trim().split(/\s+/)[0];
    definirTextoDashboard("dashboardSaudacao", `${periodo}, ${primeiroNome}.`);
    definirTextoDashboard("dashboardHoje", new Date().toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    }));
}

function renderizarLiveDashboard(lives, turmas) {
    const conteudo = document.getElementById("dashboardLiveContent");
    const statusElemento = document.getElementById("dashboardLiveStatus");
    const tituloElemento = document.getElementById("dashboardLiveHeading");
    if (!conteudo || !statusElemento) return;
    const aoVivo = lives.find(live => normalizarStatusDashboard(live.status) === "ao vivo");
    const agendadas = lives.filter(live => ["agendada", "agendado"].includes(normalizarStatusDashboard(live.status)))
        .sort((a, b) => instanteDashboard(a) - instanteDashboard(b));
    const proxima = agendadas.find(live => instanteDashboard(live) >= Date.now()) || agendadas[0] || null;
    const destaque = aoVivo || proxima;

    if (!destaque) {
        if (tituloElemento) tituloElemento.textContent = "Próxima aula";
        statusElemento.textContent = "SEM AGENDA";
        statusElemento.className = "dashboard-live-status offline";
        conteudo.innerHTML = `<div class="dashboard-live-empty"><span>◉</span><strong>Nenhuma transmissão agendada</strong><p>Cadastre uma live para que ela apareça em destaque no Dashboard.</p></div>`;
        return;
    }

    const estaAoVivo = destaque === aoVivo;
    const turma = turmas.find(item => String(item.id) === String(destaque.turma_id));
    if (tituloElemento) tituloElemento.textContent = estaAoVivo ? "Acontecendo agora" : "Próxima aula";
    statusElemento.textContent = estaAoVivo ? "AO VIVO" : "AGENDADA";
    statusElemento.className = `dashboard-live-status ${estaAoVivo ? "ao-vivo" : "agendada"}`;
    conteudo.innerHTML = `<div class="dashboard-live-mark ${estaAoVivo ? "active" : ""}"><span>${estaAoVivo ? "LIVE" : formatarDataDashboard(destaque.data_live).slice(0,5)}</span></div>
        <div class="dashboard-live-details"><span>${escaparDashboard(turma?.nome || "Turma não informada")}</span><h4>${escaparDashboard(destaque.titulo || "Aula ao vivo")}</h4><p>${escaparDashboard(destaque.descricao || (estaAoVivo ? "A transmissão está disponível para os alunos." : "Aula preparada e aguardando o início."))}</p>
        <div><b>${formatarDataDashboard(destaque.data_live)}</b><i></i><b>${escaparDashboard(String(destaque.horario_inicio || "Horário não informado").slice(0,5))}</b></div></div>`;
}

async function carregarDashboardCompleto() {
    if (dashboardCarregando) return;
    dashboardCarregando = true;
    const botaoAtualizar = document.getElementById("dashboardRefreshButton");
    if (botaoAtualizar) { botaoAtualizar.disabled = true; botaoAtualizar.textContent = "↻ Atualizando..."; }
    definirTextoDashboard("dashboardAtualizado", "Atualizando...");
    atualizarSaudacaoDashboard();

    try {
        const respostas = await Promise.all([
            supabaseClient.from("cursos").select("id,nome,ativo"),
            supabaseClient.from("usuarios").select("id,nome,perfil,ativo,primeiro_acesso"),
            supabaseClient.from("turmas").select("id,nome,curso_id,ativa"),
            supabaseClient.from("lives").select("id,turma_id,titulo,descricao,data_live,horario_inicio,status"),
            supabaseClient.from("turma_alunos").select("aluno_id,turma_id,ativo"),
            supabaseClient.from("presencas_chamadas").select("id"),
            supabaseClient.from("presencas").select("id,presente")
        ]);
        const erro = respostas.find(resposta => resposta.error)?.error;
        if (erro) throw erro;
        const [cursos, usuarios, turmas, lives, matriculas, chamadas, presencas] = respostas.map(resposta => resposta.data || []);
        const alunos = usuarios.filter(usuario => usuario.perfil === "aluno");
        const professores = usuarios.filter(usuario => usuario.perfil === "professor");
        const alunosAtivos = alunos.filter(usuario => usuario.ativo === true).length;
        const professoresAtivos = professores.filter(usuario => usuario.ativo === true).length;
        const cursosAtivos = cursos.filter(curso => curso.ativo === true).length;
        const turmasAtivas = turmas.filter(turma => turma.ativa === true).length;
        const matriculasAtivas = matriculas.filter(matricula => matricula.ativo === true).length;
        const confirmadas = presencas.filter(presenca => presenca.presente === true).length;
        const frequencia = presencas.length ? Math.round(confirmadas * 100 / presencas.length) : 0;
        const livesAoVivo = lives.filter(live => normalizarStatusDashboard(live.status) === "ao vivo").length;
        const livesAgendadas = lives.filter(live => ["agendada", "agendado"].includes(normalizarStatusDashboard(live.status))).length;

        definirTextoDashboard("totalCursos", cursos.length);
        definirTextoDashboard("dashboardCursosAtivos", `${cursosAtivos} ${cursosAtivos === 1 ? "ativo" : "ativos"}`);
        definirTextoDashboard("totalAlunos", alunosAtivos);
        definirTextoDashboard("dashboardAlunosTotal", `${alunos.length} cadastrados`);
        definirTextoDashboard("totalProfessores", professoresAtivos);
        definirTextoDashboard("dashboardProfessoresTotal", `${professores.length} cadastrados`);
        definirTextoDashboard("totalLives", lives.length);
        definirTextoDashboard("dashboardLivesResumo", livesAoVivo ? `${livesAoVivo} ao vivo agora` : `${livesAgendadas} agendadas`);
        definirTextoDashboard("totalTurmasDashboard", turmasAtivas);
        definirTextoDashboard("dashboardTurmasTotal", `${turmas.length} no total`);
        definirTextoDashboard("dashboardMatriculas", matriculasAtivas);
        definirTextoDashboard("dashboardFrequencia", `${frequencia}%`);
        definirTextoDashboard("dashboardChamadasResumo", `${confirmadas}/${presencas.length} confirmações`);
        definirTextoDashboard("dashboardPrimeiroAcesso", alunos.filter(aluno => aluno.ativo === true && aluno.primeiro_acesso === true).length);
        definirTextoDashboard("dashboardAtualizado", `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}`);
        renderizarLiveDashboard(lives, turmas);
        console.log("MEP EAD | Dashboard operacional atualizado:", { cursos:cursos.length, alunos:alunosAtivos, turmas:turmasAtivas, chamadas:chamadas.length });
    } catch (erro) {
        console.error("MEP EAD | Erro ao carregar Dashboard:", erro);
        definirTextoDashboard("dashboardAtualizado", "Não foi possível atualizar");
        const status = document.getElementById("dashboardLiveStatus");
        if (status) { status.textContent = "INDISPONÍVEL"; status.className = "dashboard-live-status offline"; }
    } finally {
        dashboardCarregando = false;
        if (botaoAtualizar) { botaoAtualizar.disabled = false; botaoAtualizar.textContent = "↻ Atualizar indicadores"; }
    }
}

document.getElementById("dashboardRefreshButton")?.addEventListener("click", carregarDashboardCompleto);


window.addEventListener("hashchange", () => {

    const page =
        window.location.hash
            .replace("#", "")
            .trim();


    if (page) {
        mudarPagina(page, false);
    }

});


window.mudarPaginaGestao = mudarPagina;


/* =========================================
   LOGOUT
========================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            const confirmar =
                confirm(
                    "Deseja realmente sair do MEP EAD?"
                );


            if (!confirmar) {
                return;
            }


            try {

                const {
                    error
                } =
                    await supabaseClient
                        .auth
                        .signOut();


                if (error) {

                    console.error(
                        "Erro ao sair:",
                        error
                    );

                    alert(
                        "Não foi possível encerrar a sessão."
                    );

                    return;

                }


                window.location.href =
                    "../index.html";

            }

            catch (erro) {

                console.error(
                    "Erro no logout:",
                    erro
                );

            }

        }
    );

}


/* =========================================
   VOLTAR PARA LOGIN
========================================= */

function voltarLogin() {

    window.location.href =
        "../index.html";

}


/* =========================================
   DEBUG
========================================= */

console.log(
    "%cMEP EAD | GESTÃO",
    "color:#ff2020;font-size:20px;font-weight:900;"
);
