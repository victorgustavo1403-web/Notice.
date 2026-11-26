import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePopupPosition } from "./usePopup.js";
import { chaveData, dataDoEvento, formatarDataEvento, hojeChave } from "./datas.js";
import "./styles/DatePicker.css";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const SEMANA = [
  ["D", "Domingo"], ["S", "Segunda"], ["T", "Terça"], ["Q", "Quarta"],
  ["Q", "Quinta"], ["S", "Sexta"], ["S", "Sábado"],
];

const somarDias = (chave, n) => {
  const d = dataDoEvento(chave);
  d.setDate(d.getDate() + n);
  return chaveData(d);
};
const somarMeses = (chave, n) => {
  const d = dataDoEvento(chave);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return chaveData(d);
};
const indiceMes = (chave) => {
  const d = dataDoEvento(chave);
  return d.getFullYear() * 12 + d.getMonth();
};

/**
 * Seletor de data no estilo do sistema (substitui <input type="date">).
 * value / min: 'YYYY-MM-DD'.  Dias antes de `min` aparecem apagados e não podem ser escolhidos.
 * Teclado: setas movem o dia, PageUp/PageDown mudam o mês, Enter escolhe, Esc fecha.
 */
export default function DatePicker({
  value,
  onChange,
  min,
  placeholder = "Selecionar data",
  clearable = true,
  disabled = false,
  id,
  ariaLabel,
  ariaLabelledBy,
}) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(null); // dia (chave) com foco do teclado
  const [visao, setVisao] = useState(null); // um dia qualquer do mês exibido
  const gatilho = useRef(null);
  const popup = useRef(null);
  const focarDia = useRef(false);

  const hoje = hojeChave();
  const { estilo, acima } = usePopupPosition(aberto, gatilho, {
    largura: 308,
    alturaMax: 460,
  });

  const abrir = () => {
    if (disabled) return;
    const inicio = value || (min && min > hoje ? min : hoje);
    setVisao(inicio);
    setFoco(inicio);
    focarDia.current = true;
    setAberto(true);
  };

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  };

  const bloqueado = (chave) => Boolean(min) && chave < min;

  const escolher = (chave) => {
    if (bloqueado(chave)) return;
    onChange?.(chave);
    fechar();
  };

  // Clique fora fecha
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (gatilho.current?.contains(e.target) || popup.current?.contains(e.target))
        return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  // Leva o foco para o dia certo (ao abrir e na navegação por teclado)
  useEffect(() => {
    if (!aberto || !focarDia.current) return;
    const el = popup.current?.querySelector(`[data-dia="${foco}"]`);
    if (el) {
      el.focus();
      focarDia.current = false;
    }
  }, [aberto, foco, visao, estilo]);

  useEffect(() => {
    if (disabled) setAberto(false);
  }, [disabled]);

  // Grade do mês exibido
  const dias = useMemo(() => {
    if (!visao) return [];
    const base = dataDoEvento(visao);
    const ano = base.getFullYear();
    const mes = base.getMonth();
    const lista = [];
    for (let i = 0; i < new Date(ano, mes, 1).getDay(); i++) lista.push(null);
    for (let d = 1; d <= new Date(ano, mes + 1, 0).getDate(); d++)
      lista.push(chaveData(new Date(ano, mes, d)));
    return lista;
  }, [visao]);

  const tituloMes = visao
    ? `${MESES[dataDoEvento(visao).getMonth()]} ${dataDoEvento(visao).getFullYear()}`
    : "";

  const podeVoltar = !min || (visao && indiceMes(visao) > indiceMes(min));

  const irParaMes = (n) => {
    if (n < 0 && !podeVoltar) return;
    const novo = somarMeses(visao, n);
    setVisao(novo);
    // mantém um alvo de foco válido dentro do mês novo (para o Tab)
    const d = dataDoEvento(novo);
    const primeiro = chaveData(new Date(d.getFullYear(), d.getMonth(), 1));
    setFoco(min && primeiro < min && indiceMes(min) === indiceMes(novo) ? min : primeiro);
  };

  const moverFoco = (novoFoco) => {
    if (min && novoFoco < min) novoFoco = min; // não deixa fugir para antes do mínimo
    focarDia.current = true;
    setFoco(novoFoco);
    if (indiceMes(novoFoco) !== indiceMes(visao)) setVisao(novoFoco);
  };

  const aoTeclar = (e) => {
    const mapa = {
      ArrowLeft: () => moverFoco(somarDias(foco, -1)),
      ArrowRight: () => moverFoco(somarDias(foco, 1)),
      ArrowUp: () => moverFoco(somarDias(foco, -7)),
      ArrowDown: () => moverFoco(somarDias(foco, 7)),
      PageUp: () => moverFoco(somarMeses(foco, -1)),
      PageDown: () => moverFoco(somarMeses(foco, 1)),
      Home: () => moverFoco(somarDias(foco, -dataDoEvento(foco).getDay())),
      End: () => moverFoco(somarDias(foco, 6 - dataDoEvento(foco).getDay())),
    };
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // fecha só o calendário, não o modal por trás
      fechar();
    } else if (mapa[e.key]) {
      e.preventDefault();
      mapa[e.key]();
    }
  };

  // Teclado no gatilho: setas abrem
  const aoTeclarGatilho = (e) => {
    if (e.key === "Escape" && aberto) {
      e.preventDefault();
      e.stopPropagation();
      fechar();
    } else if (!aberto && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      abrir();
    }
  };

  return (
    <>
      <div className={`dp-campo ${aberto ? "aberto" : ""} ${disabled ? "desabilitado" : ""}`}>
        <button
          type="button"
          id={id}
          ref={gatilho}
          className="dp-gatilho"
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          onClick={() => (aberto ? fechar(false) : abrir())}
          onKeyDown={aoTeclarGatilho}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
            <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
          </svg>
          <span className={value ? "" : "vazio"}>
            {value ? formatarDataEvento(value) : placeholder}
          </span>
        </button>

        {clearable && value && !disabled && (
          <button
            type="button"
            className="dp-limpar"
            aria-label="Remover data"
            title="Remover data"
            onClick={() => onChange?.("")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        )}
      </div>

      {aberto &&
        estilo &&
        visao &&
        createPortal(
          <div
            ref={popup}
            role="dialog"
            aria-label="Escolher data"
            className={`dp-popup ${acima ? "acima" : ""}`}
            style={estilo}
            onKeyDown={aoTeclar}
          >
            <div className="dp-topo">
              <button
                type="button"
                className="dp-nav"
                aria-label="Mês anterior"
                disabled={!podeVoltar}
                onClick={() => irParaMes(-1)}
              >
                <svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 1.5L2 7l5.5 5.5" /></svg>
              </button>
              <div className="dp-titulo" aria-live="polite">{tituloMes}</div>
              <button
                type="button"
                className="dp-nav"
                aria-label="Próximo mês"
                onClick={() => irParaMes(1)}
              >
                <svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 1.5L7 7l-5.5 5.5" /></svg>
              </button>
            </div>

            <div className="dp-semana" aria-hidden="true">
              {SEMANA.map(([letra, nome], i) => (
                <span key={i} title={nome}>{letra}</span>
              ))}
            </div>

            <div className="dp-grade" role="grid" key={tituloMes}>
              {dias.map((chave, i) => {
                if (!chave) return <span key={`v${i}`} className="dp-vazio" />;
                const passado = bloqueado(chave);
                const sel = chave === value;
                return (
                  <button
                    type="button"
                    key={chave}
                    data-dia={chave}
                    tabIndex={chave === foco ? 0 : -1}
                    aria-label={formatarDataEvento(chave)}
                    aria-pressed={sel}
                    aria-disabled={passado || undefined}
                    title={passado ? "Data que já passou" : undefined}
                    className={
                      "dp-dia" +
                      (sel ? " selecionado" : "") +
                      (chave === hoje ? " hoje" : "") +
                      (passado ? " passado" : "")
                    }
                    onClick={() => escolher(chave)}
                    onFocus={() => setFoco(chave)}
                  >
                    {Number(chave.slice(8))}
                  </button>
                );
              })}
            </div>

            <div className="dp-rodape">
              <button
                type="button"
                className="dp-atalho"
                disabled={bloqueado(hoje)}
                onClick={() => escolher(hoje)}
              >
                Hoje
              </button>
              {clearable && value && (
                <button
                  type="button"
                  className="dp-atalho sutil"
                  onClick={() => {
                    onChange?.("");
                    fechar();
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
