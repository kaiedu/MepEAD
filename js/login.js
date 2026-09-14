/* =========================================
   MEP EAD
   LOGIN.JS
   LOGIN + PRIMEIRO ACESSO
   + RECUPERAÇÃO DE SENHA
========================================= */


/* =========================================
   ELEMENTOS
========================================= */

const form =
    document.getElementById("loginForm");

const inputUsuario =
    document.getElementById("usuario");

const inputSenha =
    document.getElementById("senha");

const loginButton =
    document.getElementById("loginButton");


/* =========================================
   ELEMENTOS
   RECUPERAÇÃO DE SENHA
========================================= */

const forgotPassword =
    document.getElementById("forgotPassword");

const passwordModal =
    document.getElementById("passwordModal");

const passwordModalOverlay =
    document.getElementById("passwordModalOverlay");

const closePasswordModal =
    document.getElementById("closePasswordModal");

const backToLogin =
    document.getElementById("backToLogin");

const forgotPasswordForm =
    document.getElementById("forgotPasswordForm");

const recoveryEmail =
    document.getElementById("recoveryEmail");

const recoveryMessage =
    document.getElementById("recoveryMessage");

const recoveryButton =
    document.getElementById("recoveryButton");


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        configurarMostrarSenha();

        configurarRecuperacaoSenha();

        console.log(
            "MEP EAD | Login carregado."
        );

        console.log(
            "MEP EAD | Recuperação de senha: ATIVA."
        );

    }
);


/* =========================================
   LOGIN
========================================= */

if (form) {

    form.addEventListener(
        "submit",
        realizarLogin
    );

}


/* =========================================
   RECUPERAÇÃO DE SENHA
========================================= */

function configurarRecuperacaoSenha() {

    /* =====================================
       ABRIR MODAL
    ===================================== */

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            event => {

                event.preventDefault();

                abrirModalRecuperacao();

            }
        );

    }


    /* =====================================
       FECHAR
    ===================================== */

    if (closePasswordModal) {

        closePasswordModal.addEventListener(
            "click",
            fecharModalRecuperacao
        );

    }


    if (backToLogin) {

        backToLogin.addEventListener(
            "click",
            fecharModalRecuperacao
        );

    }


    if (passwordModalOverlay) {

        passwordModalOverlay.addEventListener(
            "click",
            fecharModalRecuperacao
        );

    }


    /* =====================================
       ESC
    ===================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                passwordModal &&
                !passwordModal.hidden
            ) {

                fecharModalRecuperacao();

            }

        }
    );


    /* =====================================
       FORMULÁRIO
    ===================================== */

    if (forgotPasswordForm) {

        forgotPasswordForm.addEventListener(
            "submit",
            enviarRecuperacaoSenha
        );

    }

}


/* =========================================
   ABRIR MODAL RECUPERAÇÃO
========================================= */

function abrirModalRecuperacao() {

    if (!passwordModal) {

        return;

    }


    passwordModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );


    limparMensagemRecuperacao();


    if (recoveryEmail) {

        /*
           Se o usuário já digitou o e-mail
           no login, aproveitamos o valor.
        */

        if (
            inputUsuario &&
            inputUsuario.value.trim()
        ) {

            recoveryEmail.value =
                inputUsuario.value.trim();

        }


        setTimeout(
            () => {

                recoveryEmail.focus();

                recoveryEmail.select();

            },
            100
        );

    }

}


/* =========================================
   FECHAR MODAL RECUPERAÇÃO
========================================= */

function fecharModalRecuperacao() {

    if (!passwordModal) {

        return;

    }


    passwordModal.hidden =
        true;


    document.body.classList.remove(
        "modal-open"
    );


    limparMensagemRecuperacao();


    if (forgotPasswordForm) {

        forgotPasswordForm.reset();

    }


    alterarEstadoBotaoRecuperacao(
        false
    );

}


/* =========================================
   ENVIAR RECUPERAÇÃO
========================================= */

