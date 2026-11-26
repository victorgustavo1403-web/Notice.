import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollSmoother, ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

// Rolagem suave (ScrollSmoother) padrão do sistema. A página precisa ter
// <div id="smooth-wrapper"><div id="smooth-content">…</div></div>; barras fixas e pop-ups
// (portais) ficam fora do conteúdo. No celular a suavização é mais leve.
export function useRolagemSuave(dependencias = []) {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const suave = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: window.matchMedia?.("(max-width: 768px)").matches ? 0.6 : 2,
    });
    return () => suave.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);
}
