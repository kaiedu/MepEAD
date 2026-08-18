/* =========================================================
   MEP EAD
   PROFESSORES
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       VERIFICAR SUPABASE
    ===================================================== */

    if (
        typeof supabaseClient === "undefined"
    ) {

        console.error(
            "MEP EAD | Cliente Supabase não encontrado."
        );

        return;

    }


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const modal =
        document.getElementById("professorModal");

    const form =
        document.getElementById("professorForm");

    const novoProfessorButton =
        document.getElementById("novoProfessorButton");

    const novoProfessorEmptyButton =
        document.getElementById("novoProfessorEmptyButton");

    const fecharProfessorModal =
        document.getElementById("fecharProfessorModal");

    const cancelarProfessor =
        document.getElementById("cancelarProfessor");

    const mensagem =
        document.getElementById("professorFormMessage");

    const salvarButton =
        document.getElementById("salvarProfessorButton");

    const listaProfessores =
        document.getElementById("listaProfessores");

    const professoresLoading =
        document.getElementById("professoresLoading");

    const professoresEmpty =
        document.getElementById("professoresEmpty");

    const contadorProfessores =
        document.getElementById("contadorProfessores");

    const buscarProfessor =
        document.getElementById("buscarProfessor");

    const filtroProfessores =
        document.getElementById("filtroProfessores");


    /* =====================================================
       CAMPOS
    ===================================================== */

    const campoNome =
        document.getElementById("professorNome");

    const campoEmail =
        document.getElementById("professorEmail");

    const campoSenha =
        document.getElementById("professorSenha");

    const campoSenhaConfirmacao =
        document.getElementById("professorSenhaConfirmacao");

    const campoAtivo =
        document.getElementById("professorAtivo");


    /* =====================================================
       ESTADO
    ===================================================== */

    let professores = [];


    /* =====================================================
       ABRIR MODAL
    ===================================================== */

    function abrirModal() {

        if (!modal) {

            console.error(
                "MEP EAD | Modal de professor não encontrado."
            );

            return;

        }


        if (form) {
            form.reset();
        }


        if (campoAtivo) {
            campoAtivo.checked = true;
        }


        esconderMensagem();


        modal.hidden = false;


        document.body.classList.add(
            "modal-open"
        );


        setTimeout(function () {

            if (campoNome) {
                campoNome.focus();
            }

        }, 100);

    }


    /* =====================================================
       FECHAR MODAL
    ===================================================== */

    function fecharModal() {

        if (!modal) {
            return;
        }


        modal.hidden = true;


        document.body.classList.remove(
            "modal-open"
        );


        if (form) {
            form.reset();
        }


        esconderMensagem();

    }


    /* =====================================================
       MENSAGEM
    ===================================================== */

    function mostrarMensagem(
        texto,
        tipo
    ) {

        if (!mensagem) {
            return;
        }


        if (!tipo) {
            tipo = "erro";
        }


        mensagem.textContent =
            texto;


        mensagem.className =
            "form-message " + tipo;


        mensagem.hidden =
            false;

    }


    function esconderMensagem() {

        if (!mensagem) {
            return;
        }


        mensagem.hidden =
            true;


        mensagem.textContent =
            "";


        mensagem.className =
            "form-message";

    }


    /* =====================================================
       LOADING DO BOTÃO
    ===================================================== */

    function alterarLoading(
        carregando
    ) {

        if (!salvarButton) {
            return;
        }


        salvarButton.disabled =
            carregando;


        const normal =
            salvarButton.querySelector(
                ".button-normal"
            );


        const loading =
            salvarButton.querySelector(
                ".button-loading"
            );


        if (normal) {

            normal.hidden =
                carregando;

        }


        if (loading) {

            loading.hidden =
                !carregando;

        }

    }


    /* =====================================================
       CRIAR PROFESSOR
    ===================================================== */

    async function criarProfessor(
        dados
    ) {

        try {

            alterarLoading(true);

            esconderMensagem();


            /* =============================================
               VERIFICAR SESSÃO
            ============================================= */

            const resultadoSessao =
                await supabaseClient.auth.getSession();


            const sessionData =
                resultadoSessao.data;

            const sessionError =
                resultadoSessao.error;


            if (
                sessionError ||
                !sessionData ||
                !sessionData.session
            ) {

                throw new Error(
                    "Sua sessão expirou. Faça login novamente."
                );

            }


            const token =
                sessionData.session.access_token;


            /* =============================================
               CHAMAR EDGE FUNCTION
            ============================================= */

            const resultadoFunction =
                await supabaseClient.functions.invoke(
                    "criar-professor",
                    {
                        body: dados,
                        headers: {
                            Authorization:
                                "Bearer " + token
                        }
                    }
                );


            const data =
                resultadoFunction.data;

            const error =
                resultadoFunction.error;


            if (error) {

                console.error(
                    "Erro ao chamar criar-professor:",
                    error
                );


                throw new Error(
                    error.message ||
                    "Não foi possível criar o professor."
                );

            }


            if (!data) {

                throw new Error(
                    "O servidor não retornou uma resposta."
                );

            }


            if (!data.sucesso) {

                throw new Error(
                    data.erro ||
                    "Não foi possível criar o professor."
                );

            }


            /* =============================================
               SUCESSO
            ============================================= */

            mostrarMensagem(
                data.mensagem ||
                "Professor criado com sucesso.",
                "sucesso"
            );


            await carregarProfessores();


            setTimeout(function () {

                fecharModal();

            }, 1000);


        } catch (erro) {

            console.error(
                "Erro ao criar professor:",
                erro
            );


            mostrarMensagem(
                erro && erro.message
                    ? erro.message
                    : "Ocorreu um erro ao criar o professor.",
                "erro"
            );

        } finally {

            alterarLoading(false);

        }

    }


    /* =====================================================
       SUBMIT
    ===================================================== */

    async function handleSubmit(
        event
    ) {

        event.preventDefault();


        const nome =
            String(
                campoNome && campoNome.value
                    ? campoNome.value
                    : ""
            ).trim();


        const email =
            String(
                campoEmail && campoEmail.value
                    ? campoEmail.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const senha =
            String(
                campoSenha && campoSenha.value
                    ? campoSenha.value
                    : ""
            );


        const senhaConfirmacao =
            String(
                campoSenhaConfirmacao &&
                campoSenhaConfirmacao.value
                    ? campoSenhaConfirmacao.value
                    : ""
            );


        const ativo =
            campoAtivo
                ? campoAtivo.checked
                : true;


        /* =============================================
           VALIDAÇÕES
        ============================================= */

        if (!nome) {

            mostrarMensagem(
                "Informe o nome completo do professor."
            );


            if (campoNome) {
                campoNome.focus();
            }


            return;

        }


        if (!email) {

            mostrarMensagem(
                "Informe o e-mail do professor."
            );


            if (campoEmail) {
                campoEmail.focus();
            }


            return;

        }


        const regexEmail =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!regexEmail.test(email)) {

            mostrarMensagem(
                "Informe um e-mail válido."
            );


            if (campoEmail) {
                campoEmail.focus();
            }


            return;

        }


        if (senha.length < 6) {

            mostrarMensagem(
                "A senha temporária precisa ter pelo menos 6 caracteres."
            );


            if (campoSenha) {
                campoSenha.focus();
            }


            return;

        }


        if (
            senha !==
            senhaConfirmacao
        ) {

            mostrarMensagem(
                "As senhas não coincidem."
            );


            if (campoSenhaConfirmacao) {
                campoSenhaConfirmacao.focus();
            }


            return;

        }


        /* =============================================
           ENVIAR
        ============================================= */

        await criarProfessor({

            nome: nome,

            email: email,

            senha: senha,

            ativo: ativo

        });

    }


    /* =====================================================
       CARREGAR PROFESSORES
    ===================================================== */

    async function carregarProfessores() {

        if (
            typeof supabaseClient === "undefined"
        ) {

            console.error(
                "MEP EAD | Cliente Supabase não encontrado."
            );

            return;

        }


        try {

            mostrarLoading();


            const resultado =
                await supabaseClient
                    .from("usuarios")
                    .select(
                        "id, auth_id, nome, email, perfil, ativo, primeiro_acesso, created_at"
                    )
                    .eq(
                        "perfil",
                        "professor"
                    )
                    .order(
                        "nome",
                        {
                            ascending: true
                        }
                    );


            const data =
                resultado.data;

            const error =
                resultado.error;


            if (error) {

                console.error(
                    "Erro ao carregar professores:",
                    error
                );


                throw error;

            }


            professores =
                Array.isArray(data)
                    ? data
                    : [];


            renderizarProfessores();


        } catch (erro) {

            console.error(
                "Erro ao carregar professores:",
                erro
            );


            esconderLoading();


            if (listaProfessores) {

                listaProfessores.innerHTML =
                    '<div class="placeholder-card">' +

                        '<span>⚠️</span>' +

                        '<h3>' +
                            'Não foi possível carregar os professores' +
                        '</h3>' +

                        '<p>' +
                            'Verifique sua conexão e tente novamente.' +
                        '</p>' +

                    '</div>';

            }

        }

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function mostrarLoading() {

        if (professoresLoading) {

            professoresLoading.hidden =
                false;

        }


        if (professoresEmpty) {

            professoresEmpty.hidden =
                true;

        }

    }


    function esconderLoading() {

        if (professoresLoading) {

            professoresLoading.hidden =
                true;

        }

    }


    /* =====================================================
       RENDERIZAR PROFESSORES
    ===================================================== */

    function renderizarProfessores() {

        esconderLoading();


        const busca =
            String(
                buscarProfessor &&
                buscarProfessor.value
                    ? buscarProfessor.value
                    : ""
            )
                .trim()
                .toLowerCase();


        const filtro =
            filtroProfessores &&
            filtroProfessores.value
                ? filtroProfessores.value
                : "todos";


        const lista =
            professores.filter(
                function (professor) {

                    const nome =
                        String(
                            professor.nome || ""
                        )
                            .toLowerCase();


                    const email =
                        String(
                            professor.email || ""
                        )
                            .toLowerCase();


                    const correspondeBusca =
                        !busca ||
                        nome.includes(busca) ||
                        email.includes(busca);


                    let correspondeFiltro =
                        true;


                    if (
                        filtro === "ativos"
                    ) {

                        correspondeFiltro =
                            professor.ativo === true;

                    }


                    if (
                        filtro === "inativos"
                    ) {

                        correspondeFiltro =
                            professor.ativo === false;

                    }


                    return (
                        correspondeBusca &&
                        correspondeFiltro
                    );

                }
            );


        if (contadorProfessores) {

            contadorProfessores.textContent =
                lista.length;

        }


        if (!lista.length) {

            if (listaProfessores) {

                listaProfessores.innerHTML =
                    "";

            }


            if (professoresEmpty) {

                professoresEmpty.hidden =
                    false;

            }


            return;

        }


        if (professoresEmpty) {

            professoresEmpty.hidden =
                true;

        }


        if (!listaProfessores) {
            return;
        }


        listaProfessores.innerHTML =
            lista
                .map(
                    criarCardProfessor
                )
                .join("");

    }


    /* =====================================================
       CARD DO PROFESSOR
    ===================================================== */

    function criarCardProfessor(
        professor
    ) {

        const nome =
            escaparHtml(
                professor.nome ||
                "Professor"
            );


        const email =
            escaparHtml(
                professor.email ||
                "Sem e-mail"
            );


        const inicial =
            obterInicial(
                professor.nome
            );


        const status =
            professor.ativo
                ? "ATIVO"
                : "INATIVO";


        const classeStatus =
            professor.ativo
                ? "ativo"
                : "inativo";


        return (

            '<article ' +
                'class="professor-card" ' +
                'data-professor-id="' +
                    escaparHtml(
                        professor.id ||
                        ""
                    ) +
                '">' +

                '<div class="professor-card-avatar">' +

                    inicial +

                '</div>' +

                '<div class="professor-card-content">' +

                    '<div class="professor-card-header">' +

                        '<div>' +

                            '<h3>' +
                                nome +
                            '</h3>' +

                            '<span>' +
                                email +
                            '</span>' +

                        '</div>' +

                        '<span class="professor-status ' +
                            classeStatus +
                        '">' +

                            status +

                        '</span>' +

                    '</div>' +

                    '<div class="professor-card-footer">' +

                        '<span>' +
                            '👨‍🏫 Professor' +
                        '</span>' +

                    '</div>' +

                '</div>' +

            '</article>'

        );

    }


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function obterInicial(
        nome
    ) {

        const texto =
            String(
                nome || ""
            ).trim();


        if (!texto) {
            return "P";
        }


        return texto
            .charAt(0)
            .toUpperCase();

    }


    function escaparHtml(
        valor
    ) {

        return String(valor)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    if (novoProfessorButton) {

        novoProfessorButton.addEventListener(
            "click",
            abrirModal
        );

    }


    if (novoProfessorEmptyButton) {

        novoProfessorEmptyButton.addEventListener(
            "click",
            abrirModal
        );

    }


    if (fecharProfessorModal) {

        fecharProfessorModal.addEventListener(
            "click",
            fecharModal
        );

    }


    if (cancelarProfessor) {

        cancelarProfessor.addEventListener(
            "click",
            fecharModal
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            handleSubmit
        );

    }


    if (buscarProfessor) {

        buscarProfessor.addEventListener(
            "input",
            renderizarProfessores
        );

    }


    if (filtroProfessores) {

        filtroProfessores.addEventListener(
            "change",
            renderizarProfessores
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    fecharModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                modal &&
                !modal.hidden
            ) {

                fecharModal();

            }

        }
    );


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    function inicializar() {

        console.log(
            "MEP EAD | Módulo de professores carregado."
        );


        carregarProfessores();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            inicializar
        );

    } else {

        inicializar();

    }


    /* =====================================================
       DISPONIBILIZAR GLOBALMENTE
    ===================================================== */

    window.MEPProfessores = {

        carregar:
            carregarProfessores,

        abrir:
            abrirModal,

        fechar:
            fecharModal

    };


})();