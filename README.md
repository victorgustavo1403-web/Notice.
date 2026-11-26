# Notice.

![Logo Notice.](src/assets/img/logo-completa.png)

## Descrição

O Notice. é um sistema web desenvolvido para centralizar, organizar e facilitar a divulgação de avisos institucionais na Etec de Campo Limpo Paulista (ETECAMP). O projeto busca solucionar problemas relacionados à dispersão de informações, à diversidade de canais de comunicação e à perda de avisos importantes, permitindo que alunos, professores e funcionários consultem publicações organizadas por categorias.

## Equipe — Grupo 05

- José André Ribas — Documentação
- Vinicius Coelho — Back-end e front-end
- Victor Santos — Back-end e front-end

## Tecnologias utilizadas

**Front-end**

- HTML5, CSS3 e JavaScript (ECMAScript moderno);
- React 19 e Vite 8;
- React Router DOM (rotas) e GSAP (animações e rolagem suave);
- TipTap (editor de texto das publicações) e DOMPurify (limpeza do conteúdo exibido);
- Recharts (gráficos do relatório de acessos) e Lucide (ícones);
- PWA (instalação no celular e funcionamento offline básico).

**Back-end**

- Node.js e Express 5;
- SQLite com better-sqlite3;
- JWT (autenticação) e bcryptjs (senhas criptografadas);
- Multer (envio de imagens e de currículos em PDF);
- Nodemailer (e-mails de recuperação de senha);
- sanitize-html (limpeza do conteúdo das publicações) e dotenv (variáveis de ambiente).

> As versões exatas estão em `package.json` (front-end) e `backend/package.json` (back-end).

## Funcionalidades

**Para todos os usuários**

- Login único, com cada perfil levado para a sua página inicial;
- Consulta de avisos por categoria: Geral, Eventos, Vagas de emprego, Coordenação e Secretaria;
- Resumo semanal com tudo o que foi publicado nos últimos 7 dias;
- Notificações de avisos novos (sino na barra de navegação);
- Calendário de eventos;
- Confirmação de leitura de avisos;
- Perfil com foto e e-mail, e recuperação de senha por e-mail;
- Tema claro e escuro, layout responsivo e instalação como aplicativo (PWA).

**Por perfil**

- **Aluno:** envia currículo em PDF nas vagas de emprego (e pode trocar ou retirar a candidatura);
- **Professor e funcionários:** acessam suas áreas restritas (Área do professor e Área dos funcionários);
- **Administrador:** cria, edita e exclui publicações; consulta os currículos enviados nas vagas;
- **Superadministrador:** tudo o que o administrador faz, mais o cadastro de usuários e o relatório de acessos.

**Recursos do sistema**

- **Agenda pública** na página inicial, visível sem login;
- **Mural para TV** (`/tv`): página pública que passa os avisos mais recentes e os próximos eventos, um por vez, em tela cheia;
- **Relatório de acessos:** visualizações por aviso, por categoria e por período, com detalhe de quem abriu cada aviso e exportação em CSV;
- **Limpeza automática:** avisos com mais de 30 dias e sem evento futuro são removidos, com cópia de segurança do banco antes de cada limpeza.

## Interface do sistema

### Login

![Tela de login](<design/Interface - Telas do sistema/Login.png>)

### Página inicial

Página inicial do aluno, com o resumo semanal das publicações.

![Página inicial](<design/Interface - Telas do sistema/Página inicial.png>)

![Resumo semanal](<design/Interface - Telas do sistema/Resumo Semanal.png>)

### Página inicial — Superadministrador

Painel com navegação por categorias e acesso ao gerenciamento de publicações, usuários, currículos e relatórios.

![Página inicial do superadministrador](<design/Interface - Telas do sistema/Página inicial - Super Admin.png>)

### Categorias e visualização de avisos

Publicações de uma categoria e a exibição detalhada de um aviso, com descrição, data do evento e opção de marcar como lido.

![Página de categoria](<design/Interface - Telas do sistema/Categoria.png>)

![Visualização de um aviso](<design/Interface - Telas do sistema/Visualização aviso.png>)

### Criação de publicações

Formulário com título, categoria, imagem, data de evento e editor de texto formatado.

![Formulário de nova publicação](<design/Interface - Telas do sistema/Criar publicação.png>)

### Calendário e notificações

![Calendário de eventos](<design/Interface - Telas do sistema/Calendário.png>)

![Notificações](<design/Interface - Telas do sistema/Notificações.png>)

### Perfil do usuário

![Perfil do usuário](<design/Interface - Telas do sistema/Perfil usuário.png>)

### Vagas de emprego e currículos

O aluno envia o currículo pela própria vaga; administradores consultam os currículos recebidos.

![Candidatura a uma vaga](<design/Interface - Telas do sistema/Captura de tela 2026-11-26 173612.png>)

![Currículos recebidos](<design/Interface - Telas do sistema/Currículos.png>)

### Cadastro de usuários — Superadministrador

![Cadastro de usuários](<design/Interface - Telas do sistema/Cadastro de usuários.png>)

### Relatório de acessos — Superadministrador

![Relatório de acessos](<design/Interface - Telas do sistema/Relatório de acessos - Super Admin.png>)

### Mural para TV

![Mural para TV](<design/Interface - Telas do sistema/Tv.png>)

## Estrutura do repositório

