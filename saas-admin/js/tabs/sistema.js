// Sistema — saúde da infraestrutura: Mongo, SMTP, disco, processo e schedulers
import { apiRequest, saasToast, esc, formatSize } from '../core.js';

// ============================================================================
// SISTEMA
// ============================================================================

const SCHEDULER_LABEL = {
  deadlineChecker: 'Lembretes de prazo (6h)',
  offboardingChecker: 'Offboarding de contas (24h)',
  postDeliveryUpsell: 'Upsell pós-entrega (6h)',
  storageRetention: 'Retenção de storage (24h)',
  anniversaryAutomator: 'Reativação CRM (diário 8h)'
};

function _uptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function _relativo(date) {
  if (!date) return '—';
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function _statusCard(titulo, ok, valor, detalhe) {
  const cor = ok === null ? '#94a3b8' : ok ? '#34d399' : '#f87171';
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        <span style="width:10px; height:10px; border-radius:50%; background:${cor};"></span>
        <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">${titulo}</span>
      </div>
      <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary);">${valor}</div>
      ${detalhe ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem; word-break:break-word;">${detalhe}</div>` : ''}
    </div>`;
}

async function loadSistema(forceSmtp = false) {
  const container = document.getElementById('sistemaContent');
  if (!container) return;
  container.innerHTML = '<div class="loading">Verificando o sistema...</div>';

  try {
    const url = '/api/admin/saas/system' + (forceSmtp ? '?verifySmtp=1' : '');
    const [sys, auditData] = await Promise.all([
      apiRequest('GET', url),
      apiRequest('GET', '/api/admin/saas/audit?limit=10').catch(() => null)
    ]);

    // Cards de estado
    const usoDisco = sys.disco?.totalBytes
      ? Math.round(((sys.disco.totalBytes - sys.disco.freeBytes) / sys.disco.totalBytes) * 100)
      : null;

    const cards = [
      _statusCard('MongoDB', sys.mongo.ok, sys.mongo.ok ? 'Conectado' : 'OFFLINE',
        sys.mongo.pingMs !== null ? `ping ${sys.mongo.pingMs}ms` : ''),
      _statusCard('SMTP (e-mail)', sys.smtp.ok, sys.smtp.ok ? 'Operacional' : 'Falha',
        sys.smtp.ok ? `verificado ${_relativo(sys.smtp.checkedAt)}` : esc(sys.smtp.error || '')),
      _statusCard('Disco', usoDisco === null ? null : usoDisco < 85, usoDisco === null ? '—' : `${usoDisco}% usado`,
        `uploads: ${sys.disco?.uploadsBytes != null ? formatSize(sys.disco.uploadsBytes) : '—'} · livre: ${sys.disco?.freeBytes != null ? formatSize(sys.disco.freeBytes) : '—'}`),
      _statusCard('Processo', true, _uptime(sys.processo.uptimeSec) + ' no ar',
        `Node ${esc(sys.processo.nodeVersion)} · v${esc(sys.processo.appVersion)} · RAM ${formatSize(sys.processo.rssBytes)}${sys.processo.pm2Instance !== null ? ` · worker ${sys.processo.pm2Instance}` : ''}`)
    ].join('');

    // Tabela de schedulers
    const schedRows = (sys.schedulers || []).map(s => {
      const ok = s.lastStatus === 'ok';
      return `
        <tr>
          <td style="font-size:0.8rem;">${SCHEDULER_LABEL[s.name] || esc(s.name)}</td>
          <td><span style="background:${ok ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'}; color:${ok ? '#34d399' : '#f87171'}; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.65rem; font-weight:700;">${ok ? 'OK' : 'ERRO'}</span></td>
          <td style="font-size:0.75rem;" title="${s.lastEndAt ? new Date(s.lastEndAt).toLocaleString('pt-BR') : ''}">${_relativo(s.lastEndAt)}</td>
          <td style="font-size:0.75rem; color:#94a3b8;">${s.lastDurationMs != null ? s.lastDurationMs + 'ms' : '—'}</td>
          <td style="font-size:0.75rem; color:#94a3b8; text-align:center;">${s.runCount || 0}</td>
          <td style="font-size:0.7rem; color:#f87171; max-width:260px; word-break:break-word;">${s.lastError ? esc(s.lastError.slice(0, 120)) : ''}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" class="loading">Nenhuma execução registrada ainda (aguarde o boot dos schedulers)</td></tr>';

    // Auditoria recente
    const auditHtml = (auditData?.entries || []).map(a => `
      <li style="display:flex; justify-content:space-between; gap:0.75rem; padding:0.35rem 0; border-bottom:1px solid var(--border); font-size:0.8rem;">
        <span><strong>${esc(a.action)}</strong>${a.targetOrgId?.name ? ` → ${esc(a.targetOrgId.name)}` : ''} <span style="color:#64748b;">por ${esc(a.adminUserId?.email || '?')}</span></span>
        <span style="color:#64748b; font-size:0.7rem; flex-shrink:0;">${new Date(a.at).toLocaleString('pt-BR')}</span>
      </li>`).join('') || '<li style="color:#64748b; font-size:0.8rem;">Nenhuma ação registrada</li>';

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:0.75rem; margin-bottom:1.25rem;">
        ${cards}
      </div>

      <div class="table-wrap" style="margin-bottom:1.25rem;">
        <div style="padding:1rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:0.875rem; font-weight:600; margin:0;">Schedulers (automações)</h3>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn" onclick="loadSistema(true)" title="Revalida o SMTP ignorando o cache">Verificar SMTP agora</button>
            <button class="btn" onclick="loadSistema()">Atualizar</button>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Automação</th><th>Status</th><th>Última execução</th><th>Duração</th><th>Execuções</th><th>Último erro</th></tr>
          </thead>
          <tbody>${schedRows}</tbody>
        </table>
      </div>

      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1rem;">
        <h3 style="font-size:0.875rem; font-weight:600; margin:0 0 0.75rem 0;">Auditoria recente (ações do superadmin)</h3>
        <ul style="list-style:none; margin:0; padding:0;">${auditHtml}</ul>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="loading" style="color:var(--red);">Erro ao carregar o sistema: ${esc(err.message)}</div>`;
    saasToast('Erro: ' + err.message, 'error');
  }
}

window.loadSistema = loadSistema;

export { loadSistema };
