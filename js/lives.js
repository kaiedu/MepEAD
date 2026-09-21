/* =========================================================
   MEP EAD
   SISTEMA DE LIVES
   GERENCIAMENTO + SISTEMA DE PRESENÇA

   IMPORTANTE:

   A tabela "lives" representa a própria aula.

   RELAÇÃO:

   lives.id
       ↓
   presencas_chamadas.aula_id
       ↓
   presencas.aula_id

   TABELAS UTILIZADAS:

   lives
   cursos
   turmas
   turma_alunos
   presencas_chamadas
   presencas
========================================================= */

console.log("MEP EAD | LIVES | JS carregado");


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const DURACAO_CHAMADA = 15;

const TABELA_CHAMADAS =
    "presencas_chamadas";

const TABELA_PRESENCAS =
    "presencas";

const TABELA_TURMA_ALUNOS =
    "turma_alunos";


/* =========================================================
   ESTADO
========================================================= */

let livesLista = [];
let livesTurmas = [];
let livesCursos = [];
let livesMaterias = [];

let liveAtual = null;
let usuarioAtualLive = null;

let chamadaAtualLive = null;

let intervaloChamadaLive = null;
let intervaloAtualizacaoLive = null;


/* =========================================================
   ELEMENTOS | LISTAGEM
========================================================= */

const livesList =
    document.getElementById("livesList");

const livesLoading =
    document.getElementById("livesLoading");

const livesEmpty =
    document.getElementById("livesEmpty");

const novaLiveButton =
    document.getElementById("novaLiveButton");

const novaLiveEmptyButton =
    document.getElementById("novaLiveEmptyButton");

const filtroLiveStatus =
    document.getElementById("filtroLiveStatus");

const filtroLiveCurso =
    document.getElementById("filtroLiveCurso");

const buscarLive =
    document.getElementById("buscarLive");

const livesTotal =
    document.getElementById("livesTotal");

const livesAgendadas =
    document.getElementById("livesAgendadas");

const livesAoVivo =
    document.getElementById("livesAoVivo");

const livesEncerradas =
    document.getElementById("livesEncerradas");


/* =========================================================
   ELEMENTOS | NOVA LIVE
========================================================= */

const novaLiveModal =
    document.getElementById("novaLiveModal");

const fecharNovaLive =
    document.getElementById("fecharNovaLive");

const cancelarNovaLive =
    document.getElementById("cancelarNovaLive");

const novaLiveForm =
    document.getElementById("novaLiveForm");

const novaLiveTitulo =
    document.getElementById("novaLiveTitulo");

const liveCurso =
    document.getElementById("liveCurso");

const liveTurma =
    document.getElementById("liveTurma");

const liveMateria =
    document.getElementById("liveMateria");

const liveTitulo =
    document.getElementById("liveTitulo");

const liveDescricao =
    document.getElementById("liveDescricao");

const liveYoutube =
    document.getElementById("liveYoutube");

const liveYoutubeId =
    document.getElementById("liveYoutubeId");

const liveData =
    document.getElementById("liveData");

const liveHorario =
    document.getElementById("liveHorario");

const liveAtiva =
    document.getElementById("liveAtiva");

const novaLiveMensagem =
    document.getElementById("novaLiveMensagem");

const salvarNovaLive =
    document.getElementById("salvarNovaLive");


/* =========================================================
   ELEMENTOS | GERENCIAR LIVE
========================================================= */

const gerenciarLiveModal =
    document.getElementById("gerenciarLiveModal");

const fecharGerenciarLive =
    document.getElementById("fecharGerenciarLive");

const gerenciarLiveTitulo =
    document.getElementById("gerenciarLiveTitulo");

const gerenciarLiveStatus =
    document.getElementById("gerenciarLiveStatus");

const gerenciarLiveTurma =
    document.getElementById("gerenciarLiveTurma");

const livePlayer =
    document.getElementById("livePlayer");

const gerenciarLiveCurso =
    document.getElementById("gerenciarLiveCurso");

const gerenciarLiveTurmaInfo =
    document.getElementById("gerenciarLiveTurmaInfo");

const gerenciarLiveData =
    document.getElementById("gerenciarLiveData");

const gerenciarLiveHorario =
    document.getElementById("gerenciarLiveHorario");

const editarLiveButton =
    document.getElementById("editarLiveButton");

const encerrarLiveButton =
    document.getElementById("encerrarLiveButton");

const iniciarLiveButton =
    document.getElementById("iniciarLiveButton");


/* =========================================================
   ELEMENTOS | PRESENÇA
========================================================= */

const presenceCounter =
    document.getElementById("presenceCounter");

const presenceCurrent =
    document.getElementById("presenceCurrent");

const presenceTimer =
    document.getElementById("presenceTimer");

const presenceRespondidas =
    document.getElementById("presenceRespondidas");

const presenceTotalAlunos =
    document.getElementById("presenceTotalAlunos");

const abrirChamadaButton =
    document.getElementById("abrirChamadaButton");

const presenceLast =
    document.getElementById("presenceLast");

const presenceLastResult =
    document.getElementById("presenceLastResult");


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function inicializarLives() {

    console.log(
        "MEP EAD | Inicializando sistema de Lives..."
    );

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {

        console.error(
            "MEP EAD | Supabase não está disponível."
        );

        mostrarErroLives(
            "Não foi possível conectar ao Supabase."
        );

        return;
    }

    configurarEventosLives();

    await carregarUsuarioLive();
    await carregarCursosLives();
    await carregarTurmasLives();
    await carregarMateriasLives();
    await carregarLives();
}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventosLives() {

    if (novaLiveButton) {
        novaLiveButton.addEventListener(
            "click",
            abrirNovaLive
        );
    }

    if (novaLiveEmptyButton) {
        novaLiveEmptyButton.addEventListener(
            "click",
            abrirNovaLive
        );
    }

    if (fecharNovaLive) {
        fecharNovaLive.addEventListener(
            "click",
            fecharModalNovaLive
        );
    }

    if (cancelarNovaLive) {
        cancelarNovaLive.addEventListener(
            "click",
            fecharModalNovaLive
        );
    }

    if (novaLiveForm) {
        novaLiveForm.addEventListener(
            "submit",
            salvarLive
        );
    }

    if (liveCurso) {
        liveCurso.addEventListener(
            "change",
            () => {
                preencherTurmasDoCurso(
                    liveCurso.value
                );
                preencherMateriasDoCurso(
                    liveCurso.value
                );
            }
        );
    }

    if (liveYoutube) {
        liveYoutube.addEventListener(
            "input",
            atualizarYoutubeId
        );
    }

    if (filtroLiveStatus) {
        filtroLiveStatus.addEventListener(
            "change",
            renderizarLives
        );
    }

    if (filtroLiveCurso) {
        filtroLiveCurso.addEventListener(
            "change",
            renderizarLives
        );
    }

    if (buscarLive) {
        buscarLive.addEventListener(
            "input",
            renderizarLives
        );
    }

    if (fecharGerenciarLive) {
        fecharGerenciarLive.addEventListener(
            "click",
            fecharModalGerenciarLive
        );
    }

    if (abrirChamadaButton) {
        abrirChamadaButton.addEventListener(
            "click",
            abrirChamadaPresenca
        );
    }

    if (editarLiveButton) {
        editarLiveButton.addEventListener(
            "click",
            editarLiveAtual
        );
    }

    if (encerrarLiveButton) {
        encerrarLiveButton.addEventListener(
            "click",
            encerrarLiveAtual
        );
    }

    if (iniciarLiveButton) {
        iniciarLiveButton.addEventListener(
            "click",
            iniciarLiveAtual
        );
    }

    if (gerenciarLiveModal) {

        gerenciarLiveModal.addEventListener(
            "click",
            evento => {

                if (
                    evento.target ===
                    gerenciarLiveModal
                ) {
                    fecharModalGerenciarLive();
                }

            }
        );

    }

    if (novaLiveModal) {

        novaLiveModal.addEventListener(
            "click",
            evento => {

                if (
                    evento.target ===
                    novaLiveModal
                ) {
                    fecharModalNovaLive();
                }

            }
        );

    }

    document.addEventListener(
        "click",
        tratarCliqueLive
    );
}


