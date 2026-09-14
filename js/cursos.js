/* =========================================
   MEP EAD
   CURSOS
   Ministério de Ensino no Propósito
========================================= */


/* =========================================
   ELEMENTOS
========================================= */

const cursoModal =
    document.getElementById("cursoModal");

const novoCursoButton =
    document.getElementById("novoCursoButton");

const novoCursoEmptyButton =
    document.getElementById("novoCursoEmptyButton");

const fecharCursoModal =
    document.getElementById("fecharCursoModal");

const cancelarCurso =
    document.getElementById("cancelarCurso");

const cursoForm =
    document.getElementById("cursoForm");

const cursoNome =
    document.getElementById("cursoNome");

const cursoDescricao =
    document.getElementById("cursoDescricao");

const cursoImagem =
    document.getElementById("cursoImagem");

const cursoAtivo =
    document.getElementById("cursoAtivo");

const cursoPreview =
    document.getElementById("cursoPreview");

const cursoPreviewImagem =
    document.getElementById("cursoPreviewImagem");

const cursoPreviewNome =
    document.getElementById("cursoPreviewNome");

const cursoPreviewDescricao =
    document.getElementById("cursoPreviewDescricao");

const listaCursos =
    document.getElementById("listaCursos");

const cursosLoading =
    document.getElementById("cursosLoading");

const cursosEmpty =
    document.getElementById("cursosEmpty");

const buscarCurso =
    document.getElementById("buscarCurso");

const filtroCursos =
    document.getElementById("filtroCursos");

const contadorCursos =
    document.getElementById("contadorCursos");

const contadorCursosAtivos =
    document.getElementById("contadorCursosAtivos");

const contadorCursosInativos =
    document.getElementById("contadorCursosInativos");

const contadorMatriculasCursos =
    document.getElementById("contadorMatriculasCursos");

const salvarCursoButton =
    document.getElementById("salvarCursoButton");


/* =========================================
   ESTADO
========================================= */

let cursos = [];

let cursoEditandoId = null;

/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "%cMEP EAD | CURSOS",
            "color:#ff2020;font-size:18px;font-weight:900;"
        );

        configurarEventosCursos();

        await carregarCursos();

    }
);


/* =========================================
   EVENTOS
========================================= */

