// Regras de quem enxerga o quê (hierarquia de perfis).
//   aluno (comum) < professor < coordenação < administrador < super_admin
// A coordenação só lê (como o professor), mas também acessa a Área dos funcionários.
// Cada "área" é uma categoria que exige um nível mínimo para ser vista.
const NIVEL = { comum: 1, professor: 2, coordenacao: 3, administrador: 4, super_admin: 5 };

const AREA_PROFESSOR = 'Área do professor';
const AREA_FUNCIONARIOS = 'Área dos funcionários';

function normalizar(texto = '') {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// nível mínimo exigido por categoria (nome normalizado); as demais são livres
const NIVEL_DA_CATEGORIA = {
    [normalizar(AREA_PROFESSOR)]: NIVEL.professor,
    [normalizar(AREA_FUNCIONARIOS)]: NIVEL.coordenacao,
};

function nivelExigido(nomeCategoria) {
    return NIVEL_DA_CATEGORIA[normalizar(nomeCategoria)] || NIVEL.comum;
}

function podeVerCategoria(tipo, nomeCategoria) {
    return (NIVEL[tipo] || 0) >= nivelExigido(nomeCategoria);
}

module.exports = { NIVEL, AREA_PROFESSOR, AREA_FUNCIONARIOS, podeVerCategoria, nivelExigido, normalizar };
