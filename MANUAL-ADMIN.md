# Manual do Painel Administrativo — CliqueZoom

> Este manual explica cada módulo do painel admin para o fotógrafo: o que é, para que serve, como configurar e onde o resultado aparece.

---

## Como acessar o painel

- **URL:** `seuslug.cliquezoom.com.br/admin/` (ou domínio próprio se configurado)
- **Login:** e-mail e senha cadastrados na plataforma
- **Sessão:** dura 7 dias. Após isso, você verá a mensagem *"Sua sessão expirou"* e deverá fazer login novamente.

---

## Visão geral da sidebar

| Ícone | Módulo | Finalidade resumida |
|-------|--------|---------------------|
| 🖼️ | Hero | Capa principal do site |
| 👤 | Perfil | Dados do estúdio e marca d'água |
| 👥 | Sessões | Galeria privada para clientes |
| 📖 | Prova de Álbuns | Aprovação de álbuns pelos clientes |
| 🌐 | Meu Site | Conteúdo completo do site público |
| 🔗 | Domínio | Configurar domínio próprio |
| 🗂️ | Clientes | CRM — cadastro de clientes |
| 💳 | Plano | Assinatura e limites de uso |
| 🔗 | Rodapé | Links e redes sociais do site |
| 🔌 | Integrações | WhatsApp, Google Analytics, Meta Pixel |
| 📈 | Marketing | Métricas de campanhas |
| ⚙️ | Manutenção | Ativar página de manutenção |

---

## 🖼️ Hero — Capa do Site

### O que é
O Hero é a **primeira coisa que um visitante vê** ao entrar no seu site. É a tela cheia com foto de fundo, título e subtítulo. É a sua vitrine — a imagem e as palavras que definem sua identidade visual na internet.

### Para que serve
- Causar impacto imediato no visitante
- Comunicar seu estilo fotográfico com uma imagem poderosa
- Apresentar seu nome/estúdio e slogan

### Como configurar

**Textos**
- **Título Principal:** seu nome, nome do estúdio ou slogan principal. Ex: *"Soraia Estúdio"* ou *"Fotografando momentos únicos"*
- **Subtítulo:** complemento do título. Ex: *"Ensaios | Casamentos | Família"*

**Imagem**
- Clique em **Substituir Imagem** para fazer upload da foto de fundo
- Use uma foto horizontal de alta qualidade (recomendado: mínimo 1920×1080px)
- **Zoom:** amplia ou reduz a imagem dentro do frame (0.5x a 2x)
- **Posição:** arraste a foto diretamente no preview para reposicionar o ponto de foco

**Título e Subtítulo**
- **Tamanho (px):** controla o tamanho da fonte. Título padrão: 80px, subtítulo: 40px
- **Posição:** arraste o texto diretamente no preview para posicioná-lo onde quiser na tela

**Efeitos**
- **Overlay:** camada escura semi-transparente sobre a foto (0% = sem escurecimento, 80% = bem escuro). Ajuda a destacar o texto branco sobre fotos claras
- **Barra Superior / Inferior:** adiciona uma faixa preta no topo ou rodapé do hero. Útil para criar um efeito cinematográfico ou separar o hero do menu de navegação

**Preview ao vivo**
- Tudo que você altera aparece instantaneamente no preview à direita
- Alterne entre **Desktop** e **Mobile** para conferir como ficará em cada dispositivo
- Arraste os elementos diretamente no preview para reposicioná-los

### Onde aparece
→ Site público do fotógrafo (tela inicial, seção hero)

### Dica prática
Use uma foto que mostre **seu melhor trabalho** e que tenha uma área mais escura onde o texto fique legível. Se a foto for clara, aumente o Overlay para 30–40%.

---

## 👤 Perfil — Dados do Estúdio e Marca d'Água

### O que é
As informações oficiais do seu estúdio: nome, contato, logotipo e configurações de marca d'água nas fotos dos clientes.

### Para que serve
- Identificar seu estúdio na plataforma e no site
- Configurar a **marca d'água** que aparece nas fotos enquanto o cliente ainda não recebeu a entrega final
- Definir a identidade visual (cor primária, logo)

### Como configurar

**Dados do estúdio**
- Nome, telefone, WhatsApp, e-mail de contato, site pessoal
- Endereço, cidade, estado
- Bio (descrição do estúdio — aparece no site público)
- Logotipo (upload de imagem PNG com fundo transparente)

**Marca d'água**
- **Tipo:** Texto (ex: *"Soraia Estúdio"*) ou Logo (sua imagem)
- **Texto personalizado:** o texto que aparecerá sobre as fotos
- **Opacidade:** intensidade da marca d'água (5% = quase invisível, 50% = bem visível). Recomendado: 15–20%
- **Posição:** Centro, Grade (repetida), Cantos, etc.
- **Tamanho:** Pequeno, Médio, Grande

