// Painel de histórico/timeline da sessão.
// Mescla eventos reais (session.events[]) com eventos sintéticos derivados dos timestamps existentes.

import { icon } from '../../../utils/icons.js';

// `icon` aqui é o NOME do ícone de linha (utils/icons.js), renderizado via SVG no dot.
const EVENT_CONFIG = {
  session_created:      { icon: 'camera',      label: 'Sessão criada',                   color: '#3b82f6' },
  photos_uploaded:      { icon: 'upload',      label: 'Fotos enviadas pelo fotógrafo',    color: '#6366f1' },
  uploads_completed:    { icon: 'checkCircle', label: 'Upload marcado como concluído',    color: '#3fb950' },
  code_sent:            { icon: 'enviar',      label: 'Código/link enviado ao cliente',   color: '#0ea5e9' },
  client_first_access:  { icon: 'olho',        label: 'Cliente acessou a galeria',       color: '#8b5cf6' },
  selection_submitted:  { icon: 'selecao',     label: 'Seleção enviada pelo cliente',     color: '#3fb950' },
  reopen_requested:     { icon: 'reabrir',     label: 'Reabertura solicitada pelo cliente', color: '#ffa657' },
  reopen_accepted:      { icon: 'check',       label: 'Reabertura aceita pelo fotógrafo', color: '#3fb950' },
  reopen_dismissed:     { icon: 'x',           label: 'Reabertura recusada',             color: '#f85149' },
  edited_uploaded:      { icon: 'brilho',      label: 'Fotos editadas enviadas',          color: '#a855f7' },
  client_downloaded:    { icon: 'download',    label: 'Cliente fez download',            color: '#0ea5e9' },
  delivered:            { icon: 'presente',    label: 'Sessão entregue ao cliente',       color: '#3fb950' },
  archived:             { icon: 'arquivo',     label: 'Sessão arquivada',                 color: '#6b7280' },
  photos_deleted:       { icon: 'lixeira',     label: 'Fotos excluídas do servidor',     color: '#f85149' },
  retention_set:        { icon: 'relogio',     label: 'Prazo de armazenamento definido',  color: '#d29922' }
};

// Gera eventos sintéticos a partir dos timestamps já existentes na sessão.
// Para sessões antigas (sem events[]), esses são os únicos dados disponíveis.
function _syntheticEvents(session) {
  const ev = [];
  if (session.createdAt) ev.push({ type: 'session_created', ts: session.createdAt, meta: { mode: session.mode, packageLimit: session.packageLimit, eventType: session.eventType } });
  if (session.uploadsCompletedAt) ev.push({ type: 'uploads_completed', ts: session.uploadsCompletedAt, meta: { totalPhotos: (session.photos || []).filter(p => !p.hidden).length } });
  if (session.codeSentAt) ev.push({ type: 'code_sent', ts: session.codeSentAt, meta: {} });
  if (session.firstAccessAt) ev.push({ type: 'client_first_access', ts: session.firstAccessAt, meta: {} });
  if (session.selectionSubmittedAt) ev.push({ type: 'selection_submitted', ts: session.selectionSubmittedAt, meta: { count: (session.selectedPhotos || []).length } });
  if (session.lastEditedUploadAt) ev.push({ type: 'edited_uploaded', ts: session.lastEditedUploadAt, meta: {} });
  if (session.deliveredAt) ev.push({ type: 'delivered', ts: session.deliveredAt, meta: { selectedCount: (session.selectedPhotos || []).length } });
  if (session.archivedAt) ev.push({ type: 'archived', ts: session.archivedAt, meta: { externalStorageUrl: session.externalStorageUrl || '' } });
  return ev;
}

// Mescla eventos reais e sintéticos, eliminando duplicatas (real tem prioridade).
function _mergeEvents(real, synthetic) {
  const DEDUP_WINDOW = 60 * 1000; // 1 minuto
  const merged = [...real];
  for (const syn of synthetic) {
    const tsMs = new Date(syn.ts).getTime();
    const hasDuplicate = real.some(r => r.type === syn.type && Math.abs(new Date(r.ts).getTime() - tsMs) < DEDUP_WINDOW);
    if (!hasDuplicate) merged.push({ ...syn, _synthetic: true });
  }
  merged.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  return merged;
}

