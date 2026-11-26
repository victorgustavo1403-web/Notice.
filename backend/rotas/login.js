const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
    const { rm, senha } = req.body;

    if (!rm || !senha) {
        return res.status(400).json({ erro: 'Informe RM e senha.' });
    }

    const usuario = db.prepare('SELECT * FROM usuarios WHERE rm = ?').get(rm);

    if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
        return res.status(401).json({ erro: 'RM ou senha inválidos.' });
    }

    const token = jwt.sign(
        { id: usuario.id, rm: usuario.rm, nome: usuario.nome, tipo: usuario.tipo },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({
        token,
        usuario: { id: usuario.id, rm: usuario.rm, nome: usuario.nome, tipo: usuario.tipo },
    });
});

module.exports = router;