```
Notice.-/
├── backend/                     servidor (Express + SQLite)
│   ├── server.js                ponto de entrada: login, usuários, publicações, perfil, mural da TV
│   ├── db.js                    conexão com o banco e migrações automáticas
│   ├── schema.sql               estrutura do banco (aplicada ao iniciar)
│   ├── acesso.js                regras de quem pode ver cada categoria
│   ├── publicacoes.js           consultas das publicações
│   ├── conteudo.js              limpeza do texto formatado das publicações
│   ├── curriculos.js            envio e consulta de currículos
│   ├── rotas-acessos.js         registro de visualizações e relatório de acessos
│   ├── limpeza.js               remoção automática de avisos antigos
│   ├── mailer.js                envio de e-mails (recuperação de senha)
│   ├── middlewares/auth.js      verificação do login (JWT) e das permissões
│   ├── rotas/                   rotas de login e cadastro
│   ├── seed*.js                 dados de teste
│   ├── uploads/                 imagens das publicações e fotos de perfil
│   ├── curriculos/              PDFs enviados pelos alunos (fora do Git)
│   └── backups/                 cópias do banco antes de cada limpeza (fora do Git)
│
├── src/                         aplicação React (front-end)
│   ├── main.jsx                 rotas e proteção por perfil
│   ├── Hero.jsx, Sobre.jsx,
│   │   ComoFunciona.jsx,
│   │   AgendaPublica.jsx        página inicial pública
│   ├── Auth.jsx                 login e recuperação de senha
│   ├── Home-usuario.jsx         página inicial do superadministrador
│   ├── Home-admin.jsx           página inicial do administrador
│   ├── HomeComum.jsx            página inicial de alunos, professores e coordenação
│   ├── Categoria.jsx            avisos de uma categoria
│   ├── PublicacaoModal.jsx      visualização de um aviso
│   ├── NovaPublicacaoModal.jsx  criação e edição de publicações
│   ├── Calendario.jsx           calendário de eventos
│   ├── Sino.jsx                 notificações
│   ├── Perfil.jsx               perfil do usuário
│   ├── cadastro-usuario.jsx     cadastro de usuários
│   ├── Curriculos.jsx           currículos recebidos
│   ├── RelatorioAcessos.jsx     relatório de acessos
│   ├── TV.jsx                   mural para TV
│   ├── ui/                      componentes compartilhados (avatar, avisos, diálogos, tema, logo)
│   ├── animations/              animações GSAP
│   ├── styles/                  estilos (inclui o tema escuro)
│   └── assets/                  imagens e fontes
│
├── public/                      ícones, manifest e service worker (PWA)
├── tools/gerar_tema_escuro.py   gera src/styles/tema-escuro.css a partir dos estilos
├── design/                      identidade visual e telas do sistema
├── doc/                         fichamentos, questionário e materiais complementares
├── index.html
└── package.json                 dependências do front-end
```

## Como executar o projeto

### Pré-requisitos

- Git;
- Node.js **22.12 ou superior** (ou 20.19+) e npm. O Vite 8 não funciona em versões anteriores.

### 1. Clonar o repositório

```bash
git clone https://github.com/victorgustavo1403-web/Notice.-
cd Notice.-
```

### 2. Configurar o back-end

```bash
cd backend
npm install
```

Copie `backend/.env.example` para `backend/.env` e preencha as variáveis abaixo. Não publique esse arquivo no GitHub.

```env
JWT_SECRET=uma-chave-longa-e-aleatoria
EMAIL_USER=conta-de-envio@gmail.com
EMAIL_PASS=senha-de-app-do-gmail

# opcionais
LIMPEZA_DIAS=30
LIMPEZA_DESATIVADA=1
```

`EMAIL_USER` e `EMAIL_PASS` só são usados na recuperação de senha. `LIMPEZA_DESATIVADA=1` desliga a remoção automática de avisos antigos (útil em apresentações).

O banco de dados (`notice.db`) é criado automaticamente na primeira execução. Para preenchê-lo com dados de teste, rode os scripts nesta ordem:

```bash
node seedCategorias.js
node seed-categorias.js
node seed.js
node seed-areas.js
node seed-eventos.js
```

Depois, inicie o servidor:

```bash
node server.js
```

Servidor: http://localhost:3001

Para ver o que a limpeza automática apagaria, sem apagar nada: `node limpeza.js --simular`.

### 3. Executar o front-end

Em outro terminal, a partir da raiz do projeto:

```bash
npm install
npm run dev
```

Acesse http://localhost:5173 no navegador. O mural para TV fica em http://localhost:5173/tv.

Para testar a versão de produção (necessária para o PWA):

```bash
npm run build
npm run preview
```

### Usuários de teste

Todos com a senha `senha123`:

| Perfil | RM |
|---|---|
| Aluno | 10001 |
| Administrador | 20001 |
| Superadministrador | 30001 |
| Professor | 40001 |
| Coordenação | 60001 |

## Como citar o projeto

Ribas, José André, Victor Santos, Coelho, Vinicius. **Notice.:desenvolvimento de um sistema
web para organização e divulgação de avisos escolares. 2026. 30 p. Trabalho de Conclusão de Curso (Técnico em Informática para Internet) — Etec de Campo Limpo Paulista, Campo Limpo Paulista, 2026.

## Contato
victorgustavo1403@gmail.com
viniciuscoe009@gmail.com

## Trabalho escrito

Repositório Institucional do Conhecimento do Centro Paula Souza: https://ric.cps.sp.gov.br/
