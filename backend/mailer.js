require('dotenv').config();
const nodemailer = require('nodemailer');
const { textoPuro } = require('./conteudo');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Evita que texto digitado numa publicação quebre o HTML do e-mail
function escaparHtml(texto = '') {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function enviarBoasVindas(destinatario, nome) {
    try {
        await transporter.sendMail({
            from: `"Notice." <${process.env.EMAIL_USER}>`,
            to: destinatario,
            subject: 'Bem-vindo(a) ao Notice.!',
            html: `
                <h2>Olá, ${nome}!</h2>
                <p>Sua conta no <strong>Notice.</strong> foi criada com sucesso.</p>
                <p>Agora você pode acompanhar as publicações direto pela plataforma.</p>
                <p>Se não foi você quem criou essa conta, ignore este e-mail.</p>
            `,
        });
        console.log(`E-mail de boas-vindas enviado para ${destinatario}`);
    } catch (err) {
        console.error('Erro ao enviar e-mail de boas-vindas:', err.message);
    }
}

// Avisa os usuários sobre uma nova publicação.
// usuarios: [{ nome, email }]  |  publicacao: { titulo, conteudo, categoria }
// Envia um e-mail por pessoa (ninguém vê o endereço dos outros) e nunca lança erro:
// se um envio falhar, os próximos continuam.
async function enviarNovaPublicacao(usuarios, publicacao) {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const titulo = escaparHtml(publicacao.titulo);
    const categoria = escaparHtml(publicacao.categoria || 'Geral');

    // a descrição é HTML do editor: no e-mail vai só o texto, sem as tags
    const textoCompleto = textoPuro(publicacao.conteudo);
    const previa = escaparHtml(
        textoCompleto.length > 200 ? `${textoCompleto.slice(0, 200).trim()}...` : textoCompleto
    );

    let enviados = 0;

    for (const usuario of usuarios) {
        try {
            await transporter.sendMail({
                from: `"Notice." <${process.env.EMAIL_USER}>`,
                to: usuario.email,
                subject: `Nova publicação em ${publicacao.categoria || 'Geral'}: ${publicacao.titulo}`,
                html: `
                    <h2>Olá, ${escaparHtml(usuario.nome)}!</h2>
                    <p>Há uma nova publicação no <strong>Notice.</strong>:</p>
                    <h3 style="margin-bottom:4px;">${titulo}</h3>
                    <p style="margin-top:0;color:#777;">${categoria}</p>
                    <p>${previa}</p>
                    <p><a href="${siteUrl}">Abrir o Notice.</a></p>
                `,
            });
            enviados++;
        } catch (err) {
            console.error(`Erro ao notificar ${usuario.email}:`, err.message);
        }
    }

    console.log(`Notificação de nova publicação enviada para ${enviados} de ${usuarios.length} usuário(s).`);
}

module.exports = { enviarBoasVindas, enviarNovaPublicacao };