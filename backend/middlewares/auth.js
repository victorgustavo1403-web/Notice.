require('dotenv').config();
const jwt = require('jsonwebtoken');

// Verifica se o token enviado no header é válido e coloca os dados do usuário em req.usuario
function verificarAutenticado(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(401).json({ erro: 'Token inválido ou expirado.' });
        }
        req.usuario = payload; // { id, rm, nome, tipo }
        next();
    });
}

function apenasSuperAdmin(req, res, next) {
    if (req.usuario?.tipo !== 'super_admin') {
        return res.status(403).json({ erro: 'Acesso restrito ao super admin.' });
    }
    next();
}

// Quem lê avisos (aluno, professor, coordenação); administradores e super admin apenas publicam
function apenasLeitor(req, res, next) {
    if (!['comum', 'professor', 'coordenacao'].includes(req.usuario?.tipo)) {
        return res.status(403).json({ erro: 'Somente alunos, professores e a coordenação podem marcar avisos como lidos.' });
    }
    next();
}

// Quem publica: administrador e super admin
function apenasPublicador(req, res, next) {
    if (!['administrador', 'super_admin'].includes(req.usuario?.tipo)) {
        return res.status(403).json({ erro: 'Somente publicadores podem criar publicações.' });
    }
    next();
}

module.exports = { verificarAutenticado, apenasSuperAdmin, apenasLeitor, apenasPublicador };