/* =========================================================
   USUÁRIO
========================================================= */

async function carregarUsuarioLive() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getUser();

        if (error) {

            console.error(
                "MEP EAD | Erro ao obter usuário:",
                error
            );

            return;
        }

        usuarioAtualLive =
            data?.user || null;

        console.log(
            "MEP EAD | Auth ID:",
            usuarioAtualLive?.id
        );

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao carregar usuário:",
            erro
        );

    }
}


/* =========================================================
   CURSOS
========================================================= */

async function carregarCursosLives() {

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
                "MEP EAD | Erro ao carregar cursos:",
                error
            );

            return;
        }

        livesCursos =
            Array.isArray(data)
                ? data
                : [];

        preencherSelectCursos();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao carregar cursos:",
            erro
        );

    }
}


/* =========================================================
   SELECT CURSOS
========================================================= */

function preencherSelectCursos() {

    if (liveCurso) {

        liveCurso.innerHTML = `
            <option value="">
                Selecione o curso
            </option>
        `;

        livesCursos
            .filter(
                curso =>
                    curso.ativo !== false
            )
            .forEach(
                curso => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        curso.id;

                    option.textContent =
                        curso.nome;

                    liveCurso.appendChild(
                        option
                    );

                }
            );

    }

    if (filtroLiveCurso) {

        filtroLiveCurso.innerHTML = `
            <option value="">
                Todos os cursos
            </option>
        `;

        livesCursos
            .filter(
                curso =>
                    curso.ativo !== false
            )
            .forEach(
                curso => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        curso.id;

                    option.textContent =
                        curso.nome;

                    filtroLiveCurso.appendChild(
                        option
                    );

                }
            );

    }
}


/* =========================================================
   TURMAS
========================================================= */

async function carregarTurmasLives() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("turmas")
                .select(`
                    id,
                    nome,
                    codigo,
                    curso_id,
                    ativa
                `)
                .order(
                    "nome",
                    {
                        ascending: true
                    }
                );

        if (error) {

            console.error(
                "MEP EAD | Erro ao carregar turmas:",
                error
            );

            return;
        }

        livesTurmas =
            Array.isArray(data)
                ? data
                : [];

        preencherTurmasDoCurso("");

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao carregar turmas:",
            erro
        );

    }
}


/* =========================================================
   TURMAS DO CURSO
========================================================= */

function preencherTurmasDoCurso(
    cursoId,
    turmaSelecionada = ""
) {

    if (!liveTurma) {
        return;
    }

    liveTurma.innerHTML = "";

    if (!cursoId) {

        liveTurma.disabled =
            true;

        liveTurma.innerHTML = `
            <option value="">
                Primeiro selecione o curso
            </option>
        `;

        return;
    }

    const turmasDoCurso =
        livesTurmas.filter(
            turma =>
                String(turma.curso_id) ===
                String(cursoId) &&
                turma.ativa !== false
        );

    liveTurma.disabled =
        false;

    const primeiraOpcao =
        document.createElement(
            "option"
        );

    primeiraOpcao.value =
        "";

    primeiraOpcao.textContent =
        turmasDoCurso.length
            ? "Selecione uma turma"
            : "Nenhuma turma disponível";

    liveTurma.appendChild(
        primeiraOpcao
    );

    turmasDoCurso.forEach(
        turma => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                turma.id;

            option.textContent =
                turma.codigo
                    ? `${turma.nome} • ${turma.codigo}`
                    : turma.nome;

            if (
                String(turma.id) ===
                String(turmaSelecionada)
            ) {
                option.selected =
                    true;
            }

            liveTurma.appendChild(
                option
            );

        }
    );
}


/* =========================================================
   MATÉRIAS DO CURSO
========================================================= */

async function carregarMateriasLives(
    cursoSelecionado = liveCurso?.value || "",
    materiaSelecionada = liveMateria?.value || ""
) {
    try {
        const { data, error } = await supabaseClient
            .from("materias")
            .select("id,curso_id,nome,ativa")
            .order("nome", { ascending:true });
        if (error) throw error;
        livesMaterias = Array.isArray(data) ? data : [];
        preencherMateriasDoCurso(
            cursoSelecionado,
            materiaSelecionada
        );
    } catch (erro) {
        console.error("MEP EAD | Erro ao carregar matérias:", erro);
        livesMaterias = [];
        preencherMateriasDoCurso(
            cursoSelecionado,
            materiaSelecionada
        );
    }
}

function preencherMateriasDoCurso(cursoId, materiaSelecionada = "") {
    if (!liveMateria) return;
    const materias = livesMaterias.filter(materia =>
        String(materia.curso_id) === String(cursoId) && materia.ativa !== false
    );
    liveMateria.disabled = !cursoId || !materias.length;
    liveMateria.innerHTML = `<option value="">${!cursoId ? "Primeiro selecione o curso" : materias.length ? "Selecione uma matéria" : "Cadastre uma matéria para este curso"}</option>`;
    materias.forEach(materia => {
        const option = document.createElement("option");
        option.value = materia.id;
        option.textContent = materia.nome;
        option.selected = String(materia.id) === String(materiaSelecionada);
        liveMateria.appendChild(option);
    });
}

function encontrarMateria(id) {
    return livesMaterias.find(materia => String(materia.id) === String(id));
}


/* =========================================================
   CARREGAR LIVES
========================================================= */

async function carregarLives() {

    try {

        mostrarLoadingLives();

        const {
            data,
            error
        } =
            await supabaseClient
                .from("lives")
                .select(`
                    id,
                    turma_id,
                    materia_id,
                    professor_id,
                    titulo,
                    descricao,
                    youtube_url,
                    youtube_video_id,
                    data_live,
                    horario_inicio,
                    horario_fim,
                    status,
                    created_at,
                    updated_at,
                    aula_id
                `)
                .order(
                    "data_live",
                    {
                        ascending: false
                    }
                )
                .order(
                    "horario_inicio",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "MEP EAD | Erro ao carregar lives:",
                error
            );

            mostrarErroLives(
                error.message
            );

            return;
        }

        livesLista =
            Array.isArray(data)
                ? data
                : [];

        console.log(
            "MEP EAD | Lives encontradas:",
            livesLista.length
        );

        renderizarLives();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao carregar lives:",
            erro
        );

        mostrarErroLives(
            "Ocorreu um erro ao carregar as lives."
        );

    }
}


/* =========================================================
   RENDERIZAR
========================================================= */

