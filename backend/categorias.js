const { db } = require('./db');

function listarCategorias() {
    return db.prepare('SELECT id, nome FROM categorias ORDER BY nome').all();
}

module.exports = { listarCategorias };