function configurarEventosCursos() {

    /* =====================================
       NOVO CURSO
    ===================================== */

    if (novoCursoButton) {

        novoCursoButton.addEventListener(
            "click",
            () => {

                cursoEditandoId = null;

                abrirModalCurso();

            }
        );

    }


    /* =====================================
       PRIMEIRO CURSO
    ===================================== */

    if (novoCursoEmptyButton) {

        novoCursoEmptyButton.addEventListener(
            "click",
            () => {

                cursoEditandoId = null;

                abrirModalCurso();

            }
        );

    }


    /* =====================================
       FECHAR MODAL
    ===================================== */

    if (fecharCursoModal) {

        fecharCursoModal.addEventListener(
            "click",
            fecharModalCurso
        );

    }


    if (cancelarCurso) {

        cancelarCurso.addEventListener(
            "click",
            fecharModalCurso
        );

    }


    /* =====================================
       CLICAR FORA
    ===================================== */

    if (cursoModal) {

        cursoModal.addEventListener(
            "click",
            event => {

                if (
                    event.target === cursoModal
                ) {

                    fecharModalCurso();

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
                cursoModal &&
                !cursoModal.hidden
            ) {

                fecharModalCurso();

            }

        }
    );


    /* =====================================
       FORMULÁRIO
    ===================================== */

    if (cursoForm) {

        cursoForm.addEventListener(
            "submit",
            salvarCurso
        );

    }


    /* =====================================
       PREVIEW
    ===================================== */

    if (cursoNome) {

        cursoNome.addEventListener(
            "input",
            atualizarPreview
        );

    }


    if (cursoDescricao) {

        cursoDescricao.addEventListener(
            "input",
            atualizarPreview
        );

    }


    if (cursoImagem) {

        cursoImagem.addEventListener(
            "input",
            atualizarPreview
        );

    }


    /* =====================================
       BUSCA
    ===================================== */

    if (buscarCurso) {

        buscarCurso.addEventListener(
            "input",
            renderizarCursosFiltrados
        );

    }


    /* =====================================
       FILTRO
    ===================================== */

    if (filtroCursos) {

        filtroCursos.addEventListener(
            "change",
            renderizarCursosFiltrados
        );

    }


    /* =====================================
       AÇÕES DOS CARDS
    ===================================== */

    if (listaCursos) {

        listaCursos.addEventListener(
            "click",
            tratarAcaoCurso
        );

    }

}


/* =========================================
   ABRIR MODAL
========================================= */

function abrirModalCurso(curso = null) {

    if (!cursoModal) {

        console.error(
            "MEP EAD | Modal de curso não encontrado."
        );

        return;

    }


    limparFormularioCurso();


    if (curso) {

        cursoEditandoId =
            curso.id;

        preencherFormularioCurso(
            curso
        );

    }

    else {

        cursoEditandoId =
            null;

    }


    atualizarTituloModal();


    cursoModal.hidden =
        false;


    cursoModal.classList.add(
        "active"
    );


    document.body.classList.add(
        "modal-open"
    );


    setTimeout(
        () => {

            if (cursoNome) {

                cursoNome.focus();

            }

        },
        100
    );

}


/* =========================================
   FECHAR MODAL
========================================= */

function fecharModalCurso() {

    if (!cursoModal) {
        return;
    }


    cursoModal.classList.remove(
        "active"
    );


    document.body.classList.remove(
        "modal-open"
    );


    setTimeout(
        () => {

            cursoModal.hidden =
                true;

        },
        200
    );


    cursoEditandoId =
        null;


    limparFormularioCurso();

    atualizarTituloModal();

}


/* =========================================
   TÍTULO DO MODAL
========================================= */

function atualizarTituloModal() {

    const titulo =
        document.getElementById(
            "cursoModalTitle"
        );


    if (titulo) {

        titulo.textContent =
            cursoEditandoId
                ? "Editar curso"
                : "Novo curso";

    }


    const botao =
        document.getElementById(
            "salvarCursoButton"
        );


    if (!botao) {
        return;
    }


    const textoNormal =
        botao.querySelector(
            ".button-normal"
        );


    if (textoNormal) {

        textoNormal.textContent =
            cursoEditandoId
                ? "Salvar alterações"
                : "Criar curso";

    }

}


/* =========================================
   LIMPAR FORMULÁRIO
========================================= */

function limparFormularioCurso() {

    if (cursoForm) {

        cursoForm.reset();

    }


    if (cursoAtivo) {

        cursoAtivo.checked =
            true;

    }


    if (cursoPreview) {

        cursoPreview.hidden =
            true;

    }


    if (cursoPreviewImagem) {

        cursoPreviewImagem.src =
            "";

    }


    if (cursoPreviewNome) {

        cursoPreviewNome.textContent =
            "Nome do curso";

    }


    if (cursoPreviewDescricao) {

        cursoPreviewDescricao.textContent =
            "Descrição do curso";

    }


    const mensagem =
        document.getElementById(
            "cursoFormMessage"
        );


    if (mensagem) {

        mensagem.hidden =
            true;

        mensagem.textContent =
            "";

        mensagem.className =
            "form-message";

    }

}


/* =========================================
   PREENCHER FORMULÁRIO
========================================= */

function preencherFormularioCurso(curso) {

    if (cursoNome) {

        cursoNome.value =
            curso.nome || "";

    }


    if (cursoDescricao) {

        cursoDescricao.value =
            curso.descricao || "";

    }


    if (cursoImagem) {

        cursoImagem.value =
            curso.imagem_url || "";

    }


    if (cursoAtivo) {

        cursoAtivo.checked =
            curso.ativo !== false;

    }


    atualizarPreview();

}


/* =========================================
   PREVIEW
========================================= */

function atualizarPreview() {

    if (!cursoPreview) {
        return;
    }


    const nome =
        cursoNome?.value.trim() ||
        "Nome do curso";


    const descricao =
        cursoDescricao?.value.trim() ||
        "Descrição do curso";


    const imagem =
        cursoImagem?.value.trim() ||
        "";


    if (cursoPreviewNome) {

        cursoPreviewNome.textContent =
            nome;

    }


    if (cursoPreviewDescricao) {

        cursoPreviewDescricao.textContent =
            descricao;

    }


    if (
        imagem &&
        cursoPreviewImagem
    ) {

        cursoPreviewImagem.src =
            imagem;


        cursoPreviewImagem.onload =
            () => {

                cursoPreview.hidden =
                    false;

            };


        cursoPreviewImagem.onerror =
            () => {

                cursoPreviewImagem.src =
                    "";

                cursoPreview.hidden =
                    true;

            };

    }

    else {

        cursoPreview.hidden =
            true;

    }

}


/* =========================================
   CARREGAR CURSOS
========================================= */

async function carregarCursos() {

    mostrarLoading();


    try {

        if (
            typeof supabaseClient ===
            "undefined" ||
            !supabaseClient
        ) {

            throw new Error(
                "Supabase não foi inicializado."
            );

        }


        const {
            data,
            error
        } =
            await supabaseClient

                .from("cursos")

                .select(`
                    id,
                    nome,
                    descricao,
                    imagem_url,
                    ativo,
                    criado_por,
                    created_at,
                    updated_at,
                    mensalidade_ativa,
                    mensalidade_valor,
                    mensalidade_bloqueio_modo,
                    mensalidade_carencia_dias
                `)

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "MEP EAD | Erro ao carregar cursos:",
                error
            );


            mostrarErro(
                obterMensagemErro(error)
            );


            return;

        }


        cursos =
            Array.isArray(data)
                ? data
                : [];


        await carregarResumoDosCursos();


        console.log(
            "MEP EAD | Cursos carregados:",
            cursos
        );


        atualizarContador();

        renderizarCursosFiltrados();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado:",
            erro
        );


        mostrarErro(
            erro?.message ||
            "Ocorreu um erro ao carregar os cursos."
        );

    }

}