function renderizarLives() {

    if (!livesList) {
        return;
    }

    const statusFiltro =
        filtroLiveStatus?.value ||
        "todas";

    const cursoFiltro =
        filtroLiveCurso?.value ||
        "";

    const busca =
        String(
            buscarLive?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const filtradas =
        livesLista.filter(
            live => {

                const status =
                    normalizarStatus(
                        live.status
                    );

                if (
                    statusFiltro ===
                    "agendadas" &&
                    status !==
                    "agendada"
                ) {
                    return false;
                }

                if (
                    statusFiltro ===
                    "ao-vivo" &&
                    status !==
                    "ao_vivo"
                ) {
                    return false;
                }

                if (
                    statusFiltro ===
                    "encerradas" &&
                    status !==
                    "encerrada"
                ) {
                    return false;
                }

                if (cursoFiltro) {

                    const turma =
                        encontrarTurma(
                            live.turma_id
                        );

                    if (
                        String(
                            turma?.curso_id
                        ) !==
                        String(
                            cursoFiltro
                        )
                    ) {
                        return false;
                    }

                }

                if (busca) {

                    const turma =
                        encontrarTurma(
                            live.turma_id
                        );

                    const curso =
                        encontrarCurso(
                            turma?.curso_id
                        );

                    const texto =
                        [
                            live.titulo,
                            live.descricao,
                            turma?.nome,
                            turma?.codigo,
                            curso?.nome
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();

                    if (
                        !texto.includes(
                            busca
                        )
                    ) {
                        return false;
                    }

                }

                return true;

            }
        );

    if (livesLoading) {
        livesLoading.hidden =
            true;
    }

    const cardsAntigos =
        livesList.querySelectorAll(
            ".live-card"
        );

    cardsAntigos.forEach(
        card =>
            card.remove()
    );

    filtradas.forEach(
        live => {

            livesList.appendChild(
                criarCardLive(
                    live
                )
            );

        }
    );

    if (livesEmpty) {

        livesEmpty.hidden =
            livesLista.length > 0;

    }

    atualizarResumoLives();
}


/* =========================================================
   CARD
========================================================= */

function criarCardLive(
    live
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "live-card";

    const turma =
        encontrarTurma(
            live.turma_id
        );

    const curso =
        encontrarCurso(
            turma?.curso_id
        );

    const materia =
        encontrarMateria(
            live.materia_id
        );

    const status =
        normalizarStatus(
            live.status
        );

    const videoId =
        live.youtube_video_id ||
        extrairYoutubeId(
            live.youtube_url
        );

    card.innerHTML = `

        <div class="live-card-header">

            <div>

                <span class="live-card-eyebrow">
                    LIVE
                </span>

                <h3>
                    ${escaparHTML(
                        live.titulo ||
                        "Sem título"
                    )}
                </h3>

            </div>

            <span
                class="live-status ${escaparHTML(status)}"
            >
                ${escaparHTML(
                    obterTextoStatus(
                        status
                    )
                )}
            </span>

        </div>


        <div class="live-card-body">

            ${
                videoId
                    ? `
                        <div class="live-card-video">

                            <img
                                src="https://img.youtube.com/vi/${escaparHTML(videoId)}/hqdefault.jpg"
                                alt=""
                                loading="lazy"
                            >

                        </div>
                    `
                    : `
                        <div class="live-card-video-placeholder">
                            🔴
                        </div>
                    `
            }


            <div class="live-card-info">

                <div class="live-info-row">

                    <span>
                        CURSO
                    </span>

                    <strong>
                        ${escaparHTML(
                            curso?.nome ||
                            "Curso não encontrado"
                        )}
                    </strong>

                </div>


                <div class="live-info-row">

                    <span>
                        TURMA
                    </span>

                    <strong>
                        ${escaparHTML(
                            turma?.nome ||
                            "Turma não encontrada"
                        )}
                    </strong>

                </div>


                <div class="live-info-row">

                    <span>
                        MATÉRIA
                    </span>

                    <strong>
                        ${escaparHTML(
                            materia?.nome ||
                            "Não vinculada"
                        )}
                    </strong>

                </div>


                <div class="live-info-row">

                    <span>
                        DATA
                    </span>

                    <strong>
                        ${escaparHTML(
                            formatarData(
                                live.data_live
                            )
                        )}
                    </strong>

                </div>


                <div class="live-info-row">

                    <span>
                        HORÁRIO
                    </span>

                    <strong>
                        ${escaparHTML(
                            formatarHorario(
                                live.horario_inicio
                            )
                        )}
                    </strong>

                </div>

            </div>

        </div>


        <div class="live-card-actions">

            <button
                type="button"
                class="live-action-button primary"
                data-live-action="controlar"
                data-live-id="${escaparHTML(live.id)}"
            >
                Gerenciar
            </button>


            <button
                type="button"
                class="live-action-button"
                data-live-action="editar"
                data-live-id="${escaparHTML(live.id)}"
            >
                Editar
            </button>


            <button
                type="button"
                class="live-action-button danger"
                data-live-action="excluir"
                data-live-id="${escaparHTML(live.id)}"
            >
                Excluir
            </button>

        </div>

    `;

    return card;
}


/* =========================================================
   CLIQUES
========================================================= */

function tratarCliqueLive(
    evento
) {

    const botao =
        evento.target.closest(
            "[data-live-action]"
        );

    if (!botao) {
        return;
    }

    const acao =
        botao.dataset.liveAction;

    const id =
        botao.dataset.liveId;

    const live =
        livesLista.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!live) {
        return;
    }

    if (acao === "controlar") {

        abrirGerenciarLive(
            live
        );

    }

    if (acao === "editar") {

        abrirEditarLive(
            live
        );

    }

    if (acao === "excluir") {

        excluirLive(
            live
        );

    }
}


/* =========================================================
   NOVA LIVE
========================================================= */

async function abrirNovaLive() {

    if (!novaLiveModal) {
        return;
    }

    if (novaLiveForm) {

        novaLiveForm.reset();

        delete novaLiveForm.dataset.liveId;

    }

    if (novaLiveTitulo) {

        novaLiveTitulo.textContent =
            "Nova live";

    }

    if (salvarNovaLive) {

        salvarNovaLive.textContent =
            "Criar live";

    }

    limparMensagemNovaLive();

    preencherTurmasDoCurso("");
    await carregarMateriasLives("", "");

    if (liveYoutubeId) {

        liveYoutubeId.value =
            "";

    }

    novaLiveModal.hidden =
        false;

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   EDITAR LIVE
========================================================= */

async function abrirEditarLive(
    live
) {

    if (!novaLiveModal) {
        return;
    }

    if (novaLiveTitulo) {

        novaLiveTitulo.textContent =
            "Editar live";

    }

    if (salvarNovaLive) {

        salvarNovaLive.textContent =
            "Salvar alterações";

    }

    limparMensagemNovaLive();

    const turma =
        encontrarTurma(
            live.turma_id
        );

    if (liveCurso) {

        liveCurso.value =
            turma?.curso_id ||
            "";

    }

    preencherTurmasDoCurso(
        turma?.curso_id ||
        "",
        live.turma_id ||
        ""
    );

    await carregarMateriasLives(
        turma?.curso_id || "",
        live.materia_id || ""
    );

    if (liveTitulo) {

        liveTitulo.value =
            live.titulo ||
            "";

    }

    if (liveDescricao) {

        liveDescricao.value =
            live.descricao ||
            "";

    }

    if (liveYoutube) {

        liveYoutube.value =
            live.youtube_url ||
            "";

    }

    if (liveYoutubeId) {

        liveYoutubeId.value =
            live.youtube_video_id ||
            extrairYoutubeId(
                live.youtube_url
            );

    }

    if (liveData) {

        liveData.value =
            live.data_live ||
            "";

    }

    if (liveHorario) {

        liveHorario.value =
            limparHorario(
                live.horario_inicio
            );

    }

    if (liveAtiva) {

        liveAtiva.value =
            normalizarStatus(
                live.status
            ) ===
            "cancelada"
                ? "false"
                : "true";

    }

    if (novaLiveForm) {

        novaLiveForm.dataset.liveId =
            live.id;

    }

    novaLiveModal.hidden =
        false;

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   FECHAR MODAL NOVA LIVE
========================================================= */

function fecharModalNovaLive() {

    if (!novaLiveModal) {
        return;
    }

    novaLiveModal.hidden =
        true;

    document.body.classList.remove(
        "modal-open"
    );

    if (novaLiveForm) {

        delete novaLiveForm.dataset.liveId;

    }
}


/* =========================================================
   SALVAR LIVE
========================================================= */

async function salvarLive(
    evento
) {

    evento.preventDefault();

    limparMensagemNovaLive();

    const cursoId =
        liveCurso?.value ||
        "";

    const turmaId =
        liveTurma?.value ||
        "";

    const materiaId =
        liveMateria?.value ||
        "";

    const titulo =
        liveTitulo?.value?.trim() ||
        "";

    const descricao =
        liveDescricao?.value?.trim() ||
        "";

    const youtubeUrl =
        liveYoutube?.value?.trim() ||
        "";

    const youtubeVideoId =
        liveYoutubeId?.value?.trim() ||
        extrairYoutubeId(
            youtubeUrl
        );

    const dataLive =
        liveData?.value ||
        "";

    const horario =
        liveHorario?.value ||
        "";

    const status =
        liveAtiva?.value ===
        "false"
            ? "cancelada"
            : "agendada";

    const liveId =
        novaLiveForm?.dataset?.liveId ||
        "";

    if (!cursoId) {

        mostrarMensagemNovaLive(
            "Selecione um curso.",
            "erro"
        );

        return;

    }

    if (!turmaId) {

        mostrarMensagemNovaLive(
            "Selecione uma turma.",
            "erro"
        );

        return;

    }

    if (!materiaId) {

        mostrarMensagemNovaLive(
            "Selecione a matéria desta aula.",
            "erro"
        );

        return;

    }

    if (!titulo) {

        mostrarMensagemNovaLive(
            "Informe o título da aula.",
            "erro"
        );

        return;

    }

    if (!dataLive) {

        mostrarMensagemNovaLive(
            "Informe a data da aula.",
            "erro"
        );

        return;

    }

    if (!horario) {

        mostrarMensagemNovaLive(
            "Informe o horário.",
            "erro"
        );

        return;

    }

    const professorId =
        await obterUsuarioIdParaLive();

    if (!professorId) {

        mostrarMensagemNovaLive(
            "Não foi possível identificar o usuário responsável pela live.",
            "erro"
        );

        return;

    }

    const dados = {

        turma_id:
            turmaId,

        materia_id:
            materiaId,

        professor_id:
            professorId,

        titulo:
            titulo,

        descricao:
            descricao ||
            null,

        youtube_url:
            youtubeUrl ||
            null,

        youtube_video_id:
            youtubeVideoId ||
            null,

        data_live:
            dataLive,

        horario_inicio:
            horario,

        horario_fim:
            null,

        status:
            status,

        updated_at:
            new Date().toISOString()

    };

    try {

        if (salvarNovaLive) {

            salvarNovaLive.disabled =
                true;

            salvarNovaLive.textContent =
                liveId
                    ? "Salvando..."
                    : "Criando...";

        }

        let resposta;

        if (liveId) {

            resposta =
                await supabaseClient
                    .from("lives")
                    .update(dados)
                    .eq(
                        "id",
                        liveId
                    )
                    .select()
                    .single();

        }

        else {

            resposta =
                await supabaseClient
                    .from("lives")
                    .insert(dados)
                    .select()
                    .single();

        }

        if (resposta.error) {

            console.error(
                "MEP EAD | Erro ao salvar live:",
                resposta.error
            );

            mostrarMensagemNovaLive(
                resposta.error.message ||
                "Não foi possível salvar a live.",
                "erro"
            );

            return;

        }

        mostrarMensagemNovaLive(
            liveId
                ? "Live atualizada com sucesso!"
                : "Live criada com sucesso!",
            "sucesso"
        );

        setTimeout(
            async () => {

                fecharModalNovaLive();

                await carregarLives();

            },
            600
        );

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao salvar live:",
            erro
        );

        mostrarMensagemNovaLive(
            "Ocorreu um erro ao salvar a live.",
            "erro"
        );

    }

    finally {

        if (salvarNovaLive) {

            salvarNovaLive.disabled =
                false;

            salvarNovaLive.textContent =
                liveId
                    ? "Salvar alterações"
                    : "Criar live";

        }

    }
}


/* =========================================================
   USUÁRIO
========================================================= */

async function obterUsuarioIdParaLive() {

    if (!usuarioAtualLive?.id) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("usuarios")
                .select("id")
                .eq(
                    "auth_id",
                    usuarioAtualLive.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "MEP EAD | Erro ao localizar usuário:",
                error
            );

            return null;

        }

        return data?.id || null;

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao obter usuário:",
            erro
        );

        return null;

    }
}


