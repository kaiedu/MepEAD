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

    console.log(
        "Carregando informações do Dashboard..."
    );


    await Promise.all([

        carregarTotalCursos(),

        carregarTotalAlunos(),

        carregarTotalProfessores(),

        carregarTotalLives()

    ]);


    console.log(
        "Dashboard carregado."
    );

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

function mudarPagina(page) {

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


    const pagina =
        document.getElementById(
            `page-${page}`
        );


    if (pagina) {

        pagina.classList.add(
            "active"
        );

    }


    /* ================================
       TÍTULOS
    ================================= */

    const titulos = {

        dashboard: "Dashboard",

        cursos: "Cursos",

        turmas: "Turmas",

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