/* =========================================
   RESUMO OPERACIONAL DOS CURSOS
========================================= */

async function carregarResumoDosCursos() {

    cursos.forEach(curso => {
        curso.resumo = { turmas: 0, alunos: 0, professores: 0 };
    });

    if (!cursos.length) return;

    try {
        const idsCursos = cursos.map(curso => curso.id);
        const { data: turmasData, error: turmasErro } = await supabaseClient
            .from("turmas")
            .select("id, curso_id, ativa")
            .in("curso_id", idsCursos);
        if (turmasErro) throw turmasErro;

        const turmasResumo = turmasData || [];
        const idsTurmas = turmasResumo.map(turma => turma.id);
        let matriculasData = [];
        let professoresData = [];

        if (idsTurmas.length) {
            const [matriculasResposta, professoresResposta] = await Promise.all([
                supabaseClient.from("turma_alunos").select("turma_id, aluno_id, ativo").in("turma_id", idsTurmas).eq("ativo", true),
                supabaseClient.from("turma_professores").select("turma_id, professor_id").in("turma_id", idsTurmas)
            ]);
            if (matriculasResposta.error) throw matriculasResposta.error;
            if (professoresResposta.error) throw professoresResposta.error;
            matriculasData = matriculasResposta.data || [];
            professoresData = professoresResposta.data || [];
        }

        const cursoPorTurma = new Map(turmasResumo.map(turma => [String(turma.id), String(turma.curso_id)]));
        cursos.forEach(curso => {
            const cursoId = String(curso.id);
            const turmasCurso = turmasResumo.filter(turma => String(turma.curso_id) === cursoId);
            const alunos = new Set(matriculasData.filter(item => cursoPorTurma.get(String(item.turma_id)) === cursoId).map(item => item.aluno_id));
            const professores = new Set(professoresData.filter(item => cursoPorTurma.get(String(item.turma_id)) === cursoId).map(item => item.professor_id));
            curso.resumo = { turmas: turmasCurso.length, alunos: alunos.size, professores: professores.size };
        });
    } catch (erro) {
        console.warn("MEP EAD | Não foi possível carregar o resumo dos cursos:", erro);
    }
}