/* =========================================================
   EXCLUIR LIVE
========================================================= */

async function excluirLive(
    live
) {

    const confirmar =
        window.confirm(
            `Deseja realmente excluir a live "${live.titulo}"?`
        );

    if (!confirmar) {
        return;
    }

    try {

        const {
            error
        } =
            await supabaseClient
                .from("lives")
                .delete()
                .eq(
                    "id",
                    live.id
                );

        if (error) {

            console.error(
                "MEP EAD | Erro ao excluir live:",
                error
            );

            alert(
                error.message
            );

            return;

        }

        if (
            liveAtual &&
            String(liveAtual.id) ===
            String(live.id)
        ) {

            fecharModalGerenciarLive();

        }

        await carregarLives();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao excluir live:",
            erro
        );

        alert(
            "Não foi possível excluir a live."
        );

    }
}


/* =========================================================
   GERENCIAR LIVE
========================================================= */

async function abrirGerenciarLive(
    live
) {

    pararContagemChamada();

    pararAtualizacaoGerenciar();

    chamadaAtualLive =
        null;

    liveAtual =
        live;

    if (!gerenciarLiveModal) {
        return;
    }

    const turma =
        encontrarTurma(
            live.turma_id
        );

    const curso =
        encontrarCurso(
            turma?.curso_id
        );

    if (gerenciarLiveTitulo) {

        gerenciarLiveTitulo.textContent =
            live.titulo ||
            "Aula";

    }

    atualizarStatusGerenciar(
        live.status
    );

    if (gerenciarLiveTurma) {

        gerenciarLiveTurma.textContent =
            turma
                ? `${turma.nome}${turma.codigo ? ` • ${turma.codigo}` : ""}`
                : "Turma não encontrada";

    }

    if (gerenciarLiveCurso) {

        gerenciarLiveCurso.textContent =
            curso?.nome ||
            "Curso não encontrado";

    }

    if (gerenciarLiveTurmaInfo) {

        gerenciarLiveTurmaInfo.textContent =
            turma?.nome ||
            "Não encontrado";

    }

    if (gerenciarLiveData) {

        gerenciarLiveData.textContent =
            formatarData(
                live.data_live
            );

    }

    if (gerenciarLiveHorario) {

        gerenciarLiveHorario.textContent =
            formatarHorario(
                live.horario_inicio
            );

    }

    montarPlayerLive(
        live
    );

    limparVisualChamada();

    gerenciarLiveModal.hidden =
        false;

    document.body.classList.add(
        "modal-open"
    );

    await atualizarDadosPresenca();

    iniciarAtualizacaoGerenciar();
}


/* =========================================================
   FECHAR GERENCIAMENTO
========================================================= */

function fecharModalGerenciarLive() {

    pararAtualizacaoGerenciar();

    pararContagemChamada();

    liveAtual =
        null;

    chamadaAtualLive =
        null;

    if (gerenciarLiveModal) {

        gerenciarLiveModal.hidden =
            true;

    }

    document.body.classList.remove(
        "modal-open"
    );

    limparVisualChamada();
}


/* =========================================================
   PLAYER
========================================================= */

function montarPlayerLive(
    live
) {

    if (!livePlayer) {
        return;
    }

    const videoId =
        live.youtube_video_id ||
        extrairYoutubeId(
            live.youtube_url
        );

    if (!videoId) {

        livePlayer.innerHTML = `

            <div class="live-player-placeholder">

                <span>
                    ▶
                </span>

                <strong>
                    Transmissão do YouTube
                </strong>

                <small>
                    Nenhum vídeo foi vinculado.
                </small>

            </div>

        `;

        return;

    }

    livePlayer.innerHTML = `

        <iframe
            src="https://www.youtube.com/embed/${escaparHTML(videoId)}"
            title="${escaparHTML(live.titulo || "Live MEP EAD")}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
        ></iframe>

    `;
}


/* =========================================================
   STATUS
========================================================= */

function atualizarStatusGerenciar(
    status
) {

    const normalizado =
        normalizarStatus(
            status
        );

    if (gerenciarLiveStatus) {

        gerenciarLiveStatus.textContent =
            obterTextoStatus(
                normalizado
            );

        gerenciarLiveStatus.className =
            `live-status ${normalizado}`;

    }

    if (encerrarLiveButton) {

        encerrarLiveButton.hidden =
            normalizado !==
            "ao_vivo";

        encerrarLiveButton.disabled =
            normalizado !==
            "ao_vivo";

    }

    if (abrirChamadaButton) {

        abrirChamadaButton.disabled =
            normalizado !==
            "ao_vivo";

    }

    atualizarBotaoIniciarLive();
}


/* =========================================================
   BOTÃO INICIAR
========================================================= */

