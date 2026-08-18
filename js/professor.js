/* Dados da área do professor, usando os mesmos vínculos do painel administrativo. */
(function () {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    let professor, cursos = [], turmas = [], matriculas = [], lives = [];
    const $ = id => document.getElementById(id);
    const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const empty = (t, p, i = "◌") => `<div class="empty-state"><div class="empty-icon">${i}</div><h3>${esc(t)}</h3><p>${esc(p)}</p></div>`;
    const loading = text => `<div class="loading-state"><div class="loading-spinner"></div><span>${text}</span></div>`;
    const data = v => v ? new Intl.DateTimeFormat("pt-BR", { dateStyle:"medium" }).format(new Date(`${v}T00:00:00`)) : "Data não informada";
    const turma = id => turmas.find(x => x.id === id);
    const curso = x => x?.cursos?.nome || "Curso não informado";
    const nomeTurma = id => turma(id)?.nome || "Turma não informada";
    const titulos = {dashboard:"Dashboard", cursos:"Meus cursos", turmas:"Minhas turmas", aulas:"Aulas", alunos:"Alunos", lives:"Lives", presencas:"Presenças", configuracoes:"Configurações"};

    function abrirPagina(nome) {
        if (!titulos[nome]) return;
        document.querySelectorAll(".page").forEach(x => x.classList.toggle("active", x.id === `page-${nome}`));
        document.querySelectorAll("[data-page]").forEach(x => x.classList.toggle("active", x.dataset.page === nome));
        if ($("pageTitle")) $("pageTitle").textContent = titulos[nome];
        history.replaceState(null, "", `#${nome}`);
        ({cursos:renderCursos, turmas:renderTurmas, alunos:renderAlunos, aulas:renderAulas, lives:renderLives, presencas:renderPresencas}[nome] || (() => {}))();
    }

    async function sessao() {
        const {data: s} = await supabaseClient.auth.getSession();
        if (!s?.session) return false;
        const {data: u, error} = await supabaseClient.from("usuarios").select("id,nome,email,perfil,ativo").eq("auth_id", s.session.user.id).maybeSingle();
        if (error || !u || u.perfil !== "professor" || u.ativo !== true) { await supabaseClient.auth.signOut(); return false; }
        professor = u;
        $("userName").textContent = u.nome || "Professor";
        $("userAvatar").textContent = (u.nome || "P").trim()[0].toUpperCase();
        return true;
    }

    async function carregar() {
        const {data: vinculos, error} = await supabaseClient.from("turma_professores").select("turma_id").eq("professor_id", professor.id);
        /* A tabela de vínculos pode não estar liberada para perfis antigos.
           Ela serve apenas para restringir a visualização, portanto uma falha
           aqui não pode impedir o carregamento dos dados do portal. */
        if (error) console.warn("MEP EAD | Não foi possível consultar os vínculos do professor:", error.message);
        const ids = error ? [] : [...new Set((vinculos || []).map(x => x.turma_id).filter(Boolean))];
        /*
         * Instalações antigas podem ainda não ter registros em
         * turma_professores. Nesse caso mostramos os dados reais já
         * cadastrados, tal como o painel de Gestão, em vez de exibir uma
         * área vazia. Quando houver vínculo, a visão permanece restrita às
         * turmas do professor.
         */
        const consultaCursos = supabaseClient.from("cursos")
            .select("id,nome,descricao,imagem_url,ativo")
            .order("nome");
        const consultaTurmas = supabaseClient.from("turmas")
            .select("id,curso_id,nome,codigo,data_inicio,data_fim,ativa")
            .order("nome");
        const consultaMatriculas = supabaseClient.from("turma_alunos")
            .select("turma_id,aluno_id,ativo,data_matricula,usuarios(id,nome,email)")
            .eq("ativo", true);
        const consultaLives = supabaseClient.from("lives")
            .select("id,turma_id,titulo,descricao,youtube_url,data_live,horario_inicio,horario_fim,status")
            .order("data_live", {ascending:false})
            .order("horario_inicio", {ascending:false});
        if (ids.length) {
            consultaTurmas.in("id", ids);
            consultaMatriculas.in("turma_id", ids);
            consultaLives.in("turma_id", ids);
        } else {
            console.warn("MEP EAD | Professor sem vínculo de turma; exibindo os dados cadastrados na Gestão.");
        }
        const [c, t, m, l] = await Promise.all([
            consultaCursos,
            consultaTurmas,
            consultaMatriculas,
            consultaLives
        ]);
        if (c.error || t.error || m.error || l.error) throw (c.error || t.error || m.error || l.error);
        cursos = c.data || [];
        const cursosPorId = new Map(cursos.map(item => [item.id, item]));
        turmas = (t.data || []).map(item => ({ ...item, cursos: cursosPorId.get(item.curso_id) || null }));
        matriculas = m.data || []; lives = l.data || [];
    }

    function dashboard() {
        const cursosVinculados = new Set(turmas.map(x => x.curso_id).filter(Boolean));
        const alunos = new Set(matriculas.map(x => x.aluno_id).filter(Boolean));
        [["totalCursos",cursosVinculados.size],["totalTurmas",turmas.length],["totalAlunos",alunos.size],["totalAulas",lives.length]].forEach(([id,v]) => { if ($(id)) $(id).textContent = v; });
        if ($("dashboardTurmas")) $("dashboardTurmas").innerHTML = turmas.length ? turmas.slice(0,5).map(x => `<div class="teacher-dashboard-turma"><div class="teacher-dashboard-turma-info"><strong>${esc(x.nome)}</strong><span>${esc(curso(x))}</span></div><span class="teacher-dashboard-turma-count">${matriculas.filter(m=>m.turma_id===x.id).length} aluno(s)</span></div>`).join("") : empty("Nenhuma turma vinculada", "Peça à administração para vinculá-lo a uma turma.", "🎓");
        const live = lives.find(x=>x.status === "ao_vivo") || lives.find(x=>x.status === "agendada") || lives[0];
        if ($("proximaLive")) $("proximaLive").innerHTML = live ? liveCard(live) : empty("Nenhuma live cadastrada", "Quando houver uma transmissão vinculada às suas turmas, ela aparecerá aqui.", "◉");
    }

    function liveCard(x) {
        const horario = x.horario_inicio ? ` às ${esc(x.horario_inicio.slice(0,5))}` : "";
        const link = x.youtube_url ? `<p><a class="primary-button" href="${esc(x.youtube_url)}" target="_blank" rel="noopener">Abrir transmissão</a></p>` : "";
        return `<article class="teacher-live-card"><div class="teacher-live-card-header"><div><h3>${esc(x.titulo || "Live sem título")}</h3><p>${esc(nomeTurma(x.turma_id))} · ${data(x.data_live)}${horario}</p>${x.descricao ? `<p>${esc(x.descricao)}</p>` : ""}</div><span class="live-badge">${esc((x.status || "agendada").replace("_"," ").toUpperCase())}</span></div>${link}</article>`;
    }

    function renderCursos() {
        const lista = $("listaCursos"), vazio = $("cursosEmpty"); if (!lista) return;
        const cursosComTurma = cursos;
        lista.innerHTML = cursosComTurma.map(cursoItem => {
            const turmasDoCurso = turmas.filter(turmaItem => turmaItem.curso_id === cursoItem.id);
            const alunosDoCurso = matriculas.filter(matricula => turmasDoCurso.some(turmaItem => turmaItem.id === matricula.turma_id));
            const alunosUnicos = [...new Map(alunosDoCurso.map(matricula => [matricula.aluno_id, matricula])).values()];
            const turmasTexto = turmasDoCurso.map(turmaItem => turmaItem.nome).join(", ");
            const listaAlunos = alunosUnicos.length
                ? alunosUnicos.map(matricula => `<li>${esc(matricula.usuarios?.nome || "Aluno")}</li>`).join("")
                : "<li>Nenhum aluno matriculado.</li>";
            return `<article class="teacher-course-card"><div class="teacher-course-cover">${cursoItem.imagem_url?`<img src="${esc(cursoItem.imagem_url)}" alt="">`:"📚"}</div><div class="teacher-course-info"><h3>${esc(cursoItem.nome)}</h3><p>${esc(cursoItem.descricao || turmasTexto || "Curso cadastrado no sistema.")}</p><div class="teacher-course-meta"><span>${turmasDoCurso.length} turma(s)</span><span>${alunosUnicos.length} aluno(s)</span></div><div class="teacher-course-enrollments"><strong>Turmas: ${esc(turmasTexto)}</strong><span>Alunos matriculados</span><ul>${listaAlunos}</ul></div></div></article>`;
        }).join("");
        vazio.hidden = cursosComTurma.length > 0;
    }
    function renderTurmas() {
        const lista=$("listaTurmas"), vazio=$("turmasEmpty"); if(!lista)return;
        lista.innerHTML=turmas.map(x=>`<article class="teacher-turma-card" data-turma><div class="teacher-turma-card-header"><div><h3>${esc(x.nome)}</h3><p class="curso-name">${esc(curso(x))}</p></div><span class="turma-badge">${x.ativa?"ATIVA":"INATIVA"}</span></div><div class="teacher-turma-details"><div class="teacher-turma-detail"><span>ALUNOS MATRICULADOS</span><strong>${matriculas.filter(m=>m.turma_id===x.id).length}</strong></div><div class="teacher-turma-detail"><span>INÍCIO</span><strong>${data(x.data_inicio)}</strong></div></div></article>`).join("");
        vazio.hidden=turmas.length>0;
    }
    function renderAlunos() {
        const lista=$("listaAlunos"), vazio=$("alunosEmpty"); if(!lista)return;
        const unicos=new Map(); matriculas.forEach(m=>{if(!unicos.has(m.aluno_id))unicos.set(m.aluno_id,{...m,turmas:[]});unicos.get(m.aluno_id).turmas.push(`${curso(turma(m.turma_id))} · ${nomeTurma(m.turma_id)}`);});
        const dados=[...unicos.values()]; lista.innerHTML=dados.map(m=>alunoCard(m,`${esc(m.usuarios?.email || "")}<br>${esc(m.turmas.join(", "))}`,"MATRICULADO")).join(""); vazio.hidden=dados.length>0;
    }
    function alunoCard(m, detalhe, status) { return `<article class="teacher-student-card" data-aluno><div class="student-info"><div class="student-avatar">${esc((m.usuarios?.nome||"A")[0].toUpperCase())}</div><div class="student-name"><strong>${esc(m.usuarios?.nome||"Aluno")}</strong><span>${detalhe}</span></div></div><span class="student-status">${esc(status)}</span></article>`; }
    function renderAulas() { const lista=$("listaAulas"); if(lista)lista.innerHTML=lives.length?lives.map(liveCard).join(""):empty("Nenhuma aula cadastrada","As aulas ao vivo vinculadas às suas turmas aparecerão aqui.","▶"); }
    function renderLives() { const lista=$("listaLives"); if(lista)lista.innerHTML=lives.length?lives.map(liveCard).join(""):empty("Nenhuma live cadastrada","Quando uma live for vinculada às suas turmas, ela aparecerá aqui.","🔴"); }

    async function renderPresencas() {
        const lista=$("listaPresencas"); if(!lista)return; lista.innerHTML=loading("Carregando frequência dos alunos...");
        const ids=turmas.map(x=>x.id); if(!ids.length){lista.innerHTML=empty("Nenhum aluno matriculado","Não há turmas vinculadas ao seu perfil.","✓");return;}
        const {data: registros,error}=await supabaseClient.from("presencas").select("aluno_id,turma_id,presente,aula_id").in("turma_id",ids);
        if(error){console.error(error);lista.innerHTML=empty("Não foi possível carregar",error.message,"⚠️");return;}
        const mapa=new Map(); matriculas.forEach(m=>mapa.set(`${m.turma_id}:${m.aluno_id}`,{...m,total:0,presentes:0}));
        (registros||[]).forEach(r=>{const m=mapa.get(`${r.turma_id}:${r.aluno_id}`);if(m){m.total++;if(r.presente)m.presentes++;}});
        const dados=[...mapa.values()]; lista.innerHTML=dados.length?`<div class="teacher-students-list">${dados.map(m=>{const p=m.total?Math.round(m.presentes*100/m.total):0;return alunoCard(m,`${esc(curso(turma(m.turma_id)))} · ${esc(nomeTurma(m.turma_id))} · ${m.presentes}/${m.total} presença(s)`,m.total?`${p}%`:"SEM CHAMADAS");}).join("")}</div>`:empty("Nenhuma presença registrada","As frequências das suas turmas aparecerão aqui.","✓");
    }
    function busca(campo,seletor){const el=$(campo);if(el)el.addEventListener("input",()=>{const t=el.value.trim().toLowerCase();document.querySelectorAll(seletor).forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(t));});}
    busca("buscarTurma","#listaTurmas [data-turma]"); busca("buscarAluno","#listaAlunos [data-aluno]");
    $("novaAulaButton")?.addEventListener("click",()=>abrirPagina("lives"));
    $("logoutButton")?.addEventListener("click",async()=>{await supabaseClient.auth.signOut();location.replace("../index.html");});
    document.querySelectorAll("[data-page]").forEach(x=>x.addEventListener("click",()=>abrirPagina(x.dataset.page)));
    async function iniciar(){if(!await sessao()){location.replace("../index.html");return;}try{await carregar();dashboard();}catch(e){console.error("MEP EAD | Erro ao carregar a área do professor:",e);$("dashboardTurmas").innerHTML=empty("Não foi possível carregar",e.message||"Tente novamente.","⚠️");}abrirPagina(location.hash.slice(1)||"dashboard");}
    supabaseClient.auth.onAuthStateChange((e,s)=>{if(e==="SIGNED_OUT"||(e==="TOKEN_REFRESHED"&&!s))location.replace("../index.html");});
    document.readyState==="loading"?document.addEventListener("DOMContentLoaded",iniciar):iniciar();
    window.MEPProfessor={abrirPagina,recarregar:iniciar};
})();
