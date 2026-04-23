# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing-page.spec.js >> Landing Page - Jornada do Fotógrafo >> Deve mostrar erro ao tentar usar um slug já existente
- Location: tests/landing-page.spec.js:49:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#slugPreview')
Expected substring: "Indisponível"
Received string:    "✓ soraia.cliquezoom.com.br (Disponível)"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#slugPreview')
    4 × locator resolved to <div id="slugPreview" class="slug-preview">soraia.cliquezoom.com.br</div>
      - unexpected value "soraia.cliquezoom.com.br"
    5 × locator resolved to <div id="slugPreview" class="slug-preview">✓ soraia.cliquezoom.com.br (Disponível)</div>
      - unexpected value "✓ soraia.cliquezoom.com.br (Disponível)"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "CliqueZoom" [ref=e4] [cursor=pointer]:
        - /url: /
      - generic [ref=e5]:
        - button "Solucoes" [ref=e7] [cursor=pointer]:
          - text: Solucoes
          - img [ref=e8]
        - link "Planos" [ref=e10] [cursor=pointer]:
          - /url: "#planos"
        - link "FAQ" [ref=e11] [cursor=pointer]:
          - /url: "#faq-section"
        - link "Entrar" [ref=e12] [cursor=pointer]:
          - /url: /admin/
        - link "Criar Conta" [ref=e13] [cursor=pointer]:
          - /url: "#cadastro"
  - generic [ref=e14]:
    - generic [ref=e15]:
      - img [ref=e16]
      - text: BETA GRATUITO
    - heading "A plataforma completa para fotógrafos profissionais" [level=1] [ref=e18]
    - paragraph [ref=e19]: Galeria de seleção, entrega online, prova de álbum e site profissional — tudo em um só lugar.
    - generic [ref=e20]:
      - link "Começar grátis" [ref=e21] [cursor=pointer]:
        - /url: "#cadastro"
        - text: Começar grátis
        - img [ref=e22]
      - link "Conhecer Solucoes" [ref=e24] [cursor=pointer]:
        - /url: "#solucoes"
    - generic [ref=e25]: Sem cartão de crédito. Plano gratuito para sempre.
  - generic [ref=e27]:
    - generic [ref=e28]:
      - generic [ref=e29]: 100%
      - generic [ref=e30]: Gratuito no beta
    - generic [ref=e31]:
      - generic [ref=e32]: 2 min
      - generic [ref=e33]: Para criar sua conta
    - generic [ref=e34]:
      - generic [ref=e35]: 24h
      - generic [ref=e36]: Aprovacao em horas uteis
    - generic [ref=e37]:
      - generic [ref=e38]: "0"
      - generic [ref=e39]: Codigo necessario
  - generic [ref=e40]:
    - generic [ref=e41]: Solucoes
    - heading "Tudo que você precisa" [level=2] [ref=e42]
    - paragraph [ref=e43]: Ferramentas pensadas para o seu dia a dia, do portfolio a entrega final ao cliente.
    - generic [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e47]: 🖼️
        - heading "Galeria de Seleção" [level=3] [ref=e48]
        - paragraph [ref=e49]: Cliente seleciona as fotos favoritas com um coração. Limite de pacote e preço por foto extra configuráveis.
      - generic [ref=e50]:
        - generic [ref=e52]: 📦
        - heading "Entrega Online" [level=3] [ref=e53]
        - paragraph [ref=e54]: Entregue as fotos em alta resolução direto pelo link. Cliente baixa individualmente ou em ZIP.
      - generic [ref=e55]:
        - generic [ref=e57]: 📖
        - heading "Prova de Álbum" [level=3] [ref=e58]
        - paragraph [ref=e59]: Envie a prova do álbum folheável para aprovação. Cliente aprova página por página ou tudo de uma vez.
      - generic [ref=e60]:
        - generic [ref=e62]: 🌐
        - heading "Site Profissional" [level=3] [ref=e63]
        - paragraph [ref=e64]: Crie seu site de portfólio com 5 templates exclusivos. Domínio próprio suportado.
      - generic [ref=e65]:
        - generic [ref=e67]: 👥
        - heading "CRM de Clientes" [level=3] [ref=e68]
        - paragraph [ref=e69]: Gerencie seus clientes, histórico de sessões e dados de contato em um só lugar.
      - generic [ref=e70]:
        - generic [ref=e72]: 💧
        - heading "Marca D'Água" [level=3] [ref=e73]
        - paragraph [ref=e74]: Proteja suas fotos com marca d'água personalizada (texto ou logo) com opacidade ajustável.
      - generic [ref=e75]:
        - generic [ref=e77]: 📊
        - heading "Analytics" [level=3] [ref=e78]
        - paragraph [ref=e79]: Acompanhe acessos à sua galeria com Google Analytics e Meta Pixel integrados.
      - generic [ref=e80]:
        - generic [ref=e82]: 📱
        - heading "PWA Offline" [level=3] [ref=e83]
        - paragraph [ref=e84]: Galeria funciona offline como app nativo. Cliente instala no celular e acessa sem internet.
  - generic [ref=e86]:
    - generic [ref=e87]: Como funciona
    - heading "Como funciona" [level=2] [ref=e88]
    - paragraph [ref=e89]: Sem complicacao. Crie sua conta e comece a usar em minutos.
    - generic [ref=e90]:
      - generic [ref=e91]:
        - generic [ref=e92]: 📸
        - heading "Crie sua conta" [level=3] [ref=e93]
        - paragraph [ref=e94]: Cadastre-se gratuitamente e configure seu estúdio em minutos.
      - generic [ref=e95]:
        - generic [ref=e96]: 🖼️
        - heading "Envie suas fotos" [level=3] [ref=e97]
        - paragraph [ref=e98]: Faça upload das fotos da sessão e compartilhe o link com seu cliente.
      - generic [ref=e99]:
        - generic [ref=e100]: ✅
        - heading "Cliente aprova" [level=3] [ref=e101]
        - paragraph [ref=e102]: Seu cliente seleciona, aprova e você entrega com um clique.
  - generic [ref=e103]:
    - generic [ref=e104]: Recursos
    - heading "Projetado para fotografos" [level=2] [ref=e105]
    - paragraph [ref=e106]: Cada recurso foi pensado para facilitar seu trabalho e impressionar seus clientes.
    - generic [ref=e107]:
      - generic [ref=e108]:
        - img [ref=e110]
        - generic [ref=e115]:
          - heading "Painel Administrativo" [level=4] [ref=e116]
          - paragraph [ref=e117]: Gerencie todo o conteudo do seu site, albuns, sessoes e notificacoes em um so lugar.
      - generic [ref=e118]:
        - img [ref=e120]
        - generic [ref=e123]:
          - heading "Subdominio Exclusivo" [level=4] [ref=e124]
          - paragraph [ref=e125]: "Seu nome na URL: seudominio.cliquezoom.com.br. Profissional e facil de compartilhar."
      - generic [ref=e126]:
        - img [ref=e128]
        - generic [ref=e131]:
          - heading "Notificacoes em Tempo Real" [level=4] [ref=e132]
          - paragraph [ref=e133]: Saiba quando clientes acessam galerias, selecionam fotos ou finalizam selecoes.
      - generic [ref=e134]:
        - img [ref=e136]
        - generic [ref=e138]:
          - heading "100% Responsivo" [level=4] [ref=e139]
          - paragraph [ref=e140]: Seu site e a galeria do cliente funcionam perfeitamente em celular, tablet e desktop.
      - generic [ref=e141]:
        - img [ref=e143]
        - generic [ref=e146]:
          - heading "Newsletter Integrada" [level=4] [ref=e147]
          - paragraph [ref=e148]: Capture leads no seu site com formulario de newsletter e gerencie inscritos pelo painel.
      - generic [ref=e149]:
        - img [ref=e151]
        - generic [ref=e154]:
          - heading "Zero Codigo" [level=4] [ref=e155]
          - paragraph [ref=e156]: Tudo configuravel pelo painel. Atualize fotos, textos e cores sem precisar programar.
  - generic [ref=e158]:
    - generic [ref=e159]: Planos
    - heading "Planos e preços" [level=2] [ref=e160]
    - paragraph [ref=e161]: Comece grátis e cresça no seu ritmo.
    - generic [ref=e162]:
      - generic [ref=e163]:
        - generic [ref=e164]: Free
        - generic [ref=e165]: Para começar e testar a plataforma.
        - generic [ref=e166]:
          - generic [ref=e167]: R$ 0
          - generic [ref=e168]: /para sempre
        - separator [ref=e169]
        - list [ref=e170]:
          - listitem [ref=e171]:
            - img [ref=e172]
            - text: Até 5 sessões
          - listitem [ref=e174]:
            - img [ref=e175]
            - text: Até 100 fotos por sessão
          - listitem [ref=e177]:
            - img [ref=e178]
            - text: 1 álbum de prova
          - listitem [ref=e180]:
            - img [ref=e181]
            - text: 500 MB de armazenamento
          - listitem [ref=e183]:
            - img [ref=e184]
            - text: Galeria de seleção
          - listitem [ref=e186]:
            - img [ref=e187]
            - text: Entrega online
        - link "Comecar Free" [ref=e189] [cursor=pointer]:
          - /url: "#cadastro"
      - generic [ref=e190]:
        - generic [ref=e191]: Popular
        - generic [ref=e192]: Basic
        - generic [ref=e193]: Para fotógrafos em crescimento.
        - generic [ref=e194]:
          - generic [ref=e195]: R$ 49
          - generic [ref=e196]: /por mês
        - separator [ref=e197]
        - list [ref=e198]:
          - listitem [ref=e199]:
            - img [ref=e200]
            - text: Até 50 sessões
          - listitem [ref=e202]:
            - img [ref=e203]
            - text: Até 5.000 fotos por sessão
          - listitem [ref=e205]:
            - img [ref=e206]
            - text: 10 álbuns de prova
          - listitem [ref=e208]:
            - img [ref=e209]
            - text: 10 GB de armazenamento
          - listitem [ref=e211]:
            - img [ref=e212]
            - text: Tudo do Free
          - listitem [ref=e214]:
            - img [ref=e215]
            - text: Site profissional
          - listitem [ref=e217]:
            - img [ref=e218]
            - text: CRM de clientes
          - listitem [ref=e220]:
            - img [ref=e221]
            - text: Analytics integrado
        - link "Assinar Basic" [ref=e223] [cursor=pointer]:
          - /url: "#cadastro"
      - generic [ref=e224]:
        - generic [ref=e225]: Pro
        - generic [ref=e226]: Para estúdios profissionais.
        - generic [ref=e227]:
          - generic [ref=e228]: R$ 99
          - generic [ref=e229]: /por mês
        - separator [ref=e230]
        - list [ref=e231]:
          - listitem [ref=e232]:
            - img [ref=e233]
            - text: Sessões ilimitadas
          - listitem [ref=e235]:
            - img [ref=e236]
            - text: Fotos ilimitadas
          - listitem [ref=e238]:
            - img [ref=e239]
            - text: Álbuns ilimitados
          - listitem [ref=e241]:
            - img [ref=e242]
            - text: 50 GB de armazenamento
          - listitem [ref=e244]:
            - img [ref=e245]
            - text: Tudo do Basic
          - listitem [ref=e247]:
            - img [ref=e248]
            - text: Domínio próprio
          - listitem [ref=e250]:
            - img [ref=e251]
            - text: Suporte prioritário
        - link "Comecar Pro" [ref=e253] [cursor=pointer]:
          - /url: "#cadastro"
    - paragraph [ref=e254]: Durante o beta, todas as funcionalidades estao disponiveis gratuitamente.
  - generic [ref=e256]:
    - generic [ref=e257]: Duvidas
    - heading "Perguntas frequentes" [level=2] [ref=e258]
    - generic [ref=e259]:
      - generic [ref=e260]:
        - button "Preciso de cartão de crédito para começar?" [ref=e261] [cursor=pointer]:
          - text: Preciso de cartão de crédito para começar?
          - img [ref=e262]
        - paragraph [ref=e264]: Não. O plano Free é gratuito para sempre, sem necessidade de cartão de crédito.
      - generic [ref=e265]:
        - button "Posso mudar de plano a qualquer momento?" [ref=e266] [cursor=pointer]:
          - text: Posso mudar de plano a qualquer momento?
          - img [ref=e267]
        - paragraph [ref=e269]: Sim. Você pode fazer upgrade ou downgrade do seu plano quando quiser.
      - generic [ref=e270]:
        - button "Como meu cliente acessa as fotos?" [ref=e271] [cursor=pointer]:
          - text: Como meu cliente acessa as fotos?
          - img [ref=e272]
        - paragraph [ref=e274]: Você compartilha um link com código de acesso. O cliente acessa pelo navegador, sem precisar criar conta.
      - generic [ref=e275]:
        - button "As fotos ficam seguras na plataforma?" [ref=e276] [cursor=pointer]:
          - text: As fotos ficam seguras na plataforma?
          - img [ref=e277]
        - paragraph [ref=e279]: Sim. As fotos são armazenadas com segurança e protegidas por marca d'água. Apenas quem tem o código de acesso pode ver.
      - generic [ref=e280]:
        - button "Posso usar meu próprio domínio?" [ref=e281] [cursor=pointer]:
          - text: Posso usar meu próprio domínio?
          - img [ref=e282]
        - paragraph [ref=e284]: Sim, no plano Pro você pode conectar seu domínio próprio ao seu site profissional.
    - generic [ref=e285]:
      - button "Preciso esperar para usar a plataforma?" [ref=e286] [cursor=pointer]:
        - text: Preciso esperar para usar a plataforma?
        - img [ref=e287]
      - paragraph [ref=e289]: Nao ha aprovacao manual. Sua conta e ativada automaticamente assim que voce conclui o cadastro. Voce ja pode acessar o painel e comecar a configurar seu site.
    - generic [ref=e290]:
      - button "Posso usar meu dominio proprio?" [ref=e291] [cursor=pointer]:
        - text: Posso usar meu dominio proprio?
        - img [ref=e292]
      - paragraph [ref=e294]: No momento, voce recebe um subdominio exclusivo (seudominio.cliquezoom.com.br). Dominios proprios serao suportados em uma atualizacao futura.
    - generic [ref=e295]:
      - button "Como funciona a selecao de fotos?" [ref=e296] [cursor=pointer]:
        - text: Como funciona a selecao de fotos?
        - img [ref=e297]
      - paragraph [ref=e299]: Voce cria uma sessao no painel, faz upload das fotos e define um codigo de acesso. Seu cliente acessa a galeria privada, seleciona as fotos favoritas (com limite de pacote) e finaliza. Voce recebe uma notificacao e pode revisar, reabrir ou entregar.
    - generic [ref=e300]:
      - button "Preciso saber programar?" [ref=e301] [cursor=pointer]:
        - text: Preciso saber programar?
        - img [ref=e302]
      - paragraph [ref=e304]: Nao! Tudo e configuravel pelo painel administrativo. Voce atualiza fotos, textos, cores e conteudo sem precisar escrever nenhuma linha de codigo.
    - generic [ref=e305]:
      - button "Meus dados estao seguros?" [ref=e306] [cursor=pointer]:
        - text: Meus dados estao seguros?
        - img [ref=e307]
      - paragraph [ref=e309]: Sim. Cada fotografo tem seus dados completamente isolados. Utilizamos HTTPS em todas as conexoes e as fotos dos clientes sao protegidas por codigo de acesso exclusivo.
    - generic [ref=e310]:
      - button "Posso cancelar a qualquer momento?" [ref=e311] [cursor=pointer]:
        - text: Posso cancelar a qualquer momento?
        - img [ref=e312]
      - paragraph [ref=e314]: Sim, sem fidelidade. Voce pode fazer downgrade para o plano Free ou encerrar sua conta quando quiser. Seus dados ficam disponiveis por 30 dias apos o cancelamento.
  - generic [ref=e316]:
    - heading "Pronto para transformar sua entrega de fotos?" [level=2] [ref=e317]
    - paragraph [ref=e318]: Junte-se a fotógrafos profissionais que já usam a CliqueZoom.
    - link "Criar conta grátis" [ref=e319] [cursor=pointer]:
      - /url: "#cadastro"
      - text: Criar conta grátis
      - img [ref=e320]
  - generic [ref=e322]:
    - generic [ref=e323]: Cadastro
    - heading "Crie sua conta" [level=2] [ref=e324]
    - paragraph [ref=e325]: Preencha os dados abaixo para criar seu portfolio profissional
    - generic [ref=e326]:
      - generic [ref=e327]:
        - generic [ref=e328]:
          - generic [ref=e329]: Nome completo
          - textbox "Nome completo" [ref=e330]:
            - /placeholder: Seu nome
        - generic [ref=e331]:
          - generic [ref=e332]: Email
          - textbox "Email" [ref=e333]:
            - /placeholder: seu@email.com
        - generic [ref=e334]:
          - generic [ref=e335]: Nome do estudio
          - textbox "Nome do estudio" [ref=e336]:
            - /placeholder: "Ex: Maria Fotografias"
        - generic [ref=e337]:
          - generic [ref=e338]: URL do seu site
          - textbox "URL do seu site" [active] [ref=e339]:
            - /placeholder: meu-estudio
            - text: soraia
          - generic [ref=e340]: ✓ soraia.cliquezoom.com.br (Disponível)
          - generic [ref=e341]: Apenas letras minusculas, numeros e hifens
        - generic [ref=e342]:
          - generic [ref=e343]:
            - generic [ref=e344]: Senha
            - textbox "Senha" [ref=e345]:
              - /placeholder: Min. 6 caracteres
          - generic [ref=e346]:
            - generic [ref=e347]: Confirmar senha
            - textbox "Confirmar senha" [ref=e348]:
              - /placeholder: Repita a senha
        - button "Criar Minha Conta" [ref=e349] [cursor=pointer]
      - generic [ref=e350]:
        - text: Ja tem uma conta?
        - link "Faca login" [ref=e351] [cursor=pointer]:
          - /url: /admin
  - contentinfo [ref=e352]:
    - generic [ref=e353]:
      - generic [ref=e354]: CliqueZoom
      - generic [ref=e355]:
        - link "Solucoes" [ref=e356] [cursor=pointer]:
          - /url: "#solucoes"
        - link "Planos" [ref=e357] [cursor=pointer]:
          - /url: "#planos"
        - link "FAQ" [ref=e358] [cursor=pointer]:
          - /url: "#faq-section"
        - link "Portfolio" [ref=e359] [cursor=pointer]:
          - /url: /
      - generic [ref=e360]: © 2026 CliqueZoom. Todos os direitos reservados.
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('Landing Page - Jornada do Fotógrafo', () => {
  4  |   
  5  |   test('Deve carregar o conteúdo dinâmico e realizar cadastro com sucesso', async ({ page }) => {
  6  |     // 1. Acessar a Landing Page
  7  |     await page.goto('/');
  8  | 
  9  |     // 2. Verificar se o conteúdo dinâmico (Hero) carregou
  10 |     // Aguardamos que o título contenha o texto esperado (que venha do banco ou default)
  11 |     const headline = page.locator('#heroHeadline');
  12 |     await expect(headline).toBeVisible();
  13 |     
  14 |     // 3. Simular preenchimento do formulário
  15 |     const randomSuffix = Math.floor(Math.random() * 10000);
  16 |     const testSlug = `estudio-teste-${randomSuffix}`;
  17 |     const testEmail = `teste-${randomSuffix}@cliquezoom.com.br`;
  18 | 
  19 |     await page.fill('#name', 'Fotógrafo de Teste');
  20 |     await page.fill('#email', testEmail);
  21 |     await page.fill('#orgName', 'Meu Estúdio de Teste');
  22 |     
  23 |     // 4. Testar verificação de Slug em tempo real
  24 |     const slugInput = page.locator('#slug');
  25 |     await slugInput.fill(testSlug);
  26 | 
  27 |     // Aguardar o feedback visual (Verde/Disponível)
  28 |     const slugPreview = page.locator('#slugPreview');
  29 |     await expect(slugPreview).toContainText('Disponível', { timeout: 5000 });
  30 |     await expect(slugPreview).toHaveCSS('color', 'rgb(22, 163, 74)'); // #16a34a
  31 | 
  32 |     // 5. Preencher senhas e enviar
  33 |     await page.fill('#password', 'senha123');
  34 |     await page.fill('#confirmPassword', 'senha123');
  35 | 
  36 |     // 6. Clicar no botão de submissão
  37 |     await page.click('#submitBtn');
  38 | 
  39 |     // 7. Verificar estado de sucesso
  40 |     const successState = page.locator('#successState');
  41 |     await expect(successState).toBeVisible({ timeout: 10000 });
  42 |     await expect(successState).toContainText('Cadastro realizado com sucesso!');
  43 |     
  44 |     // Verificar se o slug correto aparece na mensagem de sucesso
  45 |     const successSlug = page.locator('#successSlug');
  46 |     await expect(successSlug).toContainText(`${testSlug}.cliquezoom.com.br`);
  47 |   });
  48 | 
  49 |   test('Deve mostrar erro ao tentar usar um slug já existente', async ({ page }) => {
  50 |     await page.goto('/');
  51 | 
  52 |     // Usaremos o slug 'soraia' que o usuário mencionou como exemplo de existente
  53 |     const slugInput = page.locator('#slug');
  54 |     await slugInput.fill('soraia');
  55 | 
  56 |     // Aguardar feedback de indisponibilidade (Vermelho)
  57 |     const slugPreview = page.locator('#slugPreview');
> 58 |     await expect(slugPreview).toContainText('Indisponível', { timeout: 5000 });
     |                               ^ Error: expect(locator).toContainText(expected) failed
  59 |     await expect(slugPreview).toHaveCSS('color', 'rgb(220, 38, 38)'); // #dc2626
  60 |   });
  61 | 
  62 | });
  63 | 
```