/* =========================================
   MEP EAD
   GESTÃO | ALUNOS
========================================= */


/* =========================================
   VARIÁVEIS
========================================= */

let alunos = [];

let alunosFiltrados = [];

let alunoEmEdicao = null;


/* =========================================
   ELEMENTOS
========================================= */

const novoAlunoButton =
    document.getElementById("novoAlunoButton");

const novoAlunoEmptyButton =
    document.getElementById("novoAlunoEmptyButton");

const alunoModal =
    document.getElementById("alunoModal");

const fecharAlunoModal =
    document.getElementById("fecharAlunoModal");

const cancelarAluno =
    document.getElementById("cancelarAluno");

const alunoForm =
    document.getElementById("alunoForm");

const alunoFormMessage =
    document.getElementById("alunoFormMessage");

const salvarAlunoButton =
    document.getElementById("salvarAlunoButton");

const buscarAluno =
    document.getElementById("buscarAluno");

const filtroAlunos =
    document.getElementById("filtroAlunos");

const listaAlunos =
    document.getElementById("listaAlunos");

const alunosLoading =
    document.getElementById("alunosLoading");

const alunosEmpty =
    document.getElementById("alunosEmpty");

const contadorAlunos =
    document.getElementById("contadorAlunos");

const contadorAlunosAtivos =
    document.getElementById("contadorAlunosAtivos");

const contadorAlunosInativos =
    document.getElementById("contadorAlunosInativos");

const contadorPrimeiroAcesso =
    document.getElementById("contadorPrimeiroAcesso");

const alunoNome =
    document.getElementById("alunoNome");

const alunoEmail =
    document.getElementById("alunoEmail");

const alunoSenha =
    document.getElementById("alunoSenha");

const alunoSenhaConfirmacao =
    document.getElementById("alunoSenhaConfirmacao");

const alunoAtivo =
    document.getElementById("alunoAtivo");


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!listaAlunos) {
            return;
        }

        console.log(
            "MEP EAD | Módulo de alunos carregado."
        );

        configurarEventos();

        carregarAlunos();

    }
);


/* =========================================
   EVENTOS
========================================= */

function configurarEventos() {


    /* =====================================
       NOVO ALUNO
    ===================================== */

    if (novoAlunoButton) {

        novoAlunoButton.addEventListener(
            "click",
            () => {

                abrirModalAluno();

            }
        );

    }


    /* =====================================
       NOVO ALUNO - ESTADO VAZIO
    ===================================== */

    if (novoAlunoEmptyButton) {

        novoAlunoEmptyButton.addEventListener(
            "click",
            () => {

                abrirModalAluno();

            }
        );

    }


    /* =====================================
       FECHAR MODAL
    ===================================== */

    if (fecharAlunoModal) {

        fecharAlunoModal.addEventListener(
            "click",
            fecharModalAluno
        );

    }


    if (cancelarAluno) {

        cancelarAluno.addEventListener(
            "click",
            fecharModalAluno
        );

    }


    /* =====================================
       CLIQUE FORA
    ===================================== */

    if (alunoModal) {

        alunoModal.addEventListener(
            "click",
            event => {

                if (
                    event.target === alunoModal
                ) {

                    fecharModalAluno();

                }

            }
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
                alunoModal &&
                !alunoModal.hidden
            ) {

                fecharModalAluno();

            }

        }
    );


    /* =====================================
       FORMULÁRIO
    ===================================== */

    if (alunoForm) {

        alunoForm.addEventListener(
            "submit",
            salvarAluno
        );

    }


    /* =====================================
       BUSCA
    ===================================== */

    if (buscarAluno) {

        buscarAluno.addEventListener(
            "input",
            aplicarFiltros
        );

    }


    /* =====================================
       FILTRO
    ===================================== */

    if (filtroAlunos) {

        filtroAlunos.addEventListener(
            "change",
            aplicarFiltros
        );

    }

}


/* =========================================
   CARREGAR ALUNOS
========================================= */

async function carregarAlunos() {

    mostrarLoading(true);

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("usuarios")
            .select(
                "id, auth_id, nome, email, matricula, perfil, ativo, primeiro_acesso, foto_url, telefone, telefone_secundario"
            )
            .eq(
                "perfil",
                "aluno"
            )
            .order(
                "nome",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Erro ao carregar alunos:",
                error
            );

            mostrarMensagemLista(
                "Não foi possível carregar os alunos."
            );

            return;

        }


        alunos =
            Array.isArray(data)
                ? data
                : [];


        aplicarFiltros();

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao carregar alunos:",
            erro
        );

        mostrarMensagemLista(
            "Ocorreu um erro ao carregar os alunos."
        );

    }

    finally {

        mostrarLoading(false);

    }

}