function atualizarBotaoIniciarLive() {

    if (!iniciarLiveButton) {
        return;
    }

    if (!liveAtual) {

        iniciarLiveButton.hidden =
            true;

        iniciarLiveButton.disabled =
            true;

        return;

    }

    const status =
        normalizarStatus(
            liveAtual.status
        );

    if (status === "agendada") {

        iniciarLiveButton.hidden =
            false;

        iniciarLiveButton.disabled =
            false;

        iniciarLiveButton.textContent =
            "▶ Iniciar live";

        return;

    }

    iniciarLiveButton.hidden =
        true;

    iniciarLiveButton.disabled =
        true;
}


/* =========================================================
   INICIAR LIVE
========================================================= */

async function iniciarLiveAtual() {

    if (!liveAtual) {

        alert(
            "Nenhuma live selecionada."
        );

        return;

    }

    if (
        normalizarStatus(
            liveAtual.status
        ) !==
        "agendada"
    ) {

        alert(
            "Esta live não está agendada."
        );

        return;

    }

    const confirmar =
        window.confirm(
            "Deseja iniciar esta live agora?"
        );

    if (!confirmar) {
        return;
    }

    try {

        if (iniciarLiveButton) {

            iniciarLiveButton.disabled =
                true;

            iniciarLiveButton.textContent =
                "Iniciando...";

        }

        const {
            data,
            error
        } =
            await supabaseClient
                .from("lives")
                .update({

                    status:
                        "ao_vivo",

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    liveAtual.id
                )
                .select()
                .single();

        if (error) {

            console.error(
                "MEP EAD | Erro ao iniciar live:",
                error
            );

            alert(
                error.message ||
                "Não foi possível iniciar a live."
            );

            atualizarBotaoIniciarLive();

            return;

        }

        liveAtual =
            data;

        atualizarStatusGerenciar(
            liveAtual.status
        );

        await carregarLives();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao iniciar live:",
            erro
        );

        alert(
            "Ocorreu um erro ao iniciar a live."
        );

        atualizarBotaoIniciarLive();

    }
}


/* =========================================================
   EDITAR LIVE ATUAL
========================================================= */

function editarLiveAtual() {

    if (!liveAtual) {
        return;
    }

    const liveParaEditar =
        liveAtual;

    fecharModalGerenciarLive();

    abrirEditarLive(
        liveParaEditar
    );
}


/* =========================================================
   ENCERRAR LIVE
========================================================= */

async function encerrarLiveAtual() {

    if (!liveAtual) {
        return;
    }

    const confirmar =
        window.confirm(
            "Deseja encerrar esta live?"
        );

    if (!confirmar) {
        return;
    }

    try {

        if (chamadaAtualLive) {

            await finalizarChamadaAtual();

        }

        const {
            data,
            error
        } =
            await supabaseClient
                .from("lives")
                .update({

                    status:
                        "encerrada",

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    liveAtual.id
                )
                .select()
                .single();

        if (error) {

            console.error(
                "MEP EAD | Erro ao encerrar live:",
                error
            );

            alert(
                error.message
            );

            return;

        }

        liveAtual =
            data;

        atualizarStatusGerenciar(
            liveAtual.status
        );

        await carregarLives();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao encerrar live:",
            erro
        );

    }
}


/* =========================================================
   PRESENÇA
   ABRIR CHAMADA
========================================================= */

async function abrirChamadaPresenca() {

    if (!liveAtual) {

        alert(
            "Nenhuma live selecionada."
        );

        return;

    }

    if (
        normalizarStatus(
            liveAtual.status
        ) !==
        "ao_vivo"
    ) {

        alert(
            "A live precisa estar AO VIVO para abrir uma chamada."
        );

        return;

    }

    if (chamadaAtualLive) {

        alert(
            "Já existe uma chamada aberta."
        );

        return;

    }

    if (abrirChamadaButton) {

        abrirChamadaButton.disabled =
            true;

    }

    try {

        const aulaId =
            liveAtual.id;

        const numero =
            await obterProximoNumeroChamada(
                liveAtual.turma_id
            );

        const {
            data: chamadasAtivas,
            error: erroAtiva
        } =
            await supabaseClient
                .from(TABELA_CHAMADAS)
                .select("id")
                .eq(
                    "aula_id",
                    aulaId
                )
                .eq(
                    "ativa",
                    true
                )
                .limit(1);

        if (erroAtiva) {
            throw erroAtiva;
        }

        if (
            chamadasAtivas &&
            chamadasAtivas.length
        ) {

            alert(
                "Já existe uma chamada ativa para esta aula."
            );

            if (abrirChamadaButton) {
                abrirChamadaButton.disabled =
                    false;
            }

            return;

        }

        const {
            data: chamada,
            error: erroChamada
        } =
            await supabaseClient
                .from(TABELA_CHAMADAS)
                .insert({

                    aula_id:
                        aulaId,

                    turma_id:
                        liveAtual.turma_id,

                    numero:
                        numero,

                    ativa:
                        true,

                    aberta_em:
                        new Date().toISOString(),

                    fechada_em:
                        null,

                    duracao_segundos:
                        DURACAO_CHAMADA

                })
                .select()
                .single();

        if (erroChamada) {

            console.error(
                "MEP EAD | Erro ao criar chamada:",
                erroChamada
            );

            throw erroChamada;

        }

        console.log(
            "MEP EAD | Chamada criada:",
            chamada
        );

        chamadaAtualLive =
            chamada;

        try {

            await criarPresencasDaChamada(
                chamada
            );

        }

        catch (erroPresencas) {

            console.error(
                "MEP EAD | Erro ao criar presenças:",
                erroPresencas
            );

            await cancelarChamadaComErro(
                chamada.id
            );

            chamadaAtualLive =
                null;

            throw erroPresencas;

        }

        await atualizarDadosPresenca();

        iniciarContagemChamada();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao abrir chamada:",
            erro
        );

        chamadaAtualLive =
            null;

        alert(
            erro?.message ||
            "Não foi possível abrir a chamada."
        );

        if (abrirChamadaButton) {

            abrirChamadaButton.disabled =
                false;

        }

    }
}


/* =========================================================
   PRÓXIMO NÚMERO DA CHAMADA
========================================================= */

async function obterProximoNumeroChamada(
    turmaId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(TABELA_CHAMADAS)
            .select(
                "numero"
            )
            .eq(
                "turma_id",
                turmaId
            )
            .order(
                "numero",
                {
                    ascending: false
                }
            )
            .limit(1);

    if (error) {

        console.error(
            "MEP EAD | Erro ao obter número:",
            error
        );

        throw error;

    }

    if (
        !data ||
        !data.length
    ) {

        return 1;

    }

    return (
        Number(
            data[0].numero
        ) + 1
    );
}


/* =========================================================
   CRIAR PRESENÇAS
========================================================= */

async function criarPresencasDaChamada(
    chamada
) {

    if (!liveAtual) {

        throw new Error(
            "Nenhuma live está selecionada."
        );

    }

    if (!chamada?.id) {

        throw new Error(
            "A chamada não possui ID."
        );

    }

    /*
     * AQUI ESTÁ A CORREÇÃO:
     *
     * A tabela correta é:
     *
     * turma_alunos
     *
     * e não:
     *
     * turmas_alunos
     */

    const {
        data: alunos,
        error
    } =
        await supabaseClient
            .from(TABELA_TURMA_ALUNOS)
            .select(`
                aluno_id
            `)
            .eq(
                "turma_id",
                liveAtual.turma_id
            )
            .eq(
                "ativo",
                true
            );

    if (error) {

        console.error(
            "MEP EAD | Erro ao buscar alunos:",
            error
        );

        throw error;

    }

    if (
        !alunos ||
        !alunos.length
    ) {

        console.warn(
            "MEP EAD | Nenhum aluno ativo encontrado para a turma."
        );

        return;

    }

    const registros =
        alunos.map(
            aluno => ({

                chamada_id:
                    chamada.id,

                aula_id:
                    liveAtual.id,

                turma_id:
                    liveAtual.turma_id,

                aluno_id:
                    aluno.aluno_id,

                presente:
                    false,

                respondido_em:
                    null

            })
        );

    const {
        error: presencaError
    } =
        await supabaseClient
            .from(TABELA_PRESENCAS)
            .insert(
                registros
            );

    if (presencaError) {

        console.error(
            "MEP EAD | Erro ao criar presenças:",
            presencaError
        );

        throw presencaError;

    }

    console.log(
        "MEP EAD | Registros de presença criados:",
        registros.length
    );

}


