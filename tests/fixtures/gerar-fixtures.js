// Gera fixtures de imagem REAIS para os testes E2E.
// As fixtures antigas eram PNGs de 1×1 pixel renomeados .jpg — nunca exercitavam
// resize, badge de dimensões nem marca d'água. Estas são JPEGs 2400×1600 (3:2),
// distintas por cor e número, para que o resize p/ 1200px gere 1200×800 real.
//
// Uso: node tests/fixtures/gerar-fixtures.js
const sharp = require('sharp');
const path = require('path');

const dir = __dirname;
const W = 2400, H = 1600;

const fixtures = [
  { name: 'foto-teste.jpg',   bg: { r: 40,  g: 40,  b: 50  }, label: 'CAPA' },
  { name: 'foto-teste-1.jpg', bg: { r: 200, g: 70,  b: 70  }, label: '1' },
  { name: 'foto-teste-2.jpg', bg: { r: 70,  g: 150, b: 200 }, label: '2' },
  { name: 'foto-teste-3.jpg', bg: { r: 90,  g: 190, b: 110 }, label: '3' },
];

async function gerar({ name, bg, label }) {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="520"
             font-weight="bold" fill="rgba(255,255,255,0.85)"
             text-anchor="middle" dominant-baseline="middle">${label}</text>
     </svg>`
  );
  await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
    .composite([{ input: svg }])
    .jpeg({ quality: 88 })
    .toFile(path.join(dir, name));
  console.log(`✓ ${name} (${W}×${H})`);
}

(async () => {
  for (const f of fixtures) await gerar(f);
  console.log('Fixtures reais geradas.');
})().catch((e) => { console.error(e); process.exit(1); });