/* =========================================
   FILTROS
========================================= */

function aplicarFiltros() {

    const termo =
        buscarAluno
            ? buscarAluno.value
                .trim()
                .toLowerCase()
            : "";


    const filtro =
        filtroAlunos
            ? filtroAlunos.value
            : "todos";


    alunosFiltrados =
        alunos.filter(
            aluno => {

                const nome =
                    String(
                        aluno.nome || ""
                    ).toLowerCase();


                const email =
                    String(
                        aluno.email || ""
                    ).toLowerCase();


                const telefones =
                    `${aluno.telefone || ""} ${aluno.telefone_secundario || ""}`
                        .toLowerCase();


                const matricula =
                    String(
                        aluno.matricula ||
                        aluno.numero_matricula ||
                        ""
                    ).toLowerCase();


                const correspondeBusca =
                    !termo ||
                    nome.includes(termo) ||
                    email.includes(termo) ||
                    matricula.includes(termo) ||
                    telefones.includes(termo);


                if (!correspondeBusca) {

                    return false;

                }


                if (
                    filtro === "ativos" &&
                    !aluno.ativo
                ) {

                    return false;

                }


                if (
                    filtro === "inativos" &&
                    aluno.ativo
                ) {

                    return false;

                }


                return true;

            }
        );


    atualizarResumoIndicadoresAlunosGestao();

    renderizarAlunos();

}


/* =========================================
   CONTADOR
========================================= */

function atualizarResumoIndicadoresAlunosGestao() {

    if (contadorAlunos) contadorAlunos.textContent = alunosFiltrados.length;
    if (contadorAlunosAtivos) contadorAlunosAtivos.textContent = alunos.filter(aluno => aluno.ativo === true).length;
    if (contadorAlunosInativos) contadorAlunosInativos.textContent = alunos.filter(aluno => aluno.ativo !== true).length;
    if (contadorPrimeiroAcesso) contadorPrimeiroAcesso.textContent = alunos.filter(aluno => aluno.primeiro_acesso === true).length;

}


/* =========================================
   RENDERIZAR ALUNOS
========================================= */

function renderizarAlunos() {

    if (!listaAlunos) {

        return;

    }


    listaAlunos.innerHTML = "";


    if (
        alunosFiltrados.length === 0
    ) {

        const possuiAlunos =
            alunos.length > 0;


        if (alunosEmpty) {

            alunosEmpty.hidden =
                possuiAlunos;

        }


        if (possuiAlunos) {

            listaAlunos.innerHTML = `

                <div class="alunos-no-results">

                    <div class="empty-icon">
                        🔎
                    </div>

                    <h3>
                        Nenhum aluno encontrado
                    </h3>

                    <p>
                        Tente alterar sua busca
                        ou o filtro selecionado.
                    </p>

                </div>

            `;

        }

        return;

    }


    if (alunosEmpty) {

        alunosEmpty.hidden = true;

    }


    alunosFiltrados.forEach(
        aluno => {

            const card =
                criarLinhaAluno(aluno);

            listaAlunos.appendChild(card);

        }
    );

}


/* =========================================
   CRIAR LINHA
========================================= */