async function enviarRecuperacaoSenha(
    event
) {

    event.preventDefault();


    limparMensagemRecuperacao();


    const email =
        recoveryEmail
            ? recoveryEmail.value
                .trim()
                .toLowerCase()
            : "";


    /* =====================================
       VALIDAR E-MAIL
    ===================================== */

    if (!email) {

        mostrarMensagemRecuperacao(
            "Informe o e-mail cadastrado no MEP EAD.",
            "error"
        );


        recoveryEmail?.focus();


        return;

    }


    if (!emailValido(email)) {

        mostrarMensagemRecuperacao(
            "Informe um e-mail válido.",
            "error"
        );


        recoveryEmail?.focus();


        return;

    }


    alterarEstadoBotaoRecuperacao(
        true
    );


    try {

        console.log(
            "Solicitando recuperação de senha:",
            email
        );


        /* =================================
           URL DE REDIRECIONAMENTO
        ================================= */

        const redirectUrl =
    window.location.origin +
    "/reset-password.html";


        console.log(
            "URL de recuperação:",
            redirectUrl
        );


        /* =================================
           SUPABASE AUTH
        ================================= */

        const {
            error
        } =
            await supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        redirectUrl
                }
            );


        /* =================================
           ERRO
        ================================= */

        if (error) {

            console.error(
                "Erro ao solicitar recuperação:",
                error
            );


            mostrarMensagemRecuperacao(
                traduzirErroRecuperacao(
                    error
                ),
                "error"
            );


            alterarEstadoBotaoRecuperacao(
                false
            );


            return;

        }


        /* =================================
           SUCESSO
        ================================= */

        console.log(
            "E-mail de recuperação enviado."
        );


        mostrarMensagemRecuperacao(

            "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",

            "success"

        );


        /*
           Não fechamos imediatamente.
           Assim o usuário consegue ler a mensagem.
        */

        if (recoveryEmail) {

            recoveryEmail.disabled =
                true;

        }


        setTimeout(
            () => {

                fecharModalRecuperacao();

            },
            4500
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado na recuperação:",
            erro
        );


        mostrarMensagemRecuperacao(
            "Ocorreu um erro ao solicitar a recuperação da senha.",
            "error"
        );


        alterarEstadoBotaoRecuperacao(
            false
        );

    }

}


/* =========================================
   ESTADO BOTÃO RECUPERAÇÃO
========================================= */