### Onde aparece
→ Marca d'água: sobre todas as fotos na **galeria do cliente** enquanto a sessão não estiver com status *Entregue*
→ Logotipo: cabeçalho e rodapé do **site público**
→ Nome do estúdio: e-mails enviados aos clientes

### Por que é importante
A marca d'água **protege suas fotos** de serem usadas sem pagamento. Ela some automaticamente quando você marca a sessão como *Entregue* — o cliente então recebe acesso às fotos em alta resolução sem marca d'água.

---

## 👥 Sessões — Galeria Privada para Clientes

### O que é
O módulo central da plataforma. Uma sessão é uma galeria privada criada para um cliente específico, acessível apenas com um código de acesso.

### Para que serve
- Entregar fotos para o cliente de forma segura e profissional
- Permitir que o cliente **selecione as fotos** do pacote contratado
- Controlar o fluxo: seleção → revisão → entrega final

### Como configurar

**Criar uma sessão**
1. Clique em **+ Nova Sessão**
2. Preencha: nome do cliente, tipo (Família, Casamento, Evento, etc.), data, prazo de seleção
3. Escolha o **modo**:
   - **Seleção:** cliente escolhe as fotos favoritas dentro de um limite
   - **Galeria:** cliente só visualiza e baixa (sem seleção)
4. Defina o **limite do pacote** (ex: 30 fotos) e o **preço por foto extra** (ex: R$25)
5. Salve e faça o upload das fotos

**Fluxo de seleção**
| Etapa | Status | O que acontece |
|-------|--------|----------------|
| Sessão criada | `Pendente` | Cliente ainda não acessou |
| Cliente acessou e está selecionando | `Em andamento` | Você vê em tempo real |
| Cliente finalizou | `Enviado` | Você recebe notificação |
| Você aprova e entrega | `Entregue` | Cliente baixa sem marca d'água |

**Código de acesso**
- Gerado automaticamente
- Compartilhe com o cliente por WhatsApp ou e-mail
- O cliente acessa a galeria e digita o código para entrar

### Onde aparece
→ **Galeria do cliente** — é o destino final de tudo que você configura aqui

### Por que é importante
Substituiu o processo manual de enviar fotos por WeTransfer ou Google Drive. O cliente tem uma experiência profissional, com galeria personalizada com sua marca, e você tem controle total do processo.

---

## 📖 Prova de Álbuns — Aprovação de Álbuns

### O que é
Ferramenta para criar **álbuns digitais** (como um fotolivro) e enviá-los para aprovação do cliente antes da impressão.

### Para que serve
- Montar o layout do álbum e mostrar ao cliente
- Receber aprovação ou pedido de alteração por página
- Documentar o processo de aprovação

### Como configurar
1. Crie um novo álbum e dê um nome
2. Adicione páginas com fotos (pode importar da sessão vinculada)
3. Clique em **Enviar para Cliente** — ele recebe um link de acesso
4. O cliente aprova ou solicita revisão página por página
5. Você ajusta e reenvia até a aprovação final

### Onde aparece
→ Portal de álbuns do cliente (link exclusivo por álbum)

---

## 🌐 Meu Site — Conteúdo do Site Público

### O que é
Aqui você edita todo o conteúdo do seu site profissional: sobre você, portfólio, serviços, depoimentos, FAQ, contato, etc.

### Para que serve
Montar e atualizar o **site do seu estúdio** sem precisar de programador.

### Sub-módulos

| Sub-aba | O que configura |
|---------|-----------------|
| **Geral** | Template visual (5 opções), título do site, WhatsApp, Instagram |
| **Sobre** | Sua bio, texto de apresentação e fotos suas |
| **Portfólio** | Galeria de melhores trabalhos (com controle de enquadramento) |
| **Serviços** | Lista de serviços e preços |
| **Depoimentos** | Avaliações de clientes |
| **Álbuns** | Coleções de fotos agrupadas por tema |
| **Estúdio** | Endereço, horários, vídeo e fotos do espaço |
| **FAQ** | Perguntas e respostas frequentes |
| **Newsletter** | Formulário de captura de e-mails |
| **Contato** | Texto e formulário de contato |

**Templates disponíveis:**
- **Elegante** — dourado, fontes serif, clássico
- **Minimalista** — preto e branco, clean, muito espaço
- **Moderno** — azul/gradientes, assimétrico
- **Escuro** — dark mode, laranja, cinematográfico
- **Galeria** — grid estilo Pinterest, foco nas fotos

### Onde aparece
→ `seuslug.cliquezoom.com.br/site` (ou domínio próprio)

---

## 🔗 Domínio — Domínio Próprio

### O que é
Configuração para usar seu próprio domínio (ex: `www.soraiaestudio.com.br`) em vez do subdomínio da CliqueZoom.

### Como funciona
1. Digite seu domínio
2. A plataforma gera um registro DNS (tipo A)
3. Você configura esse registro no painel do seu provedor de domínio (Registro.br, Hostinger, etc.)
4. Aguarda propagação (até 24h) e o domínio é verificado automaticamente

