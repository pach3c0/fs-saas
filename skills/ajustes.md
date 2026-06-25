




Revisar Online ou com o Claude





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

    Necessito que cada org, tenha seus limites de sessões, fotos e armazenamento, e que estes limites possam ser alterados pelo super admin, precisamos também de alguma forma dar de cortesia o plano pra cliente por exemplo hoje eu tenho cadastrado na plataforma minha esposa um amigo nosso que é o David a minha página de Admin que aí tudo bem é Admin e o outro site meu reino pro que eu não fiz nada ainda então são organizações que não vão me trazer nenhum tipo de dinheiro nenhum tipo de faturamento então elas entram como cortesia eu preciso sinalizar elas como cortesia elas precisam aparecer no painel do cliente como cortesia entendeu por exemplo o David está fazendo alguns testes pra mim me ajudou bastante deu bastante dica principalmente no modo seleção em grupo que é uma situação que ele está vivendo agora então bastante alteração do seleção em grupo foi devido a ele então eu decidi que nesse momento que eu estou implementando as coisas e vamos colocar aí que uns seis meses eu deixo de cortesia pra ele depois eu tiro a cortesia e eu tenho uma configuração de plano individual pra cada organização pra todas todas organizações que se cadastrar no nosso aplicativo eu tenho que ter uma opção de personalizar aquele plano o plano que ele assina no land page é o plano que manda em tudo ah se ele pegou o free é o plano atual aí dentro da indivíduo eu posso personalizar então a regra mas é o que ele assinou depois eu tenho uma que eu posso personalizar e nessa personalização eu posso aumentar o stories dele eu posso diminuir limite de sessões houve se versa ou eu posso dar de cortesia mas aí a cortesia eu dou limitada então eu quero personalizar e quando eu não quiser personalizado ou tirar da cortesia simplesmente eu vou lá e desativo aquele over de plano e aí ele volta pro plano normal da plataforma eu preciso ter essa personalização de plano


# Plataforma fora do Ar
    Eu preciso ter também no meu painel sãs Admin ou super Admin uma um botão configuração eu deixo a plataforma fora do ar fora do ar seria vou fazer uma manutenção hoje na plataforma já mandei notificado avisando que eu vou fazer uma manutenção às 2h00 da manhã então às 2h00 da manhã eu vou entrar na minha plataforma e vou habilitar o botão que tira todo mundo fora do ar quando as pessoas acessarem o painel Admin delas os fotógrafos e os clientes desses fotógrafos teremos que notificá-lo plataforma e manutenção previsão pra retorno tantas horas entendeu fotógrafo seria bacana se eu conseguisse também mas é uma opção não precisa ter se não tiver vai ficar somente essa notificação que na verdade é uma notificação que ela tem que permitir ser editado ou seja eu tenho que ter uma configuração dentro do meu sãs dentro do painel pra personalizar essa notificação notificar essa personalização que vai estar na página quando estiver fora do ar OK e o cliente só precisa aparecer uma coisa amigável e indelicada ou fotógrafo eu posso ter a opção de colocar a notificação que eu mandei há dois dias atrás caso alguém questione já tá ali ó foi notificado há tantos dias então tá aqui a notificação mas também se eu não quiser fazer isso normal só vai aparecer a notificação de que tá fora do ar e a previsão pensa em algo que o mercado usa juntando com essa minha ideia pra gente fazer um negócio legal e bacana


## Limpeza da Configuração "Padrão de entrega da galeria" (Aba Entrega)
    - O modo "Galeria" foi refatorado para uma "Página Única" onde a ação de "Entregar" fica embutida dentro de "Compartilhar" (Passo 2). 
    - O Passo 6 ("Entregar") nem é mais carregado pelo Stepper (`stepper.js`) para galerias. 
    - Devido a isso, as opções de "Sempre perguntar", "Compartilhar prévia" e "Entregar direto" não têm mais efeito.
    - O que deve ser feito: 
      1. Apagar a função `renderEntrega` e remover a aba "Entrega" inteira do arquivo `admin/js/tabs/configuracoes.js`.
      2. (Opcional/Limpeza profunda) Remover o código legado de `galleryDeliveryMode` que restou no backend (`src/routes/sessions.js`) e referências mortas na interface do fotógrafo (`stepper.js`, `wizard/steps/6-deliver.js`).

# Storage Adicional
    é necessario verificar como esta a questao de implementar o storage adicional, e excluir oque tinhamos pensado em deixar o cliente usar o driver dele


# Whatsapp na hora do Cadastro

se o usuario nao colocar o whatsapp no cadastro, precisamos criar uma regra, tipo quero quero deixar ele conhecer a plataforma primeiro tá então assim ter o WhatsApp é muito importante mas se ele não colocar isso no começo porque eu tava pensando em fazer um reconhecimento de dois fatores né WhatsApp e-mail o e-mail eu sei que eu consigo WhatsApp como tem que pagar né pra meta então fica um pouco mais complicado então tudo bem a gente coloca isso no formulário na L e se caso ele não colocar ou colocar um errado aí depois que irem começar a interagir com a plataforma a gente precisa ver alguma forma depois que ele criar duas sessões por exemplo criou duas sessões a gente tem que pensar no modo de pegar esse WhatsApp que ele já esteja na plataforma então é uma coisa que a gente precisa eu dei sugestões aqui mas possa ser que não seja as melhores em vista de que tem muitos gatilhos que seja melhor do que esse e aí você vai saber mais do que eu como eu posso ter algum gatilho que não incomode ele que ele se sinta à vontade e também que não seja muito agressivo pegas essa informação


#Campos do perfil do cleinte 

Também é outra coisa que precisamos ver na questão do dos dados do perfil por exemplo eu estou vendo aqui o perfil do cliente está faltando bastante coisa e tem uma brecha aqui por exemplo o único campo que pode ser ditado atualmente é o nome de negócio e-mail eu não posso deixar ele editar o e-mail dele que ele pode colocar um e-mail errado aí eu não consigo encontrar esse cara pra fazer algum alguma informação ele tem que solicitar tem que ter um botão ali solicitando a troca do e-mail aí a gente já pula pra uma outra etapa que é uma questão de verificação de segurança vê se alguém não entrou e Hackearam Hack essa plataforma do cliente está tentando puxar essa essa conta pra ele então tem algumas questões de segurança não pode ser editado tá tem que ter uma solicitação website já vem já por por The o o do meu site o slug dele que é o que ele já recebe por ter entrado na plataforma a gente pode até pensar depois que ele criar o domínio ou que eles fizeram a configuração do domínio apareceu os dois aqui pra ele também não pode ser editado isso aí telefone WhatsApp esse campo aqui a gente vai ter que pensar depois na hora de de exigir que ele coloque entendeu e ass ele colocou lá no formulário aqui vai ser preenchido se ele não colocar lá no formulário aqui vai ficar em aberto aí agora eu preciso cê me ajuda se vale a pena trancar esse campo ou não e eu vou precisar também ter informações de CPF ou não não preciso ter as informação CPF quem precisa ter vai ser o Mercado pago que vai ser a minha empresa que vai receber e liberar o plano se eu não precisar ter não tem porque eu ter essa responsabilidade e aqui no logotipo tem que ter aqui algo avisando que esse logotipo ele é para o site e não para a marca d'água porque é a marca d'água ela tem como ser em imagem então ela já tem o seu impute de imagem











