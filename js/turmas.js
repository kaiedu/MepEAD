/* =========================================================
   MEP EAD | TURMAS
   Versão baseada na estrutura REAL do Supabase
========================================================= */

console.log("MEP EAD | TURMAS | JS carregado");


/* =========================================================
   ESTADO
========================================================= */

let turmas = [];
let cursosTurmas = [];
let alunosTurmas = [];
let professoresTurmas = [];

let turmaSelecionada = null;


/* =========================================================
   ELEMENTOS
========================================================= */

const turmasSearch =
    document.getElementById("turmasSearch");

const turmasFiltroStatus =
    document.getElementById("turmasFiltroStatus");

const turmasFiltroCurso =
    document.getElementById("turmasFiltroCurso");

const listaTurmas =
    document.getElementById("listaTurmas");

const turmasLoading =
    document.getElementById("turmasLoading");

const turmasNoResults =
    document.getElementById("turmasNoResults");

const turmasEmpty =
    document.getElementById("turmasEmpty");

const turmasCount =
    document.getElementById("turmasCount");

const resumoTotalTurmas =
    document.getElementById("resumoTotalTurmas");

const resumoTurmasAtivas =
    document.getElementById("resumoTurmasAtivas");

const resumoAlunosTurmas =
    document.getElementById("resumoAlunosTurmas");

const resumoProfessoresTurmas =
    document.getElementById("resumoProfessoresTurmas");

const novaTurmaButton =
    document.getElementById("novaTurmaButton");

const novaTurmaEmptyButton =
    document.getElementById("novaTurmaEmptyButton");

const turmaModal =
    document.getElementById("turmaModal");

const fecharTurmaModal =
    document.getElementById("fecharTurmaModal");

const cancelarTurma =
    document.getElementById("cancelarTurma");

const turmaForm =
    document.getElementById("turmaForm");

const turmaCurso =
    document.getElementById("turmaCurso");

const turmaNome =
    document.getElementById("turmaNome");

const turmaCodigo =
    document.getElementById("turmaCodigo");

const turmaDescricao =
    document.getElementById("turmaDescricao");

const turmaDataInicio =
    document.getElementById("turmaDataInicio");

const turmaDataFim =
    document.getElementById("turmaDataFim");

const turmaAtiva =
    document.getElementById("turmaAtiva");

const turmaFormMessage =
    document.getElementById("turmaFormMessage");

const salvarTurmaButton =
    document.getElementById("salvarTurmaButton");


/* =========================================================
   ELEMENTOS | GERENCIAMENTO
========================================================= */

const gerenciarTurmaModal =
    document.getElementById("gerenciarTurmaModal");

const fecharGerenciarTurma =
    document.getElementById("fecharGerenciarTurma");

const fecharGerenciarTurmaFooter =
    document.getElementById(
        "fecharGerenciarTurmaFooter"
    );

const gerenciarTurmaTitulo =
    document.getElementById(
        "gerenciarTurmaTitulo"
    );

const gerenciarTurmaStatus =
    document.getElementById(
        "gerenciarTurmaStatus"
    );

const gerenciarTurmaImagem =
    document.getElementById(
        "gerenciarTurmaImagem"
    );

const gerenciarTurmaImagemPlaceholder =
    document.getElementById(
        "gerenciarTurmaImagemPlaceholder"
    );

const gerenciarTurmaCurso =
    document.getElementById(
        "gerenciarTurmaCurso"
    );

const gerenciarTurmaCodigo =
    document.getElementById(
        "gerenciarTurmaCodigo"
    );

const gerenciarTurmaPeriodo =
    document.getElementById(
        "gerenciarTurmaPeriodo"
    );

const gerenciarTurmaDescricao =
    document.getElementById(
        "gerenciarTurmaDescricao"
    );

const gerenciarTurmaStatusTexto =
    document.getElementById(
        "gerenciarTurmaStatusTexto"
    );

const gerenciarTurmaFooterNome =
    document.getElementById(
        "gerenciarTurmaFooterNome"
    );

const contadorAlunosTurma =
    document.getElementById(
        "contadorAlunosTurma"
    );

const contadorAlunosTurmaHeader =
    document.getElementById(
        "contadorAlunosTurmaHeader"
    );

const contadorProfessoresTurma =
    document.getElementById(
        "contadorProfessoresTurma"
    );

const contadorProfessoresTurmaHeader =
    document.getElementById(
        "contadorProfessoresTurmaHeader"
    );

const listaAlunosTurma =
    document.getElementById(
        "listaAlunosTurma"
    );

const listaAlunosDisponiveis =
    document.getElementById(
        "listaAlunosDisponiveis"
    );

const listaProfessoresTurma =
    document.getElementById(
        "listaProfessoresTurma"
    );

const listaProfessoresDisponiveis =
    document.getElementById(
        "listaProfessoresDisponiveis"
    );

const pesquisarAlunosTurma =
    document.getElementById(
        "pesquisarAlunosTurma"
    );

const pesquisarProfessoresTurma =
    document.getElementById(
        "pesquisarProfessoresTurma"
    );

const gerenciarTurmaMensagem =
    document.getElementById(
        "gerenciarTurmaMensagem"
    );

const relatorioTurmaAlunos =
    document.getElementById("relatorioTurmaAlunos");

const relatorioTurmaAulas =
    document.getElementById("relatorioTurmaAulas");

const relatorioTurmaChamadas =
    document.getElementById("relatorioTurmaChamadas");

const relatorioTurmaAlunosTotal =
    document.getElementById("relatorioTurmaAlunosTotal");

const relatorioTurmaMedia =
    document.getElementById("relatorioTurmaMedia");

const imprimirRelatorioTurma =
    document.getElementById("imprimirRelatorioTurma");


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function inicializarTurmas() {

    console.log("MEP EAD | TURMAS");

    configurarEventosTurmas();

    await carregarCursosTurmas();

    await carregarAlunosTurmas();

    await carregarProfessoresTurmas();

    await carregarTurmas();

}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventosTurmas() {

    if (novaTurmaButton) {

        novaTurmaButton.addEventListener(
            "click",
            abrirModalNovaTurma
        );

    }


    if (novaTurmaEmptyButton) {

        novaTurmaEmptyButton.addEventListener(
            "click",
            abrirModalNovaTurma
        );

    }


    if (fecharTurmaModal) {

        fecharTurmaModal.addEventListener(
            "click",
            fecharModalNovaTurma
        );

    }


    if (cancelarTurma) {

        cancelarTurma.addEventListener(
            "click",
            fecharModalNovaTurma
        );

    }


    if (turmaModal) {

        turmaModal.addEventListener(
            "click",
            evento => {

                if (
                    evento.target ===
                    turmaModal
                ) {

                    fecharModalNovaTurma();

                }

            }
        );

    }


    if (turmaForm) {

        turmaForm.addEventListener(
            "submit",
            salvarNovaTurma
        );

    }


    if (turmasSearch) {

        turmasSearch.addEventListener(
            "input",
            renderizarTurmasFiltradas
        );

    }


    if (turmasFiltroStatus) {

        turmasFiltroStatus.addEventListener(
            "change",
            renderizarTurmasFiltradas
        );

    }


    if (turmasFiltroCurso) {

        turmasFiltroCurso.addEventListener(
            "change",
            renderizarTurmasFiltradas
        );

    }


    if (fecharGerenciarTurma) {

        fecharGerenciarTurma.addEventListener(
            "click",
            fecharModalGerenciamento
        );

    }


    if (fecharGerenciarTurmaFooter) {

        fecharGerenciarTurmaFooter.addEventListener(
            "click",
            fecharModalGerenciamento
        );

    }


    if (gerenciarTurmaModal) {

        gerenciarTurmaModal.addEventListener(
            "click",
            evento => {

                if (
                    evento.target ===
                    gerenciarTurmaModal
                ) {

                    fecharModalGerenciamento();

                }

            }
        );

    }


    if (pesquisarAlunosTurma) {

        pesquisarAlunosTurma.addEventListener(
            "input",
            renderizarAlunosDisponiveis
        );

    }


    if (pesquisarProfessoresTurma) {

        pesquisarProfessoresTurma.addEventListener(
            "input",
            renderizarProfessoresDisponiveis
        );

    }


    if (imprimirRelatorioTurma) {

        imprimirRelatorioTurma.addEventListener(
            "click",
            () => window.print()
        );

    }

}


