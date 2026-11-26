// Popula a agenda pública (página inicial) com eventos de exemplo e cria duas contas
// da coordenação. Pode rodar mais de uma vez: não duplica nada.
// Rode com:  node seed-eventos.js
// Todos os eventos entram com "publico = 1" (aparecem para quem não tem login).

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { criarPublicacao } = require('./publicacoes');

const SENHA = 'senha123';
const hash = bcrypt.hashSync(SENHA, 10);

// ---------- coordenação (só visualiza; acessa a Área dos funcionários) ----------
const coordenadores = [
    { rm: '60001', nome: 'Helena Prado',  email: 'helena.prado@notice.test',  tipo: 'coordenacao', telefone: '11988880011' },
    { rm: '60002', nome: 'Rafael Duarte', email: 'rafael.duarte@notice.test', tipo: 'coordenacao', telefone: null },
];
const inserir = db.prepare(`
    INSERT OR IGNORE INTO usuarios (rm, nome, email, senha, tipo, telefone)
    VALUES (@rm, @nome, @email, @senha, @tipo, @telefone)
`);
for (const u of coordenadores) inserir.run({ ...u, senha: hash });

// ---------- autor: um administrador (publicador) já existente ----------
const autores = db.prepare("SELECT id FROM usuarios WHERE tipo IN ('administrador','super_admin') ORDER BY (tipo = 'administrador') DESC, id").all();
if (!autores.length) {
    console.error('Nenhum administrador encontrado. Rode antes: node seed.js');
    process.exit(1);
}
const autor = (i) => autores[i % autores.length].id;

const cat = (nome) => {
    const c = db.prepare('SELECT id FROM categorias WHERE lower(nome) = lower(?) ORDER BY id').get(nome);
    if (!c) throw new Error(`Categoria não encontrada: ${nome}`);
    return c.id;
};

// data daqui a N dias (YYYY-MM-DD, fuso de Brasília)
function emDias(n) {
    const d = new Date(Date.now() + n * 86400000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

const UPLOADS = path.join(__dirname, 'uploads');
function imagem(nome) {
    const origem = path.join(__dirname, '..', 'src', 'assets', 'img', 'padroes', `${nome}.png`);
    if (!fs.existsSync(origem)) return null;
    fs.mkdirSync(UPLOADS, { recursive: true });
    const destino = `seed-${nome}.png`;
    fs.copyFileSync(origem, path.join(UPLOADS, destino));
    return `/uploads/${destino}`;
}

const eventos = [
    { titulo: 'Feira de Profissões ETEC', categoria: 'Eventos', img: 'E1', dias: -6,
      conteudo: '<p>Alunos do ensino médio e dos cursos técnicos apresentaram projetos e conversaram com profissionais de várias áreas.</p>' },
    { titulo: 'Semana de Tecnologia e Inovação', categoria: 'Eventos', img: 'E2', dias: 3,
      conteudo: '<p>Palestras, oficinas e <strong>maratona de programação</strong> abertas à comunidade. Entrada gratuita.</p><p>Programação completa na secretaria.</p>' },
    { titulo: 'Visita guiada para novos alunos', categoria: 'Geral', img: 'G1', dias: 5,
      conteudo: '<p>Venha conhecer laboratórios, oficinas e salas de aula. Horário: 9h às 11h. Traga um documento com foto.</p>' },
    { titulo: 'Palestra: carreira em tecnologia', categoria: 'Eventos', img: 'E3', dias: 9,
      conteudo: '<p>Profissionais da região falam sobre mercado de trabalho, estágios e primeiro emprego. Aberta ao público.</p>' },
    { titulo: 'Plantão de matrículas', categoria: 'Secretaria', img: 'S1', dias: 12,
      conteudo: '<p>Atendimento especial para matrículas e esclarecimento de dúvidas sobre o processo seletivo (Vestibulinho).</p>' },
    { titulo: 'Feira de Ciências', categoria: 'Eventos', img: 'E4', dias: 16,
      conteudo: '<p>Exposição dos projetos de ciências e tecnologia desenvolvidos pelas turmas. Venha prestigiar!</p>' },
    { titulo: 'Reunião de pais e mestres', categoria: 'Coordenação', img: 'C1', dias: 19,
      conteudo: '<p>Entrega de boletins e conversa com a coordenação. Presença importante das famílias.</p>' },
    { titulo: 'Feira de Vagas de Estágio', categoria: 'Vagas de Emprego', img: 'E5', dias: 23,
      conteudo: '<p>Empresas parceiras recebem currículos e fazem entrevistas rápidas no pátio da escola.</p>' },
    { titulo: 'Campeonato interclasses', categoria: 'Eventos', img: 'E1', dias: 27,
      conteudo: '<p>Futsal, vôlei e jogos de tabuleiro entre as turmas. Torcida liberada!</p>' },
    { titulo: 'Dia da Comunidade ETEC', categoria: 'Geral', img: 'G2', dias: 27,
      conteudo: '<p>Atividades culturais, apresentações e serviços gratuitos para a comunidade de Campo Limpo Paulista.</p>' },
    { titulo: 'Oficina de currículo e entrevista', categoria: 'Eventos', img: 'E2', dias: 33,
      conteudo: '<p>Aprenda a montar um bom currículo e a se preparar para entrevistas. Vagas limitadas, inscrição na secretaria.</p>' },
    { titulo: 'Mostra cultural e artística', categoria: 'Eventos', img: 'E3', dias: 40,
      conteudo: '<p>Música, teatro e dança com a participação de alunos e ex-alunos.</p>' },
    { titulo: 'Inscrições do Vestibulinho', categoria: 'Secretaria', img: 'S2', dias: 47,
      conteudo: '<p>Abertas as inscrições para o processo seletivo do próximo semestre. Confira editais e prazos no site do Centro Paula Souza.</p>' },
    { titulo: 'Cerimônia de formatura', categoria: 'Geral', img: 'G3', dias: 58,
      conteudo: '<p>Cerimônia de formatura das turmas concluintes, com a presença de familiares e convidados.</p>' },
];

const existe = db.prepare('SELECT id FROM publicacoes WHERE titulo = ? AND categoria_id = ?');
const tornarPublico = db.prepare('UPDATE publicacoes SET publico = 1 WHERE id = ?');
let novas = 0;
eventos.forEach((e, i) => {
    const categoria_id = cat(e.categoria);
    const ja = existe.get(e.titulo, categoria_id);
    if (ja) { tornarPublico.run(ja.id); return; }
    const id = criarPublicacao({
        titulo: e.titulo, conteudo: e.conteudo, categoria_id, autor_id: autor(i),
        imagem_url: imagem(e.img), data_evento: emDias(e.dias), publico: 1,
    });
    novas++;
});

console.log(`Pronto: ${novas} evento(s) público(s) novo(s) na agenda. Coordenação: RM 60001 e 60002 (senha ${SENHA}).`);
