/* MEP EAD — ajustes do aplicativo instalado no Android. */
(function () {
    "use strict";

    const raiz = document.documentElement;
    const consultaStandalone = window.matchMedia?.("(display-mode: standalone)");

    function estaInstalado() {
        return Boolean(consultaStandalone?.matches || window.navigator.standalone === true);
    }

    function sincronizarViewport() {
        const altura = window.visualViewport?.height || window.innerHeight;
        raiz.style.setProperty("--mep-app-height", `${Math.round(altura)}px`);
        raiz.classList.toggle("mep-app-instalado", estaInstalado());
    }

    async function liberarOrientacaoDoAplicativo() {
        if (!estaInstalado() || !window.screen?.orientation) return;

        try {
            window.screen.orientation.unlock?.();
        } catch (_) {
            /* A API não está disponível em todos os navegadores. */
        }

        try {
            await window.screen.orientation.lock?.("any");
        } catch (_) {
            /* Em algumas versões do Android o manifesto já resolve a orientação. */
        }
    }

    function atualizarAplicativoInstalado() {
        sincronizarViewport();
        liberarOrientacaoDoAplicativo();
    }

    window.addEventListener("resize", sincronizarViewport, { passive: true });
    window.addEventListener("orientationchange", () => {
        sincronizarViewport();
        window.setTimeout(sincronizarViewport, 180);
    }, { passive: true });
    window.visualViewport?.addEventListener("resize", sincronizarViewport, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") atualizarAplicativoInstalado();
    });
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) atualizarAplicativoInstalado();
    });
    consultaStandalone?.addEventListener?.("change", atualizarAplicativoInstalado);

    atualizarAplicativoInstalado();
})();
