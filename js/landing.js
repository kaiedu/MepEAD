/* MEP EAD | Interações visuais da apresentação institucional */
(function () {
    "use strict";

    const header = document.getElementById("siteHeader");
    const revealItems = document.querySelectorAll(".reveal:not(.is-visible)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateHeader() {
        if (header) {
            header.classList.toggle("scrolled", window.scrollY > 24);
        }
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    if (reduceMotion || !("IntersectionObserver" in window)) {
        revealItems.forEach(item => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.14, rootMargin: "0px 0px -40px" }
    );

    revealItems.forEach(item => observer.observe(item));
})();
