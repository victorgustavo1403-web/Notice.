// Limpeza automática dos avisos antigos.
//
// Regra: um aviso é apagado quando foi publicado há mais de 30 dias E não tem uma data de
// realização que ainda vai acontecer. Ou seja:
//   - aviso sem data de evento, publicado há mais de 30 dias  -> apagado
//   - evento cuja data já passou, publicado há mais de 30 dias -> apagado
//   - evento com data de hoje em diante                        -> fica (mesmo se antigo)
// Junto com o aviso saem a imagem, as leituras e os currículos enviados para ele.
//
// Antes de apagar qualquer coisa, guarda uma cópia do banco em backend/backups/
// (mantém as 7 mais recentes).
//
// Uso manual:
//   node limpeza.js --simular   mostra o que seria apagado, sem apagar
//   node limpeza.js             apaga agora
// Configuração (arquivo .env):
//   LIMPEZA_DIAS=30             idade mínima, em dias
//   LIMPEZA_DESATIVADA=1        desliga a limpeza automática do servidor
const fs = require('fs');
const path = require('path');
const { db } = require('./db');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CURRICULOS_DIR = path.join(__dirname, 'curriculos');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const MANTER_BACKUPS = 7;

const hojeEmSaoPaulo = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function apagarArquivo(pasta, nome) {
    if (!nome) return;
    try { fs.unlinkSync(path.join(pasta, path.basename(nome))); } catch { /* já não existe */ }
}

/** Apaga um aviso e tudo o que depende dele (leituras, currículos, imagem). */
function apagarPublicacao(id) {
    const pub = db.prepare('SELECT id, imagem_url FROM publicacoes WHERE id = ?').get(id);
    if (!pub) return false;
    const arquivos = db.prepare('SELECT arquivo FROM curriculos WHERE publicacao_id = ?').all(id);
    db.transaction(() => {
        db.prepare('DELETE FROM leituras WHERE publicacao_id = ?').run(id);
        db.prepare('DELETE FROM curriculos WHERE publicacao_id = ?').run(id);
        db.prepare('DELETE FROM publicacoes WHERE id = ?').run(id);
    })();
    apagarArquivo(UPLOADS_DIR, pub.imagem_url);
    arquivos.forEach((c) => apagarArquivo(CURRICULOS_DIR, c.arquivo));
    return true;
}

function diasConfigurados() {
    const n = parseInt(process.env.LIMPEZA_DIAS, 10);
    return Number.isFinite(n) && n >= 1 ? n : 30;
}

/** Avisos que a regra manda apagar hoje. */
function avisosVencidos(dias = diasConfigurados()) {
    return db.prepare(`
        SELECT id, titulo, data_evento, criado_em
        FROM publicacoes
        WHERE criado_em < datetime('now', ?)
          AND (data_evento IS NULL OR data_evento = '' OR data_evento < ?)
        ORDER BY criado_em
    `).all(`-${dias} days`, hojeEmSaoPaulo());
}

async function copiarBanco() {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const destino = path.join(BACKUPS_DIR, `notice-antes-limpeza-${carimbo}.db`);
    await db.backup(destino);
    // guarda só as mais recentes
    fs.readdirSync(BACKUPS_DIR)
        .filter((n) => n.startsWith('notice-antes-limpeza-'))
        .sort()
        .slice(0, -MANTER_BACKUPS)
        .forEach((n) => apagarArquivo(BACKUPS_DIR, n));
    return destino;
}

/** Roda a limpeza. Com simular=true só lista. Devolve os avisos afetados. */
async function limparAvisosAntigos({ simular = false } = {}) {
    const dias = diasConfigurados();
    const vencidos = avisosVencidos(dias);
    if (simular || vencidos.length === 0) return { dias, avisos: vencidos, backup: null };

    const backup = await copiarBanco();
    vencidos.forEach((p) => apagarPublicacao(p.id));
    return { dias, avisos: vencidos, backup };
}

/** Liga a limpeza no servidor: 1 min depois de iniciar e depois a cada 6 horas. */
function agendarLimpeza() {
    if (process.env.LIMPEZA_DESATIVADA === '1') {
        console.log('[limpeza] desativada (LIMPEZA_DESATIVADA=1).');
        return;
    }
    const rodar = async () => {
        try {
            const { dias, avisos, backup } = await limparAvisosAntigos();
            if (avisos.length) {
                console.log(`[limpeza] ${avisos.length} aviso(s) com mais de ${dias} dias apagado(s). Cópia do banco: ${path.basename(backup)}`);
            }
        } catch (err) {
            console.error('[limpeza] falhou:', err);
        }
    };
    setTimeout(rodar, 60_000).unref();
    setInterval(rodar, 6 * 3_600_000).unref();
}

module.exports = { apagarPublicacao, limparAvisosAntigos, agendarLimpeza, avisosVencidos, CURRICULOS_DIR };

// execução manual pelo terminal
if (require.main === module) {
    require('dotenv').config();
    const simular = process.argv.includes('--simular');
    limparAvisosAntigos({ simular }).then(({ dias, avisos, backup }) => {
        const verbo = simular ? 'seriam apagados' : 'apagados';
        console.log(`Avisos com mais de ${dias} dias e sem evento futuro: ${avisos.length} ${verbo}.`);
        avisos.forEach((p) => console.log(`  #${p.id}  ${p.criado_em.slice(0, 10)}  ${p.data_evento ? `(evento ${p.data_evento}) ` : ''}${p.titulo}`));
        if (backup) console.log(`Cópia do banco antes de apagar: ${backup}`);
    }).catch((err) => { console.error(err); process.exit(1); });
}
