/* MEP EAD | Sala de controle do professor. */
(() => {
    "use strict";
    if (typeof supabaseClient === "undefined") return;

    const DURATION = 15;
    const state = { usuario:null, live:null, turma:null, curso:null, materia:null, chamadas:[], presencas:[], ativa:null, totalAlunos:0, timer:null, channels:[], chatIds:new Set(), chatOpen:false, unread:0, finalizando:false };
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const norm = value => String(value || "").trim().toLowerCase().replaceAll("-","_").replaceAll(" ","_");
    const isLive = () => norm(state.live?.status) === "ao_vivo";
    const formatDate = value => value ? new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`)) : "Data não informada";
    const formatTime = value => value ? String(value).slice(0,5) : "—";
    const formatClock = value => value ? new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date(value)) : "—";

    function toast(title,text,type="") { const box=$("teacherToast");if(!box)return;$("teacherToastTitle").textContent=title;$("teacherToastText").textContent=text;box.className=`teacher-toast ${type}`;box.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.hidden=true,4500); }
    function statusLabel(status){return({ao_vivo:"AO VIVO",agendada:"AGENDADA",encerrada:"ENCERRADA",encerrado:"ENCERRADA",finalizada:"FINALIZADA",finalizado:"FINALIZADA"})[norm(status)]||String(status||"AGENDADA").replaceAll("_"," ").toUpperCase();}
    function emptyHistory(){return `<div class="teacher-empty"><span>✓</span><strong>Nenhuma chamada realizada</strong><p>As chamadas desta aula aparecerão aqui.</p></div>`;}

    async function authenticate() {
        const {data:{session}}=await supabaseClient.auth.getSession(); if(!session)return false;
        const {data,error}=await supabaseClient.from("usuarios").select("id,nome,email,perfil,ativo,foto_url").eq("auth_id",session.user.id).maybeSingle();
        if(error||!data||norm(data.perfil)!=="professor"||data.ativo!==true)return false;
        state.usuario=data; const first=(data.nome||"Professor").trim().split(/\s+/)[0]; $("classroomUserName").textContent=data.nome||"Professor"; $("classroomUserAvatar").textContent=first.charAt(0).toUpperCase(); return true;
    }

    async function loadClass() {
        const id=new URLSearchParams(location.search).get("id"); if(!id)throw new Error("A aula não foi informada.");
        const {data,error}=await supabaseClient.rpc("professor_sala_dados",{p_live_id:id});
        if(error)throw error;if(!data?.live)throw new Error("Aula não encontrada ou não vinculada ao seu perfil.");
        state.live=data.live;state.turma=data.turma;state.curso=data.curso;state.materia=data.materia;
        state.chamadas=Array.isArray(data.chamadas)?data.chamadas:[];
        state.presencas=Array.isArray(data.presencas)?data.presencas:[];
        state.ativa=state.chamadas.find(item=>item.ativa)||null;
        state.totalAlunos=Number(data.total_alunos)||0;
        $("summaryStudents").textContent=state.totalAlunos;
        renderClass();renderPresence();if(state.ativa)startTimer();else stopTimer();
        $("chatMessages").replaceChildren();state.chatIds.clear();
        (Array.isArray(data.chat)?data.chat:[]).forEach(message=>addMessage(message));
        if(!state.chatIds.size)showChatEmpty();
    }

    function renderClass() {
        const status=norm(state.live.status), badge=$("classroomStatus"), indicator=document.querySelector(".classroom-live-indicator");
        $("classroomTitle").textContent=state.live.titulo||"Aula";$("classroomDescription").textContent=state.live.descricao||state.materia?.nome||"Sala de controle da aula.";$("classroomCourse").textContent=state.curso?.nome||"Curso";$("classroomClass").textContent=state.turma?.nome||"Turma";$("classroomSchedule").textContent=`${formatDate(state.live.data_live)} · ${formatTime(state.live.horario_inicio)}`;
        badge.textContent=statusLabel(status);badge.className=`classroom-status ${status}`;indicator.classList.toggle("is-live",isLive());$("classroomOperation").textContent=isLive()?"Aula acontecendo agora":status==="agendada"?"Aguardando início da aula":"Aula encerrada";
        $("openPresenceButton").disabled=!isLive()||Boolean(state.ativa);$("presenceGuidance").querySelector("p").textContent=isLive()?"Cada chamada permanece aberta por 15 segundos e é encerrada automaticamente.":"A chamada ficará disponível quando a aula estiver ao vivo.";
        $("chatInput").disabled=!isLive(); updateChatForm();
    }

    async function loadPresence() {
        const {data:calls,error}=await supabaseClient.from("presencas_chamadas").select("id,aula_id,turma_id,numero,ativa,aberta_em,fechada_em,duracao_segundos").eq("aula_id",state.live.id).order("numero",{ascending:false});if(error)throw error;state.chamadas=calls||[];
        const ids=state.chamadas.map(item=>item.id);if(ids.length){const {data,error:presenceError}=await supabaseClient.from("presencas").select("id,chamada_id,aluno_id,presente,respondido_em").in("chamada_id",ids);if(presenceError)throw presenceError;state.presencas=data||[];}else state.presencas=[];
        state.ativa=state.chamadas.find(item=>item.ativa)||null;renderPresence();if(state.ativa)startTimer();else stopTimer();
    }

    function callStats(id){const rows=state.presencas.filter(item=>String(item.chamada_id)===String(id));return{total:rows.length,answered:rows.filter(item=>item.presente===true).length,last:rows.filter(item=>item.respondido_em).sort((a,b)=>String(b.respondido_em).localeCompare(String(a.respondido_em)))[0]?.respondido_em};}
    function renderPresence() {
        const activeStats=state.ativa?callStats(state.ativa.id):{total:0,answered:0};$("presenceAnswered").textContent=activeStats.answered;$("presenceTotal").textContent=activeStats.total;$("summaryCalls").textContent=state.chamadas.length;
        const allLast=state.presencas.filter(item=>item.respondido_em).sort((a,b)=>String(b.respondido_em).localeCompare(String(a.respondido_em)))[0];$("summaryLastResponse").textContent=allLast?formatClock(allLast.respondido_em):"—";
        if(state.ativa){$("presenceSequence").textContent=`CHAMADA ${state.ativa.numero} ABERTA`;$("presenceSequence").classList.add("active");$("presenceControlEyebrow").textContent="CHAMADA EM ANDAMENTO";$("presenceControlTitle").textContent="Aguardando confirmações";$("presenceControlText").textContent="As respostas dos alunos aparecem aqui em tempo real.";}else{$("presenceSequence").textContent=state.chamadas.length?`${state.chamadas.length} ${state.chamadas.length===1?"CHAMADA REALIZADA":"CHAMADAS REALIZADAS"}`:"NENHUMA CHAMADA";$("presenceSequence").classList.remove("active");$("presenceControlEyebrow").textContent=isLive()?"PRONTO PARA INICIAR":"CHAMADA INDISPONÍVEL";$("presenceControlTitle").textContent=isLive()?"Abra uma chamada quando desejar":"A aula não está ao vivo";$("presenceControlText").textContent=isLive()?"Os alunos receberão um aviso para confirmar a presença durante 15 segundos.":"Quando a gestão colocar a aula ao vivo, o controle será liberado.";$("presenceSeconds").textContent=DURATION;$("presenceTimer").style.setProperty("--progress","0deg");}
        $("openPresenceButton").disabled=!isLive()||Boolean(state.ativa);
        $("presenceHistory").innerHTML=state.chamadas.length?state.chamadas.map(call=>{const stats=callStats(call.id),percent=stats.total?Math.round(stats.answered*100/stats.total):0;return`<article class="presence-history-item"><span class="presence-history-number">${esc(call.numero)}</span><div><strong>Chamada ${esc(call.numero)}${call.ativa?" · em andamento":""}</strong><small>${esc(formatClock(call.aberta_em))} · janela de ${Number(call.duracao_segundos)||DURATION}s</small></div><span class="presence-history-result"><strong>${stats.answered}/${stats.total}</strong><small>${percent}% responderam</small></span></article>`;}).join(""):emptyHistory();
    }

    function stopTimer(){clearInterval(state.timer);state.timer=null;}
    function startTimer(){stopTimer();const call=state.ativa;if(!call)return;const duration=Number(call.duracao_segundos)||DURATION,opened=new Date(call.aberta_em).getTime();const tick=async()=>{if(!state.ativa)return;const remaining=Math.max(0,duration-Math.floor((Date.now()-opened)/1000));$("presenceSeconds").textContent=remaining;$("presenceTimer").style.setProperty("--progress",`${((duration-remaining)/duration)*360}deg`);if(remaining<=0&&!state.finalizando){stopTimer();await finishCall(call.id);}};tick();state.timer=setInterval(tick,500);}

    async function openCall(){if(!isLive()||state.ativa)return;const button=$("openPresenceButton");button.disabled=true;try{const{data,error}=await supabaseClient.rpc("professor_abrir_chamada",{p_aula_id:state.live.id,p_duracao_segundos:DURATION});if(error)throw error;toast("Chamada aberta",`${data?.total_alunos??0} aluno(s) foram acionados.`);await loadPresence();}catch(error){console.error(error);toast("Não foi possível abrir a chamada",error.message||"Tente novamente.","error");button.disabled=false;}}
    async function finishCall(id){state.finalizando=true;try{const{error}=await supabaseClient.rpc("professor_finalizar_chamada",{p_chamada_id:id});if(error)throw error;await loadPresence();}catch(error){console.error(error);toast("Erro ao encerrar chamada",error.message||"Atualize a página.","error");}finally{state.finalizando=false;}}

    async function loadStudentTotal(){const{count,error}=await supabaseClient.from("turma_alunos").select("id",{count:"exact",head:true}).eq("turma_id",state.live.turma_id).eq("ativo",true);if(!error)$("summaryStudents").textContent=count||0;}
    async function loadChat(){const{data,error}=await supabaseClient.rpc("chat_mensagens_com_autores",{p_live_id:state.live.id,p_limite:300});if(error)throw error;$("chatMessages").replaceChildren();state.chatIds.clear();(data||[]).forEach(message=>addMessage(message));if(!(data||[]).length)showChatEmpty();}
    function showChatEmpty(){if($("chatMessages").children.length)return;$("chatMessages").innerHTML=`<div class="teacher-chat-empty" id="chatEmpty"><span>◌</span><strong>Nenhuma mensagem ainda</strong><p>As mensagens da turma aparecerão aqui em tempo real.</p></div>`;}
    async function completeAuthor(message){if(String(message.aluno_id)===String(state.usuario.id))return{...message,autor:state.usuario};const{data,error}=await supabaseClient.rpc("chat_mensagem_com_autor",{p_mensagem_id:message.id});if(error){console.warn("MEP EAD | Autor da mensagem não identificado:",error);return message;}return data||message;}
    function addMessage(message,{newMessage=false}={}){if(!message?.id||state.chatIds.has(message.id))return;state.chatIds.add(message.id);$("chatEmpty")?.remove();const teacher=norm(message.autor?.perfil)==="professor"||String(message.aluno_id)===String(state.usuario.id),name=message.autor?.nome||(teacher?"Professor":"Aluno"),article=document.createElement("article");article.className=`teacher-chat-message ${teacher?"professor":""}`;article.innerHTML=`<div class="teacher-chat-avatar">${esc(name.charAt(0).toUpperCase())}</div><div class="teacher-chat-bubble"><strong>${esc(name)}${teacher?"<b>PROFESSOR</b>":""}</strong><time>${esc(formatClock(message.created_at))}</time><p>${esc(message.mensagem)}</p></div>`;$("chatMessages").append(article);$("chatMessages").scrollTop=$("chatMessages").scrollHeight;if(newMessage&&!state.chatOpen){state.unread++;updateUnread();}}
    function updateUnread(){const badge=$("chatUnreadBadge");badge.textContent=state.unread>99?"99+":state.unread;badge.hidden=!state.unread;}
    function openChat(){state.chatOpen=true;state.unread=0;updateUnread();$("chatDrawer").hidden=false;$("chatDrawer").setAttribute("aria-hidden","false");document.body.classList.add("chat-open");setTimeout(()=>$("chatInput")?.focus(),80);}
    function closeChat(){state.chatOpen=false;$("chatDrawer").hidden=true;$("chatDrawer").setAttribute("aria-hidden","true");document.body.classList.remove("chat-open");}
    function updateChatForm(){const value=$("chatInput")?.value||"";$("chatCharacterCount").textContent=`${value.length}/1000`;$("chatSendButton").disabled=!isLive()||!value.trim();}
    async function sendChat(event){event.preventDefault();const input=$("chatInput"),message=input.value.trim();if(!message||!isLive())return;$("chatSendButton").disabled=true;try{const{data,error}=await supabaseClient.from("chat_mensagens").insert({live_id:state.live.id,aluno_id:state.usuario.id,mensagem:message}).select("id,live_id,aluno_id,mensagem,created_at").single();if(error)throw error;addMessage({...data,autor:state.usuario});input.value="";updateChatForm();input.focus();}catch(error){console.error(error);toast("Mensagem não enviada",error.message||"Tente novamente.","error");updateChatForm();}}

    function subscribeRealtime(){const calls=supabaseClient.channel(`professor-calls-${state.live.id}`).on("postgres_changes",{event:"*",schema:"public",table:"presencas_chamadas",filter:`aula_id=eq.${state.live.id}`},()=>loadPresence().catch(console.error)).on("postgres_changes",{event:"*",schema:"public",table:"presencas",filter:`aula_id=eq.${state.live.id}`},()=>loadPresence().catch(console.error)).subscribe();const chat=supabaseClient.channel(`professor-chat-${state.live.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_mensagens",filter:`live_id=eq.${state.live.id}`},async payload=>addMessage(await completeAuthor(payload.new),{newMessage:true})).subscribe();const live=supabaseClient.channel(`professor-live-${state.live.id}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"lives",filter:`id=eq.${state.live.id}`},payload=>{state.live={...state.live,...payload.new};renderClass();renderPresence();}).subscribe();state.channels.push(calls,chat,live);}
    function cleanup(){stopTimer();state.channels.forEach(channel=>supabaseClient.removeChannel?.(channel));state.channels=[];}
    function bindEvents(){$("openPresenceButton")?.addEventListener("click",openCall);$("refreshPresenceButton")?.addEventListener("click",()=>loadPresence().catch(error=>toast("Erro ao atualizar",error.message,"error")));$("openChatButton")?.addEventListener("click",openChat);$("closeChatButton")?.addEventListener("click",closeChat);$("chatBackdrop")?.addEventListener("click",closeChat);$("chatInput")?.addEventListener("input",updateChatForm);$("chatForm")?.addEventListener("submit",sendChat);document.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.chatOpen)closeChat();});window.addEventListener("beforeunload",cleanup);}
    async function init(){bindEvents();if(!await authenticate()){location.replace("../index.html");return;}try{await loadClass();subscribeRealtime();}catch(error){console.error("MEP EAD | Sala do professor:",error);toast("Não foi possível abrir a sala",error.message||"Tente novamente.","error");$("classroomTitle").textContent="Sala indisponível";$("classroomDescription").textContent=error.message||"A aula não pôde ser carregada.";}}
    document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();