/* =========================================================
   CONTAGEM DA CHAMADA
========================================================= */

function iniciarContagemChamada() {

    pararContagemChamada();

    if (!chamadaAtualLive) {
        return;
    }

    const duracao =
        Number(
            chamadaAtualLive.duracao_segundos
        ) ||
        DURACAO_CHAMADA;

    const abertaEm =
        chamadaAtualLive.aberta_em
            ? new Date(
                chamadaAtualLive.aberta_em
            ).getTime()
            : Date.now();

    function atualizar() {

        if (!chamadaAtualLive) {
            return;
        }

        const agora =
            Date.now();

        const passado =
            Math.floor(
                (
                    agora -
                    abertaEm
                ) / 1000
            );

        const restante =
            Math.max(
                duracao -
                passado,
                0
            );

        atualizarVisualChamada(
            restante
        );

        if (
            restante <=
            0
        ) {

            finalizarChamadaAtual();

        }

    }

    atualizar();

    intervaloChamadaLive =
        setInterval(
            async () => {

                atualizar();

                await atualizarRespostasChamada();

            },
            1000
        );
}


/* =========================================================
   VISUAL DA CHAMADA
========================================================= */

function atualizarVisualChamada(
    segundos
) {

    if (presenceCurrent) {

        presenceCurrent.hidden =
            segundos <= 0;

    }

    if (presenceTimer) {

        presenceTimer.textContent =
            Math.max(
                segundos,
                0
            );

    }

    if (abrirChamadaButton) {

        abrirChamadaButton.disabled =
            segundos > 0 ||
            !liveAtual ||
            normalizarStatus(
                liveAtual?.status
            ) !==
            "ao_vivo";

    }
}


/* =========================================================
   ATUALIZAR RESPOSTAS DA CHAMADA ATUAL
========================================================= */

async function atualizarRespostasChamada() {

    if (!chamadaAtualLive) {
        return;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(TABELA_PRESENCAS)
                .select(`
                    presente
                `)
                .eq(
                    "chamada_id",
                    chamadaAtualLive.id
                );

        if (error) {

            console.error(
                "MEP EAD | Erro ao buscar respostas:",
                error
            );

            return;

        }

        const registros =
            Array.isArray(data)
                ? data
                : [];

        const total =
            registros.length;

        const respondidas =
            registros.filter(
                item =>
                    item.presente ===
                    true
            ).length;

        const naoRespondidas =
            registros.filter(
                item =>
                    item.presente ===
                    false
            ).length;

        if (presenceRespondidas) {

            presenceRespondidas.textContent =
                respondidas;

        }

        if (presenceTotalAlunos) {

            presenceTotalAlunos.textContent =
                total;

        }

        if (presenceCounter) {

            presenceCounter.textContent =
                `${respondidas}/${total}`;

        }

        console.log(
            "MEP EAD | RESPOSTAS DA CHAMADA",
            {
                chamada_id:
                    chamadaAtualLive.id,

                total:
                    total,

                responderam:
                    respondidas,

                nao_responderam:
                    naoRespondidas
            }
        );

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro nas respostas:",
            erro
        );

    }
}


/* =========================================================
   FINALIZAR CHAMADA
========================================================= */

async function finalizarChamadaAtual() {

    if (!chamadaAtualLive) {
        return;
    }

    pararContagemChamada();

    const chamada =
        chamadaAtualLive;

    const chamadaId =
        chamada.id;

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(TABELA_CHAMADAS)
                .update({

                    ativa:
                        false,

                    fechada_em:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    chamadaId
                )
                .select()
                .single();

        if (error) {

            console.error(
                "MEP EAD | Erro ao finalizar chamada:",
                error
            );

            return;

        }

        chamadaAtualLive =
            null;

        atualizarVisualChamada(
            0
        );

        if (data) {

            await atualizarUltimaChamada(
                data
            );

        }

        await atualizarDadosPresenca();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao finalizar chamada:",
            erro
        );

    }
}


/* =========================================================
   PARAR CONTAGEM
========================================================= */

function pararContagemChamada() {

    if (intervaloChamadaLive) {

        clearInterval(
            intervaloChamadaLive
        );

        intervaloChamadaLive =
            null;

    }
}


/* =========================================================
   BUSCAR TOTAL DE ALUNOS DA TURMA
========================================================= */

async function obterTotalAlunosDaTurma(
    turmaId
) {

    if (!turmaId) {
        return 0;
    }

    try {

        /*
         * O TOTAL DE ALUNOS NÃO É MAIS
         * calculado pela tabela presencas.
         *
         * O total vem diretamente de:
         *
         * turma_alunos
         *
         * porque são esses alunos que foram
         * acionados para a chamada.
         */

        const {
            data,
            error
        } =
            await supabaseClient
                .from(TABELA_TURMA_ALUNOS)
                .select(
                    "aluno_id"
                )
                .eq(
                    "turma_id",
                    turmaId
                )
                .eq(
                    "ativo",
                    true
                );

        if (error) {

            console.error(
                "MEP EAD | Erro ao obter total de alunos da turma:",
                error
            );

            return 0;

        }

        return Array.isArray(data)
            ? data.length
            : 0;

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro inesperado ao obter alunos da turma:",
            erro
        );

        return 0;

    }
}


/* =========================================================
   ATUALIZAR DADOS DA PRESENÇA
========================================================= */

async function atualizarDadosPresenca() {

    if (!liveAtual) {
        return;
    }

    try {

        /*
         * =====================================================
         * 1. BUSCAR TODAS AS CHAMADAS DESTA LIVE
         * =====================================================
         */

        const {
            data: chamadas,
            error: chamadasError
        } =
            await supabaseClient
                .from(TABELA_CHAMADAS)
                .select(`
                    id,
                    aula_id,
                    turma_id,
                    numero,
                    ativa,
                    aberta_em,
                    fechada_em,
                    duracao_segundos
                `)
                .eq(
                    "aula_id",
                    liveAtual.id
                )
                .order(
                    "numero",
                    {
                        ascending: false
                    }
                );

        if (chamadasError) {

            console.error(
                "MEP EAD | Erro ao buscar chamadas:",
                chamadasError
            );

            return;

        }

        /*
         * =====================================================
         * 2. SE NÃO EXISTE CHAMADA
         * =====================================================
         */

        if (
            !chamadas ||
            !chamadas.length
        ) {

            limparVisualChamada();

            return;

        }

        /*
         * =====================================================
         * 3. ÚLTIMA CHAMADA
         * =====================================================
         */

        const ultimaChamada =
            chamadas[0];

        /*
         * =====================================================
         * 4. CHAMADA ATIVA
         * =====================================================
         */

        const chamadaAtiva =
            chamadas.find(
                chamada =>
                    chamada.ativa === true
            );

        if (chamadaAtiva) {

            if (
                !chamadaAtualLive ||
                String(
                    chamadaAtualLive.id
                ) !==
                String(
                    chamadaAtiva.id
                )
            ) {

                chamadaAtualLive =
                    chamadaAtiva;

                iniciarContagemChamada();

            }

        }

        /*
         * =====================================================
         * 5. QUAL CHAMADA USAR
         *
         * Se existe ativa:
         * usa ativa.
         *
         * Caso contrário:
         * usa a última.
         * =====================================================
         */

        const chamadaParaContador =
            chamadaAtiva ||
            ultimaChamada;

        if (!chamadaParaContador?.id) {
            return;
        }

        /*
         * =====================================================
         * 6. TOTAL DE ALUNOS ACIONADOS
         *
         * IMPORTANTE:
         *
         * Agora o total NÃO depende de presencas.
         *
         * Ele vem da turma.
         * =====================================================
         */

        const totalAlunos =
            await obterTotalAlunosDaTurma(
                chamadaParaContador.turma_id ||
                liveAtual.turma_id
            );

        /*
         * =====================================================
         * 7. BUSCAR RESPOSTAS DA ÚLTIMA CHAMADA
         * =====================================================
         */

        const {
            data: presencas,
            error: presencasError
        } =
            await supabaseClient
                .from(TABELA_PRESENCAS)
                .select(`
                    aluno_id,
                    presente,
                    respondido_em
                `)
                .eq(
                    "chamada_id",
                    chamadaParaContador.id
                );

        if (presencasError) {

            console.error(
                "MEP EAD | Erro ao buscar presenças:",
                presencasError
            );

            return;

        }

        const registros =
            Array.isArray(presencas)
                ? presencas
                : [];

        /*
         * =====================================================
         * 8. CONTAR RESPOSTAS
         *
         * TRUE:
         * aluno respondeu SIM
         *
         * FALSE:
         * aluno ainda não respondeu
         * =====================================================
         */

        const responderam =
            registros.filter(
                registro =>
                    registro.presente === true
            ).length;

        const naoResponderam =
            registros.filter(
                registro =>
                    registro.presente === false
            ).length;

        /*
         * =====================================================
         * 9. ATUALIZAR INTERFACE
         * =====================================================
         */

        if (presenceRespondidas) {

            presenceRespondidas.textContent =
                responderam;

        }

        if (presenceTotalAlunos) {

            presenceTotalAlunos.textContent =
                totalAlunos;

        }

        if (presenceCounter) {

            presenceCounter.textContent =
                `${responderam}/${totalAlunos}`;

        }

        /*
         * =====================================================
         * 10. ÚLTIMA CHAMADA
         * =====================================================
         */

        if (!chamadaAtiva) {

            await atualizarUltimaChamada(
                ultimaChamada
            );

        }

        /*
         * =====================================================
         * 11. LOG
         * =====================================================
         */

        console.log(
            "MEP EAD | CHAMADA ATUAL",
            {
                live_id:
                    liveAtual.id,

                chamada_id:
                    chamadaParaContador.id,

                numero:
                    chamadaParaContador.numero,

                total_alunos:
                    totalAlunos,

                responderam:
                    responderam,

                nao_responderam:
                    naoResponderam
            }
        );

        /*
         * =====================================================
         * 12. RELATÓRIO
         * =====================================================
         */

        await atualizarRelatorioLive();

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao atualizar presença:",
            erro
        );

    }
}


