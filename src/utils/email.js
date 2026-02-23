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
        ${slug}.cliquezoom.com.br
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
  const loginUrl = `https://${slug}.cliquezoom.com.br/admin`;
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
        <strong>Seu site:</strong> <a href="https://${slug}.cliquezoom.com.br" style="color: #2563eb;">${slug}.cliquezoom.com.br</a><br>
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

/**
 * E-mail para o cliente: galeria disponivel (enviado ao criar sessao)
 */
async function sendGalleryAvailableEmail(clientEmail, clientName, accessCode, orgName) {
  const subject = `Suas fotos estao disponiveis! - ${orgName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Ola, ${clientName}!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Suas fotos ja estao disponiveis para visualizacao. Use o codigo abaixo para acessar sua galeria:
      </p>

      <div style="background: #f5f5f5; border-radius: 0.5rem; padding: 1.25rem; text-align: center; margin: 1.5rem 0;">
        <p style="margin: 0 0 0.25rem 0; color: #555; font-size: 0.875rem;">Codigo de acesso</p>
        <p style="margin: 0; font-size: 2rem; font-weight: 700; letter-spacing: 0.25rem; color: #1a1a1a;">${accessCode}</p>
      </div>

      <div style="text-align: center; margin: 1.5rem 0;">
        <a href="${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/cliente" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Minha Galeria
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName} - Fotografia Profissional</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * E-mail para o cliente: fotos entregues para download
 */
async function sendPhotosDeliveredEmail(clientEmail, clientName, accessCode, orgName) {
  const subject = `Suas fotos foram entregues! - ${orgName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Ola, ${clientName}!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Suas fotos ja estao prontas para download em alta resolucao. Acesse sua galeria com o codigo abaixo:
      </p>

      <div style="background: #f5f5f5; border-radius: 0.5rem; padding: 1.25rem; text-align: center; margin: 1.5rem 0;">
        <p style="margin: 0 0 0.25rem 0; color: #555; font-size: 0.875rem;">Codigo de acesso</p>
        <p style="margin: 0; font-size: 2rem; font-weight: 700; letter-spacing: 0.25rem; color: #1a1a1a;">${accessCode}</p>
      </div>

      <div style="text-align: center; margin: 1.5rem 0;">
        <a href="${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/cliente" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Baixar Minhas Fotos
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName} - Fotografia Profissional</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * E-mail para o cliente: album enviado para aprovacao
 */
async function sendAlbumAvailableEmail(clientEmail, clientName, accessCode, albumName, orgName) {
  const subject = `Prova de album disponivel - ${orgName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Ola, ${clientName}!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        O layout do album <strong>${albumName}</strong> esta pronto para sua aprovacao. Acesse e aprove cada pagina ou solicite revisoes.
      </p>

      <div style="background: #f5f5f5; border-radius: 0.5rem; padding: 1.25rem; text-align: center; margin: 1.5rem 0;">
        <p style="margin: 0 0 0.25rem 0; color: #555; font-size: 0.875rem;">Codigo de acesso</p>
        <p style="margin: 0; font-size: 2rem; font-weight: 700; letter-spacing: 0.25rem; color: #1a1a1a;">${accessCode}</p>
      </div>

      <div style="text-align: center; margin: 1.5rem 0;">
        <a href="${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/album" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Ver Prova de Album
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName} - Fotografia Profissional</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * E-mail para o fotografo: cliente finalizou selecao de fotos
 */
async function sendSelectionSubmittedEmail(adminEmail, clientName, photoCount, sessionId, orgSlug) {
  const adminUrl = `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/admin/`;
  const subject = `${clientName} finalizou a selecao de fotos`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">FS FOTOGRAFIAS</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Selecao finalizada!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        <strong>${clientName}</strong> finalizou a selecao de fotos e escolheu <strong>${photoCount} foto(s)</strong>.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Acesse o painel para revisar a selecao e marcar como entregue.
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${adminUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Painel Admin
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>FS Fotografias - Plataforma para fotografos</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

/**
 * E-mail para o fotografo: cliente aprovou o album completo
 */
async function sendAlbumApprovedEmail(adminEmail, clientName, albumName, orgSlug) {
  const adminUrl = `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/admin/`;
  const subject = `Album aprovado por ${clientName}!`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">FS FOTOGRAFIAS</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Album aprovado!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        O album <strong>${albumName}</strong> foi totalmente aprovado por <strong>${clientName}</strong>.
        Voce pode seguir com a producao.
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${adminUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Painel Admin
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>FS Fotografias - Plataforma para fotografos</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

/**
 * E-mail para o fotografo: cliente pediu revisao em pagina do album
 */
async function sendAlbumRevisionEmail(adminEmail, clientName, albumName, comment, orgSlug) {
  const adminUrl = `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/admin/`;
  const subject = `${clientName} pediu revisao no album`;
  const commentHtml = comment
    ? `<div style="background: #f5f5f5; border-left: 3px solid #dc2626; padding: 0.75rem 1rem; border-radius: 0 0.375rem 0.375rem 0; margin: 1rem 0; color: #555; font-size: 0.9375rem; font-style: italic;">"${comment}"</div>`
    : '';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">FS FOTOGRAFIAS</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Revisao solicitada</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        <strong>${clientName}</strong> pediu revisao em uma pagina do album <strong>${albumName}</strong>.
      </p>
      ${commentHtml}
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Acesse o painel para visualizar os detalhes e atualizar o album.
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${adminUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Ver no Painel Admin
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>FS Fotografias - Plataforma para fotografos</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendApprovalEmail,
  sendGalleryAvailableEmail,
  sendPhotosDeliveredEmail,
  sendAlbumAvailableEmail,
  sendSelectionSubmittedEmail,
  sendAlbumApprovedEmail,
  sendAlbumRevisionEmail
};