### Onde aparece
→ Seu site, galeria do cliente e links passam a usar seu domínio próprio

---

## 🗂️ Clientes — CRM

### O que é
Cadastro de clientes do estúdio com histórico de sessões.

### Para que serve
- Manter dados de contato organizados
- Ver todas as sessões de um cliente em um lugar
- Categorizar clientes por tags (casamento, família, corporativo, etc.)

### Como usar
- Cadastre nome, e-mail, telefone, tags e observações privadas
- Ao criar uma sessão, vincule-a a um cliente do CRM
- No card do cliente, veja quantas sessões ele já fez

### Onde aparece
→ Uso interno do admin apenas (não aparece no site público)

---

## 💳 Plano — Assinatura

### O que é
Visualização do plano atual e opções de upgrade.

### O que mostra
- Plano ativo (Free, Basic, Pro)
- Uso atual: sessões criadas, fotos enviadas, storage
- Limites do plano
- Cards comparativos dos planos disponíveis

### Planos disponíveis
| Plano | Sessões | Fotos | Álbuns | Domínio próprio |
|-------|---------|-------|--------|-----------------|
| Free | 5 | 100 | 1 | Não |
| Basic | 50 | 5.000 | 10 | Não |
| Pro | Ilimitado | Ilimitado | Ilimitado | Sim |

---

## 🔗 Rodapé — Footer do Site

### O que é
Conteúdo exibido no rodapé do site público.

### O que configura
- **Redes sociais:** Instagram, Facebook, LinkedIn, TikTok, YouTube, e-mail
- **Links rápidos:** links personalizados (ex: "Ver Portfólio", "Contato")
- **Newsletter:** título e descrição do formulário de captura
- **Copyright:** texto de direitos autorais

### Onde aparece
→ Rodapé do site público em todas as páginas

---

## 🔌 Integrações — Ferramentas Externas

### O que é
Conexão com ferramentas de marketing e análise.

### Integrações disponíveis

**Widget do WhatsApp**
- Exibe um botão flutuante de WhatsApp no seu site
- Configure o número e uma mensagem padrão de abertura
- Facilita o contato direto de visitantes interessados

**Google Analytics 4**
- Rastreia visitantes, páginas mais vistas, origem do tráfego
- Necessário: ID de medição (formato `G-XXXXXXXXXX`)
- Obtenha em: analytics.google.com

**Meta Pixel (Facebook)**
- Rastreia conversões para campanhas de anúncios no Facebook/Instagram
- Necessário: Pixel ID (número de 15 dígitos)
- Obtenha em: Gerenciador de Eventos do Facebook

### Onde aparece
→ Scripts são injetados no **site público** automaticamente após salvar

---

## 📈 Marketing — Painel de Métricas

### O que é
Visão geral do desempenho das campanhas de marketing.

### O que mostra
- Visitas nos últimos 30 dias
- Leads gerados via WhatsApp
- Custo por lead (CPA)
- Funil: impressões → cliques → leads
- Dados demográficos e geográficos dos visitantes

> **Nota:** Os dados são estimados com base nas integrações ativas (Google Analytics e Meta Pixel). Quanto mais integrações configuradas, mais preciso o painel.

---

## ⚙️ Manutenção — Página de Manutenção

### O que é
Ativa uma tela de manutenção no seu site público, escondendo o conteúdo temporariamente.

### Para que serve
- Informar visitantes quando o site está em atualização
- Exibir uma mensagem personalizada enquanto você trabalha nas configurações
- Mostrar um carrossel de fotos enquanto o site principal está offline

### Como usar
1. Ative o toggle **Manutenção**
2. Personalize o título e a mensagem
3. Faça upload de fotos para o carrossel (opcional)
4. Salve — o site público mostra a tela de manutenção imediatamente
5. Quando terminar, desative o toggle e salve novamente

> **Atenção:** O link `/preview` continua funcionando normalmente mesmo com a manutenção ativa — use para revisar as alterações antes de publicar.

### Onde aparece
→ Site público — substitui todo o conteúdo enquanto ativo

---

## Fluxo recomendado para um fotógrafo novo

1. **Perfil** → Configure nome do estúdio, logo e marca d'água
2. **Hero** → Faça upload da melhor foto e configure título/subtítulo
3. **Meu Site → Geral** → Escolha o template visual
4. **Meu Site → Portfólio** → Suba suas melhores fotos
5. **Meu Site → Sobre** → Escreva sua bio e suba uma foto sua
6. **Meu Site → Serviços** → Liste o que você oferece e os preços
7. **Rodapé** → Adicione suas redes sociais
8. **Integrações** → Conecte WhatsApp e Google Analytics
9. **Sessões** → Crie a primeira sessão para um cliente e compartilhe o código

---

*Dúvidas ou problemas? Entre em contato com o suporte CliqueZoom.*
