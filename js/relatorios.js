/* Relatório PDF de frequência, baseado nos registros reais de presencas. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    let dados = [], cursos = [], turmas = [], lives = [];
    const $ = id => document.getElementById(id);
    const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const hoje = () => new Date().toLocaleDateString("pt-BR");

    /* Mantém a página fora dos modais legados de Lives. */
    function garantirPaginaPrincipal() {
        const pagina = $("page-relatorios");
        const principal = document.querySelector("main.main");
        if (pagina && principal && pagina.parentElement !== principal) {
            principal.appendChild(pagina);
        }
    }

    function preencherFiltros() {
        $("relatorioCurso").innerHTML = `<option value="">Todos os cursos</option>${cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join("")}`;
        $("relatorioTurma").innerHTML = `<option value="">Todas as turmas</option>${turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join("")}`;
        atualizarFiltroLives();
    }

    function atualizarFiltroLives() {
        const seletor = $("relatorioLive");
        if (!seletor) return;
        const cursoId = $("relatorioCurso")?.value || "";
        const turmaId = $("relatorioTurma")?.value || "";
        const valorAtual = seletor.value;
        const turmaPorId = new Map(turmas.map(turma => [turma.id, turma]));
        const opcoes = lives.filter(live => {
            const turma = turmaPorId.get(live.turma_id);
            return (!turmaId || live.turma_id === turmaId) && (!cursoId || turma?.curso_id === cursoId);
        });
        seletor.innerHTML = `<option value="">Todas as aulas e lives</option>${opcoes.map(live => `<option value="${live.id}">${live.titulo || "Aula sem título"} · ${formatarDataLive(live.data_live)}</option>`).join("")}`;
        if ([...seletor.options].some(opcao => opcao.value === valorAtual)) seletor.value = valorAtual;
    }

    function filtrados() {
        const cursoId = $("relatorioCurso").value;
        const turmaId = $("relatorioTurma").value;
        const liveId = $("relatorioLive")?.value || "";
        return dados.filter(item => (!cursoId || item.curso.id === cursoId) && (!turmaId || item.turma.id === turmaId) && (!liveId || item.live.id === liveId));
    }

    function formatarDataLive(valor) {
        if (!valor) return "sem data";
        const data = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
        return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleDateString("pt-BR");
    }

    function atualizarResumo() {
        const lista = filtrados();
        $("relatorioResumo").textContent = `${lista.length} aluno(s) com registro(s) de presença no filtro selecionado.`;
        $("relatorioEmpty").hidden = lista.length > 0;
    }

    async function carregarDados() {
        try {
            const { data: presencas, error } = await supabaseClient.from("presencas")
                .select("chamada_id,aluno_id,presente,respondido_em,created_at");
            if (error) throw error;
            const registros = presencas || [];
            const idsChamadas = [...new Set(registros.map(item => item.chamada_id).filter(Boolean))];
            const { data: chamadas, error: erroChamadas } = idsChamadas.length
                ? await supabaseClient.from("presencas_chamadas").select("id,aula_id,turma_id,numero").in("id", idsChamadas)
                : { data: [], error: null };
            if (erroChamadas) throw erroChamadas;
            const chamadasPorId = new Map((chamadas || []).map(item => [item.id, item]));
            const registrosComContexto = registros.map(registro => ({ ...registro, chamada: chamadasPorId.get(registro.chamada_id) }))
                .filter(registro => registro.chamada?.aula_id && registro.chamada?.turma_id);
            const idsAlunos = [...new Set(registros.map(item => item.aluno_id).filter(Boolean))];
            const idsTurmas = [...new Set(registrosComContexto.map(item => item.chamada.turma_id))];
            const idsLives = [...new Set(registrosComContexto.map(item => item.chamada.aula_id))];
            const [alunosResposta, turmasResposta, cursosResposta, livesResposta] = await Promise.all([
                idsAlunos.length ? supabaseClient.from("usuarios").select("id,nome,email").in("id", idsAlunos) : Promise.resolve({ data: [] }),
                idsTurmas.length ? supabaseClient.from("turmas").select("id,curso_id,nome").in("id", idsTurmas) : Promise.resolve({ data: [] }),
                supabaseClient.from("cursos").select("id,nome").order("nome"),
                idsLives.length ? supabaseClient.from("lives").select("id,turma_id,titulo,data_live,horario_inicio").in("id", idsLives) : Promise.resolve({ data: [] })
            ]);
            const erro = [alunosResposta, turmasResposta, cursosResposta, livesResposta].find(resposta => resposta.error)?.error;
            if (erro) throw erro;
            cursos = cursosResposta.data || [];
            turmas = turmasResposta.data || [];
            lives = livesResposta.data || [];
            const alunosPorId = new Map((alunosResposta.data || []).map(item => [item.id, item]));
            const turmasPorId = new Map(turmas.map(item => [item.id, item]));
            const cursosPorId = new Map(cursos.map(item => [item.id, item]));
            const livesPorId = new Map(lives.map(item => [item.id, item]));
            const grupos = new Map();
            registrosComContexto.forEach(item => {
                const turmaId = item.chamada.turma_id;
                const liveId = item.chamada.aula_id;
                const chave = `${item.aluno_id}:${turmaId}:${liveId}`;
                if (!grupos.has(chave)) grupos.set(chave, { alunoId:item.aluno_id, turmaId, liveId, total:0, confirmadas:0 });
                const grupo = grupos.get(chave); grupo.total++;
                if (item.presente === true) grupo.confirmadas++;
            });
            dados = [...grupos.values()].map(grupo => {
                const turma = turmasPorId.get(grupo.turmaId) || {};
                return { aluno: alunosPorId.get(grupo.alunoId) || {}, turma, curso: cursosPorId.get(turma.curso_id) || {}, live: livesPorId.get(grupo.liveId) || { id: grupo.liveId, titulo: "Aula" }, total:grupo.total, confirmadas:grupo.confirmadas, frequencia:grupo.total ? Math.round(grupo.confirmadas * 100 / grupo.total) : 0 };
            }).sort((a, b) => String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR"));
            preencherFiltros(); atualizarResumo();
        } catch (erro) {
            console.error("MEP EAD | RELATÓRIOS | Erro ao carregar:", erro);
            $("relatorioResumo").textContent = `Não foi possível carregar: ${erro.message || "erro desconhecido"}`;
        }
    }

    function camposSelecionados() {
        return [...document.querySelectorAll(".relatorio-fields input:checked")].map(input => input.value);
    }

    async function logoBase64() {
        for (const caminho of ["../img/logopreta.png", "../assets/logos/logopreta.png", "../assets/logos/logo.png"]) {
            try {
                const resposta = await fetch(caminho);
                if (!resposta.ok) continue;
                const blob = await resposta.blob();
                return await new Promise(resolve => { const leitor = new FileReader(); leitor.onload = () => resolve(leitor.result); leitor.onerror = () => resolve(null); leitor.readAsDataURL(blob); });
            } catch { /* tenta a próxima localização */ }
        }
        return null;
    }

    async function iconeLogoBase64(logo) {
        if (!logo) return null;
        return await new Promise(resolve => {
            const imagem = new Image();
            imagem.onload = () => {
                const lado = Math.min(imagem.naturalWidth, imagem.naturalHeight);
                const tela = document.createElement("canvas");
                tela.width = lado;
                tela.height = lado;
                tela.getContext("2d").drawImage(imagem, 0, 0, lado, lado, 0, 0, lado, lado);
                resolve(tela.toDataURL("image/png"));
            };
            imagem.onerror = () => resolve(null);
            imagem.src = logo;
        });
    }

    async function gerarPdf() {
        const linhas = filtrados(), campos = camposSelecionados();
        if (!linhas.length) { alert("Não há registros de presença para gerar este relatório."); return; }
        if (!campos.length) { alert("Selecione ao menos uma informação para o relatório."); return; }
        if (!window.jspdf?.jsPDF) { alert("O gerador de PDF não foi carregado. Verifique sua conexão e tente novamente."); return; }
        const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit:"mm", format:"a4", orientation:"landscape" });
        const logo = await logoBase64();
        const iconeLogo = await iconeLogoBase64(logo);
        const titulos = { nome:"Nome", email:"E-mail", curso:"Curso", turma:"Turma", frequencia:"Frequência", chamadas:"Chamadas respondidas" };
        const valor = (item, campo) => ({ nome:item.aluno.nome || "—", email:item.aluno.email || "—", curso:item.curso.nome || "—", turma:item.turma.nome || "—", frequencia:`${item.frequencia}%`, chamadas:`${item.confirmadas}/${item.total}` })[campo];
        const cursoSelecionado = cursos.find(c => c.id === $("relatorioCurso").value);
        const turmaSelecionada = turmas.find(t => t.id === $("relatorioTurma").value);
        const liveSelecionada = lives.find(live => live.id === $("relatorioLive")?.value);
        const subtitulo = liveSelecionada
            ? `Aula/live: ${liveSelecionada.titulo || "Aula"} · ${formatarDataLive(liveSelecionada.data_live)}`
            : turmaSelecionada ? `Turma: ${turmaSelecionada.nome}` : cursoSelecionado ? `Curso: ${cursoSelecionado.nome}` : "Todos os cursos e turmas";
        const margem = 15, largura = 267, coluna = largura / campos.length;
        let y = 15, pagina = 1;
        function cabecalho() {
            pdf.setFillColor(242, 242, 242); pdf.roundedRect(margem, 10, 16, 16, 2, 2, "F");
            if (iconeLogo) pdf.addImage(iconeLogo, "PNG", margem + 2, 12, 12, 12);
            if (logo) pdf.addImage(logo, "PNG", margem + 21, 11, 48, 13);
            pdf.setTextColor(35); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text("Relatório de Frequência", margem + 73, 16);
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(90); pdf.text(subtitulo, margem + 73, 21); pdf.text(`Gerado em ${hoje()}`, margem + 73, 25);
            y = 34; pdf.setFillColor(35,35,35); pdf.rect(margem, y, largura, 9, "F"); pdf.setDrawColor(175); pdf.setLineWidth(.2); pdf.rect(margem, y, largura, 9, "S"); pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
            campos.forEach((campo, indice) => { const x = margem + coluna * indice; if (indice) pdf.line(x, y, x, y + 9); pdf.text(titulos[campo], x + 2, y + 5.5); });
            y += 9;
        }
        function rodape() { pdf.setTextColor(120); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.text(`MEP EAD | Página ${pagina}`, margem, 200); }
        cabecalho(); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(45);
        linhas.forEach((linha, indice) => {
            if (y > 190) { rodape(); pdf.addPage(); pagina++; cabecalho(); }
            if (indice % 2 === 0) { pdf.setFillColor(247,247,247); pdf.rect(margem, y, largura, 8, "F"); }
            pdf.setDrawColor(200); pdf.setLineWidth(.15); pdf.rect(margem, y, largura, 8, "S");
            const limite = Math.max(13, Math.floor(coluna / 1.7));
            campos.forEach((campo, colunaIndice) => { const x = margem + coluna * colunaIndice; if (colunaIndice) pdf.line(x, y, x, y + 8); const texto = String(valor(linha, campo)); pdf.text(texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto, x + 2, y + 5); });
            y += 8;
        });
        rodape();
        const sufixo = normalizar(liveSelecionada?.titulo || turmaSelecionada?.nome || cursoSelecionado?.nome || "geral") || "geral";
        const dataArquivo = new Date().toISOString().slice(0,10).replaceAll("-", ".");
        pdf.save(`relatorio-${dataArquivo}-${sufixo}.pdf`);
    }

    garantirPaginaPrincipal();
    $("relatorioCurso")?.addEventListener("change", () => { atualizarFiltroLives(); atualizarResumo(); });
    $("relatorioTurma")?.addEventListener("change", () => { atualizarFiltroLives(); atualizarResumo(); });
    $("relatorioLive")?.addEventListener("change", atualizarResumo);
    $("gerarRelatorioPdf")?.addEventListener("click", gerarPdf);
    document.querySelector('[data-page="relatorios"]')?.addEventListener("click", carregarDados);
    console.log("MEP EAD | RELATÓRIOS | JS carregado");
})();