/* =========================================================
   ÚLTIMA CHAMADA
========================================================= */

async function atualizarUltimaChamada(
    chamada
) {

    if (
        !presenceLast ||
        !chamada
    ) {
        return;
    }

    try {

        /*
         * TOTAL DE ALUNOS DA TURMA
         */

        const totalAlunos =
            await obterTotalAlunosDaTurma(
                chamada.turma_id ||
                liveAtual?.turma_id
            );

        /*
         * RESPOSTAS DA CHAMADA
         */

        const {
            data: presencas,
            error: presencasError
        } =
            await supabaseClient
                .from(TABELA_PRESENCAS)
                .select(`
                    aluno_id,
                    presente
                `)
                .eq(
                    "chamada_id",
                    chamada.id
                );

        if (presencasError) {

            console.error(
                "MEP EAD | Erro ao obter última chamada:",
                presencasError
            );

            return;

        }

        const registros =
            Array.isArray(presencas)
                ? presencas
                : [];

        const presentes =
            registros.filter(
                registro =>
                    registro.presente === true
            ).length;

        const naoResponderam =
            registros.filter(
                registro =>
                    registro.presente === false
            ).length;

        presenceLast.hidden =
            false;

        if (presenceLastResult) {

            presenceLastResult.textContent =
                `${presentes}/${totalAlunos}`;

        }

        console.log(
            "MEP EAD | ÚLTIMA CHAMADA",
            {
                chamada_id:
                    chamada.id,

                numero:
                    chamada.numero,

                total_alunos:
                    totalAlunos,

                responderam:
                    presentes,

                nao_responderam:
                    naoResponderam
            }
        );

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro na última chamada:",
            erro
        );

    }
}


/* =========================================================
   RELATÓRIO DA LIVE
========================================================= */

async function atualizarRelatorioLive() {

    if (!liveAtual) {
        return;
    }

    try {

        /*
         * =====================================================
         * 1. BUSCAR TODAS AS CHAMADAS DA LIVE
         * =====================================================
         */

        const {
            data: chamadas,
            error: chamadasError
        } =
            await supabaseClient
                .from(TABELA_CHAMADAS)
                .select(`
                    id,
                    turma_id,
                    numero,
                    ativa,
                    aberta_em,
                    fechada_em
                `)
                .eq(
                    "aula_id",
                    liveAtual.id
                )
                .order(
                    "numero",
                    {
                        ascending: false
                    }
                );

        if (chamadasError) {

            console.error(
                "MEP EAD | Erro ao buscar chamadas do relatório:",
                chamadasError
            );

            return;

        }

        if (
            !chamadas ||
            !chamadas.length
        ) {

            return;

        }

        /*
         * =====================================================
         * 2. PEGAR A ÚLTIMA CHAMADA
         * =====================================================
         */

        const ultimaChamada =
            chamadas[0];

        /*
         * =====================================================
         * 3. PEGAR O ID DA ÚLTIMA CHAMADA
         * =====================================================
         */

        const ultimaChamadaId =
            ultimaChamada.id;

        /*
         * =====================================================
         * 4. TOTAL DE ALUNOS ACIONADOS
         *
         * VEM DE turma_alunos.
         * =====================================================
         */

        const totalAlunos =
            await obterTotalAlunosDaTurma(
                ultimaChamada.turma_id ||
                liveAtual.turma_id
            );

        /*
         * =====================================================
         * 5. BUSCAR AS RESPOSTAS DA ÚLTIMA CHAMADA
         * =====================================================
         */

        const {
            data: presencas,
            error: presencasError
        } =
            await supabaseClient
                .from(TABELA_PRESENCAS)
                .select(`
                    aluno_id,
                    chamada_id,
                    presente,
                    respondido_em
                `)
                .eq(
                    "chamada_id",
                    ultimaChamadaId
                );

        if (presencasError) {

            console.error(
                "MEP EAD | Erro ao buscar respostas da última chamada:",
                presencasError
            );

            return;

        }

        const registros =
            Array.isArray(presencas)
                ? presencas
                : [];

        /*
         * =====================================================
         * 6. TRUE
         * =====================================================
         */

        const responderam =
            registros.filter(
                registro =>
                    registro.presente === true
            ).length;

        /*
         * =====================================================
         * 7. FALSE
         * =====================================================
         */

        const naoResponderam =
            registros.filter(
                registro =>
                    registro.presente === false
            ).length;

        /*
         * =====================================================
         * 8. QUANTIDADE REAL DE RESPOSTAS REGISTRADAS
         * =====================================================
         */

        const totalRegistros =
            registros.length;

        /*
         * =====================================================
         * 9. RELATÓRIO FINAL
         * =====================================================
         */

        console.log(
            "MEP EAD | RELATÓRIO DA LIVE",
            {

                live_id:
                    liveAtual.id,

                aula_id:
                    liveAtual.id,

                ultima_chamada_id:
                    ultimaChamadaId,

                numero_ultima_chamada:
                    ultimaChamada.numero,

                total_chamadas:
                    chamadas.length,

                total_alunos_acionados:
                    totalAlunos,

                total_registros_presenca:
                    totalRegistros,

                responderam:
                    responderam,

                nao_responderam:
                    naoResponderam,

                percentual_resposta:
                    totalAlunos > 0
                        ? `${Math.round(
                            (
                                responderam /
                                totalAlunos
                            ) * 100
                        )}%`
                        : "0%"

            }
        );

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro no relatório:",
            erro
        );

    }
}


/* =========================================================
   ATUALIZAÇÃO AUTOMÁTICA
========================================================= */

function iniciarAtualizacaoGerenciar() {

    pararAtualizacaoGerenciar();

    intervaloAtualizacaoLive =
        setInterval(
            async () => {

                if (!liveAtual) {
                    return;
                }

                await atualizarDadosPresenca();

            },
            3000
        );
}


