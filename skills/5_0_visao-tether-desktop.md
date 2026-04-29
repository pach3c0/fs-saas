# Skill 5.0 — Visão: Extensão Desktop com Tethering ao vivo (CliqueZoom Capture)

> **Status:** ideia em estágio de visão. NÃO implementar agora — projeto principal ainda em fase inicial. Documento existe para preservar a direção e o terreno técnico já levantado.

## A ideia em uma frase

App desktop que recebe fotos da câmera **ao vivo via USB** (como Lightroom Tether / DaVinci Resolve), aplica **ajustes rápidos automáticos** (white balance, exposição, contraste, crop em rosto), e faz **upload imediato** para o CliqueZoom — entregando ao cliente final em tempo real durante o evento.

## Caso de uso motivador

Rodeio com 400 pessoas. Dois editores. Fotógrafo dispara no totem, foto já chega no desktop, recebe ajuste automático "fast-food" (não é edição artesanal — é correção mínima viável), e sobe direto para a galeria pública. Cliente vê sua foto enquanto ainda está no evento.

## Encaixe com o produto atual

- **Modo `multi_instant`** já entrega fotos em real-time conforme upload — esse desktop seria simplesmente mais um *cliente que faz upload*.
- **Pipeline de upload** existente em `src/routes/sessions.js` continua sendo a porta de entrada.
- **Marca d'água + thumbs** já são gerados server-side — desktop só envia o arquivo bruto/ajustado.
- Sessão criada normalmente no admin → desktop "loga" nessa sessão e despeja capturas.

> O CliqueZoom Capture **não substitui** edição profissional. É um modo "ao vivo" para volume + velocidade. Edição final continua sendo Lightroom/Capture One pós-evento.

## Modos de sessão e compatibilidade

| Modo | Compatível com Capture? | Por quê |
|---|---|---|
| `multi_instant` | ✅ ideal | Já é entrega real-time, encaixe perfeito. |
| `gallery` | ✅ funciona | Galeria pública sem seleção, igual ao instant mas sem o aspecto live. |
| `selection` | ⚠️ parcial | Pode entregar fotos para seleção depois — mas perde o sentido "live". |
| `multi_selection` | ❌ não | Exige edição artesanal antes de subir, conflita com fast-food. |

## Caminhos técnicos (terreno levantado)

### Conexão câmera → desktop

| Meio | Viabilidade | Nota |
|---|---|---|
| **USB (PTP/MTP)** | ✅ padrão da indústria | Lightroom, Capture One, gphoto2 todos usam isso. |
| **Wi-Fi tether (proprietário)** | ✅ existe | Canon Connect, Sony Imaging Edge, Nikon SnapBridge — depende do modelo. |
| **Bluetooth** | ❌ inviável para foto | Latência alta, banda baixa; só serve para metadados/controle, não RAW/JPEG grandes. |
| **HDMI** | ❌ é vídeo | HDMI é saída de vídeo (live view), não transferência de arquivo. |
| **Cartão Wi-Fi (Eye-Fi/CFexpress Wi-Fi)** | ⚠️ legacy | Quase morto comercialmente. |

### Bibliotecas / SDKs por fabricante

- **libgphoto2** — open source, suporta ~2500 câmeras via PTP. Bom ponto de partida multi-marca.
- **Canon EDSDK** — oficial, requer cadastro de developer Canon.
- **Nikon NX Tether SDK / MAID** — oficial Nikon.
- **Sony Camera Remote SDK** — oficial Sony, USB e Wi-Fi.
- **Fujifilm X RAW Studio / Tether Plugin** — limitado.

> Cada SDK tem licenciamento próprio. libgphoto2 cobre o caso "começar logo"; SDKs oficiais entram quando precisar de feature avançada (live view, controle de disparo).

### Stack do app desktop

| Stack | Prós | Contras |
|---|---|---|
| **Electron** | Reusa JS/CSS do admin, bindings nativos via Node (`gphoto2-cli`, `node-canon-edsdk`). | Pesado (~150MB), consumo de RAM. |
| **Tauri** | Leve, Rust nativo, bom binding com libs C. | Curva de Rust. |
| **App nativo (Swift/C++)** | Performance máxima. | Precisa duplicar Mac e Windows. |

