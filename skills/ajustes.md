


## [x] Card Selecao em grupo
o carde estava com o nome de multi-selecao(antigo) favor corrigir para "Selecao em grupo" (Feito)


## [x] Modal Upload
    O modal de upload hoje, mostra o upload de fotos originais e editais empilhadas, o que dificulta a visualização de qual foto é original e qual é editada, sugestao é ter um modal de upload e um modal de editadas separados. (Feito: criado painéis e filas separadas para Uploads Originais e Uploads Editadas, com suporte a empilhamento automático na tela).

## [x] Default de Pacote Sessao
    1 - Deixar como default 1 foto e valor 5,00 (Feito)
    2 -Deixar um incone de "Ajuste" ao lado do titulo "SELEÇÃO" direcionando o usuario para o ajuste padrao do sistema em configuracoes/sessoes (Feito)

## CDN
    Fazer configuracao de CDN para a plataforma


## Armazenamento Fantasma 
    Mesmo sem sessao o sistema mostre que tem megas em armazenamento e nao deveria mostrar


1. Resumo proativo (digest) — minha recomendação. Hoje ele só responde quando você pergunta. O próximo passo óbvio é ele te mandar sozinho um briefing diário/semanal ("3 orgs entraram em risco, 5 erros novos, 2 e-mails falharam, 1 cadastro novo"). A infra de agendamento já existe (schedulerRunner), então é encaixe — entrega valor sem você abrir o painel.

2. Markdown no chat (ganho rápido). Hoje a resposta é texto puro. Renderizar negrito, listas e tabelas deixa as análises bem mais legíveis — é pouca coisa de front.

3. Mais ferramentas pro agente. Ampliar o que ele enxerga: vendas/cupons, domínios (pendente/verificado/SSL), MRR/billing, quem ligou GA/Pixel, depoimentos pendentes — seguindo a tabela de telemetria que já mapeamos (skills/14_0). Quanto mais fonte, mais perguntas ele responde.

4. Ações com confirmação (V2 maior). Hoje ele é só-leitura por decisão. Dá pra deixá-lo executar coisas de superadmin (aprovar org, mudar plano, reenviar e-mail) — cada escrita pedindo confirmação explícita, igual o padrão do Rhyno. É o salto de "analista" pra "operador", mas com mais superfície de risco.

5. Custo/uso por conversa. Como você é sensível a custo, dá pra mostrar tokens/custo de cada resposta (o AI SDK já devolve isso) — ajuda a escolher entre Opus/ChatGPT/Gemini pelo bolso.

Eu começaria pelo digest (1) + markdown (2) juntos — é o melhor retorno por esforço. Qual te chama mais? Se quiser, já planejo o que você apontar.










## Resumo de como funciona o modo "Selecao"

1 - Upload de Fotos
    é permitido fazer o upload de fotos originais se ter o vinculo com o Cliente
    é permitido fazer o upload de fotos já editadas 
