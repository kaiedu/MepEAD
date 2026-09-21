/* MEP EAD | Portal operacional do professor. */
(() => {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    const state = { usuario:null, vinculos:[], cursos:[], turmas:[], matriculas:[], lives:[], materias:[], chamadas:[], carregando:false, atualizadoEm:null };
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const norm = value => String(value || "").trim().toLowerCase().replaceAll("-","_").replaceAll(" ","_");
    const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone:"America/Sao_Paulo" });
    const formatDate = value => value ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`)) : "Data não informada";
    const formatTime = value => value ? String(value).slice(0,5) : "Horário não informado";
    const curso = id => state.cursos.find(item => String(item.id) === String(id));
    const turma = id => state.turmas.find(item => String(item.id) === String(id));
    const materia = id => state.materias.find(item => String(item.id) === String(id));
    const courseFromClass = classId => curso(turma(classId)?.curso_id);

    function toast(title, text, type = "") {
        const box = $("teacherToast"); if (!box) return;
        $("teacherToastTitle").textContent = title; $("teacherToastText").textContent = text;
        box.className = `teacher-toast ${type}`; box.hidden = false;
        clearTimeout(toast.timer); toast.timer = setTimeout(() => { box.hidden = true; }, 4500);
    }

    function empty(title, text, icon = "◌") {
        return `<div class="teacher-empty"><span>${icon}</span><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
    }

    function statusLabel(status) {
        return ({ao_vivo:"AO VIVO",agendada:"AGENDADA",encerrada:"ENCERRADA",encerrado:"ENCERRADA",finalizada:"FINALIZADA",finalizado:"FINALIZADA"})[norm(status)] || String(status || "AGENDADA").replaceAll("_"," ").toUpperCase();
    }

    function openPage(name, event) {
        event?.preventDefault();
        if (![$("page-inicio"),$("page-aulas"),$("page-turmas"),$("page-alunos")].some(page => page?.id === `page-${name}`)) name = "inicio";
        document.querySelectorAll(".teacher-page").forEach(page => page.classList.toggle("active", page.id === `page-${name}`));
        document.querySelectorAll("[data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === name));
        const titles = {inicio:"Visão geral",aulas:"Minhas aulas",turmas:"Minhas turmas",alunos:"Alunos"};
        if ($("pageTitle")) $("pageTitle").textContent = titles[name];
        history.replaceState(null,"",`#${name}`); window.scrollTo({top:0,behavior:"smooth"});
        if (name === "aulas") renderClasses();
        if (name === "turmas") renderClassesGroups();
        if (name === "alunos") renderStudents();
    }

    async function authenticate() {
        const { data:{ session } } = await supabaseClient.auth.getSession();
        if (!session) return false;
        const { data, error } = await supabaseClient.from("usuarios").select("id,nome,email,perfil,ativo,foto_url").eq("auth_id",session.user.id).maybeSingle();
        if (error || !data || norm(data.perfil) !== "professor" || data.ativo !== true) return false;
        state.usuario = data;
        const first = (data.nome || "Professor").trim().split(/\s+/)[0];
        $("userName").textContent = data.nome || "Professor";
        $("userAvatar").textContent = first.charAt(0).toUpperCase();
        if (data.foto_url) {
            $("userAvatar").style.backgroundImage = `url("${String(data.foto_url).replaceAll('"','%22')}")`;
            $("userAvatar").classList.add("has-photo");
        }
        $("welcomeTitle").textContent = `Bem-vindo, ${first}.`;
        return true;
    }

    async function loadData() {
        const { data, error } = await supabaseClient.rpc("professor_portal_dados");
        if (error) throw error;
        if (!data?.professor) throw new Error("O Supabase não retornou o perfil do professor.");
        state.usuario = { ...state.usuario, ...data.professor };
        state.vinculos = Array.isArray(data.vinculos) ? data.vinculos : [];
        state.cursos = Array.isArray(data.cursos) ? data.cursos : [];
        state.turmas = Array.isArray(data.turmas) ? data.turmas : [];
        state.matriculas = Array.isArray(data.matriculas) ? data.matriculas : [];
        state.lives = Array.isArray(data.lives) ? data.lives : [];
        state.materias = Array.isArray(data.materias) ? data.materias : [];
        state.chamadas = Array.isArray(data.chamadas) ? data.chamadas : [];
        state.atualizadoEm = data.atualizado_em || new Date().toISOString();
    }

    function roomUrl(live) { return `./aula.html?id=${encodeURIComponent(live.id)}`; }

    function nextRelevantClass() {
        const now = new Date();
        const withDate = state.lives.map(item => ({
            item,
            moment: new Date(`${item.data_live || "1970-01-01"}T${String(item.horario_inicio || "00:00:00").slice(0,8)}-03:00`)
        }));
        const live = withDate.find(entry => norm(entry.item.status) === "ao_vivo");
        if (live) return live.item;
        const future = withDate.filter(entry => norm(entry.item.status) === "agendada" && entry.moment >= now)
            .sort((a,b) => a.moment - b.moment)[0];
        if (future) return future.item;
        return withDate.sort((a,b) => b.moment - a.moment)[0]?.item;
    }

    function renderAll() {
        renderDashboard();
        renderClasses();
        renderClassesGroups();
        renderStudents();
    }

    async function refreshData({ silencioso = false } = {}) {
        if (state.carregando) return;
        state.carregando = true;
        try {
            await loadData();
            renderAll();
            if (!silencioso) toast("Dados atualizados", "As informações mais recentes do Supabase já estão na tela.");
        } catch (error) {
            console.error("MEP EAD | Atualização do portal do professor:", error);
            if (!silencioso) toast("Não foi possível atualizar", error.message || "Tente novamente.", "error");
            throw error;
        } finally {
            state.carregando = false;
        }
    }

    function renderDashboard() {
        const students = new Set(state.matriculas.map(item => item.aluno_id));
        $("totalAulas").textContent=state.lives.length; $("totalTurmas").textContent=state.turmas.length; $("totalAlunos").textContent=students.size; $("totalChamadas").textContent=state.chamadas.length;
        const todayCount=state.lives.filter(item => item.data_live===hoje()).length; $("aulasHojeTexto").textContent=todayCount?`${todayCount} ${todayCount===1?"aula hoje":"aulas hoje"}`:"Nenhuma aula hoje";
        const liveCount=state.lives.filter(item => norm(item.status)==="ao_vivo").length; $("navLiveCount").hidden=!liveCount; $("navLiveCount").textContent=liveCount;
        const next=nextRelevantClass(), content=$("nextClassContent"), badge=$("nextClassStatus");
        if (!next) { content.innerHTML=empty("Nenhuma aula vinculada","Quando uma aula for atribuída a você, ela aparecerá aqui.","▦"); badge.textContent="SEM AULAS"; badge.className="teacher-live-dot"; }
        else {
            const status=norm(next.status), cls=turma(next.turma_id), crs=courseFromClass(next.turma_id);
            $("nextClassHeading").textContent=status==="ao_vivo"?"Aula acontecendo agora":"Próxima aula"; badge.textContent=statusLabel(status); badge.className=`teacher-live-dot ${status}`;
            content.innerHTML=`<article class="next-class-card"><small>${esc(crs?.nome||"MEP EAD")} · ${esc(cls?.nome||"Turma")}</small><h4>${esc(next.titulo||"Aula")}</h4><p>${esc(next.descricao||"Entre na sala para conduzir a chamada e acompanhar o chat da turma.")}</p><div class="next-class-meta"><span>${esc(formatDate(next.data_live))}</span><span>${esc(formatTime(next.horario_inicio))}</span><span>${esc(materia(next.materia_id)?.nome||"Matéria não informada")}</span></div><div class="next-class-actions"><button type="button" class="room-button ${status==="ao_vivo"?"live":""}" data-room="${esc(next.id)}">${status==="ao_vivo"?"Entrar na sala ao vivo":"Abrir sala de controle"}</button></div></article>`;
        }
        $("dashboardTurmas").innerHTML=state.turmas.length?state.turmas.slice(0,5).map(item=>`<article class="teacher-compact-item"><span>${esc((item.nome||"T").charAt(0).toUpperCase())}</span><div><strong>${esc(item.nome)}</strong><small>${esc(curso(item.curso_id)?.nome||"Curso")} · ${state.matriculas.filter(enrollment=>enrollment.turma_id===item.id).length} alunos</small></div></article>`).join(""):empty("Nenhuma turma vinculada","A gestão precisa vincular seu perfil a uma turma.","▤");
    }

    function classCard(item) {
        const dateValue=item.data_live?new Date(`${item.data_live}T12:00:00Z`):null, status=norm(item.status), cls=turma(item.turma_id), crs=courseFromClass(item.turma_id);
        const day=dateValue?String(dateValue.getUTCDate()).padStart(2,"0"):"—", month=dateValue?dateValue.toLocaleDateString("pt-BR",{month:"short",timeZone:"UTC"}).replace(".","").toUpperCase():"DATA";
        return `<article class="teacher-class-card ${status==="ao_vivo"?"is-live":""}" data-search="${esc(`${item.titulo} ${cls?.nome} ${crs?.nome}`.toLowerCase())}" data-status="${status}"><div class="teacher-class-date"><strong>${day}</strong><span>${esc(month)}</span></div><div class="teacher-class-info"><small>${esc(crs?.nome||"Curso")} · ${esc(cls?.nome||"Turma")} · ${esc(formatTime(item.horario_inicio))}</small><h3>${esc(item.titulo||"Aula sem título")}</h3><p>${esc(materia(item.materia_id)?.nome||item.descricao||"Sala de controle da aula")}</p></div><div class="teacher-class-actions"><span class="status-badge ${status}">${esc(statusLabel(status))}</span><button type="button" data-room="${esc(item.id)}">Abrir sala <span>→</span></button></div></article>`;
    }

    function renderClasses() {
        const search=String($("buscarAula")?.value||"").trim().toLowerCase(), filter=$("filtroAulaStatus")?.value||"";
        const items=state.lives.filter(item=>(!filter||norm(item.status)===filter)&&(!search||`${item.titulo} ${turma(item.turma_id)?.nome} ${courseFromClass(item.turma_id)?.nome}`.toLowerCase().includes(search)));
        $("aulasCount").textContent=`${state.lives.length} ${state.lives.length===1?"aula":"aulas"}`; $("listaAulas").innerHTML=items.length?items.map(classCard).join(""):empty("Nenhuma aula encontrada",state.lives.length?"Ajuste os filtros utilizados.":"A gestão ainda não vinculou aulas ao seu perfil.","▦");
    }

    function renderClassesGroups() {
        const search=String($("buscarTurma")?.value||"").trim().toLowerCase();
        const items=state.turmas.filter(item=>!search||`${item.nome} ${item.codigo} ${curso(item.curso_id)?.nome}`.toLowerCase().includes(search));
        $("turmasCount").textContent=`${state.turmas.length} ${state.turmas.length===1?"turma":"turmas"}`;
        $("listaTurmas").innerHTML=items.length?items.map(item=>`<article class="teacher-turma-card"><header><span>${esc(curso(item.curso_id)?.nome||"CURSO")}</span><h3>${esc(item.nome)}</h3><p>${esc(item.codigo||item.descricao||"Turma MEP EAD")}</p></header><div><span><small>ALUNOS ATIVOS</small><strong>${state.matriculas.filter(enrollment=>enrollment.turma_id===item.id).length}</strong></span><span><small>AULAS</small><strong>${state.lives.filter(live=>live.turma_id===item.id).length}</strong></span></div></article>`).join(""):empty("Nenhuma turma encontrada",state.turmas.length?"Ajuste sua pesquisa.":"A gestão precisa vincular uma turma ao seu perfil.","▤");
    }

    function renderStudents() {
        const map=new Map(); state.matriculas.forEach(item=>{const current=map.get(item.aluno_id)||{...item,classes:[]};current.classes.push(turma(item.turma_id)?.nome||"Turma");map.set(item.aluno_id,current);});
        const search=String($("buscarAluno")?.value||"").trim().toLowerCase(); const students=[...map.values()].filter(item=>!search||`${item.usuarios?.nome} ${item.usuarios?.email} ${item.classes.join(" ")}`.toLowerCase().includes(search));
        $("alunosCount").textContent=`${map.size} ${map.size===1?"aluno":"alunos"}`;
        $("listaAlunos").innerHTML=students.length?students.map(item=>`<article class="teacher-student-card"><div class="student-profile"><div class="student-avatar">${esc((item.usuarios?.nome||"A").charAt(0).toUpperCase())}</div><div><strong>${esc(item.usuarios?.nome||"Aluno")}</strong><small>${esc(item.usuarios?.email||"E-mail não informado")}</small></div></div><div class="student-classes">${esc(item.classes.join(" · "))}</div><span class="student-active">ATIVO</span></article>`).join(""):empty("Nenhum aluno encontrado",map.size?"Ajuste sua pesquisa.":"Não há matrículas ativas nas suas turmas.","♙");
    }

    function bindEvents() {
        document.querySelectorAll("[data-page]").forEach(item=>item.addEventListener("click",event=>openPage(item.dataset.page,event)));
        document.addEventListener("click",event=>{const button=event.target.closest("[data-room]");if(button) location.href=roomUrl({id:button.dataset.room});});
        $("buscarAula")?.addEventListener("input",renderClasses); $("filtroAulaStatus")?.addEventListener("change",renderClasses); $("buscarTurma")?.addEventListener("input",renderClassesGroups); $("buscarAluno")?.addEventListener("input",renderStudents);
        $("logoutButton")?.addEventListener("click",async()=>{await supabaseClient.auth.signOut();location.replace("../index.html");});
        window.addEventListener("hashchange",()=>openPage(location.hash.slice(1)||"inicio"));
        document.addEventListener("visibilitychange",()=>{
            if (document.visibilityState === "visible" && state.usuario) refreshData({silencioso:true}).catch(()=>{});
        });
        window.setInterval(()=>{
            if (document.visibilityState === "visible" && state.usuario) refreshData({silencioso:true}).catch(()=>{});
        },60000);
    }

    async function init() {
        bindEvents();
        if (!await authenticate()) { location.replace("../index.html"); return; }
        try { await loadData(); renderAll(); openPage(location.hash.slice(1)||"inicio"); }
        catch(error){ console.error("MEP EAD | Portal do professor:",error); toast("Não foi possível carregar o portal",error.message||"Tente novamente.","error"); $("nextClassContent").innerHTML=empty("Dados indisponíveis","Atualize a página em alguns instantes.","!"); }
    }
    document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();