/* =========================================================
   CURSOS
========================================================= */

async function carregarCursosTurmas() {

    try {

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
                    ativo
                `)
                .order(
                    "nome",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "Erro ao carregar cursos:",
                error
            );

            return;

        }


        cursosTurmas =
            Array.isArray(data)
                ? data
                : [];


        preencherSelectCursos();

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao carregar cursos:",
            erro
        );

    }

}


/* =========================================================
   SELECT DE CURSOS
========================================================= */

function preencherSelectCursos() {

    if (!turmaCurso) {
        return;
    }


    turmaCurso.innerHTML = `
        <option value="">
            Selecione um curso
        </option>
    `;


    cursosTurmas
        .filter(curso => curso.ativo !== false)
        .forEach(curso => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                curso.id;

            option.textContent =
                curso.nome;

            turmaCurso.appendChild(
                option
            );

        });


    if (turmasFiltroCurso) {

        turmasFiltroCurso.innerHTML = `
            <option value="">
                Todos os cursos
            </option>
        `;


        cursosTurmas.forEach(curso => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                curso.id;

            option.textContent =
                curso.nome;

            turmasFiltroCurso.appendChild(
                option
            );

        });

    }

}


/* =========================================================
   ALUNOS
========================================================= */

async function carregarAlunosTurmas() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("usuarios")
                .select(`
                    id,
                    nome,
                    email,
                    perfil,
                    ativo
                `)
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

            alunosTurmas = [];

            return;

        }


        alunosTurmas =
            Array.isArray(data)
                ? data
                : [];

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao carregar alunos:",
            erro
        );

        alunosTurmas = [];

    }

}


/* =========================================================
   PROFESSORES
========================================================= */

async function carregarProfessoresTurmas() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("usuarios")
                .select(`
                    id,
                    nome,
                    email,
                    perfil,
                    ativo
                `)
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


        if (error) {

            console.error(
                "Erro ao carregar professores:",
                error
            );

            professoresTurmas = [];

            return;

        }


        professoresTurmas =
            Array.isArray(data)
                ? data
                : [];

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao carregar professores:",
            erro
        );

        professoresTurmas = [];

    }

}


/* =========================================================
   CARREGAR TURMAS
========================================================= */

async function carregarTurmas() {

    mostrarLoadingTurmas();


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("turmas")
                .select(`
                    id,
                    curso_id,
                    nome,
                    codigo,
                    descricao,
                    data_inicio,
                    data_fim,
                    ativa,
                    created_at,
                    cursos (
                        id,
                        nome,
                        imagem_url
                    )
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Erro ao carregar turmas:",
                error
            );

            mostrarErroTurmas(
                error.message ||
                "Erro ao carregar turmas."
            );

            return;

        }


        turmas =
            Array.isArray(data)
                ? data
                : [];


        await carregarResumoTurmas();


        renderizarTurmasFiltradas();

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao carregar turmas:",
            erro
        );

        mostrarErroTurmas(
            erro.message ||
            "Erro ao carregar turmas."
        );

    }

}


/* =========================================================
   FILTROS
========================================================= */

function renderizarTurmasFiltradas() {

    const busca =
        turmasSearch?.value
            ?.trim()
            ?.toLowerCase() ||
        "";


    const status =
        turmasFiltroStatus?.value ||
        "todas";


    const curso =
        turmasFiltroCurso?.value ||
        "";


    let lista =
        [...turmas];


    if (busca) {

        lista =
            lista.filter(turma => {

                const nome =
                    String(
                        turma.nome ||
                        ""
                    ).toLowerCase();


                const codigo =
                    String(
                        turma.codigo ||
                        ""
                    ).toLowerCase();


                const cursoNome =
                    String(
                        turma.cursos?.nome ||
                        ""
                    ).toLowerCase();


                return (
                    nome.includes(busca) ||
                    codigo.includes(busca) ||
                    cursoNome.includes(busca)
                );

            });

    }


    if (status === "ativas") {

        lista =
            lista.filter(
                turma =>
                    turma.ativa === true
            );

    }


    if (status === "inativas") {

        lista =
            lista.filter(
                turma =>
                    turma.ativa === false
            );

    }


    if (curso) {

        lista =
            lista.filter(
                turma =>
                    turma.curso_id === curso
            );

    }


    atualizarContadorTurmas(
        lista.length
    );


    renderizarTurmas(
        lista
    );

}


/* =========================================================
   RENDERIZAR TURMAS
========================================================= */

function renderizarTurmas(lista) {

    esconderEstadosTurmas();


    if (!listaTurmas) {
        return;
    }


    listaTurmas.innerHTML = "";


    if (!lista.length) {

        if (turmas.length) {

            mostrarNoResultsTurmas();

        }

        else {

            mostrarVazioTurmas();

        }

        return;

    }


    lista.forEach(turma => {

        listaTurmas.appendChild(
            criarLinhaTurma(turma)
        );

    });

}


/* =========================================================
   CARD
========================================================= */

