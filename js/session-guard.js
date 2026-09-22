/* MEP EAD — tratamento compartilhado de sessão expirada. */
(function () {
    "use strict";

    if (window.MEPSessionGuard) return;

    const scriptAtual = document.currentScript;
    const loginUrl = scriptAtual?.dataset?.loginUrl || "../index.html";
    let exibido = false;
    let verificando = null;

    function criarInterface() {
        let overlay = document.getElementById("mepSessionOverlay");
        if (overlay) return overlay;

        const style = document.createElement("style");
        style.textContent = `
            html.mep-session-bloqueada, html.mep-session-bloqueada body { overflow: hidden !important; }
            .mep-session-overlay { position: fixed; z-index: 2147483647; inset: 0; padding: 24px; display: grid; place-items: center; background: rgba(7,7,10,.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); font-family: Inter, Arial, sans-serif; }
            .mep-session-overlay[hidden] { display: none !important; }
            .mep-session-card { width: min(100%, 430px); padding: 34px; border: 1px solid rgba(255,255,255,.11); border-radius: 22px; background: radial-gradient(circle at 100% 0, rgba(245,34,45,.18), transparent 38%), #151519; color: #fff; text-align: center; box-shadow: 0 35px 100px rgba(0,0,0,.55); }
            .mep-session-icon { width: 58px; height: 58px; margin: 0 auto 20px; display: grid; place-items: center; border-radius: 17px; background: rgba(245,34,45,.13); color: #ff3742; }
            .mep-session-icon svg { width: 29px; height: 29px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
            .mep-session-label { display: block; margin-bottom: 9px; color: #ff4b54; font-size: 9px; font-weight: 900; letter-spacing: .17em; }
            .mep-session-card h2 { margin: 0; color: #fff; font-size: clamp(25px, 6vw, 33px); line-height: 1.08; letter-spacing: -.045em; }
            .mep-session-card p { margin: 14px auto 25px; max-width: 330px; color: #aaaab2; font-size: 13px; line-height: 1.65; }
            .mep-session-login { width: 100%; min-height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: center; gap: 16px; border: 0; border-radius: 11px; background: linear-gradient(135deg,#f5222d,#bd111b); color: #fff; font: 800 12px/1 Inter,Arial,sans-serif; cursor: pointer; box-shadow: 0 14px 35px rgba(245,34,45,.23); }
            .mep-session-login:hover { transform: translateY(-1px); }
            .mep-session-login:focus-visible { outline: 3px solid rgba(255,255,255,.7); outline-offset: 3px; }
            .mep-session-note { display: block; margin-top: 15px; color: #686871; font-size: 9px; }
            @media (max-width: 480px) { .mep-session-overlay { padding: 16px; } .mep-session-card { padding: 29px 22px; border-radius: 18px; } }
        `;
        document.head.appendChild(style);

        overlay = document.createElement("div");
        overlay.id = "mepSessionOverlay";
        overlay.className = "mep-session-overlay";
        overlay.hidden = true;
        overlay.setAttribute("role", "alertdialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "mepSessionTitle");
        overlay.innerHTML = `
            <section class="mep-session-card">
                <div class="mep-session-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"></path></svg></div>
                <span class="mep-session-label">ACESSO À PLATAFORMA</span>
                <h2 id="mepSessionTitle">Sua sessão terminou</h2>
                <p id="mepSessionMessage">Por segurança, é necessário entrar novamente para continuar usando o MEP EAD.</p>
                <button type="button" class="mep-session-login" id="mepSessionLogin">Ir para o login <span aria-hidden="true">→</span></button>
                <small class="mep-session-note">Seus dados e seu progresso continuam salvos.</small>
            </section>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector("#mepSessionLogin")?.addEventListener("click", () => window.location.replace(loginUrl));
        return overlay;
    }

    function mostrar(opcoes = {}) {
        const overlay = criarInterface();
        const titulo = opcoes.titulo || "Sua sessão terminou";
        const mensagem = opcoes.mensagem || "Por segurança, é necessário entrar novamente para continuar usando o MEP EAD.";
        overlay.querySelector("#mepSessionTitle").textContent = titulo;
        overlay.querySelector("#mepSessionMessage").textContent = mensagem;
        overlay.hidden = false;
        document.documentElement.classList.add("mep-session-bloqueada");
        exibido = true;
        window.setTimeout(() => overlay.querySelector("#mepSessionLogin")?.focus(), 30);
    }

    async function verificar() {
        if (exibido) return false;
        if (verificando) return verificando;
        verificando = (async () => {
            try {
                if (!window.supabaseClient?.auth) {
                    mostrar({ mensagem: "Não foi possível validar seu acesso. Entre novamente para continuar." });
                    return false;
                }
                const { data: sessao, error: erroSessao } = await window.supabaseClient.auth.getSession();
                if (erroSessao || !sessao?.session) {
                    mostrar();
                    return false;
                }
                const { data: usuario, error: erroUsuario } = await window.supabaseClient.auth.getUser();
                if (erroUsuario || !usuario?.user) {
                    mostrar();
                    return false;
                }
                return true;
            } catch (_) {
                mostrar({ mensagem: "Não foi possível validar sua sessão. Entre novamente para continuar." });
                return false;
            } finally {
                verificando = null;
            }
        })();
        return verificando;
    }

    window.MEPSessionGuard = { mostrar, verificar, irParaLogin: () => window.location.replace(loginUrl) };

    window.supabaseClient?.auth?.onAuthStateChange?.((evento, sessao) => {
        if (evento === "SIGNED_OUT" || (!sessao && evento === "TOKEN_REFRESHED")) mostrar();
    });
    window.addEventListener("pageshow", () => verificar());
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") verificar();
    });
    verificar();
})();
