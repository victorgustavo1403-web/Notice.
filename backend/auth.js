const bcrypt = require('bcryptjs');
const { db } = require('./db');

/**
 * Faz login por RM + senha.
 * Retorna os dados do usuário (sem a senha) ou null se as credenciais forem inválidas.
 */
function login(rm, senha) {
    const usuario = db.prepare('SELECT * FROM usuarios WHERE rm = ?').get(rm);
    if (!usuario) return null;
        try {
        db.prepare("INSERT INTO acessos (usuario_id, evento) VALUES (?, 'login')").run(usuario.id);
    } catch (err) {
        console.error('Falha ao registrar login:', err); // não impede o login
    }

    const senhaCorreta = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaCorreta) return null;

    const { senha: _senha, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
}

/**
 * Cadastra um novo usuário.
 * Aplica a regra: telefone só pode ser preenchido para usuários do tipo 'comum'.
 */
function cadastrarUsuario({ rm, nome, senha, tipo, telefone }) {
    if (!['comum', 'professor', 'coordenacao'].includes(tipo) && telefone) {
        throw new Error("Apenas alunos, professores e a coordenação podem ter telefone.");
    }

    const senhaHash = bcrypt.hashSync(senha, 10);

    const insert = db.prepare(`
        INSERT INTO usuarios (rm, nome, senha, tipo, telefone)
        VALUES (@rm, @nome, @senha, @tipo, @telefone)
    `);

    insert.run({ rm, nome, senha: senhaHash, tipo, telefone: telefone ?? null });
}

module.exports = { login, cadastrarUsuario };