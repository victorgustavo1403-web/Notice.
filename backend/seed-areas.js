// Popula o banco com professores, funcionários (administradores) e publicações
// de exemplo para as áreas restritas. Pode rodar mais de uma vez: não duplica nada.
// Rode com:  node seed-areas.js
// (a migração do tipo "professor" roda sozinha ao carregar o db.js)

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { criarPublicacao } = require('./publicacoes');

const SENHA = 'senha123';
const hash = bcrypt.hashSync(SENHA, 10);

const usuarios = [
    { rm: '40001', nome: 'Marcelo Antunes',  email: 'marcelo.antunes@notice.test', tipo: 'professor',     telefone: '11988880001' },
    { rm: '40002', nome: 'Patrícia Lemos',   email: 'patricia.lemos@notice.test',  tipo: 'professor',     telefone: '11988880002' },
    { rm: '40003', nome: 'Rogério Tavares',  email: 'rogerio.tavares@notice.test', tipo: 'professor',     telefone: null },
    { rm: '50001', nome: 'Helena Corrêa',    email: 'helena.correa@notice.test',   tipo: 'administrador', telefone: null },
    { rm: '50002', nome: 'Carlos Menezes',   email: 'carlos.menezes@notice.test',  tipo: 'administrador', telefone: null },
];

const inserir = db.prepare(`
    INSERT OR IGNORE INTO usuarios (rm, nome, email, senha, tipo, telefone)
    VALUES (@rm, @nome, @email, @senha, @tipo, @telefone)
`);
for (const u of usuarios) inserir.run({ ...u, senha: hash });

// ---------- publicações ----------
const cat = (nome) => db.prepare('SELECT id FROM categorias WHERE nome = ?').get(nome).id;
const autorFuncionario = db.prepare("SELECT id FROM usuarios WHERE rm = '50001'").get().id;
const autorFuncionario2 = db.prepare("SELECT id FROM usuarios WHERE rm = '50002'").get().id;

// data daqui a N dias (YYYY-MM-DD, fuso de Brasília)
function emDias(n) {
    const d = new Date(Date.now() + n * 86400000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

// copia uma imagem padrão para /uploads e devolve o caminho público
const UPLOADS = path.join(__dirname, 'uploads');
function imagem(nome) {
    const origem = path.join(__dirname, '..', 'src', 'assets', 'img', 'padroes', `${nome}.png`);
    if (!fs.existsSync(origem)) return null;
    fs.mkdirSync(UPLOADS, { recursive: true });
    const destino = `seed-${nome}.png`;
    fs.copyFileSync(origem, path.join(UPLOADS, destino));
    return `/uploads/${destino}`;
}

const professor = cat('Área do professor');
const funcionarios = cat('Área dos funcionários');

const publicacoes = [
    { titulo: 'Reunião pedagógica do bimestre', categoria_id: professor, autor_id: autorFuncionario, img: 'P1', data_evento: emDias(3),
      conteudo: '<p><strong>Reunião pedagógica</strong> com todos os professores para fechamento do bimestre.</p><p>Tragam as notas lançadas e os relatórios das turmas.</p>' },
    { titulo: 'Prazo para entrega de diários', categoria_id: professor, autor_id: autorFuncionario2, img: 'P2', data_evento: emDias(8),
      conteudo: '<p>Os diários de classe devem ser entregues à secretaria até esta data.</p><p>Atrasos precisam ser justificados à coordenação.</p>' },
    { titulo: 'Capacitação sobre metodologias ativas', categoria_id: professor, autor_id: autorFuncionario, img: 'P3', data_evento: null,
      conteudo: '<p>Está aberta a inscrição para a capacitação de metodologias ativas.</p><p>Vagas limitadas: confirme presença com a coordenação.</p>' },
    { titulo: 'Atualização do plano de ensino', categoria_id: professor, autor_id: autorFuncionario2, img: 'P4', data_evento: emDias(15),
      conteudo: '<p>O novo modelo de <em>plano de ensino</em> já está disponível. Use-o a partir do próximo semestre.</p>' },

    { titulo: 'Reunião geral de funcionários', categoria_id: funcionarios, autor_id: autorFuncionario, img: 'F1', data_evento: emDias(2),
      conteudo: '<p>Reunião geral com a equipe administrativa para alinhar o calendário do semestre.</p>' },
    { titulo: 'Manutenção do sistema de matrículas', categoria_id: funcionarios, autor_id: autorFuncionario2, img: 'F2', data_evento: emDias(6),
      conteudo: '<p>O sistema de matrículas ficará fora do ar para manutenção. Programem os atendimentos para outro horário.</p>' },
    { titulo: 'Escala de plantão da secretaria', categoria_id: funcionarios, autor_id: autorFuncionario, img: 'F3', data_evento: null,
      conteudo: '<p>A nova escala de plantão da secretaria já está disponível. Confira seus dias e solicite trocas com antecedência.</p>' },
    { titulo: 'Treinamento de segurança da informação', categoria_id: funcionarios, autor_id: autorFuncionario2, img: 'F4', data_evento: emDias(12),
      conteudo: '<p>Treinamento obrigatório para todos os funcionários sobre proteção de dados e senhas.</p>' },
];

const existe = db.prepare('SELECT 1 FROM publicacoes WHERE titulo = ? AND categoria_id = ?');
let novas = 0;
for (const p of publicacoes) {
    if (existe.get(p.titulo, p.categoria_id)) continue;
    criarPublicacao({
        titulo: p.titulo, conteudo: p.conteudo, categoria_id: p.categoria_id,
        autor_id: p.autor_id, imagem_url: imagem(p.img), data_evento: p.data_evento,
    });
    novas++;
}

console.log(`Pronto: ${novas} publicação(ões) nova(s). Senha de todos os usuários criados: ${SENHA}`);