function criarLinhaAluno(aluno) {

    const linha = document.createElement("article");
    linha.className = "aluno-row";
    linha.dataset.id = aluno.id;

    const nome = escaparHTML(aluno.nome || "Aluno sem nome");
    const email = escaparHTML(aluno.email || "E-mail não informado");
    const matricula = obterMatricula(aluno);
    const telefone = escaparHTML(aluno.telefone || aluno.telefone_secundario || "Não informado");
    const ativo = aluno.ativo === true;
    const primeiroAcesso = aluno.primeiro_acesso === true;
    const fotoUrl = /^https:\/\//i.test(String(aluno.foto_url || ""))
        ? escaparHTML(aluno.foto_url)
        : "";
    const avatar = fotoUrl
        ? `<img src="${fotoUrl}" alt="Foto de ${nome}" loading="lazy">`
        : `<span>${obterInicial(aluno.nome)}</span>`;

    linha.innerHTML = `
        <div class="aluno-row-profile">
            <div class="aluno-row-avatar">${avatar}</div>
            <div><span class="aluno-row-label">ALUNO</span><h3>${nome}</h3><small>${email}</small></div>
        </div>
        <div class="aluno-row-matricula"><span>Matrícula institucional</span><strong>${matricula}</strong></div>
        <div class="aluno-row-contact"><span>Telefone</span><strong>${telefone}</strong></div>
        <div class="aluno-row-access"><span>Acesso</span><strong>${primeiroAcesso ? "Primeiro acesso pendente" : "Senha atualizada"}</strong>${primeiroAcesso ? '<em>Requer troca de senha</em>' : '<em>Conta configurada</em>'}</div>
        <div class="aluno-row-status"><span class="aluno-status ${ativo ? "ativo" : "inativo"}">${ativo ? "ATIVO" : "INATIVO"}</span></div>
        <div class="aluno-row-actions">
            <button type="button" class="aluno-action" data-action="status" data-id="${escaparHTML(aluno.id)}">${ativo ? "Desativar" : "Ativar"}</button>
            <button type="button" class="aluno-action primary" data-action="editar" data-id="${escaparHTML(aluno.id)}">Editar aluno</button>
        </div>`;

    linha.querySelector("img")?.addEventListener("error", evento => {
        evento.currentTarget.closest(".aluno-row-avatar").innerHTML = `<span>${obterInicial(aluno.nome)}</span>`;
    });

    linha.querySelectorAll("[data-action]").forEach(botao => {
        botao.addEventListener("click", () => {
            if (botao.dataset.action === "status") alternarStatusAluno(botao.dataset.id);
            if (botao.dataset.action === "editar") editarAluno(botao.dataset.id);
        });
    });

    linha.addEventListener("dblclick", () => editarAluno(String(aluno.id)));

    return linha;
}


/* =========================================
   CARD LEGADO
========================================= */

function criarCardAluno(aluno) {

    const card =
        document.createElement("article");


    card.className =
        "aluno-card";


    const nome =
        escaparHTML(
            aluno.nome ||
            "Aluno sem nome"
        );


    const email =
        escaparHTML(
            aluno.email ||
            "E-mail não informado"
        );


    const inicial =
        obterInicial(
            aluno.nome
        );


    const fotoUrl =
        /^https:\/\//i.test(String(aluno.foto_url || ""))
            ? escaparHTML(aluno.foto_url)
            : "";


    const avatarHTML =
        fotoUrl
            ? `<img src="${fotoUrl}" alt="Foto de ${nome}">`
            : inicial;


    const telefone =
        escaparHTML(
            aluno.telefone ||
            aluno.telefone_secundario ||
            "Não informado"
        );


    const status =
        aluno.ativo
            ? "ATIVO"
            : "INATIVO";


    const statusClasse =
        aluno.ativo
            ? "ativo"
            : "inativo";


    const primeiroAcesso =
        Boolean(
            aluno.primeiro_acesso
        );


    const primeiroAcessoHTML =
        primeiroAcesso
            ? `
                <span
                    class="aluno-primeiro-acesso"
                    title="O aluno ainda precisa trocar a senha temporária."
                >
                    Primeiro acesso
                </span>
            `
            : "";


    card.innerHTML = `

        <div class="aluno-card-header">

            <div class="aluno-avatar">
                ${avatarHTML}
            </div>

            <div class="aluno-card-info">

                <h3>
                    ${nome}
                </h3>

                <span>
                    ${email}
                </span>

            </div>

            <span
                class="aluno-status ${statusClasse}"
            >
                ${status}
            </span>

        </div>


        <div class="aluno-card-body">

            <div class="aluno-info">

                <span>
                    Matrícula
                </span>

                <strong>
                    ${obterMatricula(aluno)}
                </strong>

            </div>


            <div class="aluno-info">

                <span>
                    Perfil
                </span>

                <strong>
                    Aluno
                </strong>

            </div>


            <div class="aluno-info aluno-acesso-info">

                <span>
                    Acesso
                </span>

                <strong>
                    ${
                        primeiroAcesso
                            ? "Troca de senha pendente"
                            : "Senha atualizada"
                    }
                </strong>

            </div>


            <div class="aluno-info aluno-contato-info">

                <span>
                    Contato
                </span>

                <strong>
                    ${telefone}
                </strong>

            </div>

        </div>


        ${primeiroAcessoHTML}


        <div class="aluno-card-footer">

            <button
                type="button"
                class="aluno-action"
                data-action="status"
                data-id="${aluno.id}"
            >
                ${
                    aluno.ativo
                        ? "Desativar"
                        : "Ativar"
                }
            </button>


            <button
                type="button"
                class="aluno-action primary"
                data-action="editar"
                data-id="${aluno.id}"
            >
                Editar
            </button>

        </div>

    `;


    const botoes =
        card.querySelectorAll(
            "[data-action]"
        );


    botoes.forEach(
        botao => {

            botao.addEventListener(
                "click",
                () => {

                    const action =
                        botao.dataset.action;


                    const id =
                        botao.dataset.id;


                    if (
                        action === "status"
                    ) {

                        alternarStatusAluno(
                            id
                        );

                    }


                    if (
                        action === "editar"
                    ) {

                        editarAluno(
                            id
                        );

                    }

                }
            );

        }
    );


    return card;

}