/* =========================================
   FILTRAR CURSOS
========================================= */

function renderizarCursosFiltrados() {

    if (!listaCursos) {
        return;
    }


    const busca =
        buscarCurso?.value
            ?.trim()
            ?.toLowerCase() ||
        "";


    const filtro =
        filtroCursos?.value ||
        "todos";


    let lista =
        [...cursos];


    /* =====================================
       BUSCA
    ===================================== */

    if (busca) {

        lista =
            lista.filter(
                curso => {

                    const nome =
                        String(
                            curso.nome || ""
                        ).toLowerCase();


                    const descricao =
                        String(
                            curso.descricao || ""
                        ).toLowerCase();


                    return (
                        nome.includes(busca) ||
                        descricao.includes(busca)
                    );

                }
            );

    }


    /* =====================================
       ATIVOS
    ===================================== */

    if (
        filtro ===
        "ativos"
    ) {

        lista =
            lista.filter(
                curso =>
                    curso.ativo === true
            );

    }


    /* =====================================
       INATIVOS
    ===================================== */

    if (
        filtro ===
        "inativos"
    ) {

        lista =
            lista.filter(
                curso =>
                    curso.ativo === false
            );

    }


    renderizarCursos(
        lista
    );

}


/* =========================================
   RENDERIZAR CURSOS
========================================= */

function renderizarCursos(lista) {

    esconderEstados();


    if (!listaCursos) {
        return;
    }


    listaCursos.innerHTML =
        "";


    if (!lista.length) {

        mostrarVazio();

        return;

    }


    lista.forEach(
        curso => {

            const card =
                criarLinhaCurso(
                    curso
                );


            listaCursos.appendChild(
                card
            );

        }
    );

}


/* =========================================
   CRIAR CARD
========================================= */

function criarLinhaCurso(curso) {
    const card = document.createElement("article");
    card.className = "curso-card curso-row";
    card.dataset.id = curso.id;

    const nome = escaparHTML(curso.nome || "Curso sem nome");
    const descricao = escaparHTML(curso.descricao || "Nenhuma descrição cadastrada.");
    const imagem = curso.imagem_url ? escaparHTML(curso.imagem_url) : "";
    const ativo = curso.ativo === true;
    const resumo = curso.resumo || { turmas: 0, alunos: 0, professores: 0 };
    const capa = imagem
        ? `<div class="curso-card-cover"><img src="${imagem}" alt="Capa do curso ${nome}" class="curso-card-image" loading="lazy"><div class="curso-card-overlay"></div></div>`
        : `<div class="curso-card-cover curso-sem-capa"><div class="curso-sem-imagem"><span>MEP</span></div><div class="curso-card-overlay"></div></div>`;

    card.innerHTML = `
        ${capa}
        <div class="curso-card-content">
            <div class="curso-card-main">
                <span class="curso-card-label">CURSO · CADASTRADO EM ${formatarData(curso.created_at)}</span>
                <h3 class="curso-card-title">${nome}</h3>
                <p class="curso-card-description">${descricao}</p>
            </div>
            <div class="curso-row-structure" aria-label="Estrutura do curso">
                <span><strong>${resumo.turmas}</strong><small>${resumo.turmas === 1 ? "turma" : "turmas"}</small></span>
                <span><strong>${resumo.alunos}</strong><small>${resumo.alunos === 1 ? "aluno" : "alunos"}</small></span>
                <span><strong>${resumo.professores}</strong><small>${resumo.professores === 1 ? "professor" : "professores"}</small></span>
            </div>
            <div class="curso-row-status"><span class="curso-status ${ativo ? "ativo" : "inativo"}"><span class="status-dot"></span>${ativo ? "Ativo" : "Inativo"}</span></div>
            <div class="curso-card-actions">
                <button type="button" class="curso-action curso-editar" data-action="editar" data-id="${curso.id}" title="Editar curso"><span class="action-icon">✎</span><span>Editar</span></button>
                <button type="button" class="curso-action curso-status-button" data-action="status" data-id="${curso.id}" title="${ativo ? "Desativar curso" : "Ativar curso"}"><span class="action-icon">${ativo ? "−" : "+"}</span><span>${ativo ? "Desativar" : "Ativar"}</span></button>
                <button type="button" class="curso-action curso-excluir" data-action="excluir" data-id="${curso.id}" title="Excluir curso" aria-label="Excluir ${nome}"><span class="action-icon">×</span></button>
            </div>
        </div>`;

    const imagemElement = card.querySelector(".curso-card-image");
    imagemElement?.addEventListener("error", () => {
        const cover = imagemElement.closest(".curso-card-cover");
        if (!cover) return;
        imagemElement.remove();
        cover.classList.add("curso-sem-capa");
        const fallback = document.createElement("div");
        fallback.className = "curso-sem-imagem";
        fallback.innerHTML = "<span>MEP</span>";
        cover.prepend(fallback);
    }, { once: true });

    return card;
}

