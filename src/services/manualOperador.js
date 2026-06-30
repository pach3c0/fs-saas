// Manual do Operador — leitura do conteúdo versionado (Markdown) em src/docs/manual-operador.
// Fonte ÚNICA consumida por DUAS superfícies:
//   - rotas do Super Admin (src/routes/saasAdmin.js) → aba "Manual do Operador";
//   - tool da IA do Super Admin (getManualOperador em src/services/agentTools.js).
// I/O sempre assíncrono (fs.promises). Conteúdo é interno/superadmin-only — nunca
// entra em ManualModule (manual do fotógrafo).
const fs = require('fs').promises;
const path = require('path');

const manifest = require('../docs/manual-operador'); // index.js (CommonJS)
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'manual-operador');

// Lista de seções (sem conteúdo), ordenada. Não expõe o nome do arquivo no payload público.
function listSections() {
  return [...manifest]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((s) => ({ slug: s.slug, title: s.title, order: s.order || 0 }));
}

// Conteúdo de UMA seção. Aceita SÓ slugs do manifesto — o caminho do arquivo nunca é
// derivado do input (guarda anti path-traversal). Retorna null se o slug não existir.
async function getSection(slug) {
  const entry = manifest.find((s) => s.slug === String(slug || '').trim());
  if (!entry) return null;
  const markdown = await fs.readFile(path.join(DOCS_DIR, entry.file), 'utf8');
  return { slug: entry.slug, title: entry.title, markdown };
}

// Busca por CONTEÚDO: varre o markdown de todas as seções e devolve as que casam com
// o termo (case-insensitive). Usada pela IA como fallback quando o termo não bate no
// título/slug (ex.: "reembolso", "online agora", "cortesia"). São poucos arquivos
// pequenos → ler todos a cada busca é barato. Só lê os arquivos do manifesto (mesma
// guarda anti path-traversal). Retorna [{ slug, title, snippet }] ordenado pelo manifesto.
async function search(term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return [];
  const ordered = [...manifest].sort((a, b) => (a.order || 0) - (b.order || 0));
  const hits = [];
  for (const entry of ordered) {
    let markdown;
    try {
      markdown = await fs.readFile(path.join(DOCS_DIR, entry.file), 'utf8');
    } catch {
      continue; // arquivo do manifesto ausente → ignora em vez de quebrar a busca
    }
    const idx = markdown.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 80);
    const snippet = markdown.slice(start, idx + 160).replace(/\s+/g, ' ').trim();
    hits.push({ slug: entry.slug, title: entry.title, snippet });
  }
  return hits;
}

module.exports = { listSections, getSection, search };
