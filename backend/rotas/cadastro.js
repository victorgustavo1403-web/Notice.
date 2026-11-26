const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { enviarBoasVindas } = require('../mailer');
const { verificarAutenticado, apenasSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

router.post('/cadastro', verificarAutenticado, apenasSuperAdmin, async (req, res) => {
    const { rm, nome, email, senha, telefone, tipo } = req.body;

    if (!rm || !nome || !email || !senha || !tipo) {
        return res.status(400).json({ erro: 'Preencha RM, nome, e-mail, senha e tipo.' });
    }

    if (!['comum', 'professor', 'coordenacao', 'administrador'].includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo inválido. Use "comum" (aluno) ou "administrador" (publicador).' });
    }

    try {
        const jaExiste = db.prepare('SELECT id FROM usuarios WHERE rm = ? OR email = ?').get(rm, email);
        if (jaExiste) {
            return res.status(409).json({ erro: 'RM ou e-mail já cadastrado.' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);

        const resultado = db.prepare(`
            INSERT INTO usuarios (rm, nome, email, senha, tipo, telefone)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(rm, nome, email, senhaHash, tipo, ['comum', 'professor'].includes(tipo) ? (telefone || null) : null);

        enviarBoasVindas(email, nome);

        res.status(201).json({ mensagem: 'Conta criada com sucesso!', id: resultado.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar conta.' });
    }
});

module.exports = router;