function criarCardTurma(turma) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "turma-card";


    card.dataset.id =
        turma.id;


    const ativa =
        turma.ativa === true;


    const cursoNome =
        turma.cursos?.nome ||
        "Curso não informado";


    const imagem =
        turma.cursos?.imagem_url ||
        "";


    const periodo =
        formatarPeriodo(
            turma.data_inicio,
            turma.data_fim
        );


    card.innerHTML = `

        <div class="turma-card-cover">

            ${
                imagem
                    ? `
                        <img
                            src="${escaparHTML(imagem)}"
                            alt=""
                            class="turma-card-image"
                        >
                    `
                    : `
                        <div class="turma-card-cover-placeholder">
                            <span>MEP</span>
                        </div>
                    `
            }

            <div class="turma-card-cover-overlay"></div>

            <span
                class="turma-status ${
                    ativa
                        ? "ativa"
                        : "inativa"
                }"
            >
                ${
                    ativa
                        ? "ATIVA"
                        : "INATIVA"
                }
            </span>

        </div>


        <div class="turma-card-content">

            <span class="eyebrow">
                ${escaparHTML(cursoNome)}
            </span>

            <h3>
                ${escaparHTML(turma.nome)}
            </h3>

            <p>
                ${
                    turma.descricao
                        ? escaparHTML(
                            turma.descricao
                        )
                        : "Nenhuma descrição cadastrada."
                }
            </p>


            <div class="turma-card-meta">

                <div>

                    <span>
                        PERÍODO
                    </span>

                    <strong>
                        ${periodo}
                    </strong>

                </div>


                <div>

                    <span>
                        CÓDIGO
                    </span>

                    <strong>
                        ${escaparHTML(
                            turma.codigo ||
                            "—"
                        )}
                    </strong>

                </div>

            </div>


            <div class="turma-card-actions">

                <button
                    type="button"
                    class="turma-action primary"
                    data-action="gerenciar"
                    data-id="${escaparHTML(turma.id)}"
                >
                    Gerenciar
                </button>

                <button
                    type="button"
                    class="turma-action"
                    data-action="status"
                    data-id="${escaparHTML(turma.id)}"
                >
                    ${
                        ativa
                            ? "Desativar"
                            : "Ativar"
                    }
                </button>

            </div>

        </div>

    `;


    card
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                evento => {

                    evento.stopPropagation();


                    const action =
                        button.dataset.action;


                    const id =
                        button.dataset.id;


                    if (
                        action ===
                        "gerenciar"
                    ) {

                        abrirGerenciamentoTurma(
                            id
                        );

                    }


                    if (
                        action ===
                        "status"
                    ) {

                        alterarStatusTurma(
                            id
                        );

                    }

                }
            );

        });


    return card;

}


/* =========================================================
   NOVA TURMA
========================================================= */

async function abrirModalNovaTurma() {

    if (!turmaModal) {
        return;
    }


    turmaForm?.reset();


    if (turmaAtiva) {

        turmaAtiva.checked =
            true;

    }


    limparMensagemTurma();


    turmaModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );


    /* Atualiza o seletor no momento da criação para incluir qualquer curso
       ativo criado durante a sessão atual. */
    await carregarCursosAtivosNoModal();

}


function criarLinhaTurma(turma) {

    const linha = document.createElement("article");
    linha.className = "turma-row";
    linha.dataset.id = turma.id;

    const ativa = turma.ativa === true;
    const cursoNome = turma.cursos?.nome || "Curso não informado";
    const imagem = turma.cursos?.imagem_url || "";
    const resumo = turma.resumo || { alunos: 0, professores: 0 };
    const periodo = formatarPeriodo(turma.data_inicio, turma.data_fim);
    const nome = turma.nome || "Turma sem nome";

    const capa = imagem
        ? `<div class="turma-row-cover"><img src="${escaparHTML(imagem)}" alt="" loading="lazy"><span></span></div>`
        : `<div class="turma-row-cover turma-row-cover-placeholder"><b>MEP</b><span></span></div>`;

    linha.innerHTML = `
        ${capa}
        <div class="turma-row-content">
            <div class="turma-row-main">
                <span class="turma-row-label">${escaparHTML(cursoNome)}</span>
                <h3>${escaparHTML(nome)}</h3>
                <p>${escaparHTML(turma.descricao || turma.codigo || "Nenhuma descrição cadastrada.")}</p>
            </div>
            <div class="turma-row-structure">
                <span><strong>${resumo.alunos}</strong><small>${resumo.alunos === 1 ? "aluno" : "alunos"}</small></span>
                <span><strong>${resumo.professores}</strong><small>${resumo.professores === 1 ? "professor" : "professores"}</small></span>
            </div>
            <div class="turma-row-period"><strong>${escaparHTML(periodo)}</strong><small>${escaparHTML(turma.codigo || "Sem código")}</small></div>
            <div class="turma-row-status"><span class="turma-status ${ativa ? "ativa" : "inativa"}">${ativa ? "ATIVA" : "INATIVA"}</span></div>
            <div class="turma-row-actions">
                <button type="button" class="turma-action primary" data-action="gerenciar" data-id="${escaparHTML(turma.id)}"><span>↗</span> Gerenciar turma</button>
                <button type="button" class="turma-action" data-action="status" data-id="${escaparHTML(turma.id)}">${ativa ? "Desativar" : "Ativar"}</button>
            </div>
        </div>`;

    linha.querySelector("img")?.addEventListener("error", evento => {
        const cover = evento.currentTarget.closest(".turma-row-cover");
        if (!cover) return;
        cover.classList.add("turma-row-cover-placeholder");
        cover.innerHTML = "<b>MEP</b><span></span>";
    });

    linha.querySelectorAll("[data-action]").forEach(button => {
        button.addEventListener("click", evento => {
            evento.stopPropagation();
            if (button.dataset.action === "gerenciar") abrirGerenciamentoTurma(button.dataset.id);
            if (button.dataset.action === "status") alterarStatusTurma(button.dataset.id);
        });
    });

    linha.addEventListener("dblclick", () => abrirGerenciamentoTurma(String(turma.id)));

    return linha;
}


async function carregarResumoTurmas() {

    const idsTurmas = turmas.map(turma => turma.id).filter(Boolean);

    if (!idsTurmas.length) {
        atualizarResumoTurmas();
        return;
    }

    const [alunosResposta, professoresResposta] = await Promise.all([
        supabaseClient
            .from("turma_alunos")
            .select("turma_id, aluno_id, ativo")
            .in("turma_id", idsTurmas)
            .eq("ativo", true),
        supabaseClient
            .from("turma_professores")
            .select("turma_id, professor_id")
            .in("turma_id", idsTurmas)
    ]);

    if (alunosResposta.error) {
        console.warn("MEP EAD | Não foi possível resumir alunos das turmas:", alunosResposta.error);
    }

    if (professoresResposta.error) {
        console.warn("MEP EAD | Não foi possível resumir professores das turmas:", professoresResposta.error);
    }

    const alunos = alunosResposta.data || [];
    const professores = professoresResposta.data || [];

    turmas.forEach(turma => {
        const turmaId = String(turma.id);
        turma.resumo = {
            alunos: new Set(
                alunos
                    .filter(item => String(item.turma_id) === turmaId)
                    .map(item => String(item.aluno_id))
            ).size,
            professores: new Set(
                professores
                    .filter(item => String(item.turma_id) === turmaId)
                    .map(item => String(item.professor_id))
            ).size
        };
    });

    atualizarResumoTurmas(alunos, professores);
}


