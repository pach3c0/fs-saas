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

module.exports = { listSections, getSection };