/* =========================================
   ABRIR MODAL
========================================= */

function abrirModalAluno(
    aluno = null
) {

    alunoEmEdicao =
        aluno;


    limparMensagem();


    if (!alunoForm) {

        return;

    }


    alunoForm.reset();


    if (aluno) {

        const titulo =
            document.getElementById(
                "alunoModalTitle"
            );


        if (titulo) {

            titulo.textContent =
                "Editar aluno";

        }


        if (alunoNome) {

            alunoNome.value =
                aluno.nome || "";

        }


        if (alunoEmail) {

            alunoEmail.value =
                aluno.email || "";

        }


        if (alunoAtivo) {

            alunoAtivo.checked =
                Boolean(
                    aluno.ativo
                );

        }


        if (alunoSenha) {

            alunoSenha.required =
                false;

            alunoSenha.value =
                "";

        }


        if (alunoSenhaConfirmacao) {

            alunoSenhaConfirmacao.required =
                false;

            alunoSenhaConfirmacao.value =
                "";

        }


        if (salvarAlunoButton) {

            const texto =
                salvarAlunoButton.querySelector(
                    ".button-normal"
                );


            if (texto) {

                texto.textContent =
                    "Salvar alterações";

            }

        }

    }

    else {

        const titulo =
            document.getElementById(
                "alunoModalTitle"
            );


        if (titulo) {

            titulo.textContent =
                "Novo aluno";

        }


        if (alunoSenha) {

            alunoSenha.required =
                true;

        }


        if (alunoSenhaConfirmacao) {

            alunoSenhaConfirmacao.required =
                true;

        }


        if (alunoAtivo) {

            alunoAtivo.checked =
                true;

        }


        if (salvarAlunoButton) {

            const texto =
                salvarAlunoButton.querySelector(
                    ".button-normal"
                );


            if (texto) {

                texto.textContent =
                    "Criar aluno";

            }

        }

    }


    if (alunoModal) {

        alunoModal.hidden =
            false;


        document.body.classList.add(
            "modal-open"
        );

    }


    setTimeout(
        () => {

            if (alunoNome) {

                alunoNome.focus();

            }

        },
        100
    );

}


/* =========================================
   FECHAR MODAL
========================================= */

function fecharModalAluno() {

    if (!alunoModal) {

        return;

    }


    alunoModal.hidden =
        true;


    document.body.classList.remove(
        "modal-open"
    );


    alunoEmEdicao =
        null;


    if (alunoForm) {

        alunoForm.reset();

    }


    limparMensagem();


    const titulo =
        document.getElementById(
            "alunoModalTitle"
        );


    if (titulo) {

        titulo.textContent =
            "Novo aluno";

    }


    if (alunoSenha) {

        alunoSenha.required =
            true;

    }


    if (alunoSenhaConfirmacao) {

        alunoSenhaConfirmacao.required =
            true;

    }


    if (salvarAlunoButton) {

        const texto =
            salvarAlunoButton.querySelector(
                ".button-normal"
            );


        if (texto) {

            texto.textContent =
                "Criar aluno";

        }

    }

}


/* =========================================
   SALVAR ALUNO
========================================= */

