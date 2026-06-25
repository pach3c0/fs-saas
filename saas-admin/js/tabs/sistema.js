// Sistema — saúde da infraestrutura: Mongo, SMTP, disco, processo e schedulers
import { apiRequest, saasToast, saasConfirm, esc, formatSize } from '../core.js';

// ============================================================================
// MANUTENÇÃO GLOBAL DA PLATAFORMA
// ============================================================================

function _manutencaoCard(m = {}) {
  const on = !!m.enabled;
  return `
    <div style="background:var(--bg-surface); border:1px solid ${on ? '#f59e0b' : 'var(--border)'}; border-radius:0.5rem; padding:1rem 1.25rem; margin-bottom:1.25rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="width:10px; height:10px; border-radius:50%; background:${on ? '#f59e0b' : '#34d399'};"></span>
          <h3 style="font-size:0.95rem; font-weight:700; margin:0;">Modo manutenção da plataforma</h3>
          <span style="font-size:0.7rem; font-weight:700; padding:0.15rem 0.55rem; border-radius:999px; background:${on ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.12)'}; color:${on ? '#f59e0b' : '#34d399'};">
            ${on ? 'EM MANUTENÇÃO' : 'NO AR'}
          </span>
        </div>
        <button class="btn" id="maintToggleBtn" data-on="${on ? '1' : '0'}"
          style="${on ? 'background:#f59e0b; color:#1a1a1a; border-color:#f59e0b;' : ''}">
          ${on ? 'Tirar da manutenção' : 'Colocar em manutenção'}
        </button>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin:0.6rem 0 0.9rem;">
        Coloca <strong>toda a plataforma</strong> fora do ar com um aviso amigável (fotógrafos, sites e galerias).
        Você (super admin) e o painel <code>/saas-admin</code> continuam acessíveis.
      </p>
      <div style="display:grid; gap:0.6rem; max-width:560px;">
        <label style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Mensagem para os usuários</label>
        <textarea id="maintMsg" rows="2" placeholder="Estamos fazendo uma manutenção rápida. Já voltamos."
          style="width:100%; resize:vertical; padding:0.6rem; border-radius:0.4rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary); font-family:inherit; font-size:0.85rem;">${esc(m.message || '')}</textarea>
        <label style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Previsão de retorno (opcional)</label>
        <input id="maintEta" type="text" placeholder="Ex.: hoje às 18h" value="${esc(m.etaText || '')}"
          style="width:100%; padding:0.6rem; border-radius:0.4rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary); font-family:inherit; font-size:0.85rem;">
        <div>
          <button class="btn" id="maintSaveBtn">Salvar mensagem</button>
        </div>
      </div>
    </div>`;
}

async function _saveMaintenance(enabled) {
  const message = document.getElementById('maintMsg')?.value || '';
  const etaText = document.getElementById('maintEta')?.value || '';
  await apiRequest('PATCH', '/api/admin/saas/platform-config', {
    maintenance: { enabled, message, etaText }
  });
}

function _wireMaintenance() {
  const toggle = document.getElementById('maintToggleBtn');
  if (toggle) {
    toggle.onclick = async () => {
      const turningOn = toggle.dataset.on !== '1';
      if (turningOn) {
        const ok = await saasConfirm(
          'Isso vai tirar TODA a plataforma do ar para os fotógrafos e clientes (você continua com acesso). Confirmar?',
          { title: 'Colocar em manutenção', confirmText: 'Colocar em manutenção', danger: true }
        );
        if (!ok) return;
      }
      toggle.disabled = true;
      try {
        await _saveMaintenance(turningOn);
        saasToast(turningOn ? 'Plataforma em manutenção.' : 'Plataforma de volta ao ar.', 'success');
        loadSistema();
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
        toggle.disabled = false;
      }
    };
  }
  const saveBtn = document.getElementById('maintSaveBtn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try {
        // Mantém o estado atual (on/off), só atualiza a mensagem/previsão
        await _saveMaintenance(toggle?.dataset.on === '1');
        saasToast('Mensagem salva.', 'success');
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false;
      }
    };
  }
}

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

// ============================================================================
// PRESENÇA ONLINE (item 10) — quem está usando a plataforma AGORA
// ============================================================================

// Rótulo amigável do módulo (aba do admin ou tela do cliente).
const _MODULE_LABEL = {
  dashboard: 'Início', sessoes: 'Sessões', clientes: 'Clientes', mensagens: 'Mensagens',
  crm: 'CRM', 'meu-site': 'Meu Site', dominio: 'Domínio', integracoes: 'Integrações',
  marketing: 'Marketing', perfil: 'Perfil', plano: 'Plano', ajuda: 'Ajuda',
  configuracoes: 'Config', gestao: 'Gestão (Rhyno)',
  galeria: 'Galeria', selecao: 'Seleção', outros: 'Outros'
};

