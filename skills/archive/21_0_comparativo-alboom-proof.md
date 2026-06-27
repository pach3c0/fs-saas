# CliqueZoom vs. Alboom Proof Gallery — Análise Comparativa

> Documento estratégico de posicionamento de produto. **Parado para revisão com calma** (pedido do dono em 2026-06-22). Nada aqui foi acionado ainda — é material de leitura/decisão.
> Cruzar com: monetização (gateway Mercado Pago já decidido para fase futura) e a trava **V1 sem pagamentos na plataforma** antes de mexer no roadmap.

---

## Visão Geral

| | **CliqueZoom** | **Alboom Proof Gallery** |
|---|---|---|
| **Modelo** | SaaS multi-tenant (seu próprio) | SaaS de terceiro (plataforma externa) |
| **Público** | Fotógrafos BR (plataforma white-label) | Fotógrafos BR/global |
| **Fundação** | 2024–2026 (em crescimento) | Empresa estabelecida (~10 anos) |
| **Stack** | Node.js + MongoDB + Vanilla JS | Plataforma proprietária |
| **Dados** | Banco próprio (controle total) | Dados no servidor deles |

---

## 🟢 Funcionalidades — Comparativo Detalhado

### Galeria e Entrega

| Funcionalidade | CliqueZoom | Alboom Proof |
|---|---|---|
| Galeria de fotos para cliente | ✅ PWA offline-ready | ✅ Web (sem PWA) |
| Entrega em alta resolução | ✅ | ✅ |
| Entrega de vídeo | ❌ (só fotos) | ✅ |
| Slideshow / tela cheia | ❌ (não mencionado) | ✅ |
| Álbum 3D interativo | ❌ | ✅ |
| Organização por coleções/álbuns | ❌ V2 oculta (albuns-prova.js) | ✅ (Making of, Cerimônia, Festa…) |
| Download pelo cliente | ✅ | ✅ |
| Offline (PWA / Service Worker) | ✅ `sw.js` | ❌ |
| Proteção contra print/screenshot | ❌ | ✅ (Proof Gallery 3.0) |
| Marca d'água automática | ❌ | ✅ |

### Seleção e Aprovação

| Funcionalidade | CliqueZoom | Alboom Proof |
|---|---|---|
| Seleção individual (`selection`) | ✅ | ✅ |
| Deadline de seleção | ✅ | ✅ (não explícito) |
| Seleção em grupo/família (`multi_selection`) | ✅ **diferencial** | ❌ (não encontrado) |
| QR Code de auto-inscrição | ✅ **diferencial único** | ❌ |
| Comentários do cliente por foto | ✅ (por participante) | ✅ |
| Reabertura de seleção | ✅ (por participante) | Não confirmado |
| Código de acesso (sem login) | ✅ | ✅ |
| Integração com Lightroom | ❌ | ✅ |

### Monetização (Fotos Extras)

| Funcionalidade | CliqueZoom | Alboom Proof |
|---|---|---|
| Pedido de fotos extras | ✅ (por participante) | ✅ |
| Tabela de preços progressiva | ✅ (cumulativa por faixas) | ✅ (descontos progressivos) |
| Pagamento integrado (gateway) | ❌ V1 — fotógrafo cobra fora | ✅ (Alboom Pay) |
| Entrega automática pós-pagamento | ❌ | ✅ |

### CRM / Gestão do Negócio

| Funcionalidade | CliqueZoom | Alboom Proof |
|---|---|---|
| CRM integrado | ✅ (Rhyno ERP via iframe SSO) | ❌ (focado só em galerias) |
| Gestão de clientes | ✅ | Básico |
| Gestão financeira | ✅ (via Rhyno) | Via Alboom Pay |
| Agendamento / sessões | ✅ | Não confirmado |
| Notificações automáticas (WhatsApp/email) | ✅ (schedulers) | ✅ |
| Pipeline de vendas | ✅ (via Rhyno) | ❌ |

### Site Público do Fotógrafo

| Funcionalidade | CliqueZoom | Alboom Proof |
|---|---|---|
| Site público com domínio próprio | ✅ (5 temas, subdomínio) | ✅ (site portfólio Alboom) |
| Builder de site visual | ✅ (com preview ao vivo em iframe) | ✅ |
| Múltiplos temas | ✅ (elegante, minimalista, moderno, escuro, galeria) | ✅ |
| Domínio customizado | ✅ (verificação DNS automática) | ✅ |
| Blog | ❌ | Não confirmado |

### Infraestrutura e Controle

| Funcionalidade | CliqueZoom | Alboom Proof |
|---|---|---|
| Controle total dos dados | ✅ (MongoDB próprio, VPS própria) | ❌ (dados no servidor deles) |
| Multi-tenant (SaaS próprio) | ✅ (escala para N fotógrafos) | N/A — é a plataforma |
| Self-hosted / white-label | ✅ potencial | ❌ |
| Velocidade de iteração | ✅ (muda o que quiser) | ❌ (depende da Alboom) |

---

## 💰 Comparativo de Custo