async function salvarAluno(event) {

    event.preventDefault();


    limparMensagem();


    const nome =
        alunoNome
            ? alunoNome.value.trim()
            : "";


    const email =
        alunoEmail
            ? alunoEmail.value.trim().toLowerCase()
            : "";


    const senha =
        alunoSenha
            ? alunoSenha.value
            : "";


    const confirmacao =
        alunoSenhaConfirmacao
            ? alunoSenhaConfirmacao.value
            : "";


    const ativo =
        alunoAtivo
            ? alunoAtivo.checked
            : true;


    if (!nome) {

        mostrarMensagem(
            "Informe o nome completo do aluno.",
            "error"
        );


        alunoNome?.focus();


        return;

    }


    if (!email) {

        mostrarMensagem(
            "Informe o e-mail do aluno.",
            "error"
        );


        alunoEmail?.focus();


        return;

    }


    if (!emailValido(email)) {

        mostrarMensagem(
            "Informe um e-mail válido.",
            "error"
        );


        alunoEmail?.focus();


        return;

    }


    /* =====================================
       EDIÇÃO
    ===================================== */

    if (alunoEmEdicao) {

        await atualizarAluno(
            alunoEmEdicao,
            {
                nome,
                email,
                ativo
            }
        );


        return;

    }


    /* =====================================
       SENHA TEMPORÁRIA
    ===================================== */

    if (!senha) {

        mostrarMensagem(
            "Informe uma senha temporária.",
            "error"
        );


        alunoSenha?.focus();


        return;

    }


    if (senha.length < 6) {

        mostrarMensagem(
            "A senha precisa ter pelo menos 6 caracteres.",
            "error"
        );


        alunoSenha?.focus();


        return;

    }


    if (senha !== confirmacao) {

        mostrarMensagem(
            "As senhas não coincidem.",
            "error"
        );


        alunoSenhaConfirmacao?.focus();


        return;

    }


    await criarAluno(
        nome,
        email,
        senha,
        ativo
    );

}


/* =========================================
   CRIAR ALUNO
========================================= */

async function criarAluno(
    nome,
    email,
    senha,
    ativo
) {

    alterarEstadoBotao(true);


    try {

        /* =================================
           CONFIRMAR SESSÃO DO GESTOR
        ================================= */

        const {
            data: sessaoData,
            error: sessaoErro
        } =
            await supabaseClient
                .auth
                .getSession();


        if (
            sessaoErro ||
            !sessaoData?.session
        ) {

            mostrarMensagem(
                "Sua sessão expirou. Faça login novamente.",
                "error"
            );


            return;

        }


        console.log(
            "Criando aluno:",
            {
                nome,
                email,
                ativo
            }
        );


        /* =================================
           CHAMAR EDGE FUNCTION
        ================================= */

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "criar-aluno",
                {
                    body: {

                        nome:
                            nome,

                        email:
                            email,

                        senha:
                            senha,

                        ativo:
                            ativo

                    }
                }
            );


        /* =================================
           ERRO DA EDGE FUNCTION
        ================================= */

        if (error) {

            console.error(
                "Erro na função criar-aluno:",
                error
            );


            const mensagem =
                await obterMensagemErroFunction(
                    error
                );


            mostrarMensagem(
                mensagem,
                "error"
            );


            return;

        }


        /* =================================
           DEBUG DA RESPOSTA
        ================================= */

        console.log(
            "Resposta da função criar-aluno:",
            data
        );


        /* =================================
           VALIDAR RESPOSTA
           
           A Edge Function retorna:

           {
               sucesso: true,
               mensagem: "...",
               usuario: {...}
           }

           Antes o JS procurava:
           
           data.success

           Isso fazia o sistema interpretar
           um cadastro bem-sucedido como erro.
        ================================= */

        if (
            !data ||
            data.sucesso !== true
        ) {

            console.error(
                "Resposta inesperada da função:",
                data
            );


            mostrarMensagem(
                data?.mensagem ||
                data?.message ||
                data?.erro ||
                data?.error ||
                "Não foi possível criar o aluno.",
                "error"
            );


            return;

        }


        /* =================================
           SUCESSO REAL
        ================================= */

        console.log(
            "Aluno criado com sucesso:",
            data.usuario
        );


        mostrarMensagem(
            data.mensagem ||
            "Aluno cadastrado com sucesso!",
            "success"
        );


        /* =================================
           ATUALIZAR LISTA
        ================================= */

        await carregarAlunos();


        /* =================================
           FECHAR MODAL
        ================================= */

        setTimeout(
            () => {

                fecharModalAluno();

            },
            900
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao criar aluno:",
            erro
        );


        mostrarMensagem(
            traduzirErroAuth(
                erro
            ),
            "error"
        );

    }

    finally {

        alterarEstadoBotao(false);

    }

}


