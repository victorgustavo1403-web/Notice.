// Rede de segurança: se algum campo cair na validação nativa do navegador, a mensagem
// aparece em português (e não no idioma do navegador). Os formulários principais já validam
// por conta própria, com mensagens no padrão do sistema.
function mensagemPara(campo) {
  const v = campo.validity;
  if (v.valueMissing) {
    if (campo.type === "checkbox") return "Marque esta opção para continuar.";
    if (campo.tagName === "SELECT") return "Selecione uma opção.";
    return "Preencha este campo.";
  }
  if (v.typeMismatch) {
    if (campo.type === "email") return "Informe um e-mail válido, como nome@exemplo.com.";
    if (campo.type === "url") return "Informe um endereço válido, começando com http:// ou https://.";
    return "O valor informado não é válido.";
  }
  if (v.tooShort) return `Use pelo menos ${campo.minLength} caracteres.`;
  if (v.tooLong) return `Use no máximo ${campo.maxLength} caracteres.`;
  if (v.patternMismatch) return campo.title || "O formato informado não é válido.";
  if (v.rangeUnderflow) return `O valor mínimo é ${campo.min}.`;
  if (v.rangeOverflow) return `O valor máximo é ${campo.max}.`;
  if (v.stepMismatch || v.badInput) return "O valor informado não é válido.";
  return "Verifique este campo.";
}

export function ativarValidacaoPt() {
  document.addEventListener(
    "invalid",
    (e) => {
      const campo = e.target;
      if (!(campo instanceof HTMLElement) || !("setCustomValidity" in campo)) return;
      campo.setCustomValidity("");
      campo.setCustomValidity(mensagemPara(campo));
    },
    true,
  );
  // limpa a mensagem personalizada assim que o usuário corrige o campo
  const limpar = (e) => {
    if (e.target && "setCustomValidity" in e.target) e.target.setCustomValidity("");
  };
  document.addEventListener("input", limpar, true);
  document.addEventListener("change", limpar, true);
}