/* =========================================================
   PARAR ATUALIZAÇÃO
========================================================= */

function pararAtualizacaoGerenciar() {

    if (intervaloAtualizacaoLive) {

        clearInterval(
            intervaloAtualizacaoLive
        );

        intervaloAtualizacaoLive =
            null;

    }
}


/* =========================================================
   CANCELAR CHAMADA COM ERRO
========================================================= */

async function cancelarChamadaComErro(
    chamadaId
) {

    if (!chamadaId) {
        return;
    }

    try {

        await supabaseClient
            .from(TABELA_CHAMADAS)
            .update({

                ativa:
                    false,

                fechada_em:
                    new Date().toISOString()

            })
            .eq(
                "id",
                chamadaId
            );

    }

    catch (erro) {

        console.error(
            "MEP EAD | Erro ao cancelar chamada:",
            erro
        );

    }
}


/* =========================================================
   RESUMO DAS LIVES
========================================================= */

function atualizarResumoLives() {

    const total =
        livesLista.length;

    const agendadas =
        livesLista.filter(
            live =>
                normalizarStatus(
                    live.status
                ) ===
                "agendada"
        ).length;

    const aoVivo =
        livesLista.filter(
            live =>
                normalizarStatus(
                    live.status
                ) ===
                "ao_vivo"
        ).length;

    const encerradas =
        livesLista.filter(
            live =>
                normalizarStatus(
                    live.status
                ) ===
                "encerrada"
        ).length;

    if (livesTotal) {

        livesTotal.textContent =
            total;

    }

    if (livesAgendadas) {

        livesAgendadas.textContent =
            agendadas;

    }

    if (livesAoVivo) {

        livesAoVivo.textContent =
            aoVivo;

    }

    if (livesEncerradas) {

        livesEncerradas.textContent =
            encerradas;

    }
}


/* =========================================================
   LOADING
========================================================= */

function mostrarLoadingLives() {

    if (livesLoading) {

        livesLoading.hidden =
            false;

    }

    if (livesEmpty) {

        livesEmpty.hidden =
            true;

    }
}


/* =========================================================
   ERRO
========================================================= */

function mostrarErroLives(
    mensagem
) {

    if (!livesList) {
        return;
    }

    if (livesLoading) {

        livesLoading.hidden =
            true;

    }

    if (livesEmpty) {

        livesEmpty.hidden =
            false;

        const titulo =
            livesEmpty.querySelector(
                "h3"
            );

        const texto =
            livesEmpty.querySelector(
                "p"
            );

        if (titulo) {

            titulo.textContent =
                "Não foi possível carregar as lives";

        }

        if (texto) {

            texto.textContent =
                mensagem ||
                "Ocorreu um erro.";

        }

    }

    console.error(
        "MEP EAD | Erro:",
        mensagem
    );
}


/* =========================================================
   MENSAGEM NOVA LIVE
========================================================= */

function mostrarMensagemNovaLive(
    mensagem,
    tipo
) {

    if (!novaLiveMensagem) {
        return;
    }

    novaLiveMensagem.hidden =
        false;

    novaLiveMensagem.textContent =
        mensagem;

    novaLiveMensagem.className =
        `form-message ${tipo || ""}`;
}


function limparMensagemNovaLive() {

    if (!novaLiveMensagem) {
        return;
    }

    novaLiveMensagem.hidden =
        true;

    novaLiveMensagem.textContent =
        "";

    novaLiveMensagem.className =
        "form-message";
}


/* =========================================================
   YOUTUBE
========================================================= */

function atualizarYoutubeId() {

    if (!liveYoutubeId) {
        return;
    }

    const url =
        liveYoutube?.value?.trim() ||
        "";

    liveYoutubeId.value =
        extrairYoutubeId(
            url
        );
}


/* =========================================================
   EXTRAIR YOUTUBE ID
========================================================= */

function extrairYoutubeId(
    url
) {

    if (!url) {
        return "";
    }

    const texto =
        String(
            url
        ).trim();

    const padroes = [

        /youtube\.com\/watch\?v=([^&]+)/i,

        /youtube\.com\/embed\/([^?&]+)/i,

        /youtube\.com\/live\/([^?&]+)/i,

        /youtu\.be\/([^?&]+)/i,

        /youtube\.com\/shorts\/([^?&]+)/i

    ];

    for (
        const regex of padroes
    ) {

        const resultado =
            texto.match(
                regex
            );

        if (
            resultado &&
            resultado[1]
        ) {

            return resultado[1];

        }

    }

    return "";
}


/* =========================================================
   ENCONTRAR TURMA
========================================================= */

function encontrarTurma(
    turmaId
) {

    return livesTurmas.find(
        turma =>
            String(
                turma.id
            ) ===
            String(
                turmaId
            )
    ) || null;
}


/* =========================================================
   ENCONTRAR CURSO
========================================================= */

function encontrarCurso(
    cursoId
) {

    return livesCursos.find(
        curso =>
            String(
                curso.id
            ) ===
            String(
                cursoId
            )
    ) || null;
}


/* =========================================================
   STATUS
========================================================= */

function normalizarStatus(
    status
) {

    const valor =
        String(
            status ||
            "agendada"
        )
            .toLowerCase()
            .trim();

    if (
        valor ===
        "ao vivo" ||
        valor ===
        "ao-vivo" ||
        valor ===
        "ao_vivo"
    ) {

        return "ao_vivo";

    }

    return valor;
}


function obterTextoStatus(
    status
) {

    switch (
        normalizarStatus(
            status
        )
    ) {

        case "agendada":
            return "AGENDADA";

        case "ao_vivo":
            return "AO VIVO";

        case "encerrada":
            return "ENCERRADA";

        case "cancelada":
            return "CANCELADA";

        default:
            return String(
                status ||
                "AGENDADA"
            ).toUpperCase();

    }
}


/* =========================================================
   DATA
========================================================= */

function formatarData(
    valor
) {

    if (!valor) {
        return "Não informado";
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

    return String(
        valor
    );
}


/* =========================================================
   HORÁRIO
========================================================= */

function formatarHorario(
    valor
) {

    if (!valor) {
        return "Não informado";
    }

    return String(
        valor
    ).substring(
        0,
        5
    );
}


function limparHorario(
    valor
) {

    if (!valor) {
        return "";
    }

    return String(
        valor
    ).substring(
        0,
        5
    );
}


/* =========================================================
   ESCAPAR HTML
========================================================= */

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


/* =========================================================
   LIMPAR VISUAL
========================================================= */

function limparVisualChamada() {

    if (presenceCurrent) {

        presenceCurrent.hidden =
            true;

    }

    if (presenceTimer) {

        presenceTimer.textContent =
            String(
                DURACAO_CHAMADA
            );

    }

    if (presenceRespondidas) {

        presenceRespondidas.textContent =
            "0";

    }

    if (presenceTotalAlunos) {

        presenceTotalAlunos.textContent =
            "0";

    }

    if (presenceCounter) {

        presenceCounter.textContent =
            "0/0";

    }

    if (abrirChamadaButton) {

        abrirChamadaButton.disabled =
            !liveAtual ||
            normalizarStatus(
                liveAtual?.status
            ) !==
            "ao_vivo";

    }

    if (presenceLast) {

        presenceLast.hidden =
            true;

    }

    if (presenceLastResult) {

        presenceLastResult.textContent =
            "Não informado";

    }
}


/* =========================================================
   LIMPEZA
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        pararContagemChamada();

        pararAtualizacaoGerenciar();

    }
);


/* =========================================================
   EXPOSIÇÃO GLOBAL
========================================================= */

window.carregarLives =
    carregarLives;

window.recarregarMateriasLives =
    carregarMateriasLives;

window.abrirNovaLive =
    abrirNovaLive;

window.abrirGerenciarLive =
    abrirGerenciarLive;

window.abrirChamadaPresenca =
    abrirChamadaPresenca;

window.finalizarChamadaAtual =
    finalizarChamadaAtual;

window.iniciarLiveAtual =
    iniciarLiveAtual;

window.encerrarLiveAtual =
    encerrarLiveAtual;


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarLives
    );

}
else {

    inicializarLives();

}