/* =========================================
   OBTER MENSAGEM DE ERRO DA FUNCTION
========================================= */

async function obterMensagemErroFunction(
    erro
) {

    try {

        if (
            erro?.context &&
            typeof erro.context.json === "function"
        ) {

            const resposta =
                await erro.context.json();


            console.error(
                "Resposta de erro da Edge Function:",
                resposta
            );


            return traduzirErroAuth(
                {
                    message:
                        resposta?.erro ||
                        resposta?.error ||
                        resposta?.mensagem ||
                        resposta?.message ||
                        erro?.message
                }
            );

        }

    }

    catch (jsonErro) {

        console.warn(
            "Não foi possível interpretar o erro da função:",
            jsonErro
        );

    }


    return traduzirErroAuth(
        erro
    );

}


/* =========================================
   ATUALIZAR ALUNO
========================================= */

async function atualizarAluno(
    aluno,
    dados
) {

    alterarEstadoBotao(true);


    try {

        const {
            error
        } =
            await supabaseClient
                .from("usuarios")
                .update({

                    nome:
                        dados.nome,

                    email:
                        dados.email,

                    ativo:
                        dados.ativo

                })
                .eq(
                    "id",
                    aluno.id
                );


        if (error) {

            console.error(
                "Erro ao atualizar aluno:",
                error
            );


            mostrarMensagem(
                "Não foi possível atualizar o aluno.",
                "error"
            );


            return;

        }


        mostrarMensagem(
            "Aluno atualizado com sucesso!",
            "success"
        );


        await carregarAlunos();


        setTimeout(
            () => {

                fecharModalAluno();

            },
            700
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao atualizar aluno:",
            erro
        );


        mostrarMensagem(
            "Ocorreu um erro ao atualizar o aluno.",
            "error"
        );

    }

    finally {

        alterarEstadoBotao(false);

    }

}


/* =========================================
   EDITAR ALUNO
========================================= */

function editarAluno(id) {

    const aluno =
        alunos.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!aluno) {

        console.warn(
            "Aluno não encontrado:",
            id
        );


        return;

    }


    abrirModalAluno(
        aluno
    );

}


/* =========================================
   ALTERAR STATUS
========================================= */

async function alternarStatusAluno(
    id
) {

    const aluno =
        alunos.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!aluno) {

        return;

    }


    const novoStatus =
        !Boolean(
            aluno.ativo
        );


    const acao =
        novoStatus
            ? "ativar"
            : "desativar";


    const confirmar =
        confirm(
            `Deseja realmente ${acao} o aluno "${aluno.nome}"?`
        );


    if (!confirmar) {

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("usuarios")
                .update({

                    ativo:
                        novoStatus

                })
                .eq(
                    "id",
                    aluno.id
                );


        if (error) {

            console.error(
                "Erro ao alterar status:",
                error
            );


            alert(
                "Não foi possível alterar o status do aluno."
            );


            return;

        }


        await carregarAlunos();

    }

    catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );


        alert(
            "Ocorreu um erro ao alterar o status."
        );

    }

}


/* =========================================
   LOADING
========================================= */

function mostrarLoading(
    mostrar
) {

    if (alunosLoading) {

        alunosLoading.hidden =
            !mostrar;

    }


    if (
        mostrar &&
        listaAlunos
    ) {

        listaAlunos.innerHTML = "";


        if (alunosLoading) {

            listaAlunos.appendChild(
                alunosLoading
            );

        }

    }

}


/* =========================================
   MENSAGEM DA LISTA
========================================= */

function mostrarMensagemLista(
    mensagem
) {

    if (!listaAlunos) {

        return;

    }


    listaAlunos.innerHTML = `

        <div class="alunos-no-results">

            <div class="empty-icon">
                ⚠
            </div>

            <h3>
                Não foi possível carregar
            </h3>

            <p>
                ${escaparHTML(mensagem)}
            </p>

        </div>

    `;

}


/* =========================================
   MENSAGEM DO FORMULÁRIO
========================================= */