> **Recomendação se/quando avançar:** Electron primeiro (ship rápido reaproveitando código). Migrar para Tauri se peso virar problema.

### Pipeline de auto-ajuste "fast-food"

- **Sharp / libvips** — JPEG/TIFF resize, exposição, contraste, saturação. Já está no projeto server-side.
- **face-api.js / MediaPipe** — detecção de rosto para crop centrado.
- **dcraw / LibRaw** — para abrir RAW caso queira processar antes do upload.
- **WASM pipeline** custom — opção se quiser controle total e sem deps nativas.

Ajustes propostos no MVP:
1. Auto white balance (média ponderada).
2. Auto-exposição (histograma → curva).
3. Crop centrado em rosto (1 face dominante).
4. Saturação +10 / contraste +15 (constantes "look CliqueZoom").
5. Compressão JPEG q85.

> Tudo executa em ≤ 500ms por foto em CPU comum. Sem GPU obrigatório.

### Upload e auth

- Desktop autentica com **token de sessão** gerado no admin (QR Code ou código de 6 dígitos).
- Upload usa o endpoint existente de `multi_instant` — não precisa rota nova.
- Filas locais com retry para falha de rede (eventos com Wi-Fi ruim).

## Riscos e razões para esperar

1. **Hardware lock-in** — cada fabricante muda SDK; manter compatibilidade é trabalho contínuo.
2. **Casos de borda em campo** — bateria, cabo solto, USB hub, drivers Windows. Tethering é notório por ser frágil.
3. **Suporte ao usuário** — fotógrafo não-técnico vai ligar quando câmera não conectar. É mesa de ajuda, não só código.
4. **Foco do produto** — SaaS web ainda precisa amadurecer (CRM, pagamento, marca d'água, multi_instant em campo). Adicionar app desktop antes disso dilui foco.

## Quando faz sentido começar

Critérios mínimos antes de tocar nesta visão:

- [ ] SaaS web rodando estável em produção (sem incidentes mensais).
- [ ] Modo `multi_instant` validado em pelo menos 3 eventos reais.
- [ ] CRM/automação (skill 4.1) funcionando — fotógrafo já vê valor recorrente.
- [ ] Pelo menos 1 fotógrafo cliente pedindo explicitamente tether (validação de demanda).
- [ ] Receita ou capital para tolerar 2–3 meses focados em desktop.

## Caminho mínimo viável (quando chegar a hora)

**Fase 0 — Prova de conceito (1 semana, sem UI)**
- Script Node.js usando `gphoto2-cli` que baixa foto da câmera USB.
- Aplica Sharp básico.
- Faz POST no endpoint `multi_instant` existente.
- Roda em uma câmera só (a do dono).

**Fase 1 — Electron MVP (3–4 semanas)**
- App com login (token de sessão).
- Watcher USB/libgphoto2.
- Pipeline auto-ajuste com toggles.
- Upload com fila e retry.
- Funciona com 5–10 modelos de câmera populares.

**Fase 2 — Distribuição (2 semanas)**
- Code-signing Mac e Windows.
- Auto-update.
- Onboarding visual.

**Fase 3 — Expansão**
- Live view, controle remoto de disparo, presets de ajuste por evento.
- Suporte a SDKs oficiais para câmeras top-tier.

## Nome de produto sugerido

**CliqueZoom Capture** — alinhado com a identidade visual já feita.

## Anti-escopo permanente

Mesmo se um dia esta visão sair do papel, NÃO transformar em:
- Editor de RAW completo (concorrer com Lightroom é suicídio).
- Software de gestão de catálogo (Bridge / Photo Mechanic).
- Plataforma de impressão / álbuns físicos.

**O Capture serve a UM uso:** evento ao vivo + entrega imediata. Tudo fora disso fica no SaaS web ou em ferramentas de terceiros.

## Para revisitar

Reler este documento quando:
- Um cliente pedir tether/live diretamente.
- Modo `multi_instant` mostrar tração e os fotógrafos pedirem mais velocidade.
- Aparecer concorrente fazendo isso e ficar claro que é mesa.

Até lá, **dorme**.
