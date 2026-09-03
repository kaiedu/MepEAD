/* Relatório PDF de frequência por aula e consolidado por turma/curso. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    let dadosAula = [], dadosConsolidados = [], cursos = [], turmas = [], lives = [];
    const $ = id => document.getElementById(id);
    const esc = valor => String(valor ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const hoje = () => new Date().toLocaleDateString("pt-BR");
    const percentual = (confirmadas, total) => total ? Math.round(confirmadas * 100 / total) : null;
    const exibirPercentual = valor => valor === null || valor === undefined ? "-" : `${valor}%`;

    function garantirPaginaPrincipal() {
        const pagina = $("page-relatorios"), principal = document.querySelector("main.main");
        if (pagina && principal && pagina.parentElement !== principal) principal.appendChild(pagina);
    }

    function formatarDataLive(valor) {
        if (!valor) return "sem data";
        const data = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
        return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleDateString("pt-BR");
    }

    function atualizarFiltroTurmas() {
        const seletor = $("relatorioTurma");
        if (!seletor) return;
        const cursoId = $("relatorioCurso")?.value || "";
        const valorAtual = seletor.value;
        const opcoes = turmas.filter(turma => !cursoId || turma.curso_id === cursoId);
        seletor.innerHTML = `<option value="">Todas as turmas</option>${opcoes.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join("")}`;
        if (opcoes.some(turma => String(turma.id) === valorAtual)) seletor.value = valorAtual;
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
        seletor.innerHTML = `<option value="">Todas as aulas e lives</option>${opcoes.map(live => {
            const turma = turmaPorId.get(live.turma_id);
            return `<option value="${esc(live.id)}">${esc(live.titulo || "Aula sem título")} · ${esc(turma?.nome || "Turma")} · ${esc(formatarDataLive(live.data_live))}</option>`;
        }).join("")}`;
        if (opcoes.some(live => String(live.id) === valorAtual)) seletor.value = valorAtual;
    }

    function preencherFiltros() {
        if ($("relatorioCurso")) $("relatorioCurso").innerHTML = `<option value="">Todos os cursos</option>${cursos.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("")}`;
        atualizarFiltroTurmas();
        atualizarFiltroLives();
    }

    function filtrados() {
        const cursoId = $("relatorioCurso")?.value || "";
        const turmaId = $("relatorioTurma")?.value || "";
        const liveId = $("relatorioLive")?.value || "";
        const base = liveId ? dadosAula.filter(item => item.live.id === liveId) : dadosConsolidados;
        return base.filter(item => (!cursoId || item.curso.id === cursoId) && (!turmaId || item.turma.id === turmaId));
    }

    function atualizarResumo() {
        const lista = filtrados();
        const liveId = $("relatorioLive")?.value || "";
        const live = lives.find(item => item.id === liveId);
        const total = lista.reduce((soma, item) => soma + item.total, 0);
        const confirmadas = lista.reduce((soma, item) => soma + item.confirmadas, 0);
        const taxa = percentual(confirmadas, total);
        if ($("relatorioResumo")) {
            $("relatorioResumo").textContent = live
                ? `${lista.length} aluno(s) na turma. Nesta aula: ${confirmadas}/${total} confirmações (${exibirPercentual(taxa)}). O PDF também mostrará o acumulado completo do curso nessa turma.`
                : `${lista.length} aluno(s)/turma no filtro. Acumulado: ${confirmadas}/${total} confirmações (${exibirPercentual(taxa)}).`;
        }
        if ($("relatorioEmpty")) $("relatorioEmpty").hidden = lista.length > 0;
    }

    async function carregarDados() {
        try {
            const [chamadasResposta, presencasResposta, cursosResposta, turmasResposta, livesResposta, matriculasResposta] = await Promise.all([
                supabaseClient.from("presencas_chamadas").select("id,aula_id,turma_id,numero,aberta_em,created_at"),
                supabaseClient.from("presencas").select("id,chamada_id,aluno_id,presente,respondido_em,created_at"),
                supabaseClient.from("cursos").select("id,nome").order("nome"),
                supabaseClient.from("turmas").select("id,curso_id,nome").order("nome"),
                supabaseClient.from("lives").select("id,turma_id,titulo,data_live,horario_inicio").order("data_live"),
                supabaseClient.from("turma_alunos").select("aluno_id,turma_id,ativo").eq("ativo", true)
            ]);
            const respostas = [chamadasResposta, presencasResposta, cursosResposta, turmasResposta, livesResposta, matriculasResposta];
            const erro = respostas.find(resposta => resposta.error)?.error;
            if (erro) throw erro;

            const chamadas = chamadasResposta.data || [];
            const presencas = presencasResposta.data || [];
            const matriculas = [...new Map((matriculasResposta.data || [])
                .filter(item => item.aluno_id && item.turma_id)
                .map(item => [`${item.aluno_id}:${item.turma_id}`, item])).values()];
            cursos = cursosResposta.data || [];
            turmas = turmasResposta.data || [];
            lives = livesResposta.data || [];

            const idsAlunos = [...new Set(matriculas.map(item => item.aluno_id).filter(Boolean))];
            const alunosResposta = idsAlunos.length
                ? await supabaseClient.from("usuarios").select("id,nome,email").in("id", idsAlunos)
                : { data:[], error:null };
            if (alunosResposta.error) throw alunosResposta.error;

            const alunosPorId = new Map((alunosResposta.data || []).map(item => [item.id, item]));
            const turmasPorId = new Map(turmas.map(item => [item.id, item]));
            const cursosPorId = new Map(cursos.map(item => [item.id, item]));
            const livesPorTurma = new Map();
            lives.forEach(live => {
                if (!livesPorTurma.has(live.turma_id)) livesPorTurma.set(live.turma_id, []);
                livesPorTurma.get(live.turma_id).push(live);
            });
            const chamadasPorTurma = new Map(), chamadasPorLive = new Map();
            chamadas.forEach(chamada => {
                if (!chamadasPorTurma.has(chamada.turma_id)) chamadasPorTurma.set(chamada.turma_id, []);
                if (!chamadasPorLive.has(chamada.aula_id)) chamadasPorLive.set(chamada.aula_id, []);
                chamadasPorTurma.get(chamada.turma_id).push(chamada);
                chamadasPorLive.get(chamada.aula_id).push(chamada);
            });
            const confirmadas = new Set(presencas.filter(item => item.presente === true).map(item => `${item.chamada_id}:${item.aluno_id}`));

            dadosConsolidados = [];
            dadosAula = [];
            matriculas.forEach(matricula => {
                const aluno = alunosPorId.get(matricula.aluno_id) || { id:matricula.aluno_id };
                const turma = turmasPorId.get(matricula.turma_id) || {};
                const curso = cursosPorId.get(turma.curso_id) || {};
                const chamadasTurma = chamadasPorTurma.get(matricula.turma_id) || [];
                const confirmadasCurso = chamadasTurma.filter(chamada => confirmadas.has(`${chamada.id}:${matricula.aluno_id}`)).length;
                const consolidado = { aluno, turma, curso, total:chamadasTurma.length, confirmadas:confirmadasCurso, frequencia:percentual(confirmadasCurso,chamadasTurma.length) };
                dadosConsolidados.push(consolidado);

                (livesPorTurma.get(matricula.turma_id) || []).forEach(live => {
                    const chamadasLive = chamadasPorLive.get(live.id) || [];
                    const confirmadasAula = chamadasLive.filter(chamada => confirmadas.has(`${chamada.id}:${matricula.aluno_id}`)).length;
                    dadosAula.push({
                        aluno, turma, curso, live,
                        total:chamadasLive.length,
                        confirmadas:confirmadasAula,
                        frequencia:percentual(confirmadasAula,chamadasLive.length),
                        totalCurso:consolidado.total,
                        confirmadasCurso:consolidado.confirmadas,
                        frequenciaCurso:consolidado.frequencia
                    });
                });
            });
            const ordenar = (a,b) => String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR") || String(a.turma.nome || "").localeCompare(String(b.turma.nome || ""), "pt-BR");
            dadosConsolidados.sort(ordenar);
            dadosAula.sort(ordenar);
            preencherFiltros();
            atualizarResumo();
        } catch (erro) {
            console.error("MEP EAD | RELATÓRIOS | Erro ao carregar:", erro);
            if ($("relatorioResumo")) $("relatorioResumo").textContent = `Não foi possível carregar: ${erro.message || "erro desconhecido"}`;
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
                const lado = Math.min(imagem.naturalWidth, imagem.naturalHeight), tela = document.createElement("canvas");
                tela.width = lado; tela.height = lado;
                tela.getContext("2d").drawImage(imagem, 0, 0, lado, lado, 0, 0, lado, lado);
                resolve(tela.toDataURL("image/png"));
            };
            imagem.onerror = () => resolve(null);
            imagem.src = logo;
        });
    }

    function camposDoPdf(campos, aulaSelecionada) {
        if (!aulaSelecionada) return campos;
        return campos.flatMap(campo => {
            if (campo === "frequencia") return ["frequenciaAula", "frequenciaCurso"];
            if (campo === "chamadas") return ["chamadasAula", "chamadasCurso"];
            return [campo];
        });
    }

    async function gerarPdf() {
        const linhas = filtrados(), escolhidos = camposSelecionados();
        if (!linhas.length) { alert("Não há alunos ou registros para gerar este relatório."); return; }
        if (!escolhidos.length) { alert("Selecione ao menos uma informação para o relatório."); return; }
        if (!window.jspdf?.jsPDF) { alert("O gerador de PDF não foi carregado. Verifique sua conexão e tente novamente."); return; }

        const cursoSelecionado = cursos.find(c => c.id === $("relatorioCurso")?.value);
        const turmaSelecionada = turmas.find(t => t.id === $("relatorioTurma")?.value);
        const liveSelecionada = lives.find(live => live.id === $("relatorioLive")?.value);
        const campos = camposDoPdf(escolhidos, Boolean(liveSelecionada));
        const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit:"mm", format:"a4", orientation:"landscape" });
        const logo = await logoBase64(), iconeLogo = await iconeLogoBase64(logo);
        const titulos = {
            nome:"Nome", email:"E-mail", curso:"Curso", turma:"Turma",
            frequencia:"Frequencia", chamadas:"Chamadas",
            frequenciaAula:"Presenca na aula", frequenciaCurso:"Frequencia no curso",
            chamadasAula:"Chamadas da aula", chamadasCurso:"Chamadas no curso"
        };
        const valor = (item, campo) => ({
            nome:item.aluno.nome || "-", email:item.aluno.email || "-", curso:item.curso.nome || "-", turma:item.turma.nome || "-",
            frequencia:exibirPercentual(item.frequencia), chamadas:`${item.confirmadas}/${item.total}`,
            frequenciaAula:exibirPercentual(item.frequencia), frequenciaCurso:exibirPercentual(item.frequenciaCurso),
            chamadasAula:`${item.confirmadas}/${item.total}`, chamadasCurso:`${item.confirmadasCurso}/${item.totalCurso}`
        })[campo];
        const subtitulo = liveSelecionada
            ? `Aula: ${liveSelecionada.titulo || "Aula"} | ${formatarDataLive(liveSelecionada.data_live)}`
            : turmaSelecionada ? `Turma: ${turmaSelecionada.nome}` : cursoSelecionado ? `Curso: ${cursoSelecionado.nome}` : "Todos os cursos e turmas";
        const margem = 15, largura = 267, coluna = largura / campos.length;
        const totalAula = linhas.reduce((soma,item) => soma + item.total,0), confirmadasAula = linhas.reduce((soma,item) => soma + item.confirmadas,0);
        const totalCurso = liveSelecionada ? linhas.reduce((soma,item) => soma + item.totalCurso,0) : totalAula;
        const confirmadasCurso = liveSelecionada ? linhas.reduce((soma,item) => soma + item.confirmadasCurso,0) : confirmadasAula;
        let y = 15, pagina = 1;

        function cabecalho() {
            pdf.setFillColor(242,242,242); pdf.roundedRect(margem,10,16,16,2,2,"F");
            if (iconeLogo) pdf.addImage(iconeLogo,"PNG",margem+2,12,12,12);
            if (logo) pdf.addImage(logo,"PNG",margem+21,11,48,13);
            pdf.setTextColor(35); pdf.setFont("helvetica","bold"); pdf.setFontSize(16); pdf.text("Relatorio de Frequencia",margem+73,16);
            pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(90); pdf.text(subtitulo,margem+73,21); pdf.text(`Gerado em ${hoje()}`,margem+73,25);
            y = 32;
            if (liveSelecionada) {
                const taxaAula = exibirPercentual(percentual(confirmadasAula,totalAula));
                const taxaCurso = exibirPercentual(percentual(confirmadasCurso,totalCurso));
                pdf.setFillColor(250,250,250); pdf.setDrawColor(220); pdf.roundedRect(margem,y,130,13,2,2,"FD"); pdf.roundedRect(margem+137,y,130,13,2,2,"FD");
                pdf.setFont("helvetica","bold"); pdf.setFontSize(7); pdf.setTextColor(80); pdf.text("PRESENCA NA AULA SELECIONADA",margem+4,y+5); pdf.text("FREQUENCIA COMPLETA DO CURSO",margem+141,y+5);
                pdf.setFontSize(10); pdf.setTextColor(30); pdf.text(`${taxaAula}  (${confirmadasAula}/${totalAula})`,margem+4,y+10); pdf.text(`${taxaCurso}  (${confirmadasCurso}/${totalCurso})`,margem+141,y+10);
                y += 18;
            }
            pdf.setFillColor(35,35,35); pdf.rect(margem,y,largura,9,"F"); pdf.setDrawColor(175); pdf.setLineWidth(.2); pdf.rect(margem,y,largura,9,"S"); pdf.setTextColor(255); pdf.setFont("helvetica","bold"); pdf.setFontSize(6.5);
            campos.forEach((campo,indice) => { const x=margem+coluna*indice; if(indice)pdf.line(x,y,x,y+9); pdf.text(titulos[campo],x+2,y+5.5); });
            y += 9;
        }
        function rodape() { pdf.setTextColor(120); pdf.setFont("helvetica","normal"); pdf.setFontSize(7); pdf.text(`MEP EAD | Pagina ${pagina}`,margem,200); }
        cabecalho(); pdf.setFont("helvetica","normal"); pdf.setFontSize(6.5); pdf.setTextColor(45);
        linhas.forEach((linha,indice) => {
            if (y > 190) { rodape(); pdf.addPage(); pagina++; cabecalho(); }
            if (indice % 2 === 0) { pdf.setFillColor(247,247,247); pdf.rect(margem,y,largura,8,"F"); }
            pdf.setDrawColor(205); pdf.setLineWidth(.15); pdf.rect(margem,y,largura,8,"S");
            const limite=Math.max(10,Math.floor(coluna/1.65));
            campos.forEach((campo,colunaIndice) => { const x=margem+coluna*colunaIndice; if(colunaIndice)pdf.line(x,y,x,y+8); const texto=String(valor(linha,campo) ?? "-"); pdf.text(texto.length>limite?`${texto.slice(0,limite-3)}...`:texto,x+2,y+5); });
            y += 8;
        });
        rodape();
        const sufixo = normalizar(liveSelecionada?.titulo || turmaSelecionada?.nome || cursoSelecionado?.nome || "geral") || "geral";
        const dataArquivo = new Date().toISOString().slice(0,10).replaceAll("-",".");
        pdf.save(`relatorio-${dataArquivo}-${sufixo}.pdf`);
    }

    garantirPaginaPrincipal();
    $("relatorioCurso")?.addEventListener("change", () => { atualizarFiltroTurmas(); atualizarFiltroLives(); atualizarResumo(); });
    $("relatorioTurma")?.addEventListener("change", () => { atualizarFiltroLives(); atualizarResumo(); });
    $("relatorioLive")?.addEventListener("change", atualizarResumo);
    $("gerarRelatorioPdf")?.addEventListener("click", gerarPdf);
    document.querySelector('[data-page="relatorios"]')?.addEventListener("click", carregarDados);
    window.MEPGestaoRelatorios = { carregar:carregarDados, gerarPdf };
    console.log("MEP EAD | RELATÓRIOS | JS carregado");
})();