function mostrarMensagem(
    mensagem,
    tipo = "error"
) {

    if (!alunoFormMessage) {

        return;

    }


    alunoFormMessage.hidden =
        false;


    alunoFormMessage.textContent =
        mensagem;


    alunoFormMessage.className =
        "form-message";


    alunoFormMessage.classList.add(
        tipo
    );

}


function limparMensagem() {

    if (!alunoFormMessage) {

        return;

    }


    alunoFormMessage.hidden =
        true;


    alunoFormMessage.textContent =
        "";


    alunoFormMessage.className =
        "form-message";

}


/* =========================================
   ESTADO DO BOTÃO
========================================= */

function alterarEstadoBotao(
    carregando
) {

    if (!salvarAlunoButton) {

        return;

    }


    salvarAlunoButton.disabled =
        carregando;


    salvarAlunoButton.classList.toggle(
        "loading",
        carregando
    );


    const normal =
        salvarAlunoButton.querySelector(
            ".button-normal"
        );


    const loading =
        salvarAlunoButton.querySelector(
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


/* =========================================
   UTILITÁRIOS
========================================= */

function obterInicial(
    nome
) {

    if (!nome) {

        return "A";

    }


    return nome
        .trim()
        .charAt(0)
        .toUpperCase();

}


/* =========================================
   MATRÍCULA
========================================= */

function obterMatricula(
    aluno
) {

    if (
        aluno.matricula &&
        String(
            aluno.matricula
        ).trim()
    ) {

        return escaparHTML(
            aluno.matricula
        );

    }


    if (
        aluno.numero_matricula &&
        String(
            aluno.numero_matricula
        ).trim()
    ) {

        return escaparHTML(
            aluno.numero_matricula
        );

    }


    return "—";

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
   TRADUZIR ERROS
========================================= */

function traduzirErroAuth(
    erro
) {

    const mensagem =
        String(
            erro?.message || ""
        ).toLowerCase();


    /* =====================================
       E-MAIL JÁ EXISTENTE
    ===================================== */

    if (
        mensagem.includes(
            "user already registered"
        ) ||
        mensagem.includes(
            "already registered"
        ) ||
        mensagem.includes(
            "already exists"
        ) ||
        mensagem.includes(
            "duplicate key"
        ) ||
        mensagem.includes(
            "unique constraint"
        )
    ) {

        return (
            "Já existe uma conta cadastrada com este e-mail."
        );

    }


    /* =====================================
       E-MAIL INVÁLIDO
    ===================================== */

    if (
        mensagem.includes(
            "invalid email"
        ) ||
        (
            mensagem.includes(
                "email address"
            ) &&
            mensagem.includes(
                "invalid"
            )
        )
    ) {

        return (
            "O e-mail informado é inválido."
        );

    }


    /* =====================================
       SENHA
    ===================================== */

    if (
        mensagem.includes(
            "password should be at least"
        ) ||
        mensagem.includes(
            "password must be at least"
        )
    ) {

        return (
            "A senha precisa ter pelo menos 6 caracteres."
        );

    }


    /* =====================================
       RATE LIMIT
    ===================================== */

    if (
        mensagem.includes(
            "email rate limit"
        ) ||
        mensagem.includes(
            "rate limit"
        )
    ) {

        return (
            "Muitas tentativas foram realizadas. Aguarde alguns minutos antes de tentar novamente."
        );

    }


    /* =====================================
       NÃO AUTORIZADO
    ===================================== */

    if (
        mensagem.includes(
            "unauthorized"
        ) ||
        mensagem.includes(
            "not authorized"
        ) ||
        mensagem.includes(
            "jwt"
        )
    ) {

        return (
            "Sua sessão não está autorizada. Faça login novamente."
        );

    }


    /* =====================================
       PERMISSÃO
    ===================================== */

    if (
        mensagem.includes(
            "permission denied"
        ) ||
        mensagem.includes(
            "row-level security"
        ) ||
        mensagem.includes(
            "rls"
        )
    ) {

        return (
            "Você não possui permissão para realizar esta ação."
        );

    }


    /* =====================================
       FALLBACK
    ===================================== */

    return (
        erro?.message ||
        "Não foi possível criar a conta do aluno."
    );

}


/* =========================================
   DEBUG
========================================= */

console.log(
    "%cMEP EAD | ALUNOS",
    "color:#ff2020;font-size:18px;font-weight:900;"
);