function criarCardCurso(curso) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "curso-card";


    card.dataset.id =
        curso.id;


    const nome =
        escaparHTML(
            curso.nome ||
            "Curso sem nome"
        );


    const descricao =
        curso.descricao
            ? escaparHTML(
                curso.descricao
            )
            : "Nenhuma descrição cadastrada.";


    const imagem =
        curso.imagem_url
            ? escaparHTML(
                curso.imagem_url
            )
            : "";


    const ativo =
        curso.ativo === true;


    const status =
        ativo
            ? "Ativo"
            : "Inativo";


    const classeStatus =
        ativo
            ? "ativo"
            : "inativo";


    let capa;


    /* =====================================
       CAPA COM IMAGEM
    ===================================== */

    if (imagem) {

        capa = `

            <div class="curso-card-cover">

                <img
                    src="${imagem}"
                    alt="Capa do curso ${nome}"
                    class="curso-card-image"
                    loading="lazy"
                >

                <div class="curso-card-overlay"></div>

                <span
                    class="curso-status ${classeStatus}"
                >

                    <span class="status-dot"></span>

                    ${status}

                </span>

            </div>

        `;

    }


    /* =====================================
       SEM IMAGEM
    ===================================== */

    else {

        capa = `

            <div
                class="
                    curso-card-cover
                    curso-sem-capa
                "
            >

                <div class="curso-sem-imagem">

                    <span>
                        📚
                    </span>

                </div>

                <div class="curso-card-overlay"></div>

                <span
                    class="curso-status ${classeStatus}"
                >

                    <span class="status-dot"></span>

                    ${status}

                </span>

            </div>

        `;

    }


    /* =====================================
       CARD
    ===================================== */

    card.innerHTML = `

        ${capa}


        <div class="curso-card-content">

            <div class="curso-card-main">

                <span class="curso-card-label">
                    CURSO
                </span>


                <h3 class="curso-card-title">
                    ${nome}
                </h3>


                <p class="curso-card-description">
                    ${descricao}
                </p>

            </div>


            <div class="curso-card-meta">

                <div class="curso-card-date">

                    <span class="meta-icon">
                        +
                    </span>


                    <div>

                        <span class="meta-label">
                            Cadastrado em
                        </span>


                        <strong>
                            ${formatarData(
                                curso.created_at
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="curso-card-actions">

                <button
                    type="button"
                    class="curso-action curso-editar"
                    data-action="editar"
                    data-id="${curso.id}"
                    title="Editar curso"
                >

                    <span class="action-icon">
                        ✎
                    </span>

                    <span>
                        Editar
                    </span>

                </button>


                <button
                    type="button"
                    class="curso-action curso-status-button"
                    data-action="status"
                    data-id="${curso.id}"
                    title="${
                        ativo
                            ? "Desativar curso"
                            : "Ativar curso"
                    }"
                >

                    <span class="action-icon">
                        ${
                            ativo
                                ? "−"
                                : "+"
                        }
                    </span>

                    <span>
                        ${
                            ativo
                                ? "Desativar"
                                : "Ativar"
                        }
                    </span>

                </button>


                <button
                    type="button"
                    class="curso-action curso-excluir"
                    data-action="excluir"
                    data-id="${curso.id}"
                    title="Excluir curso"
                >

                    <span class="action-icon">
                        ×
                    </span>

                    <span>
                        Excluir
                    </span>

                </button>

            </div>

        </div>

    `;


    /* =====================================
       FALLBACK DA IMAGEM
    ===================================== */

    const imagemElement =
        card.querySelector(
            ".curso-card-image"
        );


    if (imagemElement) {

        imagemElement.addEventListener(
            "error",
            () => {

                const cover =
                    imagemElement.closest(
                        ".curso-card-cover"
                    );


                if (!cover) {
                    return;
                }


                imagemElement.remove();


                cover.classList.add(
                    "curso-sem-capa"
                );


                const fallback =
                    document.createElement(
                        "div"
                    );


                fallback.className =
                    "curso-sem-imagem";


                fallback.innerHTML =
                    "<span>📚</span>";


                cover.prepend(
                    fallback
                );

            },
            {
                once: true
            }
        );

    }


    return card;

}