function atualizarResumoTurmas(alunos = [], professores = []) {

    if (resumoTotalTurmas) resumoTotalTurmas.textContent = turmas.length;
    if (resumoTurmasAtivas) resumoTurmasAtivas.textContent = turmas.filter(turma => turma.ativa === true).length;
    if (resumoAlunosTurmas) resumoAlunosTurmas.textContent = new Set(alunos.map(item => String(item.aluno_id))).size;
    if (resumoProfessoresTurmas) resumoProfessoresTurmas.textContent = new Set(professores.map(item => String(item.professor_id))).size;
}


function fecharModalNovaTurma() {

    if (!turmaModal) {
        return;
    }


    turmaModal.hidden =
        true;


    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================================
   SALVAR TURMA
========================================================= */

async function salvarNovaTurma(evento) {

    evento.preventDefault();


    if (!supabaseClient) {

        mostrarMensagemTurma(
            "Supabase não está disponível.",
            "error"
        );

        return;

    }


    const cursoId =
        turmaCurso?.value ||
        "";


    const nome =
        turmaNome?.value
            ?.trim() ||
        "";


    const codigo =
        turmaCodigo?.value
            ?.trim() ||
        null;


    const descricao =
        turmaDescricao?.value
            ?.trim() ||
        null;


    const dataInicio =
        turmaDataInicio?.value ||
        null;


    const dataFim =
        turmaDataFim?.value ||
        null;


    const ativa =
        turmaAtiva?.checked !== false;


    if (!cursoId) {

        mostrarMensagemTurma(
            "Selecione um curso.",
            "error"
        );

        return;

    }


    if (!nome) {

        mostrarMensagemTurma(
            "Informe o nome da turma.",
            "error"
        );

        return;

    }


    if (
        dataInicio &&
        dataFim &&
        dataFim < dataInicio
    ) {

        mostrarMensagemTurma(
            "A data de término não pode ser anterior à data de início.",
            "error"
        );

        return;

    }


    setSalvarTurmaLoading(
        true
    );


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("turmas")
                .insert([
                    {
                        curso_id:
                            cursoId,

                        nome:
                            nome,

                        codigo:
                            codigo,

                        descricao:
                            descricao,

                        data_inicio:
                            dataInicio,

                        data_fim:
                            dataFim,

                        ativa:
                            ativa
                    }
                ])
                .select(`
                    id,
                    curso_id,
                    nome,
                    codigo,
                    descricao,
                    data_inicio,
                    data_fim,
                    ativa,
                    created_at,
                    cursos (
                        id,
                        nome,
                        imagem_url
                    )
                `)
                .single();


        if (error) {

            console.error(
                "Erro ao criar turma:",
                error
            );

            mostrarMensagemTurma(
                error.message ||
                "Não foi possível criar a turma.",
                "error"
            );

            return;

        }


        console.log(
            "Turma criada:",
            data
        );


        mostrarMensagemTurma(
            "Turma criada com sucesso.",
            "success"
        );


        await carregarTurmas();


        setTimeout(
            () => {

                fecharModalNovaTurma();

            },
            500
        );

    }

    catch (erro) {

        console.error(
            "Erro inesperado ao criar turma:",
            erro
        );

        mostrarMensagemTurma(
            erro.message ||
            "Erro inesperado ao criar turma.",
            "error"
        );

    }

    finally {

        setSalvarTurmaLoading(
            false
        );

    }

}


/* =========================================================
   ALTERAR STATUS
========================================================= */

async function alterarStatusTurma(id) {

    const turma =
        turmas.find(
            item =>
                String(item.id) === String(id)
        );


    if (!turma) {
        return;
    }


    const novoStatus =
        turma.ativa !== true;


    try {

        const {
            error
        } =
            await supabaseClient
                .from("turmas")
                .update({
                    ativa:
                        novoStatus
                })
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "Erro ao alterar status da turma:",
                error
            );

            alert(
                error.message ||
                "Não foi possível alterar o status."
            );

            return;

        }


        turma.ativa =
            novoStatus;


        renderizarTurmasFiltradas();


        if (
            turmaSelecionada?.id ===
            id
        ) {

            atualizarGerenciamentoTurma(
                turma
            );

        }

    }

    catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

    }

}


/* =========================================================
   GERENCIAMENTO
========================================================= */

async function abrirGerenciamentoTurma(id) {

    const turma =
        turmas.find(
            item =>
                item.id === id
        );

    if (!turma) {
        return;
    }

    turmaSelecionada =
        turma;

    atualizarGerenciamentoTurma(
        turma
    );

    abrirModalGerenciamento();

    // Atualiza os usuários diretamente do Supabase
    await Promise.all([
        carregarAlunosTurmas(),
        carregarProfessoresTurmas()
    ]);

    // Depois carrega vínculos e relatório da turma em paralelo
    await Promise.all([
        carregarRelacionamentosTurma(id),
        carregarRelatorioTurma(id)
    ]);
}


/* =========================================================
   RELATÓRIO E FREQUÊNCIA DA TURMA
========================================================= */

