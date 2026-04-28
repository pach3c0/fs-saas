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
      from: `"CliqueZoom" <${process.env.SMTP_USER}>`,
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
 * Email de boas-vindas apos registro (acesso imediato)
 */
async function sendWelcomeEmail(email, name, slug) {
  const loginUrl = `https://${slug}.cliquezoom.com.br/admin`;
  const subject = 'Bem-vindo ao CliqueZoom!';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Bem-vindo, ${name}!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Sua conta foi criada com sucesso. Voce ja pode acessar seu painel e comecar a configurar seu portfolio.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        <strong>Seu site:</strong> <a href="https://${slug}.cliquezoom.com.br" style="color: #2563eb;">${slug}.cliquezoom.com.br</a>
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${loginUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Meu Painel
        </a>
      </div>

      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Use o email e senha que voce cadastrou para fazer login. Com o CliqueZoom voce pode:
      </p>
      <ul style="color: #555; line-height: 1.8; font-size: 0.9375rem;">
        <li>Criar e personalizar seu site de fotografia</li>
        <li>Gerenciar sessoes e clientes</li>
        <li>Entregar galerias privadas com selecao de fotos</li>
        <li>Criar albuns de prova para aprovacao</li>
      </ul>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
}

/**
 * Email de recuperacao de senha
 */
async function sendPasswordResetEmail(email, name, resetUrl) {
  const subject = 'Redefinir senha - CliqueZoom';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Redefinir senha</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Ola, ${name}! Recebemos uma solicitacao para redefinir a senha da sua conta.
        Clique no botao abaixo para criar uma nova senha.
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Redefinir Minha Senha
        </a>
      </div>

      <p style="color: #999; font-size: 0.8125rem; text-align: center;">
        Este link expira em <strong>1 hora</strong>. Se voce nao solicitou a troca de senha, ignore este e-mail.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>CliqueZoom - Plataforma para fotógrafos</p>
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
  const subject = 'Conta aprovada! - CliqueZoom';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
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
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
}

/**
 * E-mail para o cliente: galeria disponivel (enviado ao criar sessao)
 */
async function sendGalleryAvailableEmail(clientEmail, clientName, accessCode, orgName, orgSlug) {
  const galleryUrl = orgSlug
    ? `https://${orgSlug}.cliquezoom.com.br/cliente/?code=${accessCode}`
    : `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/cliente/?code=${accessCode}`;

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
        <a href="${galleryUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Minha Galeria
        </a>
      </div>

      <p style="color: #999; font-size: 0.8125rem; text-align: center;">Ou acesse: <a href="${galleryUrl}" style="color: #2563eb;">${galleryUrl}</a></p>

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
async function sendPhotosDeliveredEmail(clientEmail, clientName, accessCode, orgName, orgSlug) {
  const galleryUrl = orgSlug
    ? `https://${orgSlug}.cliquezoom.com.br/cliente/?code=${accessCode}`
    : `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/cliente/?code=${accessCode}`;

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
        <a href="${galleryUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Baixar Minhas Fotos
        </a>
      </div>

      <p style="color: #999; font-size: 0.8125rem; text-align: center;">Ou acesse: <a href="${galleryUrl}" style="color: #2563eb;">${galleryUrl}</a></p>

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
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
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
        <p>CliqueZoom - Plataforma para fotógrafos</p>
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
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
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
        <p>CliqueZoom - Plataforma para fotógrafos</p>
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
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
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
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

/**
 * Notifica o fotografo sobre novo depoimento aguardando aprovacao
 */
async function sendPendingDepoimentoEmail(adminEmail, depoimentoName, orgName) {
  const subject = `Novo depoimento aguardando aprovacao - ${orgName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Novo depoimento recebido!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        <strong>${depoimentoName}</strong> enviou um depoimento pelo seu site e ele esta aguardando sua aprovacao.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Acesse seu painel admin, va ate <strong>Meu Site &rarr; Depoimentos</strong> para aprovar ou rejeitar.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

/**
 * E-mail para o fotografo: cliente solicitou fotos extras apos envio da selecao
 */
async function sendExtraPhotosRequestedEmail(adminEmail, clientName, photoCount) {
  const adminUrl = `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/admin/`;
  const subject = `${clientName} quer mais ${photoCount} foto(s) extra(s)`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Solicitacao de fotos extras!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        <strong>${clientName}</strong> finalizou a selecao e tambem gostaria de adquirir mais <strong>${photoCount} foto(s)</strong>.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Acesse o painel para aceitar ou recusar a solicitacao.
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="${adminUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Acessar Painel Admin
        </a>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

/**
 * Aviso ao cliente: prazo de seleção está chegando
 */
async function sendDeadlineWarningEmail(clientEmail, sessionName, daysLeft, orgName) {
  const subject = `Lembrete: você tem ${daysLeft} dia(s) para concluir sua seleção`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName || 'Galeria de Fotos'}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">⏰ Seu prazo está chegando!</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Você tem <strong>${daysLeft} dia(s)</strong> para finalizar a seleção das fotos de <strong>${sessionName}</strong>.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Acesse sua galeria e conclua a seleção antes que o prazo expire.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName || 'CliqueZoom'} - Galeria de Fotos</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * Aviso ao cliente: prazo de seleção expirou
 */
async function sendDeadlineExpiredEmail(clientEmail, sessionName, orgName) {
  const subject = `O prazo de seleção de ${sessionName} expirou`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName || 'Galeria de Fotos'}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Prazo encerrado</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Infelizmente o prazo para seleção das fotos de <strong>${sessionName}</strong> encerrou.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Entre em contato com o fotógrafo caso ainda queira fazer sua seleção.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName || 'CliqueZoom'} - Galeria de Fotos</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * E-mail para o cliente: upsell de fotos extras apos envio da selecao
 */
async function sendUpsellEmail(clientEmail, clientName, sessionName, orgName, extraPhotoPrice, sessionId, accessCode, orgSlug) {
  const galleryUrl = orgSlug
    ? `https://${orgSlug}.cliquezoom.com.br/cliente/?code=${accessCode}`
    : `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/cliente/?code=${accessCode}`;

  const subject = `Quer mais fotos de ${sessionName}? — ${orgName}`;
  const priceFormatted = extraPhotoPrice
    ? `R$ ${Number(extraPhotoPrice).toFixed(2).replace('.', ',')}`
    : null;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Sua seleção foi enviada! 🎉</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Olá${clientName ? `, <strong>${clientName}</strong>` : ''}! Recebemos sua seleção de fotos de <strong>${sessionName}</strong>.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Ficou com vontade de levar mais algumas? Você ainda pode voltar à galeria e solicitar fotos extras
        ${priceFormatted ? `por apenas <strong>${priceFormatted} cada</strong>` : ''}.
      </p>

      <div style="background: #f5f5f5; border-radius: 0.5rem; padding: 1.25rem; text-align: center; margin: 1.5rem 0;">
        <p style="margin: 0 0 0.5rem 0; color: #555; font-size: 0.875rem;">Volte à sua galeria e escolha mais fotos</p>
        ${priceFormatted ? `<p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #1a1a1a;">${priceFormatted} <span style="font-size: 0.875rem; font-weight: 400; color: #777;">por foto extra</span></p>` : ''}
      </div>

      <div style="text-align: center; margin: 1.5rem 0;">
        <a href="${galleryUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Ver Minha Galeria
        </a>
      </div>

      <p style="color: #999; font-size: 0.8125rem; text-align: center;">
        Esta oferta é válida enquanto a seleção ainda estiver em processamento.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName} - Fotografia Profissional</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * E-mail para o fotografo: conta suspensa, aviso de exclusao de arquivos
 */
async function sendOffboardingWarningEmail(ownerEmail, orgName, graceDays) {
  const subject = `Aviso importante: conta "${orgName}" suspensa — arquivos serão excluídos em ${graceDays} dias`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Sua conta foi suspensa</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        A conta <strong>${orgName}</strong> foi suspensa na plataforma CliqueZoom.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Todos os seus arquivos e fotos armazenados serão <strong>excluídos permanentemente em ${graceDays} dias</strong>
        caso a situação não seja regularizada.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Entre em contato com o suporte o quanto antes para regularizar sua conta e preservar seus dados.
      </p>

      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 0.5rem; padding: 1rem; margin: 1.5rem 0;">
        <p style="margin: 0; color: #856404; font-size: 0.9375rem;">
          ⚠️ Após o prazo, os arquivos não poderão ser recuperados.
        </p>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(ownerEmail, subject, html);
}

/**
 * E-mail para o fotografo: arquivos excluidos apos grace period
 */
async function sendOffboardingDeletedEmail(ownerEmail, orgName) {
  const subject = `Arquivos da conta "${orgName}" foram excluídos`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">CLIQUEZOOM</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Arquivos excluídos</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        O prazo de recuperação da conta <strong>${orgName}</strong> encerrou.
        Todos os arquivos e fotos armazenados foram excluídos permanentemente.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Caso tenha interesse em reativar uma nova conta, entre em contato com o suporte.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>CliqueZoom - Plataforma para fotógrafos</p>
      </div>
    </div>
  `;
  return sendEmail(ownerEmail, subject, html);
}

/**
 * E-mail para o cliente: fotos extras recusadas
 */
async function sendExtraPhotosRejectedEmail(clientEmail, clientName, orgName, reason, orgSlug) {
  const domain = process.env.BASE_DOMAIN || 'cliquezoom.com.br';
  const loginUrl = `https://${orgSlug ? orgSlug + '.' : ''}${domain}/cliente/`;

  const subject = `Atualização sobre suas fotos extras - ${orgName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
      <h2 style="color: #dc2626; text-align: center;">Solicitação de Fotos Extras</h2>
      <p>Olá, <strong>${clientName}</strong>,</p>
      <p>O fotógrafo <strong>${orgName}</strong> analisou sua solicitação de fotos extras, mas infelizmente ela não pôde ser aprovada neste momento.</p>
      
      ${reason ? `
      <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b;"><strong>Mensagem do fotógrafo:</strong><br><br>${reason}</p>
      </div>` : ''}
      
      <p>Você pode acessar sua galeria a qualquer momento para verificar os detalhes ou tentar selecionar outras fotos.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${loginUrl}" style="background-color: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Acessar Minha Galeria</a>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

/**
 * E-mail de escassez (CRM): faltam 7 dias para a galeria expirar e o cliente
 * deixou fotos para tras. Cria urgencia + entrega cupom de desconto.
 */
async function sendScarcity7dEmail(clientEmail, clientName, sessionName, orgName, remainingPhotos, couponCode, discountPercent, accessCode, orgSlug) {
  const galleryUrl = orgSlug
    ? `https://${orgSlug}.cliquezoom.com.br/cliente/?code=${accessCode}`
    : `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}/cliente/?code=${accessCode}`;

  const subject = `Faltam 7 dias: ${remainingPhotos} fotos vão sumir — ${orgName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${orgName}</h1>
      </div>

      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">⏳ Suas memórias vão sumir em 7 dias</h2>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Olá${clientName ? `, <strong>${clientName}</strong>` : ''}! Notamos que você ainda tem
        <strong>${remainingPhotos} foto${remainingPhotos !== 1 ? 's' : ''}</strong> da sessão
        <strong>${sessionName}</strong> esperando uma decisão.
      </p>
      <p style="color: #555; line-height: 1.7; font-size: 0.9375rem;">
        Após o prazo, elas serão removidas da nossa nuvem definitivamente. Para te ajudar,
        preparamos um cupom exclusivo:
      </p>

      <div style="background: #fff7ed; border: 2px dashed #d97706; border-radius: 0.5rem; padding: 1.25rem; text-align: center; margin: 1.5rem 0;">
        <p style="margin: 0 0 0.5rem 0; color: #92400e; font-size: 0.875rem; font-weight: 600;">CUPOM DE DESCONTO</p>
        <p style="margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; color: #1a1a1a;">${couponCode}</p>
        <p style="margin: 0.5rem 0 0 0; color: #92400e; font-size: 0.8125rem;">${discountPercent}% off nas fotos extras restantes</p>
      </div>

      <div style="text-align: center; margin: 1.5rem 0;">
        <a href="${galleryUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 0.875rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; font-size: 0.9375rem;">
          Ver minhas fotos restantes
        </a>
      </div>

      <p style="color: #999; font-size: 0.8125rem; text-align: center;">
        Apresente o cupom no WhatsApp para garantir o desconto.
      </p>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #999; font-size: 0.8125rem;">
        <p>${orgName} - Fotografia Profissional</p>
      </div>
    </div>
  `;
  return sendEmail(clientEmail, subject, html);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendGalleryAvailableEmail,
  sendPhotosDeliveredEmail,
  sendAlbumAvailableEmail,
  sendSelectionSubmittedEmail,
  sendAlbumApprovedEmail,
  sendAlbumRevisionEmail,
  sendPendingDepoimentoEmail,
  sendExtraPhotosRequestedEmail,
  sendDeadlineWarningEmail,
  sendDeadlineExpiredEmail,
  sendOffboardingWarningEmail,
  sendOffboardingDeletedEmail,
  sendUpsellEmail,
  sendExtraPhotosRejectedEmail,
  sendScarcity7dEmail
};