function _modPill(m) {
  const label = _MODULE_LABEL[m] || m || '—';
  return `<span style="font-size:0.65rem; font-weight:700; padding:0.1rem 0.45rem; border-radius:999px; background:var(--bg-base); color:var(--text-muted); border:1px solid var(--border); flex-shrink:0;">${esc(label)}</span>`;
}

function _presenceRow(name, module) {
  return `<li style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.3rem 0; border-bottom:1px solid var(--border); font-size:0.8rem;">
    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(name || '—')}</span>
    ${_modPill(module)}
  </li>`;
}

function _presenceCard(p = {}) {
  const counts = p.counts || { photographers: 0, clients: 0 };
  const total = p.total || 0;
  const on = total > 0;
  const photogs = (p.photographers || []).map(d => _presenceRow(d.name, d.module)).join('')
    || '<li style="color:#64748b; font-size:0.78rem; padding:0.3rem 0;">Nenhum fotógrafo online</li>';
  const clients = (p.clients || []).map(d => _presenceRow(d.name, d.module)).join('')
    || '<li style="color:#64748b; font-size:0.78rem; padding:0.3rem 0;">Nenhum cliente em galeria</li>';
  return `
    <div id="presenceCard" style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1rem 1.25rem; margin-bottom:1.25rem;">
      <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.85rem; flex-wrap:wrap;">
        <span style="width:10px; height:10px; border-radius:50%; background:${on ? '#34d399' : '#94a3b8'};"></span>
        <h3 style="font-size:0.95rem; font-weight:700; margin:0;">Presença online agora</h3>
        <span style="font-size:0.7rem; font-weight:700; padding:0.15rem 0.55rem; border-radius:999px; background:rgba(52,211,153,0.12); color:#34d399;">
          ${counts.photographers} fotógrafo${counts.photographers === 1 ? '' : 's'} · ${counts.clients} cliente${counts.clients === 1 ? '' : 's'}
        </span>
        <span style="margin-left:auto; font-size:0.68rem; color:var(--text-muted);">atualiza a cada 30s</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem;">
        <div>
          <div style="font-size:0.68rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.35rem;">👤 Fotógrafos</div>
          <ul style="list-style:none; margin:0; padding:0;">${photogs}</ul>
        </div>
        <div>
          <div style="font-size:0.68rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.35rem;">🖼️ Clientes em galeria</div>
          <ul style="list-style:none; margin:0; padding:0;">${clients}</ul>
        </div>
      </div>
    </div>`;
}

// Atualiza só o card de presença a cada 30s (sem recarregar a aba toda). Auto-encerra
// quando o card sai do DOM (troca de aba no saas-admin).
let _presencePoll = null;
function _startPresencePoll() {
  if (_presencePoll) clearInterval(_presencePoll);
  _presencePoll = setInterval(async () => {
    const card = document.getElementById('presenceCard');
    if (!card) { clearInterval(_presencePoll); _presencePoll = null; return; }
    try {
      const data = await apiRequest('GET', '/api/admin/saas/presence');
      const wrap = document.createElement('div');
      wrap.innerHTML = _presenceCard(data || {});
      card.replaceWith(wrap.firstElementChild);
    } catch (_) { /* ignora — próximo tick tenta de novo */ }
  }, 30000);
}

async function loadSistema(forceSmtp = false) {
  const container = document.getElementById('sistemaContent');
  if (!container) return;
  container.innerHTML = '<div class="loading">Verificando o sistema...</div>';

  try {
    const url = '/api/admin/saas/system' + (forceSmtp ? '?verifySmtp=1' : '');
    const [sys, auditData, cfgData, presenceData] = await Promise.all([
      apiRequest('GET', url),
      apiRequest('GET', '/api/admin/saas/audit?limit=10').catch(() => null),
      apiRequest('GET', '/api/admin/saas/platform-config').catch(() => null),
      apiRequest('GET', '/api/admin/saas/presence').catch(() => null)
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
      ${_manutencaoCard(cfgData?.config?.maintenance || {})}

      ${_presenceCard(presenceData || {})}

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

    _wireMaintenance();
    _startPresencePoll();
  } catch (err) {
    container.innerHTML = `<div class="loading" style="color:var(--red);">Erro ao carregar o sistema: ${esc(err.message)}</div>`;
    saasToast('Erro: ' + err.message, 'error');
  }
}

window.loadSistema = loadSistema;

export { loadSistema };