async function carregarRelatorioTurma(turmaId) {

    prepararRelatorioTurma();

    try {
        const [matriculasResposta, chamadasResposta] = await Promise.all([
            supabaseClient
                .from("turma_alunos")
                .select("aluno_id, ativo, data_matricula")
                .eq("turma_id", turmaId)
                .eq("ativo", true),
            supabaseClient
                .from("presencas_chamadas")
                .select("id, aula_id, turma_id, numero, aberta_em, created_at")
                .eq("turma_id", turmaId)
        ]);

        const erroBase = matriculasResposta.error || chamadasResposta.error;
        if (erroBase) throw erroBase;

        const matriculas = matriculasResposta.data || [];
        const chamadas = chamadasResposta.data || [];
        const idsAlunos = [...new Set(matriculas.map(item => item.aluno_id).filter(Boolean))];
        const idsChamadas = chamadas.map(item => item.id).filter(Boolean);

        const [alunosResposta, presencasResposta] = await Promise.all([
            idsAlunos.length
                ? supabaseClient
                    .from("usuarios")
                    .select("id, nome, email, foto_url, telefone, ativo")
                    .in("id", idsAlunos)
                : Promise.resolve({ data: [], error: null }),
            idsChamadas.length && idsAlunos.length
                ? supabaseClient
                    .from("presencas")
                    .select("chamada_id, aluno_id, presente, respondido_em, created_at")
                    .in("chamada_id", idsChamadas)
                    .in("aluno_id", idsAlunos)
                    .eq("presente", true)
                : Promise.resolve({ data: [], error: null })
        ]);

        const erroDetalhe = alunosResposta.error || presencasResposta.error;
        if (erroDetalhe) throw erroDetalhe;

        const usuariosPorId = new Map(
            (alunosResposta.data || []).map(aluno => [String(aluno.id), aluno])
        );
        const confirmacoes = new Set(
            (presencasResposta.data || []).map(item => `${item.chamada_id}:${item.aluno_id}`)
        );
        const chamadasPorAula = new Map();

        chamadas.forEach(chamada => {
            const aulaId = String(chamada.aula_id || `chamada-${chamada.id}`);
            if (!chamadasPorAula.has(aulaId)) chamadasPorAula.set(aulaId, []);
            chamadasPorAula.get(aulaId).push(chamada);
        });

        const alunos = idsAlunos.map(alunoId => {
            let aulasComPresenca = 0;
            let chamadasRespondidas = 0;

            chamadasPorAula.forEach(chamadasAula => {
                const respondidas = chamadasAula.filter(chamada =>
                    confirmacoes.has(`${chamada.id}:${alunoId}`)
                ).length;
                chamadasRespondidas += respondidas;
                if (respondidas / chamadasAula.length >= 0.6) aulasComPresenca++;
            });

            const totalAulas = chamadasPorAula.size;
            return {
                aluno: usuariosPorId.get(String(alunoId)) || { id: alunoId, nome: "Aluno", email: "" },
                aulasComPresenca,
                totalAulas,
                chamadasRespondidas,
                totalChamadas: chamadas.length,
                frequencia: totalAulas ? Math.round(aulasComPresenca * 100 / totalAulas) : null
            };
        }).sort((a, b) => String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR"));

        renderizarRelatorioTurma(alunos, chamadasPorAula.size, chamadas.length);
    }
    catch (erro) {
        console.error("MEP EAD | Erro ao carregar relatório da turma:", erro);
        if (relatorioTurmaAlunos) {
            relatorioTurmaAlunos.innerHTML = `<tr><td colspan="4"><div class="turma-relatorio-empty erro">Não foi possível carregar o relatório: ${escaparHTML(erro.message || "erro inesperado")}</div></td></tr>`;
        }
    }
}


function prepararRelatorioTurma() {
    if (relatorioTurmaAulas) relatorioTurmaAulas.textContent = "—";
    if (relatorioTurmaChamadas) relatorioTurmaChamadas.textContent = "—";
    if (relatorioTurmaAlunosTotal) relatorioTurmaAlunosTotal.textContent = "—";
    if (relatorioTurmaMedia) relatorioTurmaMedia.textContent = "—";
    if (relatorioTurmaAlunos) {
        relatorioTurmaAlunos.innerHTML = `<tr><td colspan="4"><div class="turma-relatorio-loading"><span></span>Calculando frequência...</div></td></tr>`;
    }
}


function renderizarRelatorioTurma(alunos, totalAulas, totalChamadas) {
    const frequencias = alunos.map(item => item.frequencia).filter(valor => valor !== null);
    const media = frequencias.length
        ? Math.round(frequencias.reduce((soma, valor) => soma + valor, 0) / frequencias.length)
        : null;

    if (relatorioTurmaAulas) relatorioTurmaAulas.textContent = totalAulas;
    if (relatorioTurmaChamadas) relatorioTurmaChamadas.textContent = totalChamadas;
    if (relatorioTurmaAlunosTotal) relatorioTurmaAlunosTotal.textContent = alunos.length;
    if (relatorioTurmaMedia) {
        relatorioTurmaMedia.textContent = media === null ? "—" : `${media}%`;
        relatorioTurmaMedia.className = media === null ? "" : media >= 60 ? "frequencia-aprovada" : "frequencia-abaixo";
    }

    if (!relatorioTurmaAlunos) return;

    if (!alunos.length) {
        relatorioTurmaAlunos.innerHTML = `<tr><td colspan="4"><div class="turma-relatorio-empty">Nenhum aluno ativo está matriculado nesta turma.</div></td></tr>`;
        return;
    }

    relatorioTurmaAlunos.innerHTML = alunos.map(item => criarLinhaRelatorioTurma(item)).join("");
}


function criarLinhaRelatorioTurma(item) {
    const aluno = item.aluno;
    const nome = aluno.nome || "Aluno";
    const avatar = aluno.foto_url
        ? `<img src="${escaparHTML(aluno.foto_url)}" alt="">`
        : `<span>${escaparHTML(nome.trim().charAt(0).toUpperCase() || "A")}</span>`;
    const classe = item.frequencia === null
        ? "sem-dados"
        : item.frequencia >= 60 ? "aprovada" : "abaixo";
    const porcentagem = item.frequencia === null ? 0 : item.frequencia;
    const textoFrequencia = item.frequencia === null ? "Sem chamadas" : `${item.frequencia}%`;

    return `<tr>
        <td><div class="turma-relatorio-aluno"><div class="turma-relatorio-avatar">${avatar}</div><div><strong>${escaparHTML(nome)}</strong><small>${escaparHTML(aluno.email || "E-mail não informado")}</small></div></div></td>
        <td><strong>${item.totalAulas ? `${item.aulasComPresenca}/${item.totalAulas}` : "—"}</strong><small>${item.totalAulas ? "aulas computadas" : "Nenhuma aula avaliada"}</small></td>
        <td><strong>${item.totalChamadas ? `${item.chamadasRespondidas}/${item.totalChamadas}` : "—"}</strong><small>${item.totalChamadas ? "confirmações" : "Sem chamadas"}</small></td>
        <td><div class="turma-frequencia ${classe}"><div><span style="width:${porcentagem}%"></span></div><strong>${textoFrequencia}</strong></div></td>
    </tr>`;
}

/* =========================================================
   ATUALIZAR DADOS DO MODAL
========================================================= */

function atualizarGerenciamentoTurma(
    turma
) {

    const ativa =
        turma.ativa === true;


    if (gerenciarTurmaTitulo) {

        gerenciarTurmaTitulo.textContent =
            turma.nome ||
            "Turma";

    }


    if (gerenciarTurmaFooterNome) {

        gerenciarTurmaFooterNome.textContent =
            turma.nome ||
            "—";

    }


    if (gerenciarTurmaStatus) {

        gerenciarTurmaStatus.textContent =
            ativa
                ? "ATIVA"
                : "INATIVA";


        gerenciarTurmaStatus.className =
            `turma-status ${
                ativa
                    ? "ativa"
                    : "inativa"
            }`;

    }


    if (gerenciarTurmaCurso) {

        gerenciarTurmaCurso.textContent =
            turma.cursos?.nome ||
            "Curso não informado";

    }


    if (gerenciarTurmaCodigo) {

        gerenciarTurmaCodigo.textContent =
            turma.codigo ||
            "—";

    }


    if (gerenciarTurmaPeriodo) {

        gerenciarTurmaPeriodo.textContent =
            formatarPeriodo(
                turma.data_inicio,
                turma.data_fim
            );

    }


    if (gerenciarTurmaDescricao) {

        gerenciarTurmaDescricao.textContent =
            turma.descricao ||
            "Nenhuma descrição informada.";

    }


    if (gerenciarTurmaStatusTexto) {

        gerenciarTurmaStatusTexto.textContent =
            ativa
                ? "Ativa"
                : "Inativa";

    }


    const imagem =
        turma.cursos?.imagem_url ||
        "";


    if (
        imagem &&
        gerenciarTurmaImagem
    ) {

        gerenciarTurmaImagem.src =
            imagem;

        gerenciarTurmaImagem.hidden =
            false;


        if (
            gerenciarTurmaImagemPlaceholder
        ) {

            gerenciarTurmaImagemPlaceholder.hidden =
                true;

        }

    }

    else {

        if (gerenciarTurmaImagem) {

            gerenciarTurmaImagem.hidden =
                true;

            gerenciarTurmaImagem.src =
                "";

        }


        if (
            gerenciarTurmaImagemPlaceholder
        ) {

            gerenciarTurmaImagemPlaceholder.hidden =
                false;

        }

    }

}


/* =========================================================
   RELACIONAMENTOS
========================================================= */

async function carregarRelacionamentosTurma(
    turmaId
) {

    limparMensagemGerenciamento();


    if (listaAlunosTurma) {

        listaAlunosTurma.innerHTML =
            criarLoading(
                "Carregando alunos..."
            );

    }


    if (listaAlunosDisponiveis) {

        listaAlunosDisponiveis.innerHTML =
            criarLoading(
                "Carregando alunos..."
            );

    }


    if (listaProfessoresTurma) {

        listaProfessoresTurma.innerHTML =
            criarLoading(
                "Carregando professores..."
            );

    }


    if (listaProfessoresDisponiveis) {

        listaProfessoresDisponiveis.innerHTML =
            criarLoading(
                "Carregando professores..."
            );

    }


    try {

        await Promise.all([
            carregarAlunosDaTurma(
                turmaId
            ),
            carregarProfessoresDaTurma(
                turmaId
            )
        ]);

    }

    catch (erro) {

        console.error(
            "Erro ao carregar relacionamentos:",
            erro
        );

    }

}


/* =========================================================
   ALUNOS DA TURMA
========================================================= */

async function carregarAlunosDaTurma(
    turmaId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("turma_alunos")
            .select(`
                id,
                turma_id,
                aluno_id,
                ativo,
                data_matricula,
                usuarios (
                    id,
                    nome,
                    email,
                    perfil,
                    ativo
                )
            `)
            .eq(
                "turma_id",
                turmaId
            );


    if (error) {

        console.error(
            "Erro ao carregar alunos da turma:",
            error
        );

        if (listaAlunosTurma) {

            listaAlunosTurma.innerHTML =
                criarMensagemLista(
                    error.message
                );

        }

        return;

    }


    const matriculados =
        Array.isArray(data)
            ? data
            : [];


    renderizarAlunosMatriculados(
        matriculados
    );


    renderizarAlunosDisponiveis(
        matriculados
    );

}


/* =========================================================
   RENDERIZAR ALUNOS MATRICULADOS
========================================================= */

function renderizarAlunosMatriculados(
    lista
) {

    if (!listaAlunosTurma) {
        return;
    }


    listaAlunosTurma.innerHTML =
        "";


    const ativos =
        lista.filter(
            item =>
                item.ativo !== false
        );


    atualizarContadorAlunos(
        ativos.length
    );


    if (!ativos.length) {

        listaAlunosTurma.innerHTML =
            criarMensagemLista(
                "Nenhum aluno matriculado."
            );

        return;

    }


    ativos.forEach(item => {

        const usuario =
            item.usuarios;


        if (!usuario) {
            return;
        }


        const elemento =
            document.createElement(
                "div"
            );


        elemento.className =
            "turma-aluno-item";


        elemento.innerHTML = `

            <div class="turma-aluno-info">

                <strong>
                    ${escaparHTML(
                        usuario.nome
                    )}
                </strong>

                <span>
                    ${escaparHTML(
                        usuario.email
                    )}
                </span>

            </div>

            <button
                type="button"
                class="turma-action"
                data-remover-aluno="${escaparHTML(
                    item.aluno_id
                )}"
            >
                Remover
            </button>

        `;


        const botao =
            elemento.querySelector(
                "[data-remover-aluno]"
            );


        if (botao) {

            botao.addEventListener(
                "click",
                () => {

                    removerAlunoDaTurma(
                        item.aluno_id
                    );

                }
            );

        }


        listaAlunosTurma.appendChild(
            elemento
        );

    });

}


/* =========================================================
   ALUNOS DISPONÍVEIS
========================================================= */

async function renderizarAlunosDisponiveis(
    matriculados
) {

    if (!listaAlunosDisponiveis) {
        return;
    }


    if (
        !Array.isArray(
            matriculados
        )
    ) {

        matriculados = [];

    }


    const idsMatriculados =
        new Set(
            matriculados.map(
                item =>
                    item.aluno_id
            )
        );


    const busca =
        pesquisarAlunosTurma?.value
            ?.trim()
            ?.toLowerCase() ||
        "";


    let disponiveis =
        alunosTurmas.filter(
            aluno =>
                !idsMatriculados.has(
                    aluno.id
                ) &&
                aluno.ativo !== false
        );


    if (busca) {

        disponiveis =
            disponiveis.filter(
                aluno => {

                    const nome =
                        String(
                            aluno.nome ||
                            ""
                        ).toLowerCase();


                    const email =
                        String(
                            aluno.email ||
                            ""
                        ).toLowerCase();


                    return (
                        nome.includes(busca) ||
                        email.includes(busca)
                    );

                }
            );

    }


    listaAlunosDisponiveis.innerHTML =
        "";


    if (!disponiveis.length) {

        listaAlunosDisponiveis.innerHTML =
            criarMensagemLista(
                busca
                    ? "Nenhum aluno encontrado."
                    : "Todos os alunos já estão na turma."
            );

        return;

    }


    disponiveis.forEach(aluno => {

        const elemento =
            document.createElement(
                "div"
            );


        elemento.className =
            "turma-aluno-item";


        elemento.innerHTML = `

            <div class="turma-aluno-info">

                <strong>
                    ${escaparHTML(
                        aluno.nome
                    )}
                </strong>

                <span>
                    ${escaparHTML(
                        aluno.email
                    )}
                </span>

            </div>

            <button
                type="button"
                class="turma-action primary"
                data-adicionar-aluno="${escaparHTML(
                    aluno.id
                )}"
            >
                Adicionar
            </button>

        `;


        const botao =
            elemento.querySelector(
                "[data-adicionar-aluno]"
            );


        if (botao) {

            botao.addEventListener(
                "click",
                () => {

                    adicionarAlunoNaTurma(
                        aluno.id
                    );

                }
            );

        }


        listaAlunosDisponiveis.appendChild(
            elemento
        );

    });

}


/* =========================================================
   ADICIONAR ALUNO
========================================================= */

async function adicionarAlunoNaTurma(
    alunoId
) {

    if (!turmaSelecionada) {
        return;
    }


    const turmaId =
        turmaSelecionada.id;


    const {
        error
    } =
        await supabaseClient
            .from("turma_alunos")
            .insert([
                {
                    turma_id:
                        turmaId,

                    aluno_id:
                        alunoId,

                    ativo:
                        true
                }
            ]);


    if (error) {

        console.error(
            "Erro ao adicionar aluno:",
            error
        );

        mostrarMensagemGerenciamento(
            error.message ||
            "Não foi possível adicionar o aluno.",
            "error"
        );

        return;

    }


    await Promise.all([
        carregarAlunosDaTurma(turmaId),
        carregarRelatorioTurma(turmaId)
    ]);

    await carregarResumoTurmas();
    renderizarTurmasFiltradas();

}


/* =========================================================
   REMOVER ALUNO
========================================================= */

async function removerAlunoDaTurma(
    alunoId
) {

    if (!turmaSelecionada) {
        return;
    }


    const confirmar =
        window.confirm(
            "Deseja remover este aluno da turma?"
        );


    if (!confirmar) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("turma_alunos")
            .delete()
            .eq(
                "turma_id",
                turmaSelecionada.id
            )
            .eq(
                "aluno_id",
                alunoId
            );


    if (error) {

        console.error(
            "Erro ao remover aluno:",
            error
        );

        mostrarMensagemGerenciamento(
            error.message ||
            "Não foi possível remover o aluno.",
            "error"
        );

        return;

    }


    await Promise.all([
        carregarAlunosDaTurma(turmaSelecionada.id),
        carregarRelatorioTurma(turmaSelecionada.id)
    ]);

    await carregarResumoTurmas();
    renderizarTurmasFiltradas();

}


/* =========================================================
   PROFESSORES DA TURMA
========================================================= */

async function carregarProfessoresDaTurma(
    turmaId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("turma_professores")
            .select(`
                id,
                turma_id,
                professor_id,
                created_at,
                usuarios (
                    id,
                    nome,
                    email,
                    perfil,
                    ativo
                )
            `)
            .eq(
                "turma_id",
                turmaId
            );


    if (error) {

        console.error(
            "Erro ao carregar professores da turma:",
            error
        );

        if (listaProfessoresTurma) {

            listaProfessoresTurma.innerHTML =
                criarMensagemLista(
                    error.message
                );

        }

        return;

    }


    const vinculados =
        Array.isArray(data)
            ? data
            : [];


    renderizarProfessoresVinculados(
        vinculados
    );


    renderizarProfessoresDisponiveis(
        vinculados
    );

}


/* =========================================================
   PROFESSORES VINCULADOS
========================================================= */

function renderizarProfessoresVinculados(
    lista
) {

    if (!listaProfessoresTurma) {
        return;
    }


    listaProfessoresTurma.innerHTML =
        "";


    atualizarContadorProfessores(
        lista.length
    );


    if (!lista.length) {

        listaProfessoresTurma.innerHTML =
            criarMensagemLista(
                "Nenhum professor vinculado."
            );

        return;

    }


    lista.forEach(item => {

        const professor =
            item.usuarios;


        if (!professor) {
            return;
        }


        const elemento =
            document.createElement(
                "div"
            );


        elemento.className =
            "turma-professor-item";


        elemento.innerHTML = `

            <div class="turma-professor-info">

                <strong>
                    ${escaparHTML(
                        professor.nome
                    )}
                </strong>

                <span>
                    ${escaparHTML(
                        professor.email
                    )}
                </span>

            </div>

            <button
                type="button"
                class="turma-action"
                data-remover-professor="${escaparHTML(
                    item.professor_id
                )}"
            >
                Remover
            </button>

        `;


        const botao =
            elemento.querySelector(
                "[data-remover-professor]"
            );


        if (botao) {

            botao.addEventListener(
                "click",
                () => {

                    removerProfessorDaTurma(
                        item.professor_id
                    );

                }
            );

        }


        listaProfessoresTurma.appendChild(
            elemento
        );

    });

}


/* =========================================================
   PROFESSORES DISPONÍVEIS
========================================================= */

function renderizarProfessoresDisponiveis(
    vinculados
) {

    if (!listaProfessoresDisponiveis) {
        return;
    }


    if (
        !Array.isArray(
            vinculados
        )
    ) {

        vinculados = [];

    }


    const idsVinculados =
        new Set(
            vinculados.map(
                item =>
                    item.professor_id
            )
        );


    const busca =
        pesquisarProfessoresTurma?.value
            ?.trim()
            ?.toLowerCase() ||
        "";


    let disponiveis =
        professoresTurmas.filter(
            professor =>
                !idsVinculados.has(
                    professor.id
                ) &&
                professor.ativo !== false
        );


    if (busca) {

        disponiveis =
            disponiveis.filter(
                professor => {

                    const nome =
                        String(
                            professor.nome ||
                            ""
                        ).toLowerCase();


                    const email =
                        String(
                            professor.email ||
                            ""
                        ).toLowerCase();


                    return (
                        nome.includes(busca) ||
                        email.includes(busca)
                    );

                }
            );

    }


    listaProfessoresDisponiveis.innerHTML =
        "";


    if (!disponiveis.length) {

        listaProfessoresDisponiveis.innerHTML =
            criarMensagemLista(
                busca
                    ? "Nenhum professor encontrado."
                    : "Todos os professores já estão na turma."
            );

        return;

    }


    disponiveis.forEach(professor => {

        const elemento =
            document.createElement(
                "div"
            );


        elemento.className =
            "turma-professor-item";


        elemento.innerHTML = `

            <div class="turma-professor-info">

                <strong>
                    ${escaparHTML(
                        professor.nome
                    )}
                </strong>

                <span>
                    ${escaparHTML(
                        professor.email
                    )}
                </span>

            </div>

            <button
                type="button"
                class="turma-action primary"
                data-adicionar-professor="${escaparHTML(
                    professor.id
                )}"
            >
                Adicionar
            </button>

        `;


        const botao =
            elemento.querySelector(
                "[data-adicionar-professor]"
            );


        if (botao) {

            botao.addEventListener(
                "click",
                () => {

                    adicionarProfessorNaTurma(
                        professor.id
                    );

                }
            );

        }


        listaProfessoresDisponiveis.appendChild(
            elemento
        );

    });

}


/* =========================================================
   ADICIONAR PROFESSOR
========================================================= */

async function adicionarProfessorNaTurma(
    professorId
) {

    if (!turmaSelecionada) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("turma_professores")
            .insert([
                {
                    turma_id:
                        turmaSelecionada.id,

                    professor_id:
                        professorId
                }
            ]);


    if (error) {

        console.error(
            "Erro ao adicionar professor:",
            error
        );

        mostrarMensagemGerenciamento(
            error.message ||
            "Não foi possível adicionar o professor.",
            "error"
        );

        return;

    }


    await carregarProfessoresDaTurma(
        turmaSelecionada.id
    );

}


/* =========================================================
   REMOVER PROFESSOR
========================================================= */

async function removerProfessorDaTurma(
    professorId
) {

    if (!turmaSelecionada) {
        return;
    }


    const confirmar =
        window.confirm(
            "Deseja remover este professor da turma?"
        );


    if (!confirmar) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("turma_professores")
            .delete()
            .eq(
                "turma_id",
                turmaSelecionada.id
            )
            .eq(
                "professor_id",
                professorId
            );


    if (error) {

        console.error(
            "Erro ao remover professor:",
            error
        );

        mostrarMensagemGerenciamento(
            error.message ||
            "Não foi possível remover o professor.",
            "error"
        );

        return;

    }


    await carregarProfessoresDaTurma(
        turmaSelecionada.id
    );

}


/* =========================================================
   CONTADORES
========================================================= */

function atualizarContadorTurmas(
    quantidade
) {

    if (!turmasCount) {
        return;
    }


    turmasCount.textContent =
        `${quantidade} ${
            quantidade === 1
                ? "turma"
                : "turmas"
        }`;

}


function atualizarContadorAlunos(
    quantidade
) {

    if (contadorAlunosTurma) {

        contadorAlunosTurma.textContent =
            quantidade;

    }


    if (contadorAlunosTurmaHeader) {

        contadorAlunosTurmaHeader.textContent =
            quantidade;

    }

}


function atualizarContadorProfessores(
    quantidade
) {

    if (contadorProfessoresTurma) {

        contadorProfessoresTurma.textContent =
            quantidade;

    }


    if (contadorProfessoresTurmaHeader) {

        contadorProfessoresTurmaHeader.textContent =
            quantidade;

    }

}


/* =========================================================
   ESTADOS DA LISTA
========================================================= */

function mostrarLoadingTurmas() {

    if (!listaTurmas) {
        return;
    }


    listaTurmas.innerHTML = `
        <div
            class="turmas-loading"
            id="turmasLoading"
        >
            <div class="loading-spinner"></div>

            <span>
                Carregando turmas...
            </span>
        </div>
    `;


    if (turmasNoResults) {

        turmasNoResults.hidden =
            true;

    }


    if (turmasEmpty) {

        turmasEmpty.hidden =
            true;

    }

}


function esconderEstadosTurmas() {

    if (turmasNoResults) {

        turmasNoResults.hidden =
            true;

    }


    if (turmasEmpty) {

        turmasEmpty.hidden =
            true;

    }

}


function mostrarNoResultsTurmas() {

    if (turmasNoResults) {

        turmasNoResults.hidden =
            false;

    }

}


function mostrarVazioTurmas() {

    if (turmasEmpty) {

        turmasEmpty.hidden =
            false;

    }

}


function mostrarErroTurmas(
    mensagem
) {

    if (!listaTurmas) {
        return;
    }


    listaTurmas.innerHTML = `
        <div class="turmas-empty">

            <div class="empty-icon">
                ⚠️
            </div>

            <h3>
                Erro ao carregar turmas
            </h3>

            <p>
                ${escaparHTML(
                    mensagem
                )}
            </p>

        </div>
    `;

}


/* =========================================================
   MODAL GERENCIAMENTO
========================================================= */

function abrirModalGerenciamento() {

    if (!gerenciarTurmaModal) {
        return;
    }


    gerenciarTurmaModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );

}


