// Eventos — central de erros da plataforma (backend Winston + erros JS do front)
import { apiRequest, esc } from '../core.js';

// ============================================================================
// EVENTOS / ERROS (PlatformLog)
// ============================================================================

const LEVEL_BADGE = {
  error: 'background:rgba(248,113,113,0.12); color:#f87171;',
  warn:  'background:rgba(250,204,21,0.12); color:#facc15;'
};

const SOURCE_LABEL = {
  'backend': 'Backend',
  'frontend-admin': 'Painel fotógrafo',
  'frontend-cliente': 'Galeria cliente',
  'frontend-album': 'Álbum'
};

async function loadEventos() {
  const tbody = document.getElementById('eventosTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando eventos...</td></tr>';

  try {
    const level = document.getElementById('eventosLevelFilter')?.value || '';
    const source = document.getElementById('eventosSourceFilter')?.value || '';
    const hours = document.getElementById('eventosHoursFilter')?.value || '168';

    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (source) params.set('source', source);
    params.set('hours', hours);

    const data = await apiRequest('GET', `/api/admin/saas/errors?${params}`);
    const logs = data.logs || [];

    // Contadores no topo da aba
    const counters = document.getElementById('eventosCounters');
    if (counters && data.counters) {
      const c = data.counters;
      counters.innerHTML = `
        <span style="color:#f87171; font-weight:700;">${c.errors24h} erros</span>
        <span style="color:#64748b;">·</span>
        <span style="color:#facc15; font-weight:700;">${c.warns24h} avisos</span>
        <span style="color:#64748b;">·</span>
        <span style="color:#a78bfa; font-weight:700;">${c.frontend24h} do frontend</span>
        <span style="color:#64748b; font-size:0.7rem;">(últimas 24h)</span>
      `;
    }

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum evento no período. 🎉</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const date = new Date(log.at).toLocaleString('pt-BR');
      const org = log.organizationId?.name ? esc(log.organizationId.name) : '<span style="color:#64748b;">—</span>';
      const detalhes = [
        log.stack ? `<div style="margin-top:0.4rem;"><pre style="margin:0; padding:0.5rem; background:#0f172a; border-radius:4px; font-size:0.65rem; white-space:pre-wrap; word-break:break-all; color:#94a3b8; max-height:200px; overflow-y:auto;">${esc(log.stack)}</pre></div>` : '',
        log.requestId ? `<div style="margin-top:0.3rem; font-size:0.65rem; color:#64748b;">requestId: <code>${esc(log.requestId)}</code></div>` : '',
        log.url ? `<div style="font-size:0.65rem; color:#64748b;">url: ${esc(log.url)}${log.status ? ` (${log.status})` : ''}</div>` : ''
      ].join('');

      return `
        <tr>
          <td style="white-space:nowrap; font-size:0.7rem;">${date}</td>
          <td><span style="${LEVEL_BADGE[log.level] || ''} padding:0.15rem 0.5rem; border-radius:4px; font-size:0.65rem; font-weight:700; text-transform:uppercase;">${log.level}</span></td>
          <td style="font-size:0.7rem; color:#94a3b8;">${SOURCE_LABEL[log.source] || esc(log.source)}</td>
          <td style="font-size:0.75rem;">${org}</td>
          <td style="max-width:480px;">
            ${detalhes ? `
              <details>
                <summary style="cursor:pointer; font-size:0.8rem; word-break:break-word;">${esc(log.message || '(sem mensagem)')}</summary>
                ${detalhes}
              </details>
            ` : `<span style="font-size:0.8rem; word-break:break-word;">${esc(log.message || '(sem mensagem)')}</span>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading" style="color:var(--red);">Erro ao carregar: ${esc(err.message)}</td></tr>`;
  }
}

// ============================================================================
// E-MAILS (EmailLog) — sub-painel da mesma aba
// ============================================================================

window.switchEventosView = function (view) {
  const erros = document.getElementById('eventosPainelErros');
  const emails = document.getElementById('eventosPainelEmails');
  const btnErros = document.getElementById('eventosViewErros');
  const btnEmails = document.getElementById('eventosViewEmails');
  const ativo = 'background:var(--accent); color:var(--accent-on); font-weight:600;';
  if (view === 'emails') {
    erros.style.display = 'none';
    emails.style.display = '';
    btnEmails.style.cssText = ativo;
    btnErros.style.cssText = '';
    loadEmails();
  } else {
    erros.style.display = '';
    emails.style.display = 'none';
    btnErros.style.cssText = ativo;
    btnEmails.style.cssText = '';
    loadEventos();
  }
};

async function loadEmails() {
  const tbody = document.getElementById('emailsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando e-mails...</td></tr>';

  try {
    const params = new URLSearchParams();
    const ok = document.getElementById('emailsOkFilter')?.value || '';
    const hours = document.getElementById('emailsHoursFilter')?.value || '168';
    const to = document.getElementById('emailsToFilter')?.value.trim() || '';
    if (ok) params.set('ok', ok);
    if (to) params.set('to', to);
    params.set('hours', hours);

    const data = await apiRequest('GET', `/api/admin/saas/emails?${params}`);
    const emails = data.emails || [];

    const counters = document.getElementById('emailsCounters');
    if (counters && data.counters) {
      counters.innerHTML = `
        <span style="color:#34d399; font-weight:700;">${data.counters.sent24h} enviados</span>
        <span style="color:#64748b;">·</span>
        <span style="color:#f87171; font-weight:700;">${data.counters.failed24h} falhas</span>
        <span style="color:#64748b; font-size:0.7rem;">(últimas 24h)</span>
      `;
    }

    if (!emails.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum e-mail no período.</td></tr>';
      return;
    }

    tbody.innerHTML = emails.map(e => {
      const date = new Date(e.at).toLocaleString('pt-BR');
      let badge;
      if (e.skipped) badge = '<span style="background:rgba(148,163,184,0.12); color:#94a3b8; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.65rem; font-weight:700;">SMTP OFF</span>';
      else if (e.ok) badge = '<span style="background:rgba(52,211,153,0.12); color:#34d399; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.65rem; font-weight:700;">ENVIADO</span>';
      else badge = '<span style="background:rgba(248,113,113,0.12); color:#f87171; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.65rem; font-weight:700;">FALHA</span>';

      const erroDetalhe = (!e.ok && e.error)
        ? `<div style="font-size:0.65rem; color:#f87171; margin-top:0.2rem;">${esc(e.error)}</div>` : '';

      return `
        <tr>
          <td style="white-space:nowrap; font-size:0.7rem;">${date}</td>
          <td>${badge}</td>
          <td style="font-size:0.75rem;">${esc(e.to || '-')}${e.orgSlug ? `<div style="font-size:0.65rem; color:#64748b;">org: ${esc(e.orgSlug)}</div>` : ''}</td>
          <td style="font-size:0.7rem; color:#94a3b8;">${esc(e.template || '-')}</td>
          <td style="font-size:0.75rem; max-width:340px; word-break:break-word;">${esc(e.subject || '-')}${erroDetalhe}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading" style="color:var(--red);">Erro ao carregar: ${esc(err.message)}</td></tr>`;
  }
}

window.loadEventos = loadEventos;
window.loadEmails = loadEmails;

export { loadEventos, loadEmails };