function alterarEstadoBotaoRecuperacao(
    carregando
) {

    if (!recoveryButton) {

        return;

    }


    recoveryButton.disabled =
        carregando;


    const normal =
        recoveryButton.querySelector(
            ".recovery-button-normal"
        );


    const loading =
        recoveryButton.querySelector(
            ".recovery-button-loading"
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


/* =========================================
   MENSAGEM RECUPERAÇÃO
========================================= */

function mostrarMensagemRecuperacao(
    texto,
    tipo = "error"
) {

    if (!recoveryMessage) {

        return;

    }


    recoveryMessage.hidden =
        false;


    recoveryMessage.textContent =
        texto;


    recoveryMessage.className =
        "recovery-message " +
        tipo;

}


/* =========================================
   LIMPAR MENSAGEM RECUPERAÇÃO
========================================= */

function limparMensagemRecuperacao() {

    if (!recoveryMessage) {

        return;

    }


    recoveryMessage.hidden =
        true;


    recoveryMessage.textContent =
        "";


    recoveryMessage.className =
        "recovery-message";

}


/* =========================================
   VALIDAR E-MAIL
========================================= */

function emailValido(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* =========================================
   TRADUZIR ERROS RECUPERAÇÃO
========================================= */

function traduzirErroRecuperacao(
    erro
) {

    const mensagem =
        String(
            erro?.message || ""
        ).toLowerCase();


    if (
        mensagem.includes(
            "rate limit"
        ) ||
        mensagem.includes(
            "too many requests"
        )
    ) {

        return (
            "Muitas solicitações foram realizadas. Aguarde alguns minutos e tente novamente."
        );

    }


    if (
        mensagem.includes(
            "invalid email"
        )
    ) {

        return (
            "O e-mail informado é inválido."
        );

    }


    return (
        "Não foi possível solicitar a recuperação da senha. Tente novamente."
    );

}


/* =========================================
   REALIZAR LOGIN
========================================= */

async function resolverEmailDeAcesso(identificador) {

    const valor = String(identificador || "").trim();

    if (valor.includes("@")) {
        return valor.toLowerCase();
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "resolver_email_por_matricula",
        {
            p_matricula: valor
        }
    );

    if (error) {
        console.error("Erro ao localizar matrícula:", error);
        throw new Error("Não foi possível validar a matrícula agora.");
    }

    return String(data || "").trim().toLowerCase();
}

async function realizarLogin(event) {

    event.preventDefault();


    const identificador =
        inputUsuario
            ? inputUsuario.value.trim()
            : "";


    const senha =
        inputSenha
            ? inputSenha.value
            : "";


    /* =====================================
       VALIDAÇÃO
    ===================================== */

    if (!identificador || !senha) {

        mostrarMensagem(
            "Preencha seu e-mail ou matrícula e sua senha.",
            "error"
        );

        return;

    }


    alterarEstadoBotao(true);


    try {

        const email = await resolverEmailDeAcesso(
            identificador
        );

        if (!email) {
            mostrarMensagem(
                "E-mail, matrícula ou senha incorretos.",
                "error"
            );
            alterarEstadoBotao(false);
            if (inputSenha) inputSenha.value = "";
            return;
        }

        console.log(
            "Tentando entrar com credencial informada."
        );


        /* =================================
           LOGIN SUPABASE
        ================================= */

        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: senha

            });


        /* =================================
           ERRO
        ================================= */

        if (error) {

            console.error(
                "Erro Auth:",
                error
            );


            mostrarMensagem(
                traduzirErroLogin(error),
                "error"
            );


            alterarEstadoBotao(false);


            if (inputSenha) {

                inputSenha.value = "";

                inputSenha.focus();

            }


            return;

        }


        const authUser =
            data?.user;


        if (!authUser) {

            mostrarMensagem(
                "Não foi possível identificar sua conta.",
                "error"
            );


            alterarEstadoBotao(false);

            return;

        }


        console.log(
            "Usuário autenticado:",
            authUser
        );


        /* =================================
           BUSCAR PERFIL
        ================================= */

        const {
            data: usuario,
            error: erroPerfil
        } =
            await supabaseClient
                .from("usuarios")
                .select(
                    "id, auth_id, nome, email, perfil, ativo, primeiro_acesso"
                )
                .eq(
                    "auth_id",
                    authUser.id
                )
                .maybeSingle();


        /* =================================
           ERRO PERFIL
        ================================= */

        if (erroPerfil) {

            console.error(
                "Erro ao buscar perfil:",
                erroPerfil
            );


            await supabaseClient.auth.signOut();


            mostrarMensagem(
                "Erro ao carregar seu perfil.",
                "error"
            );


            alterarEstadoBotao(false);

            return;

        }


        /* =================================
           PERFIL NÃO ENCONTRADO
        ================================= */

        if (!usuario) {

            console.error(
                "Nenhum perfil encontrado para:",
                authUser.id
            );


            await supabaseClient.auth.signOut();


            mostrarMensagem(
                "Sua conta existe, mas o perfil ainda não foi configurado.",
                "error"
            );


            alterarEstadoBotao(false);

            return;

        }


        /* =================================
           USUÁRIO DESATIVADO
        ================================= */

        if (!usuario.ativo) {

            await supabaseClient.auth.signOut();


            mostrarMensagem(
                "Seu acesso ao MEP EAD está desativado.",
                "error"
            );


            alterarEstadoBotao(false);

            return;

        }


        /* =================================
           PRIMEIRO ACESSO
        ================================= */

        if (
            usuario.perfil === "aluno" &&
            usuario.primeiro_acesso === true
        ) {

            console.log(
                "Primeiro acesso detectado."
            );


            mostrarMensagem(
                "Primeiro acesso identificado.",
                "success"
            );


            alterarEstadoBotao(false);


            setTimeout(
                () => {

                    abrirModalPrimeiroAcesso(
                        usuario
                    );

                },
                500
            );


            return;

        }


        /* =================================
           LOGIN NORMAL
        ================================= */

        console.log(
            "Perfil:",
            usuario.perfil
        );


        mostrarMensagem(
            "Bem-vindo, " +
            usuario.nome +
            "!",
            "success"
        );


        redirecionarUsuario(
            usuario
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado no login:",
            erro
        );


        mostrarMensagem(
            "Ocorreu um erro inesperado.",
            "error"
        );


        alterarEstadoBotao(false);

    }

}


/* =========================================
   REDIRECIONAR USUÁRIO
========================================= */

function redirecionarUsuario(
    usuario
) {

    setTimeout(
        function () {

            if (
                usuario.perfil ===
                "gestor"
            ) {

                window.location.href =
                    "gestao/index.html";

                return;

            }


            if (
                usuario.perfil ===
                "professor"
            ) {

                window.location.href =
                    "professor/index.html";

                return;

            }


            if (
                usuario.perfil ===
                "aluno"
            ) {

                window.location.href =
                    "aluno/index.html";

                return;

            }


            console.error(
                "Perfil desconhecido:",
                usuario.perfil
            );


            mostrarMensagem(
                "Perfil de usuário inválido.",
                "error"
            );


            alterarEstadoBotao(false);

        },
        700
    );

}


/* =========================================
   PRIMEIRO ACESSO
========================================= */

function abrirModalPrimeiroAcesso(
    usuario
) {

    const existente =
        document.getElementById(
            "primeiroAcessoModal"
        );


    if (existente) {

        existente.remove();

    }


    adicionarEstilosPrimeiroAcesso();


    const modal =
        document.createElement("div");


    modal.id =
        "primeiroAcessoModal";


    modal.className =
        "primeiro-acesso-modal";


    modal.innerHTML = `

        <div class="primeiro-acesso-box">

            <div class="primeiro-acesso-top">

                <div class="primeiro-acesso-icon">
                    🔐
                </div>

                <span class="primeiro-acesso-label">
                    PRIMEIRO ACESSO
                </span>

                <h2>
                    Crie sua nova senha.
                </h2>

                <p>
                    Olá, <strong>${escaparHTML(usuario.nome)}</strong>.
                    Por segurança, defina uma nova senha
                    para continuar utilizando o MEP EAD.
                </p>

            </div>


            <form
                id="primeiroAcessoForm"
                class="primeiro-acesso-form"
            >

                <div class="primeiro-acesso-group">

                    <label for="novaSenha">
                        Nova senha
                    </label>

                    <input
                        type="password"
                        id="novaSenha"
                        placeholder="Digite sua nova senha"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >

                    <small>
                        A senha deve ter pelo menos 6 caracteres.
                    </small>

                </div>


                <div class="primeiro-acesso-group">

                    <label for="confirmarNovaSenha">
                        Confirmar nova senha
                    </label>

                    <input
                        type="password"
                        id="confirmarNovaSenha"
                        placeholder="Digite novamente sua senha"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >

                </div>


                <div
                    id="primeiroAcessoMensagem"
                    class="primeiro-acesso-message"
                    hidden
                ></div>


                <button
                    type="submit"
                    id="salvarNovaSenha"
                    class="primeiro-acesso-button"
                >

                    <span class="senha-button-normal">
                        Salvar nova senha
                    </span>

                    <span
                        class="senha-button-loading"
                        hidden
                    >
                        Salvando...
                    </span>

                    <span class="senha-button-arrow">
                        →
                    </span>

                </button>


                <div class="primeiro-acesso-security">

                    <span>
                        🔒
                    </span>

                    Sua nova senha será protegida pelo
                    sistema de autenticação do MEP EAD.

                </div>

            </form>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const primeiroAcessoForm =
        document.getElementById(
            "primeiroAcessoForm"
        );


    const novaSenha =
        document.getElementById(
            "novaSenha"
        );


    const confirmarNovaSenha =
        document.getElementById(
            "confirmarNovaSenha"
        );


    primeiroAcessoForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            await salvarNovaSenhaPrimeiroAcesso(
                usuario,
                novaSenha,
                confirmarNovaSenha
            );

        }
    );


    setTimeout(
        () => {

            novaSenha.focus();

        },
        150
    );

}


/* =========================================
   SALVAR NOVA SENHA
========================================= */

async function salvarNovaSenhaPrimeiroAcesso(
    usuario,
    novaSenhaInput,
    confirmacaoInput
) {

    const novaSenha =
        novaSenhaInput.value;


    const confirmacao =
        confirmacaoInput.value;


    const botao =
        document.getElementById(
            "salvarNovaSenha"
        );


    /* =====================================
       VALIDAÇÃO
    ===================================== */

    if (!novaSenha) {

        mostrarMensagemPrimeiroAcesso(
            "Digite uma nova senha.",
            "error"
        );

        novaSenhaInput.focus();

        return;

    }


    if (novaSenha.length < 6) {

        mostrarMensagemPrimeiroAcesso(
            "A nova senha precisa ter pelo menos 6 caracteres.",
            "error"
        );

        novaSenhaInput.focus();

        return;

    }


    if (novaSenha !== confirmacao) {

        mostrarMensagemPrimeiroAcesso(
            "As senhas não coincidem.",
            "error"
        );

        confirmacaoInput.focus();

        return;

    }


    if (botao) {

        botao.disabled = true;

        const normal =
            botao.querySelector(
                ".senha-button-normal"
            );

        const loading =
            botao.querySelector(
                ".senha-button-loading"
            );

        if (normal) {

            normal.hidden = true;

        }

        if (loading) {

            loading.hidden = false;

        }

    }


    try {

        const {
            error: erroSenha
        } =
            await supabaseClient.auth.updateUser({

                password:
                    novaSenha

            });


        if (erroSenha) {

            console.error(
                "Erro ao alterar senha:",
                erroSenha
            );


            mostrarMensagemPrimeiroAcesso(
                traduzirErroSenha(
                    erroSenha
                ),
                "error"
            );


            restaurarBotaoNovaSenha();

            return;

        }


        const {
            data: finalizado,
            error: erroFinalizacao
        } =
            await supabaseClient.rpc(
                "finalizar_primeiro_acesso"
            );


        if (erroFinalizacao) {

            console.error(
                "Erro ao finalizar primeiro acesso:",
                erroFinalizacao
            );


            mostrarMensagemPrimeiroAcesso(
                "Sua senha foi alterada, mas não conseguimos finalizar o cadastro. Tente entrar novamente.",
                "error"
            );


            restaurarBotaoNovaSenha();

            return;

        }


        console.log(
            "Primeiro acesso finalizado:",
            finalizado
        );


        mostrarMensagemPrimeiroAcesso(
            "Senha alterada com sucesso! Entrando no MEP EAD...",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "aluno/index.html";

            },
            1000
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao alterar senha:",
            erro
        );


        mostrarMensagemPrimeiroAcesso(
            "Ocorreu um erro ao alterar sua senha.",
            "error"
        );


        restaurarBotaoNovaSenha();

    }

}


/* =========================================
   RESTAURAR BOTÃO
========================================= */

function restaurarBotaoNovaSenha() {

    const botao =
        document.getElementById(
            "salvarNovaSenha"
        );


    if (!botao) {
        return;
    }


    botao.disabled = false;


    const normal =
        botao.querySelector(
            ".senha-button-normal"
        );


    const loading =
        botao.querySelector(
            ".senha-button-loading"
        );


    if (normal) {

        normal.hidden = false;

    }


    if (loading) {

        loading.hidden = true;

    }

}


/* =========================================
   MENSAGEM PRIMEIRO ACESSO
========================================= */

function mostrarMensagemPrimeiroAcesso(
    texto,
    tipo
) {

    const mensagem =
        document.getElementById(
            "primeiroAcessoMensagem"
        );


    if (!mensagem) {
        return;
    }


    mensagem.hidden = false;

    mensagem.textContent =
        texto;


    mensagem.className =
        "primeiro-acesso-message " +
        tipo;

}


/* =========================================
   ESTILOS DO PRIMEIRO ACESSO
========================================= */

function adicionarEstilosPrimeiroAcesso() {

    if (
        document.getElementById(
            "primeiroAcessoStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement("style");


    style.id =
        "primeiroAcessoStyles";


    style.textContent = `

        .primeiro-acesso-modal {

            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
            background: rgba(0, 0, 0, .82);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            animation: primeiroAcessoFade .2s ease;

        }


        .primeiro-acesso-box {

            width: min(500px, 100%);
            background: linear-gradient(145deg, #171717, #0b0b0b);
            border: 1px solid #303030;
            border-radius: 18px;
            overflow: hidden;
            box-shadow:
                0 35px 100px rgba(0,0,0,.7),
                0 0 0 1px rgba(255,255,255,.015);
            animation: primeiroAcessoBox .25s ease;

        }


        .primeiro-acesso-top {

            padding: 30px 30px 22px;
            border-bottom: 1px solid #242424;

        }


        .primeiro-acesso-icon {

            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 17px;
            border-radius: 12px;
            background: rgba(255,31,31,.09);
            border: 1px solid rgba(255,31,31,.2);
            font-size: 21px;

        }


        .primeiro-acesso-label {

            display: block;
            margin-bottom: 7px;
            color: #ff4b4b;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1.2px;

        }


        .primeiro-acesso-top h2 {

            margin: 0 0 9px;
            color: #fff;
            font-size: 25px;
            font-weight: 850;
            letter-spacing: -.6px;

        }


        .primeiro-acesso-top p {

            margin: 0;
            color: #777;
            font-size: 13px;
            line-height: 1.65;

        }


        .primeiro-acesso-top strong {

            color: #aaa;
            font-weight: 700;

        }


        .primeiro-acesso-form {

            padding: 25px 30px 30px;

        }


        .primeiro-acesso-group {

            margin-bottom: 17px;

        }


        .primeiro-acesso-group label {

            display: block;
            margin-bottom: 8px;
            color: #aaa;
            font-size: 12px;
            font-weight: 750;

        }


        .primeiro-acesso-group input {

            width: 100%;
            height: 46px;
            padding: 0 14px;
            background: #111;
            border: 1px solid #292929;
            border-radius: 9px;
            color: #fff;
            outline: none;
            font-family: inherit;
            font-size: 13px;
            transition: .2s ease;
            box-sizing: border-box;

        }


        .primeiro-acesso-group input::placeholder {

            color: #505050;

        }


        .primeiro-acesso-group input:focus {

            background: #141414;
            border-color: rgba(255,31,31,.55);
            box-shadow: 0 0 0 3px rgba(255,31,31,.08);

        }


        .primeiro-acesso-group small {

            display: block;
            margin-top: 6px;
            color: #555;
            font-size: 10px;

        }


        .primeiro-acesso-message {

            margin: 5px 0 17px;
            padding: 11px 13px;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.5;

        }


        .primeiro-acesso-message[hidden] {

            display: none !important;

        }


        .primeiro-acesso-message.error {

            background: rgba(255,48,48,.08);
            border: 1px solid rgba(255,48,48,.2);
            color: #ff6868;

        }


        .primeiro-acesso-message.success {

            background: rgba(40,209,124,.08);
            border: 1px solid rgba(40,209,124,.2);
            color: #55df92;

        }


        .primeiro-acesso-button {

            width: 100%;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border: 1px solid rgba(255,31,31,.3);
            border-radius: 9px;
            background: linear-gradient(135deg, #ff2525, #c90000);
            color: #fff;
            font-family: inherit;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(255,31,31,.12);
            transition: .2s ease;

        }


        .primeiro-acesso-button:hover {

            transform: translateY(-1px);
            box-shadow: 0 14px 30px rgba(255,31,31,.18);

        }


        .primeiro-acesso-button:disabled {

            opacity: .65;
            cursor: wait;
            transform: none;

        }


        .senha-button-arrow {

            font-size: 18px;
            line-height: 1;

        }


        .primeiro-acesso-security {

            display: flex;
            align-items: flex-start;
            gap: 7px;
            margin-top: 16px;
            color: #555;
            font-size: 10px;
            line-height: 1.5;

        }


        @keyframes primeiroAcessoFade {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }

        }


        @keyframes primeiroAcessoBox {

            from {

                opacity: 0;
                transform: translateY(12px) scale(.98);

            }

            to {

                opacity: 1;
                transform: translateY(0) scale(1);

            }

        }


        @media (max-width: 600px) {

            .primeiro-acesso-modal {

                padding: 15px;

            }


            .primeiro-acesso-top {

                padding: 24px 22px 20px;

            }


            .primeiro-acesso-form {

                padding: 21px 22px 24px;

            }


            .primeiro-acesso-top h2 {

                font-size: 22px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================
   MOSTRAR / OCULTAR SENHA
========================================= */

function configurarMostrarSenha() {

    const toggle =
        document.getElementById(
            "togglePassword"
        );


    if (!toggle || !inputSenha) {
        return;
    }


    toggle.addEventListener(
        "click",
        () => {

            const mostrando =
                inputSenha.type ===
                "text";


            inputSenha.type =
                mostrando
                    ? "password"
                    : "text";


            toggle.setAttribute(
                "aria-label",
                mostrando
                    ? "Mostrar senha"
                    : "Ocultar senha"
            );

        }
    );

}


/* =========================================
   BOTÃO LOGIN
========================================= */

function alterarEstadoBotao(
    carregando
) {

    if (!loginButton) {
        return;
    }


    loginButton.disabled =
        carregando;


    const span =
        loginButton.querySelector(
            "span"
        );


    if (span) {

        span.textContent =
            carregando
                ? "Entrando..."
                : "Entrar no MEP EAD";

    }

}


/* =========================================
   TOAST
========================================= */

function mostrarMensagem(
    texto,
    tipo
) {

    const anterior =
        document.querySelector(
            ".mep-toast"
        );


    if (anterior) {

        anterior.remove();

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "mep-toast " +
        tipo;


    toast.innerHTML =
        '<span class="toast-icon">' +
        (
            tipo === "success"
                ? "✓"
                : "!"
        ) +
        "</span>" +

        '<span class="toast-text">' +
        escaparHTML(texto) +
        "</span>";


    document.body.appendChild(
        toast
    );


    setTimeout(
        function () {

            toast.classList.add(
                "show"
            );

        },
        10
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                function () {

                    toast.remove();

                },
                300
            );

        },
        3000
    );

}


/* =========================================
   TRADUZIR ERRO DE LOGIN
========================================= */

function traduzirErroLogin(
    erro
) {

    const mensagem =
        String(
            erro?.message || ""
        ).toLowerCase();


    if (
        mensagem.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "E-mail, matrícula ou senha incorretos."
        );

    }


    if (
        mensagem.includes(
            "email not confirmed"
        )
    ) {

        return (
            "Este e-mail ainda não foi confirmado."
        );

    }


    if (
        mensagem.includes(
            "too many requests"
        )
    ) {

        return (
            "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        );

    }


    return (
        "E-mail ou senha incorretos."
    );

}


/* =========================================
   TRADUZIR ERRO DE SENHA
========================================= */

function traduzirErroSenha(
    erro
) {

    const mensagem =
        String(
            erro?.message || ""
        ).toLowerCase();


    if (
        mensagem.includes(
            "password should be at least"
        )
    ) {

        return (
            "A senha precisa ter pelo menos 6 caracteres."
        );

    }


    if (
        mensagem.includes(
            "same password"
        )
    ) {

        return (
            "A nova senha precisa ser diferente da senha atual."
        );

    }


    if (
        mensagem.includes(
            "weak password"
        )
    ) {

        return (
            "Escolha uma senha mais segura."
        );

    }


    return (
        erro?.message ||
        "Não foi possível alterar sua senha."
    );

}


/* =========================================
   ESCAPAR HTML
========================================= */

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
    )
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


/* =========================================
   DEBUG
========================================= */

console.log(
    "%cMEP EAD",
    "color:#ff2020;font-size:24px;font-weight:900;"
);

console.log(
    "%cSupabase Auth ativo",
    "color:#4ade80;font-size:13px;"
);

console.log(
    "%cPrimeiro acesso: ATIVO",
    "color:#60a5fa;font-size:13px;"
);

console.log(
    "%cRecuperação de senha: ATIVA",
    "color:#facc15;font-size:13px;"
);
