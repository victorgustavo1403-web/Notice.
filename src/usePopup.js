import { useCallback, useLayoutEffect, useState } from "react";

// Posiciona um pop-up (renderizado em portal, com position: fixed) junto ao gatilho.
// Abre para baixo; se não couber, abre para cima. Reposiciona ao rolar/redimensionar,
// então funciona dentro de modais com scroll próprio sem ser cortado por overflow.
export function usePopupPosition(
  aberto,
  gatilhoRef,
  { largura = "igual", alturaMax = 320, folga = 8 } = {},
) {
  const [posicao, setPosicao] = useState({ estilo: null, acima: false });

  const calcular = useCallback(() => {
    const el = gatilhoRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const espacoAbaixo = vh - r.bottom - folga - 8;
    const espacoAcima = r.top - folga - 8;
    const acima =
      espacoAbaixo < Math.min(alturaMax, 240) && espacoAcima > espacoAbaixo;

    const larguraPopup = largura === "igual" ? r.width : largura;
    const left = Math.max(8, Math.min(r.left, vw - 8 - larguraPopup));

    const estilo = {
      position: "fixed",
      left,
      ...(largura === "igual"
        ? { minWidth: r.width }
        : { width: larguraPopup }),
      ...(acima
        ? {
            bottom: vh - r.top + folga,
            maxHeight: Math.min(alturaMax, espacoAcima),
          }
        : {
            top: r.bottom + folga,
            maxHeight: Math.min(alturaMax, espacoAbaixo),
          }),
    };

    setPosicao({ estilo, acima });
  }, [gatilhoRef, largura, alturaMax, folga]);

  useLayoutEffect(() => {
    if (!aberto) return;
    calcular();
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", calcular, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", calcular, true);
    };
  }, [aberto, calcular]);

  return posicao;
}