/* =========================================
   TRATAR AÇÕES
========================================= */

async function tratarAcaoCurso(event) {

    const botao =
        event.target.closest(
            "[data-action]"
        );


    if (!botao) {
        return;
    }


    const acao =
        botao.dataset.action;


    const id =
        botao.dataset.id;


    if (!id) {
        return;
    }


    const curso =
        cursos.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!curso) {

        console.error(
            "MEP EAD | Curso não encontrado:",
            id
        );

        return;

    }


    /* =====================================
       EDITAR
    ===================================== */

    if (
        acao ===
        "editar"
    ) {

        abrirModalCurso(
            curso
        );

        return;

    }


    /* =====================================
       STATUS
    ===================================== */

    if (
        acao ===
        "status"
    ) {

        await alterarStatusCurso(
            curso
        );

        return;

    }


    /* =====================================
       EXCLUIR
    ===================================== */

    if (
        acao ===
        "excluir"
    ) {

        await excluirCurso(
            curso
        );

    }

}


/* =========================================
   SALVAR CURSO
========================================= */

async function salvarCurso(event) {

    event.preventDefault();


    const nome =
        cursoNome?.value
            ?.trim() ||
        "";


    const descricao =
        cursoDescricao?.value
            ?.trim() ||
        "";


    const imagem =
        cursoImagem?.value
            ?.trim() ||
        "";


    const ativo =
        cursoAtivo
            ? cursoAtivo.checked
            : true;


    if (!nome) {

        mostrarMensagemCurso(
            "Informe o nome do curso.",
            "error"
        );


        cursoNome?.focus();


        return;

    }


    if (salvarCursoButton) {

        salvarCursoButton.disabled =
            true;

        salvarCursoButton.classList.add(
            "loading"
        );

    }


    try {

        /* =================================
           SESSÃO
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
            !sessaoData.session
        ) {

            mostrarMensagemCurso(
                "Sua sessão expirou. Faça login novamente.",
                "error"
            );


            return;

        }


        const authUser =
            sessaoData.session.user;


        /* =================================
           PERFIL
        ================================= */

        const {
            data: usuario,
            error: usuarioErro
        } =
            await supabaseClient

                .from("usuarios")

                .select(`
                    id,
                    auth_id,
                    nome,
                    email,
                    perfil,
                    ativo
                `)

                .eq(
                    "auth_id",
                    authUser.id
                )

                .maybeSingle();


        if (usuarioErro) {

            console.error(
                "MEP EAD | Erro ao buscar perfil:",
                usuarioErro
            );


            mostrarMensagemCurso(
                "Erro ao carregar seu perfil.",
                "error"
            );


            return;

        }


        if (!usuario) {

            mostrarMensagemCurso(
                "Seu perfil não foi encontrado.",
                "error"
            );


            return;

        }


        if (!usuario.ativo) {

            mostrarMensagemCurso(
                "Seu acesso está desativado.",
                "error"
            );


            return;

        }


        if (
            usuario.perfil !==
            "gestor"
        ) {

            mostrarMensagemCurso(
                "Você não possui permissão para gerenciar cursos.",
                "error"
            );


            return;

        }


        /* =================================
           DADOS
        ================================= */

        const dadosCurso = {

            nome:
                nome,

            descricao:
                descricao ||
                null,

            imagem_url:
                imagem ||
                null,

            ativo:
                ativo

        };


        /* =================================
           EDITAR
        ================================= */

        if (cursoEditandoId) {

            console.log(
                "MEP EAD | Atualizando curso:",
                cursoEditandoId
            );


            const {
                data,
                error
            } =
                await supabaseClient

                    .from("cursos")

                    .update(
                        dadosCurso
                    )

                    .eq(
                        "id",
                        cursoEditandoId
                    )

                    .select()
                    .single();


            if (error) {

                console.error(
                    "MEP EAD | Erro ao atualizar curso:",
                    error
                );


                mostrarMensagemCurso(
                    obterMensagemErro(error),
                    "error"
                );


                return;

            }


            console.log(
                "MEP EAD | Curso atualizado:",
                data
            );


            mostrarMensagemCurso(
                "Curso atualizado com sucesso!",
                "success"
            );

        }


        /* =================================
           CRIAR
        ================================= */

        else {

            console.log(
                "MEP EAD | Criando curso..."
            );


            const {
                data,
                error
            } =
                await supabaseClient

                    .from("cursos")

                    .insert({

                        ...dadosCurso,

                        criado_por:
                            usuario.id

                    })

                    .select()
                    .single();


            if (error) {

                console.error(
                    "MEP EAD | Erro ao criar curso:",
                    error
                );


                mostrarMensagemCurso(
                    obterMensagemErro(error),
                    "error"
                );


                return;

            }


            console.log(
                "MEP EAD | Curso criado:",
                data
            );


            mostrarMensagemCurso(
                "Curso criado com sucesso!",
                "success"
            );

        }


        fecharModalCurso();


        await carregarCursos();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao salvar:",
            erro
        );


        mostrarMensagemCurso(
            erro?.message ||
            "Ocorreu um erro ao salvar o curso.",
            "error"
        );

    }

    finally {

        if (salvarCursoButton) {

            salvarCursoButton.disabled =
                false;

            salvarCursoButton.classList.remove(
                "loading"
            );

        }

    }

}