function _formatTs(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' às '
    + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function _buildMeta(event) {
  const { type, meta = {} } = event;
  const parts = [];

  switch (type) {
    case 'session_created':
      if (meta.mode) {
        const modeLabel = { selection: 'Seleção', gallery: 'Galeria', multi_selection: 'Multi-Seleção' }[meta.mode] || meta.mode;
        parts.push(`Modo: ${modeLabel}`);
      }
      if (meta.packageLimit) parts.push(`Pacote: ${meta.packageLimit} fotos`);
      break;
    case 'photos_uploaded':
      if (meta.count) parts.push(`${meta.count} foto(s)`);
      if (meta.filenames?.length) parts.push(meta.filenames.slice(0, 3).join(', ') + (meta.filenames.length > 3 ? ` +${meta.filenames.length - 3}` : ''));
      break;
    case 'uploads_completed':
      if (meta.totalPhotos) parts.push(`Total: ${meta.totalPhotos} foto(s) visíveis`);
      break;
    case 'code_sent':
      if (meta.channel) {
        const ch = { email: 'E-mail', whatsapp: 'WhatsApp', both: 'E-mail + WhatsApp' }[meta.channel] || meta.channel;
        parts.push(`Canal: ${ch}`);
      }
      if (meta.recipient) parts.push(`Para: ${meta.recipient}`);
      break;
    case 'selection_submitted':
      if (meta.count !== undefined) parts.push(`${meta.count} foto(s) selecionada(s)`);
      if (meta.participantName) parts.push(`Por: ${meta.participantName}`);
      break;
    case 'edited_uploaded':
      if (meta.count) parts.push(`${meta.count} foto(s) editada(s)`);
      if (meta.filenames?.length) parts.push(meta.filenames.slice(0, 3).join(', ') + (meta.filenames.length > 3 ? ` +${meta.filenames.length - 3}` : ''));
      break;
    case 'client_downloaded':
      if (meta.type) parts.push(meta.type === 'zip' ? 'Download ZIP (todas)' : 'Download individual');
      if (meta.count) parts.push(`${meta.count} foto(s)`);
      if (meta.participantName) parts.push(`Por: ${meta.participantName}`);
      if (meta.filenames?.length && meta.type !== 'zip') {
        parts.push(meta.filenames.slice(0, 3).join(', ') + (meta.filenames.length > 3 ? ` +${meta.filenames.length - 3}` : ''));
      }
      break;
    case 'delivered':
      if (meta.selectedCount !== undefined) parts.push(`${meta.selectedCount} foto(s) entregue(s)`);
      if (meta.extrasCount) parts.push(`+ ${meta.extrasCount} cortesia(s)`);
      break;
    case 'archived':
      if (meta.externalStorageUrl) parts.push(`Link externo: ${meta.externalStorageUrl}`);
      else parts.push('Sem link externo cadastrado');
      break;
    case 'retention_set':
      if (meta.retentionUntil) parts.push(`Até: ${new Date(meta.retentionUntil).toLocaleDateString('pt-BR')}`);
      if (meta.autoDelete) parts.push('Auto-delete ativado');
      if (meta.backupOnExpire) parts.push('Backup ZIP ativado');
      break;
  }

  return parts.join(' · ');
}

// Calcula estatísticas resumidas da sessão para exibir no topo do painel.
function _buildStats(session, events) {
  const stats = [];

  const created = session.createdAt ? new Date(session.createdAt) : null;
  const delivered = session.deliveredAt ? new Date(session.deliveredAt) : null;
  if (created && delivered) {
    const days = Math.round((delivered - created) / (1000 * 60 * 60 * 24));
    stats.push({ label: 'Prazo até entrega', value: `${days} dia${days !== 1 ? 's' : ''}` });
  }

  const photoCount = (session.photos || []).filter(p => !p.hidden).length;
  if (photoCount > 0) stats.push({ label: 'Fotos no galeria', value: String(photoCount) });

  const selectedCount = (session.selectedPhotos || []).length;
  if (selectedCount > 0) stats.push({ label: 'Fotos selecionadas', value: String(selectedCount) });

  const downloads = events.filter(e => e.type === 'client_downloaded');
  if (downloads.length > 0) {
    const total = downloads.reduce((acc, e) => acc + (e.meta?.count || 0), 0);
    stats.push({ label: 'Downloads registrados', value: `${total} foto(s) em ${downloads.length} evento(s)` });
  }

  if (session.storageRetentionUntil) {
    stats.push({ label: 'Storage até', value: new Date(session.storageRetentionUntil).toLocaleDateString('pt-BR') });
  }

  return stats;
}

export function renderHistoryPanel(session) {
  const real = (session.events || []);
  const synthetic = _syntheticEvents(session);
  const all = _mergeEvents(real, synthetic);

  const panel = document.createElement('div');
  panel.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; max-width:680px;';

  // Título
  const heading = document.createElement('h3');
  heading.textContent = 'Histórico da Sessão';
  heading.style.cssText = 'font-size:1.125rem; font-weight:600; color:var(--text-primary); margin:0;';
  panel.appendChild(heading);

  // Estatísticas resumidas
  const stats = _buildStats(session, all);
  if (stats.length > 0) {
    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display:flex; flex-wrap:wrap; gap:0.75rem;';
    stats.forEach(s => {
      const chip = document.createElement('div');
      chip.style.cssText = `
        background:var(--bg-surface); border:1px solid var(--border);
        border-radius:var(--r-card); padding:0.5rem 0.875rem;
        display:flex; flex-direction:column; gap:0.125rem;
      `;
      const lbl = document.createElement('span');
      lbl.textContent = s.label;
      lbl.style.cssText = 'font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.03em;';
      const val = document.createElement('span');
      val.textContent = s.value;
      val.style.cssText = 'font-size:0.875rem; font-weight:600; color:var(--text-primary);';
      chip.appendChild(lbl);
      chip.appendChild(val);
      statsGrid.appendChild(chip);
    });
    panel.appendChild(statsGrid);
  }

  if (all.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum evento registrado para esta sessão ainda.';
    empty.style.cssText = 'color:var(--text-muted); font-size:0.875rem;';
    panel.appendChild(empty);
    return panel;
  }

  // Timeline
  const timeline = document.createElement('div');
  timeline.style.cssText = 'display:flex; flex-direction:column; position:relative;';

  // Linha vertical
  const line = document.createElement('div');
  line.style.cssText = `
    position:absolute; left:11px; top:12px; bottom:12px;
    width:2px; background:var(--border); border-radius:2px;
  `;
  timeline.appendChild(line);

  all.forEach((ev, idx) => {
    const cfg = EVENT_CONFIG[ev.type] || { icon: '', label: ev.type, color: '#6b7280' };
    const meta = _buildMeta(ev);

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; gap:1rem; padding:0.625rem 0;
      position:relative;
    `;

    // Dot — ícone de linha (currentColor herda a cor do evento via `color`).
    const dot = document.createElement('div');
    dot.style.cssText = `
      width:26px; height:26px; border-radius:50%;
      background:${cfg.color}22; border:2px solid ${cfg.color}; color:${cfg.color};
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; position:relative; z-index:1;
    `;
    const svgMarkup = icon(cfg.icon, 14);
    if (svgMarkup) dot.innerHTML = svgMarkup;
    else { dot.textContent = '•'; dot.style.fontSize = '0.75rem'; }
    row.appendChild(dot);

    // Content
    const content = document.createElement('div');
    content.style.cssText = 'flex:1; padding-bottom:0.5rem; min-width:0;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex; justify-content:space-between; align-items:baseline; gap:0.5rem; flex-wrap:wrap;';

    const label = document.createElement('span');
    label.textContent = cfg.label;
    label.style.cssText = `font-size:0.875rem; font-weight:500; color:${cfg.color};`;

    const ts = document.createElement('span');
    ts.textContent = _formatTs(ev.ts);
    ts.style.cssText = 'font-size:0.75rem; color:var(--text-muted); white-space:nowrap;';

    labelRow.appendChild(label);
    labelRow.appendChild(ts);
    content.appendChild(labelRow);

    if (meta) {
      const detail = document.createElement('p');
      detail.textContent = meta;
      detail.style.cssText = 'font-size:0.8rem; color:var(--text-secondary); margin:0.25rem 0 0; line-height:1.4; word-break:break-word;';
      content.appendChild(detail);
    }

    row.appendChild(content);
    timeline.appendChild(row);
  });

  panel.appendChild(timeline);

  const note = document.createElement('p');
  note.style.cssText = 'font-size:0.75rem; color:var(--text-muted); margin:0;';
  note.textContent = `${all.length} evento(s) registrado(s). Eventos anteriores à atualização do sistema são estimativas baseadas nos timestamps salvos.`;
  panel.appendChild(note);

  return panel;
}
