// Ícones de traço do painel CliqueZoom — estilo Feather/Lucide.
// viewBox 24×24, traço 1.75, cantos arredondados, herdam cor via currentColor.
// Entregues no handoff de design "Ícones CliqueZoom — Cadeado, Histórico, Lixeira".
//
// Uso: `import { icon } from '../utils/icons.js'` e injete o retorno via innerHTML.
//   botao.innerHTML = icon('lixeira');           // 18px (base)
//   botao.innerHTML = icon('historico', 16);     // tamanho custom
// Não defina fill/stroke fixos no consumidor — a cor acompanha `color` do contexto
// (ex.: `color: var(--red)` em ações destrutivas, como manda o design).

// Conteúdo interno de cada ícone (os <path>/<rect>/<line> dentro do <svg>).
const ICON_PATHS = {
  // Conteúdo bloqueado, sessões privadas, acesso protegido por senha.
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="15.5" x2="12" y2="17.5"/>',
  // Variante aberta (acesso liberado) — mesma geometria, arco da haste levantado.
  cadeadoAberto: '<rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/><line x1="12" y1="15.5" x2="12" y2="17.5"/>',
  // Log de atividade, versões anteriores, restaurar estado.
  historico: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/>',
  // Excluir item. Em ações destrutivas use color: var(--red).
  lixeira: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',

  // --- Navegação / utilitários (mesmo traço Feather/Lucide) ---
  chevronEsquerda: '<polyline points="15 18 9 12 15 6"/>',
  chevronDireita: '<polyline points="9 18 15 12 9 6"/>',
  config: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',

  // --- Botões de upload da sessão (handoff "Upload e Concluir upload") ---
  // Upload → bandeja com seta saindo (ação principal de envio).
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/>',
  // Concluir upload → mesma bandeja + check (finalizar o envio); par visual do upload.
  concluirUpload: '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/><polyline points="7 8 12 3 17 8"/><line x1="12" y1="3" x2="12" y2="13"/><polyline points="15.5 16.5 17.5 18.5 21.5 14.5"/>',
  // Reabrir upload → mesma bandeja + seta circular (voltar a enviar numa sessão concluída).
  reabrirUpload: '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/><polyline points="7 8 12 3 17 8"/><line x1="12" y1="3" x2="12" y2="13"/><path d="M20.5 15.5A4 4 0 1 0 21 19"/><polyline points="21 14 21 17 18 17"/>',

  // --- Timeline do histórico da sessão (um por tipo de evento) ---
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  enviar: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  olho: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  selecao: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  reabrir: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  brilho: '<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/>',
  presente: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  arquivo: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" y1="12" x2="14" y2="12"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  whatsapp: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  editar: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  foto: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
};

// Retorna a string SVG completa do ícone, herdando a cor do contexto (currentColor).
// `size` em px (largura = altura). Base do design: 18.
export function icon(name, size = 18) {
  const inner = ICON_PATHS[name];
  if (!inner) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block; flex-shrink:0;">${inner}</svg>`;
}

export { ICON_PATHS };