/* =========================================
   ALTERAR STATUS
========================================= */

async function alterarStatusCurso(curso) {

    const novoStatus =
        !curso.ativo;


    const acao =
        novoStatus
            ? "ativar"
            : "desativar";


    const confirmar =
        confirm(
            `Deseja ${acao} o curso "${curso.nome}"?`
        );


    if (!confirmar) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient

                .from("cursos")

                .update({

                    ativo:
                        novoStatus

                })

                .eq(
                    "id",
                    curso.id
                );


        if (error) {

            console.error(
                "MEP EAD | Erro ao alterar status:",
                error
            );


            mostrarMensagemCurso(
                obterMensagemErro(error),
                "error"
            );


            return;

        }


        mostrarMensagemCurso(
            novoStatus
                ? "Curso ativado com sucesso!"
                : "Curso desativado com sucesso!",
            "success"
        );


        await carregarCursos();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado:",
            erro
        );


        mostrarMensagemCurso(
            "Ocorreu um erro ao alterar o status.",
            "error"
        );

    }

}


/* =========================================
   EXCLUIR CURSO
========================================= */

async function excluirCurso(curso) {

    const confirmar =
        confirm(
            `Tem certeza que deseja excluir o curso "${curso.nome}"?\n\nEssa ação não poderá ser desfeita.`
        );


    if (!confirmar) {
        return;
    }


    try {

        console.log(
            "MEP EAD | Excluindo curso:",
            curso.id
        );


        const {
            error
        } =
            await supabaseClient

                .from("cursos")

                .delete()

                .eq(
                    "id",
                    curso.id
                );


        if (error) {

            console.error(
                "MEP EAD | Erro ao excluir curso:",
                error
            );


            mostrarMensagemCurso(
                obterMensagemErro(error),
                "error"
            );


            return;

        }


        mostrarMensagemCurso(
            "Curso excluído com sucesso!",
            "success"
        );


        await carregarCursos();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao excluir:",
            erro
        );


        mostrarMensagemCurso(
            "Ocorreu um erro ao excluir o curso.",
            "error"
        );

    }

}


