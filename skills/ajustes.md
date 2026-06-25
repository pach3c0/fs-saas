




Revisar Online ou com o Claude

# Modal de Cadastro de Leads
    quando abre o modal de criar novos leads e se o mapa estiver aparecendo na tela o nodal é criado atras do mapa, para resolver tenho que rolar a pagina tirar o mapa da minha visao e tentar abreir o modal novamente 

    nao consegui fazer o teste porque estou em local host



FAzer Solicitcao para o cluade
## CDN
    Fazer configuracao de CDN para a plataforma


## Armazenamento Fantasma 
    Mesmo sem sessao o sistema mostre que tem megas em armazenamento e nao deveria mostrar


## Agente Super admin 

    O agente esta fazendio a leitura de quantidade de orgs, o resultado que ele esta entregando nao esta sem o mesmo que esta no dashboard

     “O assistente consultou a fonte interna de métricas de negócio/assinaturas (getBusinessMetrics), que retornou distribuição por plano com 2 free e 3 pro. Precisamos validar de onde essa métrica lê o plano atribuído e por que diverge da tela do painel que mostra 1 free e 3 pro.”
Se quiser, eu posso te ajudar a montar uma mensagem objetiva para o engenheiro com o contexto dessa divergência.

# Limites de Planos Personalizados por Org

    Necessito que cada org, tenha seus limites de sessões, fotos e armazenamento, e que estes limites possam ser alterados pelo super admin

## Limpeza da Configuração "Padrão de entrega da galeria" (Aba Entrega)
    - O modo "Galeria" foi refatorado para uma "Página Única" onde a ação de "Entregar" fica embutida dentro de "Compartilhar" (Passo 2). 
    - O Passo 6 ("Entregar") nem é mais carregado pelo Stepper (`stepper.js`) para galerias. 
    - Devido a isso, as opções de "Sempre perguntar", "Compartilhar prévia" e "Entregar direto" não têm mais efeito.
    - O que deve ser feito: 
      1. Apagar a função `renderEntrega` e remover a aba "Entrega" inteira do arquivo `admin/js/tabs/configuracoes.js`.
      2. (Opcional/Limpeza profunda) Remover o código legado de `galleryDeliveryMode` que restou no backend (`src/routes/sessions.js`) e referências mortas na interface do fotógrafo (`stepper.js`, `wizard/steps/6-deliver.js`).

# Storage Adicional
    é necessario verificar como esta a questao de implementar o storage adicional, e excluir oque tinhamos pensado em deixar o cliente usar o driver dele
    