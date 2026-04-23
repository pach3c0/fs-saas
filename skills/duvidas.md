Fala galera, beleza?
Nessa aula nós vamos falar sobre single, tenant e multi tenant.
Esses dois conceitos, tá pessoal?
Eles não estão disponíveis só no contexto de SAS.
Na verdade, quando a gente fala de SAS, nós temos outros nomes.
E vamos ver um pouco mais pra frente, como silo, as vezes shared bread, enfim.
Aqui vamos entender algo que está comum em todo mundo de TI, independente se é um software SAS ou não,
que é uma arquitetura single tenant ou uma arquitetura multi tenant.
Para ficar mais fácil, Tenant pessoal é um inquilino.
Então, quando alguém está imaginando um aluguel e tudo mais, é um tenente.
Então, quando a gente passa aqui no mundo de uma aplicação, sendo o SAS ou não, como eu falei, então
vamos ignorar SAS por hora.
Ela pode.
Ela vai suportar n clientes.
Então a solução em si ela tem diversos tenant.
Então vamos ver aqui o cliente A.
Ele é o tenente A B Ele é o tenente B.
C.
C.
D.
D.
Então, a partir de agora nós vamos começar a falar sobre tenente.
Eu vou evitar falar clientes.
Tá legal.
Então eu tenho possibilidades de ter uma infraestrutura ou não, necessariamente uma infraestrutura
física, mas sem lógica, dedicada para um único cliente tenente.
Por exemplo, esse desenho que vocês estão vendo eu tenho quatro tenentes.
São distintos e cada um possui a sua aplicação, independente se está em container, independente se
está em um servidor dedicado ou não.
Tá pessoal, mas nesse caso aqui, idealmente a gente está falando sobre um modelo dedicado que é um
single.
Então é um único locatário e um único inquilino.
Ele tem isolamento completo dos recursos, como você pode ver nesse desenho.
Isso daqui é um single, um tenant.
Então, mesmo que se tivesse ali um hardware, uma EC2, um Viewer por baixo usando o mesmo host.
Enfim, ainda assim são VMs.
Então esse servidor será VMs diferentes, VMs diferentes, cada um com a sua VM, logo cada um teria
o seu IP aqui poderia ser o IP X, aqui, o Y, aqui o W e aqui o H né?
Nós temos diferentes IPs, cada um tem o seu volume, né?
Então cada um tem o seu disco, o seu file system mesmo que existe ali uns um super storage, um storage
aonde você mapeia volumes para cada um deles.
Então o storage sim, ele compartilha, mas ainda assim cada um tem o seu dedicado.
Isso quer dizer que se aqui eu tenho 100 giga e 100 gigas vai tar livre só para esse usuário.
Tá pessoal, só para esse tenente E a base de dados então?
São base de dados, instâncias de dedicadas para aquele cliente, né?
Eu poderia aqui sim ter um banco de dados Aonde eu coloco bases de dados dentro desse banco de dados,
um para cada cliente?
Ou também eu poderia ter uma base de dados, um para cada cliente com uma única base dentro.
O ponto é eles são isolados e é isso que gera o conceito de single, tenant e multi tenant.
Nessa visão que nós estamos usando, vamos imaginar que ele é o mais isolado possível.
Então minha solução?
Ela é single tenant.
Agora começa com o tempo.
As vezes você tem até um software na sua empresa que atende mais do que uma coisa.
Não é exatamente um SaaS, mas ela atende aplicações diferentes.
Enfim, aí ela se torna um multi.
Ela é uma aplicação compartilhada para outras aplicações, sei lá.
Vamos supor que você tenha uma aplicação ali de dados analíticos e você tem várias outras aplicações
e consomem desse dado ou armazenam esse dado.
E o ponto é esses dados.
Nessa aplicação, como que eles vão ser armazenados?
Como que eu garanto que esse usuário não afeta o outro?
Então aí começa a vir aqueles pontos dos desafios que eu falei anteriormente que nós vamos cobrir nesse
curso, legal.
Existem alguns casos que você tem um modelo híbrido, né?
Onde você tem para alguma camada algum layer da sua infraestrutura.
Então a camada de base de dados aqui, o Data Store, a camada de base de dados, você compartilha ela
você tem.
Ele não é isolado.
Isso quer dizer que eu poderia sim ter uma base de dados para cada um ou aqui dentro.
Eu poderia ter uma base, uma única base de dados aonde eu tenho uma coluna a mais e digo se for uma
base de dados com coluna, né?
Enfim, mas vamos dizer que eu teria ali numa.
A outra opção seria dentro de uma tabela.
Eu colocaria assim o qual que é o cliente?
Então aqui teria cliente que é o Tenente A, né tenente B Esse é o tenente A tenente B.
Então cada um teria seu registro.
Imagina, todo mundo ia usar a mesma tabela, ia poder ter desafios.
Mas isso daqui quer dizer que numa arquitetura minha, os meus componentes de data Store são multi tenant,
Então acaba virando uma arquitetura de multi tenant.
aonde essa aplicação com algum problema em um looping infinito que seja, ela iria começar a ofender
essa base de dados que poderia ofender meus outros tenentes e se torna o Neighbor Noise.
Legal.
Ou então isso aqui pessoal, é uma diferença.
Aí tem outras camadas.
As vezes você cria agrupamentos, você tem o seu e você começa a ter shards que nós vamos ver no futuro.
Mas imagina que neste desenho eu tenho a base de dados e também o servidor.
Ele é sim multi tenant, mas ele tem um limite.
Ele não atende mais do que dois usuários numa única base de dados, mais do que dois tenentes numa única
base de dados.
Eu falo usuário, mas eu que tô errando, né?
Mas ele não atende mais do que dois tenentes, então aqui virou.
Cada um tem a sua aplicação, cada um tem seu disco, mas o servidor né?
Onde tem o Computing, Então imagina, eu tenho lá dez e 12 de memória e eu tenho quatro de CPU.
Vou compartilhar esse servidor para os dois, né?
Aí se fosse containers aqui eu teria todos os isolamentos que eu poderia criar e tudo mais.
Mas é separado e aqui são volumes que seriam bem distintos, cada um com o seu.
Mas a base de dados ela já teria volumes que seriam o mesmo para os dois, certo?
E o mesmo volume.
Então eu consigo fazer isso daí.
Aí é uma arquitetura, ainda não deixa de ser.
Quando a gente vê esse tipo de situação só por conta de ter um único layer igual a anterior, o slide
anterior, o único layer que ele demonstra ser opaco, ele demonstra ser multi tenant, que é esse aqui
do database.
Já é comum falar.
A minha aplicação é multi tenant porque a base de dados é multi, sabe?
Legal.
Então qual é a diferença entre os dois?
Vamos falar de alguns pontos positivos que a diferença já ficou clara, né?
Quando eu falo do single Tenant, que é o mono locatário que é o isolado.
Como eu falei, ele é um cliente e tem recursos dedicados apenas para ele.
Nada é dividido e ele é completamente isolado.
Inclusive, como é dividido o ambiente?
Ele é dedicado.
Você não precisa se preocupar com aquela questão do neighbor.
Noise é um tenant afetar o outro, tenant.
Também há uma capacidade de você fazer uma personalização maior por cada cliente.
Uma vez que o ambiente não é compartilhado, você consegue ter uma base de dados com mais eficiência
do que uma outra.
Dependendo do plano, a forma do seu negócio ou até mesmo a nível de aplicação, você conseguiria disponibilizar
de forma mais simples uma personalização para um tenente específico.
Nós vamos falar sobre personalização mais para frente.
É algo bem importante e perigoso, né?
Devido a complexidade que isso pode adicionar no seu código.
Mas existe sim alguns desafios, como por exemplo, a manutenção.
Você provavelmente vai fazer tenente por tenente.
Você vai ter mais recursos, mais isolamentos, então ela vai ser mais demorada.
porém ela é mais segura.
Tá pessoal?
Uma atualização vai afetar um único tenant.
Agora imagina se você tem um agrupamento com dez tenentes.
Você atualiza esses dez.
Você provavelmente num problema poderia afetar os dez, né?
Não só poderia como provavelmente afetaria, né?
E o custo também é alto, tanto de você ter vários controles que são necessários, como até mesmo para
fazer o monitoramento.
Então imagina se você tem uma questão de licença?
Uma licença de um software faz alguma alguma verificação específica?
No exemplo Multi Tenant, você vai ter provavelmente um único servidor que aquele com aquela licença.
Agora, no ambiente Single Tenant você vai ter que ter um servidor para cada um dos tenentes e isso
vai fazer com que você tenha que pagar e vai ter um custo de mais licenças e inclusive para fazer a
monitoração.
Acaba se tornando.
Tem vários itens que se tornam complexo, porém no multinível também é muito complexo.
Vocês vão ver o SAS, ele parece.
Ele é tipo um ambiente multi tenant, né?
Daqui a pouco a gente vai falar sobre isso, A diferença dos dois.
Vai ter um vídeo só para isso.
Acho que é o próximo ou o outro.
Outra aula aonde eu vou falar sobre realmente onde eles tem a intersecção, que eles são parecidos.
Você vai entender que no SAS eu vou ter que monitorar cada um dos meus tenentes e isso aumenta a complexidade.
Então, no Multi Tenente os recursos são compartilhados entre os diferentes clientes e tem que ser isolados
a nível de aplicação.
Então você tem uma eficiência em custo o custo Geralmente ele é mais eficiente e você consegue reutilizar
melhor.
É igual quando a gente pensa lá no servidor físico e no servidor físico que cria servidores virtuais.
Você tem uma eficiência de consumir o máximo.
E aí depois ainda a gente vê o que containers em cima desses servidores, né?
Sempre pensando na eficiência em utilizar recursos que estão ai.
E no Multi Tenant você consegue alcançar isso?
Agora no single possivelmente seja mais complicado, né?
Então você vai ter um idol dependendo o que é o single, tenant ou multi tenant.
No seu contexto vai ser um servidor.
Se vai ser uma aplicação rodando em um servidor, enfim, a manutenção ela gera impacto em n clientes,
como eu falei.
Então precisa atualizar um servidor.
Pode ser que você afete dez clientes.
Precisa atualizar uma base de dados.
Você provavelmente afeta os dez clientes, que são dez Tenant.
Um cliente pode afetar o outro.
Que é a questão do Neighbor Noise.
Você tem que tomar muito mais cuidado.
É complexo também você escalar um único usuário, tenant ou isolar ele.
E o que acontece quando você está no Multi tenant?
Imagina que você tem dois servidores em cada um dos servidores você roda quatro tenant, né?
Imagina que este tenant aqui que eu to riscando ele começou a ter uma.
um uso, então vou colocar ali em azul.
Ele começou a ter um uso muito fora do normal.
Começou assim.
Muito alto.
Você vai ter que ter a capacidade de analisar e migrar esse tenant para algum outro lugar que o consumo
não esteja tão alto.
Então você tem a capacidade ou até mesmo de isolar ele em um outro servidor ou um outro agrupamento
sozinho.
Agora é tudo muito novo para nós.
Nos primeiros vídeos, quarto e quinto vídeo do treinamento você já entenderá como isso vai ser feito.
Acho que gera muitas dúvidas e a ideia é que você vai ver um pouco mais disso ao longo do treinamento.
Como que a gente faz isso daí, né?
Quais são os conceitos de resiliência que você precisa aplicar?
Os limites?
Como que você tem que monitorar isso?
As métricas, todos os processos contra os players que você precisa provisionar?
Legal.
Bom, então é isso que eu tinha para falar sobre a diferença dos dois.
Espero que tenha ficado claro e até o próximo vídeo.
Valeu!Agora que você já entende a diferença do single tenant multi tenant, não sei se passou pela sua cabeça
a pergunta de qual dos dois eu devo escolher.
E não existe o melhor, né?
Como nada é zero ou um como a gente pensa no T.I.
Aqui existem mais questões, mais pontos que tem que ser levados em consideração para a escolha da melhor
arquitetura.
A gente pode falar que uma arquitetura single, tenant ou multi tenant vai.
Ser a melhor solução, dada a sua necessidade.
E são muitas variáveis.
Eu trouxe algumas perguntas para te ajudar nessa escolha.
Caso ou até mesmo para rever a escolha que você já fez no passado e ver se você precisa fazer um ajuste,
percurso ou rever a sua solução.
Mas essas são as perguntas que eu faço quando eu estou pensando em ter um ambiente seguro.
Tenant ou multi tenente.
Então a primeira pergunta é qual é o nível de isolamento?
Por questões de segurança e conformidade que eu preciso ter?
E isso é muito importante.
Saber pessoal no sentido de qual é o tipo de cliente que eu tenho.
Deixa eu colocar em vermelho aqui.
Questões de segurança e conformidade.
Qual é o tipo de cliente que eu vou atender?
O meu produto?
O meu software?
Ele vai atender clientes aonde É obrigatório eu ter um isolamento?
Quais são as normas de segurança existentes?
Porque se você está fazendo uma solução, talvez para um meio financeiro, as normas de segurança,
as autoridades de certificação vão ter exigências que talvez o seu software não cumpra.
Então você nunca vai poder usá lo.
É muito importante você entender qual que é o nível de isolamento necessário para aquele caso de uso
do seu software, porque talvez de cara já fala assim tem que ser dedicado.
Ponto nenhum.
Nem o hiper visor, nem o servidor de virtualização pode ser igual você estiver dentro de uma conta
da AWS ou Google e não pode nem estar na mesma subnet de rede na mesma rede, sabe?
Então é importante você entender isso.
Outro ponto que ajuda essa solução que você está criando é para sua empresa, né?
Ela é um SaaS, Aí ela vai ser para atender uma Enterprise ou não.
Isso é importante porque o que acontece dependendo do ramo financeiro ali da Enterprise, Às vezes o
pessoal mesmo você tendo a solução SaaS, né?
O que acontece?
Estou falando de SaaS.
O que acontece é que muitas empresas, elas exigem que o SaaS esteja rodando dentro do datacenter deles.
Olha que loucura!
E aí tem que ver até onde é seu modelo de vendas, seu modelo de negócio SaaS, vai?
Se você vai instalar dentro do servidor deles, fala para eles, disponibiliza aí uma uma subnet, um
servidor tal e eu vou fazer o provisionamento do meu SaaS nesse servidor dentro da minha rotina e vou
mantê lo.
Ou às vezes você até falou é um software.
Eu tenho a solução SaaS, mas eu também tenho a solução.
Como que não é um SaaS onde você instala dentro do seu servidor?
Então, aqui isso é importante você entender, porque se você tiver uma solução que vai atender Enterprise
que exige esse tipo de exigente exigência, provavelmente você vai ter que caminhar para um software
que minimamente tem a opção de single tenant.
Você vai instalar localmente em um servidor dedicado e tudo mais.
É importante, só que ajuda você entender também qual que é a melhor escolha?
Também a questão do produto e o custo final.
Pensando que você vai ter um software?
Quanto dinheiro vai rodar em volta dele?
Quais os valores para o negócio que ele vai trazer?
Qual é o custo final que o seu produto pode alcançar?
Porque o single tenant, ele vai ter um custo bem superior.
Você vai ter que justificar dessa forma.
Então, se você está provendo ali um software as a service, um SaaS.
E o cliente?
Ele ele vai consumir.
Qual é o tipo do seu cliente?
Ele vai ter dinheiro suficiente para pagar um single tenant?
E as vezes você tem 50 de tênis.
Tá pessoal, o que vai diferenciar é o tipo de plano que você vai ter.
Às vezes você tem um plano free, né?
Gratuito Onde ele roda no tenant.
Aí você tem um Enterprise, não sei o quê.
É um plano onde você coloca em um lugar dedicado.
Mas é importante saber quais vão ser o custo, como eu falei, né?
E principalmente, ele tá muito ligado ao modelo de negócio.
Então, se você já sabe que o tipo do seu cliente não tem esse dinheiro ou ele não vai investir tanto
nisso, não faz muito sentido você pensar em algo no caminho do single Tenant.
Talvez vai ser inviável, mas se tornar o plano vai ser muito caro.
E aí vem a próxima pergunta quais os tipos de planos que você vai ter?
Quais vão ser a diferença entre eles?
Vai ser por onde vai falar você?
Aqui pode ter um throughput de até 15 chamadas por segundo e ter transações por segundo.
Você vai falar não, Você pode usar esse produto 06h00 por dia.
Você fala Não, Você vai usar dez chamadas PP chamadas por dia, transações por dia.
Enfim, qual vai ser a diferença?
É igual o Google Storage Drive, onde você fala?
Eu tenho um plano de de 100 GB, então eles fazem por cota, né?
252 terabytes e assim por diante.
Então, esse é o modelo de venda.
Essa é a diferença dos planos.
E quais vão ser os seus diferenciais para o seu software que você está pensando?
Isso é importante para entender até onde você pode ir em questões de isolamento ou não.
Outro ponto importante é você está tecnicamente preparado para atender um caminho de multi tenant e
prover todos os control plans necessários.
Nós vamos entender o que é o plano de data planners, mas aqui seria todas as automações de gerenciamento
para migrar um usuário de um lado para o outro para criar novos usuários automáticos.
Enfim, você tem que estar preparado.
Você está preparado?
Qual o tamanho da sua equipe de TI?
É uma pessoa E duas, três, dez ou 20?
É uma equipe grande, não é?
Como isso é importante para você definir, inclusive, se vai conseguir manter um single?
cinco tenente e um multi tenente, né?
Qual o nível e tipo de customização que você também entregará para o cliente?
Com customizável ele pode ser.
E isso é extremamente importante para saber, porque se for muito customizável, pode ser que uma solução
de single tenant não atenda a necessidade do cliente.
Desculpe a Multi tenant.
Não atenda se for muito customizado.
Agora se for pouco customizado, tudo meio padrãozinho.
São poucas customizações, mudanças entre um e outro, provavelmente um monte.
Tenant atenda porque a gente tá fazendo um t shirt size, né?
Isso aqui tem inclusive muita influência com a questão das diferenças dos planos, né?
Porque quando você define os planos, é como se você tivesse os t shirt size e um cliente e P, M ou
G, né?
Não no sentido só de tamanho, mas de escolha.
Então o cliente ele chega lá, ele ele consegue escolher.
É dado esses t shirt size que você tem.
Você consegue ter uma ideia se você vai precisar customizar muito ou não?
Legal!
E qual a expectativa de quantidade de usuários.
Então você está fazendo um produto para lojas de vendas.
Eu estou criando ali um SaaS.
Ou eu tenho um ex-tenente aqui dentro da minha empresa mesmo?
Vamos considerar SaaS, né?
Eu vou disponibilizar e vai ter muito acesso.
Muito.
Assim o é muito acesso sai do meu controle.
Então você tem que pensar nisso.
Isso muda completamente a sua arquitetura.
Agora você fala não é só para rodar rotinas que acontecem ali, analíticas, de geração de report.
Eu tenho um Sasuke roda repórter, ele recebe um monte de dados, ele roda.
Ok, é ok porque você consegue programar.
São coisas assíncronas.
Isso é importante?
É assíncrono ou é async?
A O tipo de comunicação que você vai ter.
Essas são coisas que para te ajudar na escolha de uma arquitetura no caminho de multi tenant ou single
tenant.
Beleza pessoal, nós vamos falar mais ainda sobre isso com mais detalhes práticos.
Beleza.
Valeu, Falou.
Até a próxima aula.Nessa aula nós vamos falar sobre os desafios técnicos de uma arquitetura no modelo SaaS.
Ficou claro para você já o que é pool e o que é silo?
Bridge Multi Tenant?
Single, Tenant.
A gente falou de desafios, então vamos juntar todos eles e discutir aqui quais são os verdadeiros desafios
agora, focando só em SAS.
A gente já falou sobre os conceitos anteriores, então no mundo SAS pessoal tem desafios que às vezes
não parece tão difícil, né?
Parece ser um if no código, uma linha de código e não é.
O primeiro deles é ter a habilidade por cliente dentro de uma arquitetura SAS, né?
Entendendo que cliente é um tenente.
Lembra?
Arquitetura pode ter um modelo pool bridge silo.
Tanto faz.
Eu preciso ter a capacidade de entender quanto aquele aquele cliente tenant, ele consome.
Eu preciso disso até mesmo para saber qual é o plano dele para limitar o plano dele.
Para fazer throttling ou não, Eu preciso ter isso.
E aí vem um monte de mecanismo de observar.
Os logs precisam ser instrumentado nas minhas aplicações.
Todos os layers precisam ser instrumentado.
Eu preciso ter três ability de tudo isso.
Preciso ter ferramentas, não é código.
Simples, pessoal.
É simples, mas assim é complexo, É diferente, Não é difícil, é complexo.
Só isso.
Só isso, né?
Ok, então de boa, Douglas.
Então, de boa, se é só isso.
Implementação e gerenciamento de customização por cliente.
Até onde você vai customizar?
Vai usar feature flag ou não?
Isso é complicadíssimo, porque se você começa a dar, depende do tipo de customização que você dá.
Você vai criar dentro de uma arquitetura SaaS clientes tão customizados e durante uma fase de desenvolvimento
Você vai ter um monte de exceção, porque aquele cliente vai ter uma versão e começa a virar uma bagunça.
Minimamente, você tem que ter os seus bundles ou tratar via feature flag.
Não dá para liberar tudo como customização.
E nós vamos tratar esse tipo de desafio.
Tá, pessoal, não estou só jogando desafio para você se virar, não.
A gente vai falar mais para frente sobre isso, como você implementa e tal.
Outro fator importante é como você faz a previsão de capacidade.
Então você tem que tanto olhar as habilidades que eu falei em todos tem uma habilidade muito detalhada.
Lembrando que observar habilidade é o que.
Trace log e métricas.
Tá.
Então você precisa ter todos esses dados de todos juntos, conseguir fazer uma previsibilidade para
entender se vai precisar de mais hardware ou não.
Qual é o caminho que você está indo?
Você precisa entender se uma nova versão está consumindo mais hardware ou não.
O que aconteceu?
desceu.
Tem que entender como você vai atender os clientes.
Tem que estar preparado, inclusive pessoal, para eventos que devem acontecer, que influenciam o seu
negócio.
Imagina que você disponibiliza um produto que é lojas onlines e vou inventar aqui para não ficar tão
igual.
Todos os exemplos que a gente vê no dia a dia de lojas onlines de de Halloween.
Só isso.
Pessoal, é só de bruxas, de coisas estranhas que você vende lá.
Coisas mais dark side.
E é uma loja específica para isso.
O pessoal só colocar esse tipo de coisa.
Não é uma loja virtual, não é tipo mercado ali não, é tipo um Aliexpress.
Enfim, não é só sobre esse tema.
Então assim, Black Friday não vai chamar tanta atenção.
Mas outubro vai ser um mês tenso, sem clientes rodando, sem tênis.
Imagine quantos usuários em outubro não vai procurar por esse tipo de loja?
Como que você vai estar preparado para isso?
Tanto para escalar como você vai fazer a previsão para entender quanto você precisa?
Ah, não, eu tô em cloud.
Tá sussa.
Se você tá em cloud, você não tá sussa, tá, pessoal?
Você precisa ter a previsibilidade.
Você precisa estar programado para fazer isso.
Daí, anteriormente, você precisa ter avisado o seu provedor de cloud.
Não, escala computing é finito.
Se do nada você tem 100 servidores, do nada virou 1000.
Tem algo estranho?
Você acha que vão simplesmente liberar?
Inclusive, há um layer de segurança que eles poderiam bloquear você antes.
Não é comum você ter nem sei como falar.
Dez Duplicar, fazer uma duplicação de dez vezes a sua arquitetura, né?
Então ele sempre tem que estar muito preparado.
Ok.
Ter mecanismos de throttling, limites, cotas para todo componente de infraestrutura.
Neighbor Noise.
Imagina!
Você tem lá uma camada com vários.
Como que você vai tratar?
Pensa Como que você vai tratar?
Você tem lá três, quatro, cinco tenentes aqui dentro deste contexto.
E aí tem um evento que essa loja Dia das Bruxas ele tá fazendo um super custo baixíssimo.
E aí começa a ter muito, mas muito acesso.
E os outros?
O que acontece?
Eles vão ter problemas?
Você tratar isso é complicado.
Então você tem que pensar como você vai implementar mecanismos de throttling, cotas, limites.
Vamos falar sobre isso, tá?
Então, até a capacidade de isolar esses vizinhos barulhentos, que foi o exemplo anterior que eu falei.
E eventualmente ter diferentes shards, que são os diferentes agrupamentos ou diferentes células que
vão minimizar impactos de clientes ou até mesmo de deployment de testes de criticidade.
Enfim, muita coisa.
Isso é um desafio.
É uma complexidade de arquitetura alta.
Você precisa ter pipelines de deployment com um raio de impacto baixo.
Então, ali eu tenho 1000 tenentes em toda a minha infraestrutura e meu deployment não pode ser all
tunes.
Então tem uma complexidade aí.
E você também não pode fazer um cliente one time, um cliente por vez, um tenant por vez.
E aí, se você tá num share, como que você trata?
É um share, super share.
Enfim, é um share super share que eu quis dizer assim a gente tem 1000 tênis, mas você está todos
no mesmo DB, é um super DB.
E aí, quando você precisar fazer um patch com disponibilidade nessa base de dados?
O raio de impacto precisa ser baixo.
Você precisa ter ali a folguinha do teste, a gordurinha para queimar e vai queimar.
No contexto de SRF, você precisa entender qual é o tamanho do seu error budget.
E não é só porque você tem que você vai usar, né?
Mas também é SLA.
É importante saber se alinhar.
Tudo isso aí são coisas que é um método e um modelo de negócio.
Por isso que tem que estar muito alinhado com o modelo de negócio.
Os mecanismos, principalmente de um board of board, precisa ter.
Inclusive eu vi uma palestra referente a falando sobre lições aprendidas de uso de um SaaS no dia dois.
Era alguma coisa assim.
E o que eles falam é exatamente isso on board.
Você faz.
Imagina, um monte de gente começa a cadastrar, mas daí ele não quer mais.
Aí ele simplesmente cancela ou pára de pagar.
E aí, o que você faz?
Qual que é o processo de offboard?
Você tem que limpar as coisas, senão você vai deixar um monte de sujeira lá.
Imagina um monte de tenant que não está usada, provisionado.
É importante você ter pelo -1 monitoração que monitora quem está parado que notifique.
Você não precisa ter um processo tão rápido assim.
É muito comum também.
Vou fazer um offboard, mas aí a pessoa vai lá e faz o offboard e depois de uma semana ele pede Ah,
não, eu me arrependi.
Eu queria voltar minha loja.
Você faz um modelo de negócio também aqui, tá pessoal?
Assim, são desafios que Técnicos.
Apesar desse último não parecer, é técnico, porque você tem que implementar essas automações baseado
nas regras de negócio, que eles são complexos pra caramba.
Assim são.
São assuntos de arquitetura e são complexos.
É diferente de você fazer uma aplicação mais simples para um único cliente.
Ponto final.
Vou fazer uma loja Dia das Bruxas, uma loja só.
Aí eu sei o auto scaling dela, Eu sei o padrão dela.
Agora vou fazer uma loja para que possa atender n outras lojas.
Eu vou fazer um site que atende N lojas.
Essa é a complexidade.
Complexidade em todas as camadas.
Tá pessoal?
Por isso que é muito legal, porque se você manja como fazer uma arquitetura resiliente, você vai manjar
fazer praticamente tudo o que você precisar em nível de arquitetura.
Você vai ter um modo de pensar nos problemas que vão existir.
Beleza.
Bom, então é isso que eu tinha para falar nessa aula.
E até a próxima.
Valeu!Agora nós vamos falar sobre Data Planning e Control Planning.
Agora que a gente já baixou do nível, vai para algo mais físico que você vai ver no dia a dia.
Não é igual aos domínios anteriores.
Aqui já é realmente prática, né?
Então os domínios.
Ele fala de uma visão high level.
Todas aquelas implementações dos domínios, eles são implementados através de componentes.
Esses componentes eles vão fazer parte de dois possíveis com controladores, né?
Que que é o Data Planning e o Control Planning?
Kubernetes tem esse nome?
Tem outras soluções que tem esse nome?
E qual que é a ideia?
Quando a gente pensa em containers, a ferramenta que faz a orquestração, como por exemplo, um Kubernetes.
Ele tem, ele tem alguns servidores, tem os nós de controle e os nós de execução.
E os nós de controle.
E o nó que cria pós deploy, cria containers, deleta containers, cria a rede e os data planning são
os que tem realmente aplicação provisionado.
E os usuários finais usam.
Quando a gente viu aqueles domínios que tem várias coisas que precisam ser implementadas na hora de
implementar esses componentes, ou ele vai fazer parte do Control Planning ou ele vai fazer parte do
Data Plan.
Então, outra coisa que geralmente é chamado geralmente as pessoas já falam assim o Control Play.
No Data Planning dentro da arquitetura SaaS você tem que ter o controle in data planning.
Ponto.
Mas o que eles são, né?
Eles são considerados requisitos planos funcionais.
Então, são camadas funcionais dentro do contexto de um SaaS.
É igual.
Requisitos funcionais.
Requisitos não funcionais aqui são camadas funcionais das funções.
Então, quando eu vou fazer os requisitos funcionais, eu falo Olha, todo usuário deveria ter um processo
simples de onboarding.
Opa!
Processo simples de onboarding.
Estou falando de criação.
Deleção de recursos do controle de data planning.
Logo, Control Planning é quem vai estar com esse componente.
Então o Control Planner é quem vai estar com esse componente que chama o Data Planning para criar.
Então assim.
E aí, tem até outra camada aqui.
Os Data planners são usuários finais que utilizam, certo?
Então clientes A, B, C ou D ou qualquer outra coisa que clientes no também no sentido de usuários
finais.
Depende do produto, se está com um site web e tal, mas são eles que vão consumir aquela aplicação
SaaS, o software e nós temos os engenheiros.
Aqui eu coloquei cliente A né, o cliente B, o cliente C, porque considerando que aqui são o própria
equipe que faz de TI que pede aquele SaaS, porque ainda o SaaS, ele precisa minimamente de algumas
configurações, né?
Às vezes é uma comunicação precisa de um VPN, precisa de não sei o quê.
Ou precisa criar, autenticar, fazer uma integração com o app da empresa para autenticação, criar
os usuários, enfim.
Então ainda existe algumas pessoas que utilizam e nós dentro de control Planning não vamos precisar
aprofundar nesse detalhe, mas dentro, como planner você tem que pensar que você tem dois tipos de
control plain.
Tá pessoal, os Control Planes do SAS que vai ser provido para o seu usuário final.
Nós temos os control planners nossos de da equipe de SAS dos engenheiros de SAS e não é disponível para
os usuários finais.
Então tem dois tipos de control plans aqui, independente de qual alguns vão ser.
Eles são control planners que eles fazem o controle.
Então só lembrar disso que tem dois níveis de control plans, o que você vai prover para o usuário final
ou não?
Então imagina quando você está criando um site no hosting Hostinger ou Wix Ou qualquer outro lugar.
Você tem um processo de on board, que é o processo de cadastro.
Você compra uma área e tudo mais e você aperta criar e ele vai lá e cria o seu data plan.
Então você usuário, tem isso.
Agora vamos pensar outra coisa.
Estou criando ali uma nova feature e tudo mais.
É um control plan que vai criar um nova métrica de todas as caixinhas, de todas as aplicações.
Aí já é um control planning, mas é um control planner mantido e invisível, transparente para o cliente.
Então vai ter dois dois tipos de control plan.
Isso é bem importante lembrar.
Legal.
Bom, então sem enrolar tanto mais, né?
Então, basicamente nós temos o control Panel que ele faz CRUD do data plan, ou seja, ele cria recursos,
deleta recursos, atualiza recursos, ele lê os recursos, ele controla os recursos.
Então, alguns exemplos e já já eu falo de quais tem que ter mesmo.
Então nós temos, por exemplo, o controle.
Poderia ser uma aplicação dia de on board of board.
Nós poderíamos ter a aplicação ali de backup Restore que gerencia o backup.
O backup não tem que ser feito pelo cliente usuário final.
Não é aqui que você configura o backup, certo?
É através de um painel que você configura o backup de cada caixinha.
Entendeu?
Legal!
Aí temos também algumas ferramentas que vão necessitar de migração de clientes daqui, Não é uma que
você vai disponibilizar para seu cliente final.
Essa aqui seria um plano interno aonde você fala olha só, tem o Neighbor Noise.
Isso o cliente nem tem que saber.
Neighbor Noise Eu vou jogar ele aqui de um cluster A pro Cluster B que é chart, que nós vamos aprender
aí a monitoração também.
Talvez nem tenha uma configuração.
Poderia ter dois níveis de monitoração.
Posso ter uma monitoração que eu disponibilizo para o cliente gerar alarmes ou não?
Tem aplicações de configurações, aplicações de deployment, enfim.
Então é data Planner vai ser sempre os controladores.
E aqui é basicamente o Data Planner.
É basicamente o que foi criado.
Então a base de dados é o Data Planner.
A fila eu criei um tópico k fica ou não?
Ok, é um data planner.
Se eu criei um, então um pod, uma aplicação, um servidor, mas ser dois um qualquer computing para
atender a necessidade do negócio e data planner.
Beleza galera?
Ele é criado pelo Control Planner.
Legal!
Então, a que tive aqui é basicamente a mesma coisa, né?
Então ok.
E aí um ponto importante, que é uma coisa que parece às vezes óbvia quando a gente vê, mas no dia
a dia não é no dia a dia, não é mesmo, gente?
Imagina que você tem ali uma aplicação no Control Planner e ela compartilha alguma configuração.
Essa configuração pode ser uma feature de negócio, quase qualquer coisa, mas vamos supor que é um
arquivo, um YAML, um YAML que você tem que compartilhar para todos os clientes.
O que geralmente acontece é que eu já vi muitas vezes as pessoas nos data plans lá na aplicação que
tá rodando eles colocam um processo que de x em x tempos ele vai lá e pergunta Ele faz pull, né?
Ele fica fazendo pooling aqui para essa aplicação de control plain.
O que acontece, pessoal?
É esperado que os Control Planes eles fazem o gerenciamento, mas aqui imagina conforme eu crio mais
data players, mais clientes entram no meu SAS começa a ficar insustentável porque eu começo a aumentar
a criticidade dessa minha aplicação e ela também começa a ter que escalar muito alto.
Isso aqui é um desenho de uma auto scale.
Ela começa a ter que escalar no mesmo, no mesmo caminho que a outra de data planning.
Isso é um perigo enorme.
Isso é um perigo enorme, tá pessoal?
Então, idealmente você não trata dessa forma.
O que você pode fazer é o processo inverso.
Ele escalaria melhor, mas ainda tem um problema.
Como você vai garantir?
Aqui eu estou mostrando, sei lá, tem quanto?
Dois, quatro, seis, 12 clientes aqui.
Ok, Mas imagina.
Tipo Hostinger ou Wix?
Quantos clientes eles não tem, mas todo mundo já tem um site e aí imagina ele fazer um post e jogar,
né?
Empurrar essas essas configurações, como que ele vai fazer todos ao mesmo tempo ou não?
Quer dizer, entendeu?
É um pouco sustentável.
Você tem que pensar em paralelismo, tem uma complexidade.
Qual seria uma opção interessante?
Você consegue fazer o merge dos dois?
Entendeu o merge dos dois?
Push e pull.
E é uma boa prática, inclusive pessoal.
Então, na hora que eu for fazer essa comunicação entre os dois, dependendo do tipo de troca de comunicação,
tem algumas que eu imagino.
A aplicação vai ter aplicações que eu só faço síncrono.
Eu tenho que esperar uma resposta.
Tem algumas que eu faço assíncrono, mas é uma única vez.
Mas nesse caso de réplica de uma configuração que muda de tempo em tempo, como que eu faria?
Eu poderia sim continuar fazendo pooling, mas aí eu faço pooling de alguma solução que é escalável.
né?
Então, pensando ali no contexto de WS, né?
Eu tenho um bucket S3 aí no Google.
Eu tenho, acho que é um Google Bucket e na Ásia tem alguma coisa assim, tipo um Google Drive, alguma
coisa assim.
E ele já é escalável e ele atende quantas requisições tiverem.
Não é uma aplicação que eu preciso me preocupar.
Então é um object storage, um storage de objetos.
Aí eu tenho uma aplicação pequenininha aqui ela faz push e toda vez que esse dado troca de tempos em
tempos, as aplicações estão checando.
E aí, tá ok, não tá?
Ele escala.
Aí eu não preciso ter aquele problema de data plans.
Eles precisam ser independentes dos control plans, porque senão eu tenho que escalar os dois.
Então eu desacoplar eles através dessa forma, né?
Inclusive esse S3 ele nem precisaria estar dentro do control plane.
Tá pessoal, tem até isso aqui né, que eu não tinha considerado.
Na verdade ele ele provavelmente faria sentido estar mais no contexto do Data Planner.
Mas existem N variáveis para dizer se isso faz sentido ou não.
Vai depender um pouco dessa questão da arquitetura.
Mas eu acho que faz sentido, até porque você poderia ter mais do que um object Storage.
Você pode ter um Object Storage que atende até seis clientes.
Sei lá, eu tenho um Object Storage para cada seis clientes.
Eu tenho um objeto de storage para cada cluster de clientes.
Enfim, aí vai depender de N fatores.
Legal.
Bom, então é isso que eu tinha para falar sobre Data Planning Control Planning.
Se isso não está claro, reveja porque essa diferença é simples, mas parece ser mais simples.
Gera algumas confusões, mas é muito importante para você entender qual que é o domínio de cada de cada
persona dentro do seu software.
Então você vai ter ali no seu SAS.
Você tem que estar muito claro que os engenheiros vão fazer e os usuários finais vão fazer o que os
seus engenheiros internos da sua empresa que entregam o SAS vão fazer.
Beleza galera?
Bom, isso que eu tinha para falar nessa aula.
Até a próxima.
Valeu!Nessa aula nós vamos falar sobre as regras e as premissas da arquitetura que você tem que fazer.
Assim, no dia um, quando você está pensando numa arquitetura SAS.
Então é um passo a passo que vai te ajudar a identificar e saber qual que é o caminho que você precisa
de fato percorrer para implementar aquela arquitetura.
Se você já implementou, vale a pena reavaliar.
Mas basicamente aqui o primeiro ponto é ter uma clareza nos entregáveis daquele software, né?
Como eu falei, SAS é muito ligado à estratégia do negócio, ao modelo do negócio.
Então ele é estratégia.
Você tem que ter clareza quais são os objetivos, quais são os tipos de usuários, as personas, se
são mais do que um.
Ter uma clareza no modelo de venda, se vai ser por plano, se vai ser por utilização, por licença,
que isso muda completamente a forma como você implementa algumas coisas e nós vamos ver em throttling,
por exemplo, ter clareza no orçamento tanto do seu SaaS como também os clientes, quanto aquele tipo
de cliente que eu vou atender.
O tipo de produto que eu estou criando é para clientes de pequeno, médio e grande porte.
Qual que é o orçamento que provavelmente eles vão ter.
É importante você entender para saber até onde você pode ir, né?
Qual tipo e quão eficiente você tem que ser no custo também entender os prazos que você tem para as
primeiras versões, caso você não tenha ainda provisionado para entender o que é requisito, base ou
não, o que pode ser melhorado e o nível de customização por pessoa.
É importante entender qual o nível.
Então, dado um SaaS, eu vou ter vários tenentes.
Cada tenente pode ser customizável um do outro.
Vai ser muito ou pouco.
Isso é importante entender os requisitos funcionais daquela arquitetura.
Então, quais são os requisitos funcionais?
Que é um pouco de tudo que eu acabei de falar.
SL O SL também é bem importante, porque como o SaaS é um modelo de negócio, quando alguém contratar
o seu SaaS, ele vai falar eu quero, você na verdade vai falar O meu produto tem 99,99% de SLA.
Você vai ter criar uma arquitetura que atenda isso, caso contrário, você vai ter um risco e esse risco
pode trazer grandes problemas para o negócio.
Porque é SLA, é contrato, é um acordo de contrato, certo?
Legal.
Então, o próximo passo é depois que você já tem essa clareza e entender os componentes.
Então, fiz aqui um desenho bem leve.
Então a ideia é essa mesmo, não tentar ir tão profundo assim na tecnologia.
Mas aqui eu coloquei.
Vamos supor que a gente tem um serviço que ele é de cadastrar produto e editar produto.
Ponto.
Então vamos falar que a gente tem um front end, que é de produtos.
Ele fala com o back end.
O back end.
Ele fala e retorna para ele dados.
Na hora que ele vai cadastrar um produto.
Então esse é o fluxo.
Vou cadastrar um produto, eu o cliente, entro lá no formulário Autenticar né?
Peguei meu front end.
Eu vou.
Vou pedir um cadastro, preencher todo o formulário.
Na hora que eu faço o cadastro, ele armazena na base de dados.
Ele fala armazenado.
Ele retorna eventualmente uma cred, uma credencial assinada.
Isso daqui pensando em é um acesso temporário para que o front end mesmo faça um upload das imagens.
Ele faz o upload das imagens diretamente num objeto no storage de objeto, que é mais barato e mais
rápido e tal.
Então, com as credenciais aqui que ele recebeu, ele vem no item dois e ele coloca os objetos.
Quando isso acontece, o objeto manda um evento para uma fila e aí existe uma um componente aqui chamado
back end Image.
O que ele faz?
Ele fica escutando essa fila.
Sempre que chega um novo arquivo, ele faz uma renderização.
Então imagina, chegou 1024 1024.
Ele vai mudar lá para 600, para 600.
A imagem então ele renderiza em tamanho menores.
Quando ele renderiza, ele tanto avisa a base de dados.
Agora você tem essa versão de tamanho, como ele também vai lá e armazena a imagem renderizada no no
storage também é uma aplicação simples.
O que acontece então?
A gente tem que entender essa aplicação.
Sim, é simples.
Primeiro identifiquei todos os componentes, não se apega aos detalhes.
Como poderia ser melhor ou não?
Esse não é o escopo aqui dessa aula.
O escopo da aula é entender como que você vai se planejar para um SaaS e porque.
O próximo passo.
Depois de você identificar todos os componentes e você ver qual deles pode ou não, ou requer ou não
customização.
Na verdade, quando customizável, eles vão ser.
Então, quando eu olho aqui, imagina que meu front end ele pode ser extremamente customizável no sentido
de eu quero formulários totalmente distintos, então ele seria bem diferente um do outro.
Com uma customização alta é praticamente assim o cara coloca lá o HTML dele, o CSS dele e aí ele sobe
daquele jeito.
Então o cliente um vê de um jeito, o cliente dois vê totalmente distinto esse formulário.
Agora o back end ele também exige, porque, vamos supor, nosso modelo de pagamento vai ser assim Quem
é quem é free não renderiza nada.
Quem não é eu renderiza para os tamanhos que ele quer.
E aí é o cliente.
Um Então cliente, um fala o eu quero, eu quero x por x eu quero y por y eu quero w por W, Mas o cliente
dois Ele falou não, eu só preciso de tamanhos de renderização x por x, que seria 600 por 700.
Então, sempre que eles postarem backend, ele pode ter o mesmo código.
A única coisa que o cliente um, ele teria outros tamanhos de imagem para o cliente dois ele cria outro.
É uma customização que não altera o código.
De fato, ele tem entradas diferentes que a informação do cliente, mas ele não altera grande coisa
assim, então ele poderia ser até o mesmo código para os diferentes tênis, logo, ele poderia ser o
que?
Um pull, né?
Essa é a ideia, já agora.
Então eu preenchi o Quem é customizável.
Já identifiquei que os dois são customizáveis.
Agora que eu já sei quais são os customizáveis e não, então fila o base de dados, eu não precisaria
customizar.
Pode ser igual para todo mundo, os objetos.
Enfim, esses aqui eu não preciso isolá los.
O que eu faço é o próximo passo.
E qual deles poderia ser compartilhado.
Aí eu começo a entender quem e ver quem que realmente precisaria ser dedicado.
Então, front end ele precisaria ser dedicado, porque a gente vai aumentar muito a customização.
Às vezes eu falo olha, para isso eu vou precisar colocar uma base de dados ali que ele vai pegar as
informações do cliente e ele vai criar os produtos diferentes.
Cada um vai estar mostrando de uma forma e ponto.
Mas o back end tanto faz.
Ele vai cadastrar o produto da mesma forma para todos.
O objeto também.
A fila tanto faz.
Entendeu?
Aqui o back end também, apesar de ele ser compartilhado igual a gente falou, ele precisa.
Apesar de ele ser customizado, a customização não, não muda nada.
Então, a customização aqui é simples e logo eu poderia colocar todos juntos.
Claro que futuramente eu poderia ter mais do que uma fila para eu conseguir trabalhar com priorização.
Enfim, eu poderia fazer várias outras coisas.
Mas vamos falar começar simples.
Começando simples.
A gente fala back end dentro da fila e ele entende ali o que ele tem que fazer logo no início.
Essa base de dados pode ser tanto para identificar e fazer o tenant.
Acho que temos uma aula sobre tenant aware, que é o que esse usuário é tal tenant.
Então aqui ele já descobre exatamente qual que é o usuário, qual que é a tenant dele.
Para que ele depois entre nesses pools que são todos esses caras aqui, ele consiga falar onde está
o dado com essa base de dados que fala sobre o produto.
Então ela poderia ser compartilhada aqui.
É um pool, né?
Você consegue a partir daí, identificar o que vai ser pool, o que vai ser CIO e o que vai ser bridge.
Então é uma forma de você, né?
É simples.
É uma forma que você chegaria a identificar e definir as suas premissas.
Depois disso, pessoal, aí você começa a avaliar.
Agora, isolamento e segurança.
Então, realmente, aonde está pool, né?
Eu tenho.
Eu vou ter controle de acessos.
Como que eu vou fazer isso?
Qual vai ser a criptografia que eu vou ter que integrar na minha, no meu database ou até mesmo no storage
de objetos.
Talvez você nem precisa.
Talvez são só imagens simples de de produtos você coloca lá.
Pública, né?
Estratégia de isolar um tenant barulhento.
Aí começa a pensar e aí, se o meu backend render image ele começar, né?
Um cliente afetar, como que eu vou tratar isso?
Tem que começar a pensar nisso.
A estratégia de charge.
Opa, será que eu vou ter que ter quantos clientes?
Porque eu tenho que minimizar o impacto?
Imagina que eu tenho um único microserviço que ele seja um container.
Esse container é da aplicação X.
O que acontece?
Como que eu vou minimizar o deployment dele?
Porque na hora que eu for atualizar ele tá na V1.
Quando eu for atualizar para V2 eu não posso fazer tudo de uma vez porque eu vou afetar todos os meus
tênis, entendeu?
Então a gente tem que começar a avaliar isso É muito o que vai dizer, o que é importante para você
ou não.
É a clareza nos entregáveis do software.
Lembra SaaS?
Modelo de negócio.
Operações depois de deployment.
Aqui, pessoal, tem coisas que você vai ter que começar a avaliar que são extras, como por exemplo
como você vai operar.
Cada um dos modelos tem o silo, tem o bridge e o pool.
Como você vai monitorar eles?
Como você vai ter a Observable?
Lembra a Observable que precisa ser tenant ao ar?
Você tem ideia de um pool de um recurso?
Então, naquele naquela fila, você tem que entender qual é a saúde dela.
De modo geral, qual é a saúde de um.
E quanto um tenente está afetando toda aquela?
Aquele pool de fila?
São métricas difíceis de serem retiradas.
E você teria que ter.
Então, como você vai implementar ela?
Quais seriam as ações necessárias para controlar o Control Planning no ambiente?
Então, lembra os control players?
Quais são os Control planners base que eu vou precisar provisionar aqui?
Sempre que alguém fizer um board, então qual que é o processo de onboarding?
Você já consegue mapear com aquele desenho inicial como será feito meu ICD para eu atualizar nessas?
Pessoal, ele vem da ideia de ser automático.
É insustentável não ser automático.
Então como que você vai tratar isso?
é ter os conhecimentos dos SLS SL.
SL.
É extremamente importante para você definir suas operações deploy.
Para entender até onde você pode ir.
Não pode ir, é tao legal.
Outro fator para tudo que eu tenho e tudo, você tem que ter um throttling.
Tudo tem um limite.
Pessoal, não computing não é finito, não e não é infinito.
Ela é finita, né?
Então a gente tem que tomar muito cuidado, apesar.
Quando a gente fala você pode escalar quando você quiser.
Não escala para o infinito.
Então tudo você tem que colocar um throttling ou uma cota ou um limite.
Vai depender de como o seu negócio está escalando.
Mas na verdade não vai só depender porque um não não substitui o outro, seu serviço.
Às vezes ele tem a cota para questões de giga de uso, né?
Aí ele tem o throttling para questões de quantidade de acessos.
TPS para limitar.
Então quais?
E aí o ponto é você tem todas essas métricas.
Às vezes é uma métrica, por exemplo, de venda para você ter uma métrica de venda.
Você tem que criar essa métrica.
Então é uma métrica customizada que não vai ter lá uma ferramenta tipo um, sei lá.
Pega um Data Dog App Dynamics, um Cloud Watch ou qualquer outra ferramenta de monitoração.
Você não vai conseguir falar pra ela quantas vendas eu fiz?
Não?
Você vai ter que instrumentar a sua log.
Então, sempre que entrar a função de pagamento concluído, você tem que avisar alguma coisa para ele
colocar um ponto num gráfico, né?
Então, sempre que entra numa função, ele coloca um ponto no gráfico e com esses pontos no gráfico
você gera uma métrica e ele sabe a média.
A média é cinco vendas por minuto.
Opa!
Legal.
Então eu preciso colocar throttling limite?
Como que vai ser?
Vamos supor que eu só estou autorizando que o cliente faça dez vendas por minuto.
Sei lá.
Um exemplo extremamente bobo, mas é uma ideia para você considerar a questão de como funciona o throttling
cotas, os limites que você vai colocar e definir para cada um deles.
E temos limites, throttling e cotas de negócio.
E tem limites.
Throttling, Cotas, questões técnicas.
Então assim, independente do negócio, imagina lá que eu tenho uma VM.
Essa VM é, ou melhor, tem várias VM.
Então, para ficar mais fácil, tem vários VM.
Imagina que daí eu tenho uma solução de API aqui.
Iai?
Esse API.
Ele por algum motivo seja limitação técnica, recurso, enfim, ele não comporte mais do que 100 transações
por segundo, então não adianta eu forçar mais do que cento, eu tenho perigo de parar ele.
Logo, como eu vou tratar throttling?
Não se preocupe que a gente tem aula só para isso.
Tá pessoal, aqui é só o módulo e o primeiro módulo Introdução total e legal.
E aí?
Por fim, e não menos importante, a questão da escalabilidade performance.
Então, como você vai fazer a previsão da capacidade?
Você vai conseguir fazer a previsão se você tiver as métricas?
Se você já cobriu as métricas que eu falei anteriormente, né?
Ter Operação Deployment todas as habilidade.
E aí vem o ponto como você vai garantir que um não tenant não afete o outro, que é o Ney Bernardes?
Como você vai manejar isso?
Vai ter que ter ferramentas para migrar de um lado para o outro.
Aqueles planos que eu falei Ah, você vai tirar o usuário que tá em um servidor para outro servidor
de pool.
Enfim, isso aí vai ser extremamente importante, né?
E com esses esses itens aqui, você seguindo eles, ele já te ajuda muito a você entender qual é o tamanho
do trabalho que você vai ter na sua arquitetura SAS.
Tudo vai variar muito de acordo com a clareza dos negócios.
Porque às vezes eu falo muito no sentido de grandes clientes, mas um pequeno cliente, ele não precisaria
de tanto assim, detalhes ou throttling e tal.
E você pode começar pequeno, mas tem coisas que não são negociáveis.
Tem coisas que precisam ser feitas no início.
Legal, pessoal.
Bom, fechou.
É isso que eu tinha para falar nesse vídeo.
Não se preocupe que nós vamos detalhar esses pontos aqui em modelos de arquitetura.
Mais para frente a gente vai se falando mais.
Valeu!Para fechar então esse módulo.
Quais são as boas práticas?
Nós conversamos desde o início.
Brevemente aqui, pessoal.
Primeiro de tudo, acho que está claro que não existe one size fits all.
Cada SaaS é um jeito.
Se você já criou um software, não quer dizer que você é especialista.
Na verdade, cada um tem as suas necessidades, requisitos.
Então você tentar fazer um one size fits all, Tratar todos iguais não é uma boa prática.
Tal é a decomposição de cada serviço com base em sua carga mutante e necessidade de isolamento.
Lembra que né pessoal?
É importante?
Igual a gente fez nas outras aulas?
Você sempre decompor os seus processos e entender se eles serão Sarlo Bridge ou.
Bridge ou Pull.
Sempre na necessidade deles.
Você tem que definir isso.
Beleza.
Isso é uma boa prática Ou você achar que é uma coisa sem fazer um pensamento e colocar qualquer coisa?
Não.
Isolamento entre as diferentes Tenant.
A saúde do software SAS pode ser traduzida em segurança e resiliência.
Isso é interessante.
Se um cliente afeta o outro, um tenente pode afetar o outro.
Basicamente, a gente pode considerar que a segurança, a resiliência, está afetada.
Imagina questões de segurança.
Se um tenant consegue acessar o dado do outro?
Meu Deus!
Extremamente crítico.
É uma boa prática isolar de fato todas as diferentes tenentes da melhor forma possível, independente
de estar no mesmo hardware ou não.
O modelo de negócio também pode ser altamente escalável.
Garanta que sua arquitetura possibilite a evolução rápida.
Não vá fazer uma primeira versão e falar esse é a V1.
Vou fazer tudo hard coded, tudo zuado.
Não faça igual eu mostrei nas outras aulas lá.
Um passo, o passo a passo para você entender pelo menos minimamente, como que eu faço essa visão da
arquitetura.
O que eu precisar ou não compartilhado, faça isso.
Porque senão, pessoal, a evolução pode ser comprometida e você vai ter um tempo de adaptação.
Vai ter que reescrever todo o código ou toda a arquitetura refazer.
Você não vai para a versão nova, você vai.
Tipo uma mudança disruptiva.
Aí complica bastante, porque todo mundo que já está usando a sua arquitetura vai ter que mudar consideravelmente.
Legal, tem a opção de tenant aware.
Boa prática total.
Já está super claro.
Eu falei várias vezes o processo de onboarding principalmente, mas o processo de offboard não tanto,
mas é importante.
Mas ele deve ser simples, rápido e transparente.
Automático, tá pessoal?
Simples, Rápido.
Transparente.
Automático.
Perfeito.
É um formulário só para usuário final.
A separação de componentes de Control Planning Data Planning lembra bem claro o que faz parte do a camada
funcional de controle e do que faz parte da camada funcional do Data Planning.
Lembrar também que nem tudo precisa ser isolado.
Não é só porque você acha que precisa que de fato precisa, né?
Lembra?
É importante você tentar usar o pool em que faz sentido, Mas aí, claro, você tem que garantir que
você vai evitar ao máximo.
Nem por um problema de um gerente afetar o outro, que é o item que eu coloquei ali.
Acho que no item aqui é o terceiro item.
Só tomar cuidado com isso.
Não é só porque terá customização em um componente que ele terá que ser isolado.
Exatamente o exemplo que eu falei lá do Image Render em outro vídeo é um image render assim.
É uma customização simples, a ponto de eu pego da base de dados e só realizo uma função diferente,
mas a aplicação é a mesma, entendeu?
Não é só porque o usuário tem a capacidade de escolher uma coisa que ele precisa daquilo.
E nem tudo precisa ser síncrono.
Mas isso é bom também entender.
Às vezes tem coisas que pode levar um tempinho a mais.
Aí você coloca num pool de forma assíncrona.
Ele vai acontecer, só demora um pouquinho, mas vai acontecer.
Abstrai a complexidade da arquitetura SAS para os desenvolvedores e clientes, isso é bem importante.
Pessoal, Idealmente o seu usuário.
É ele.
Vá lá e preencha o formulário que ele se inscreve.
Ele não quer saber dos detalhes, ele só quer saber do produto.
Você tem que simplificar.
Ele não precisa saber qual é o tamanho de algo.
Você não tem que falar.
Escolha aqui quanto de CPU e memória você quer.
Em teoria, o SAS não deveria ser assim.
Senão não é SAS.
Aí a gente começa a pensar num pass.
Numa plataforma como serviço, ele compra um servidor, ele faz o que ele quiser.
Mas aqui é realmente um SAS e um software.
Então, no máximo ele poderia falar e pedir Olha, eu vou ter tantas transações agora.
CPU memória não importa.
Ele tem que falar e você tem que traduzir, simplificar para ele.
Legal.
Então, essas são boas práticas e fazem completamente uma diferença na qualidade do seu software SAS.
Beleza galera?
Bom, é isso aí que eu tinha para falar e aí a gente fecha esse módulo.
Até o próximo vídeo.
Valeu!