/* =========================================
   CONTADOR
========================================= */

function atualizarContador() {

    if (!contadorCursos) {
        return;
    }


    contadorCursos.textContent =
        cursos.length;

    if (contadorCursosAtivos) {
        contadorCursosAtivos.textContent = cursos.filter(curso => curso.ativo === true).length;
    }

    if (contadorCursosInativos) {
        contadorCursosInativos.textContent = cursos.filter(curso => curso.ativo === false).length;
    }

    if (contadorMatriculasCursos) {
        contadorMatriculasCursos.textContent = cursos.reduce((total, curso) => total + Number(curso.resumo?.alunos || 0), 0);
    }

}


/* =========================================
   LOADING
========================================= */

function mostrarLoading() {

    if (cursosLoading) {

        cursosLoading.style.display =
            "flex";

    }


    if (cursosEmpty) {

        cursosEmpty.style.display =
            "none";

    }


    if (listaCursos) {

        listaCursos.innerHTML =
            "";

    }

}


/* =========================================
   ESCONDER ESTADOS
========================================= */

function esconderEstados() {

    if (cursosLoading) {

        cursosLoading.style.display =
            "none";

    }


    if (cursosEmpty) {

        cursosEmpty.style.display =
            "none";

    }

}


/* =========================================
   ESTADO VAZIO
========================================= */

function mostrarVazio() {

    if (cursosLoading) {

        cursosLoading.style.display =
            "none";

    }


    if (cursosEmpty) {

        cursosEmpty.style.display =
            "flex";

    }

}


/* =========================================
   ESTADO DE ERRO
========================================= */

function mostrarErro(mensagem) {

    if (cursosLoading) {

        cursosLoading.style.display =
            "none";

    }


    if (cursosEmpty) {

        cursosEmpty.style.display =
            "none";

    }


    if (!listaCursos) {
        return;
    }


    listaCursos.innerHTML = `

        <div class="placeholder-card">

            <span>
                ⚠️
            </span>

            <h3>
                Erro ao carregar cursos
            </h3>

            <p>
                ${escaparHTML(
                    mensagem
                )}
            </p>

        </div>

    `;

}


/* =========================================
   MENSAGEM / TOAST
========================================= */

function mostrarMensagemCurso(
    texto,
    tipo = "info"
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
        `mep-toast ${tipo}`;


    let icone =
        "i";


    if (
        tipo ===
        "success"
    ) {

        icone =
            "✓";

    }


    if (
        tipo ===
        "error"
    ) {

        icone =
            "!";

    }


    toast.innerHTML = `

        <span class="toast-icon">
            ${icone}
        </span>

        <span class="toast-text">
            ${escaparHTML(texto)}
        </span>

    `;


    document.body.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                300
            );

        },
        3000
    );

}


/* =========================================
   MENSAGEM DE ERRO SUPABASE
========================================= */

function obterMensagemErro(error) {

    if (!error) {

        return "Erro desconhecido.";

    }


    if (
        error.code ===
        "42501"
    ) {

        return (
            "Você não possui permissão para realizar esta ação."
        );

    }


    if (
        error.status ===
        401 ||
        error.status ===
        403
    ) {

        return (
            "Você não possui permissão para realizar esta ação."
        );

    }


    return (
        error.message ||
        error.details ||
        error.hint ||
        "Não foi possível realizar a operação."
    );

}


/* =========================================
   FORMATAR DATA
========================================= */

function formatarData(data) {

    if (!data) {

        return "--";

    }


    const dataObj =
        new Date(data);


    if (
        Number.isNaN(
            dataObj.getTime()
        )
    ) {

        return "--";

    }


    return dataObj.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


/* =========================================
   SEGURANÇA HTML
========================================= */

function escaparHTML(texto) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        texto ?? "";


    return div.innerHTML;

}


/* =========================================
   DEBUG
========================================= */

console.log(
    "%cMEP EAD | CURSOS | JS carregado",
    "color:#ff2020;font-size:16px;font-weight:900;"
);