### Alboom Proof Gallery (custo para o fotógrafo)
| Storage | Mensal | Anual/mês |
|---|---|---|
| 5 GB | R$ 39 | R$ 34 |
| 20 GB | R$ 79 | R$ 67 |
| 70 GB | R$ 119 | R$ 99 |
| 200 GB | R$ 179 | R$ 149 |
| 500 GB | R$ 299 | R$ 249 |
| 1 TB | R$ 599 | R$ 499 |

> ⚠️ Limite por armazenamento ativo — precisa deletar/arquivar galerias antigas para liberar espaço.

### CliqueZoom (custo para o fotógrafo como cliente do SaaS)
> Depende da sua estratégia de precificação. Você tem controle total sobre o modelo de negócio.

**Vantagem estratégica:** Você pode oferecer **mais storage a menor custo** (VPS Contabo ~€15/mês para múltiplos clientes), ou criar planos sem limite de storage com custo marginal quase zero.

---

## 🏆 Diferenciais do CliqueZoom (onde você vence)

| Diferencial | Por que é importante |
|---|---|
| **`multi_selection` (seleção em grupo)** | Único no mercado BR — família inteira seleciona fotos na mesma sessão, cada um com seu acesso e pacote |
| **QR Code de auto-inscrição** | Cliente escaneia e vira participante automaticamente — fluxo sem atrito nenhum |
| **Tabela de preços cumulativa** | Precificação sofisticada por faixa — transparência total para o cliente |
| **PWA offline** | Funciona sem internet — Alboom não tem isso |
| **CRM + ERP integrado (Rhyno)** | Gestão completa do negócio em uma tela — Alboom foca só em galeria |
| **Controle total dos dados** | LGPD simplificada, sem dependência de terceiro, dados não saem do Brasil |
| **Multi-tenant white-label** | Você pode vender o CliqueZoom como plataforma para outros fotógrafos |
| **Custo controlado** | Storage na sua VPS = custo fixo baixo vs. plano escalonado do Alboom |

---

## ⚠️ Gaps do CliqueZoom (onde o Alboom vence agora)

| Gap | Impacto | Prioridade sugerida |
|---|---|---|
| **Pagamento integrado** (gateway) | Alto — fotógrafo cobra fora, experiência fragmentada | 🔴 Alta |
| **Entrega de vídeo** | Médio — casamentos/formaturas têm vídeo | 🟡 Média |
| **Integração com Lightroom** | Médio — workflow do fotógrafo profissional | 🟡 Média |
| **Marca d'água automática** | Alto — proteção do trabalho | 🔴 Alta |
| **Proteção anti-print/screenshot** | Médio — segurança das fotos | 🟡 Média |
| **Álbum 3D** | Baixo — mais diferencial de apresentação | 🟢 Baixa |
| **Slideshow nativo** | Baixo — UX na galeria | 🟢 Baixa |
| **Organização por coleções** | Médio — aba `albuns-prova.js` já existe mas oculta | 🟡 Média (V2 pronto) |

---

## 🗺️ Posicionamento Recomendado

```
Alboom Proof Gallery     ←——→     CliqueZoom
"Entregue fotos bonito"            "Gerencie todo o seu negócio"
Ferramenta de galeria              Plataforma completa do fotógrafo
Cobra por storage                  Cobra por sessões/plano
Controla seus dados                Você controla seus dados
Sem CRM                            CRM + ERP integrado
```

**Mensagem de posicionamento sugerida para o CliqueZoom:**
> *"Não é só galeria. É toda a gestão do seu negócio fotográfico em um lugar — com o único sistema de seleção em grupo do Brasil."*

---

## 📋 Roadmap Prioritário para Fechar os Gaps

1. **🔴 Marca d'água automática** — adicionar ao upload/galeria (protege o trabalho do fotógrafo)
2. **🔴 Gateway de pagamento** — integrar Pix/cartão para automatizar cobrança de extras
3. **🟡 Suporte a vídeo** — permitir upload e entrega de vídeos na galeria
4. **🟡 Coleções/álbuns na galeria** (`albuns-prova.js` já existe como V2 oculto — priorizar ativação)
5. **🟡 Plugin Lightroom** ou exportação via link/API (reduz fricção do workflow)

---

> **Conclusão:** O CliqueZoom tem uma base técnica sólida e diferenciais únicos (multi_selection + QR Code + CRM integrado). Os gaps principais são no lado da **monetização automatizada** e **proteção de mídia**. Endereçando os itens 🔴, você passa a competir diretamente com o Alboom tendo uma proposta de valor superior para fotógrafos que buscam controle total.

---

## ⚠️ Notas de cautela ao usar este documento (validar antes de agir)

- **"Gateway de pagamento 🔴 Alta"** colide com a decisão atual **V1 sem pagamentos na plataforma** (cupons/vendas negociados direto com o fotógrafo). O gateway (**Mercado Pago já escolhido**) é roadmap de monetização **futuro**, não V1 — não tratar como pendência imediata.
- **Custos do Alboom** e features da "Proof Gallery 3.0" são de pesquisa externa (junho/2026) — **reconferir no site deles** antes de usar em material de marketing.
- **Coleções/álbuns:** `albuns-prova.js` está como **V2 oculto** no admin; "pronto" aqui significa que existe código, não que está testado/ativo.
