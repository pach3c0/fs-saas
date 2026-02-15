const nodemailer = require('nodemailer');

// Cria transporter SMTP (Hostinger)
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP nao configurado. Emails nao serao enviados.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return transporter;
}

/**
 * Envia email generico
 */
async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[Email] Pulando envio para ${to}: SMTP nao configurado`);
    return false;
  }

  try {
    await t.sendMail({
      from: `"FS Fotografias" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`[Email] Enviado para ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Erro ao enviar para ${to}:`, error.message);
    return false;
  }
}

/**
 * Email de boas-vindas apos registro (conta pendente)
 */
async function sendWelcomeEmail(email, name, slug) {
  const subject = 'Cadastro recebido - FS Fotografias';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">FS FOTOGRAFIAS</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Ola, ${name}!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Recebemos seu cadastro com sucesso. Sua URL reservada e:
      </p>
      <p style="background: #f5f5f5; padding: 0.75rem 1rem; border-radius: 0.5rem; font-weight: 600; color: #2563eb; font-size: 0.9375rem;">
        ${slug}.fsfotografias.com.br
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Sua conta esta em analise e sera aprovada em ate <strong>24 horas uteis</strong>.
        Voce recebera outro email assim que sua conta for ativada.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>FS Fotografias - Plataforma para fotografos</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
}

/**
 * Email de aprovacao (conta ativada)
 */
async function sendApprovalEmail(email, name, slug) {
  const loginUrl = `https://${slug}.fsfotografias.com.br/admin`;
  const subject = 'Conta aprovada! - FS Fotografias';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">FS FOTOGRAFIAS</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Parabens, ${name}!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Sua conta foi aprovada e seu portfolio esta pronto para ser configurado.
      </p>

      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        <strong>Seu site:</strong> <a href="https://${slug}.fsfotografias.com.br" style="color: #2563eb;">${slug}.fsfotografias.com.br</a><br>
        <strong>Painel admin:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${loginUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Meu Painel
        </a>
      </div>

      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Use o email e senha que voce cadastrou para fazer login. A partir do painel, voce pode:
      </p>
      <ul style="color: #555; line-height: 1.8; font-size: 0.9375rem;">
        <li>Configurar seu hero e portfolio</li>
        <li>Criar albuns de fotos</li>
        <li>Gerenciar sessoes de clientes</li>
        <li>Personalizar todo o conteudo do site</li>
      </ul>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>FS Fotografias - Plataforma para fotografos</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
}

module.exports = { sendEmail, sendWelcomeEmail, sendApprovalEmail };