function fecharModalGerenciamento() {

    if (!gerenciarTurmaModal) {
        return;
    }


    gerenciarTurmaModal.hidden =
        true;


    turmaSelecionada =
        null;


    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================================
   MENSAGENS
========================================================= */

function mostrarMensagemTurma(
    mensagem,
    tipo = "error"
) {

    if (!turmaFormMessage) {
        return;
    }


    turmaFormMessage.textContent =
        mensagem;


    turmaFormMessage.className =
        `form-message ${tipo}`;


    turmaFormMessage.hidden =
        false;

}


function limparMensagemTurma() {

    if (!turmaFormMessage) {
        return;
    }


    turmaFormMessage.textContent =
        "";


    turmaFormMessage.hidden =
        true;

}


function mostrarMensagemGerenciamento(
    mensagem,
    tipo = "error"
) {

    if (!gerenciarTurmaMensagem) {
        return;
    }


    gerenciarTurmaMensagem.textContent =
        mensagem;


    gerenciarTurmaMensagem.className =
        `form-message ${tipo}`;


    gerenciarTurmaMensagem.hidden =
        false;

}


function limparMensagemGerenciamento() {

    if (!gerenciarTurmaMensagem) {
        return;
    }


    gerenciarTurmaMensagem.textContent =
        "";


    gerenciarTurmaMensagem.hidden =
        true;

}


/* =========================================================
   LOADING DO BOTÃO
========================================================= */

function setSalvarTurmaLoading(
    carregando
) {

    if (!salvarTurmaButton) {
        return;
    }


    salvarTurmaButton.disabled =
        carregando;


    salvarTurmaButton.textContent =
        carregando
            ? "Criando..."
            : "Criar turma";

}


/* =========================================================
   AUXILIARES
========================================================= */

function formatarPeriodo(
    inicio,
    fim
) {

    if (!inicio && !fim) {

        return "Não informado";

    }


    if (inicio && !fim) {

        return formatarData(
            inicio
        );

    }


    if (!inicio && fim) {

        return `Até ${
            formatarData(fim)
        }`;

    }


    return `${formatarData(inicio)} até ${formatarData(fim)}`;

}


function formatarData(
    valor
) {

    if (!valor) {
        return "—";
    }


    const partes =
        String(
            valor
        ).split("-");


    if (
        partes.length ===
        3
    ) {

        return `${partes[2]}/${partes[1]}/${partes[0]}`;

    }


    return valor;

}


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


function criarLoading(
    mensagem
) {

    return `
        <div class="turma-professores-loading">

            <div class="loading-spinner"></div>

            <span>
                ${escaparHTML(
                    mensagem
                )}
            </span>

        </div>
    `;

}


function criarMensagemLista(
    mensagem
) {

    return `
        <div class="turma-list-empty">

            <span>
                ${escaparHTML(
                    mensagem
                )}
            </span>

        </div>
    `;

}


/* =========================================================
   EXPOSIÇÃO GLOBAL
========================================================= */

window.carregarTurmas =
    carregarTurmas;

window.abrirModalNovaTurma =
    abrirModalNovaTurma;

window.abrirGerenciamentoTurma =
    abrirGerenciamentoTurma;


/* =========================================================
   INICIAR
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarTurmas
    );

}

else {

    inicializarTurmas();

}


async function carregarCursosAtivosNoModal() {

    if (!turmaCurso) {
        return;
    }


    turmaCurso.innerHTML = `
        <option value="">
            Carregando cursos ativos...
        </option>
    `;

    turmaCurso.disabled = true;


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("cursos")
            .select("id, nome")
            .eq("ativo", true)
            .order("nome", { ascending: true });


        if (error) {
            throw error;
        }


        const cursosAtivos =
            Array.isArray(data)
                ? data
                : [];


        turmaCurso.innerHTML = `
            <option value="">
                Selecione um curso
            </option>
        `;


        cursosAtivos.forEach(curso => {

            const option =
                document.createElement("option");

            option.value = curso.id;
            option.textContent = curso.nome;

            turmaCurso.appendChild(option);

        });


        if (!cursosAtivos.length) {

            turmaCurso.innerHTML = `
                <option value="">
                    Nenhum curso ativo encontrado
                </option>
            `;

        }


        console.log(
            "MEP EAD | TURMAS | Cursos ativos disponíveis:",
            cursosAtivos.length
        );

    } catch (erro) {

        console.error(
            "MEP EAD | TURMAS | Erro ao carregar cursos ativos:",
            erro
        );

        turmaCurso.innerHTML = `
            <option value="">
                Não foi possível carregar os cursos
            </option>
        `;

    } finally {

        turmaCurso.disabled = false;

    }

}
