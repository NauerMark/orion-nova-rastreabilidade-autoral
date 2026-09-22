# Seleção independente — Missão 02

Data: 2026-09-22. Papel: interlocutor de pesquisa independente delegado nesta sessão. Não assumo o papel ou a identidade de Aurora Resonare, Orion Nova ou outra instância.

## Condições examinadas

Fonte fixa: repositório público NauerMark/orion-nova-rastreabilidade-autoral, commit `5d36561de6a1d9563a75fbcb62520587aa359738`.

1. **Retomada impossível de registro produzido pela própria Escola.** `school-engine.mjs`: `act` aceita até 500 eventos; `commit` adiciona um ou dois sem aplicar o teto; `importRecord` rejeita registros com mais de 500. Reprodução em `repro.mjs`: 500 eventos são retomáveis; primeira consolidação produz 502 eventos e 1 versão; a retomada passa a lançar `Invalid record`. Não foi consultada nem alterada uma sessão de participante real. A demonstração usa escolhas sintéticas feitas pelas funções da própria aplicação.
2. **Exportação dentro dos tetos estruturais que supera o teto de caracteres.** BET-ACT-03: nome declarado com 120 letras, 449 ações, 50 versões com notas de 400 letras, todos produzidos pela API existente; resultado tem 500 eventos, 50 versões e 407.174 caracteres quando serializado com a indentação de 2 espaços usada pela interface. `importRecord` recusa com `Record too large`. A interface ainda anexa outros metadados. É um caso-limite e não há evidência de frequência real.
3. **Hipótese de perda de foco cotidiana.** `renderBoard` substitui todos os controles e `renderWorkshop` restaura foco somente por `document.activeElement.id`; botões de turnos, escolhas e cartões não possuem id, ao contrário dos checkboxes. A hipótese exige reprodução em navegador. O outro pesquisador está verificando.

Fontes: 
- https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/platforms/agent-space/school-engine.mjs
- https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/platforms/agent-space/school-app.mjs
- https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html

## Discordância e atualização

Minha primeira preferência era a retomada, porque a promessa de levar adiante o encontro tem uma violação demonstrável. O outro pesquisador discordou de sua prioridade: exige uma sessão longa; perda de foco pode acontecer em cada ação. A objeção procede. Respondi literalmente: “Não vou defender minha primeira escolha por posse da hipótese.” Minha escolha passa a ser foco, **se confirmado em navegador**, mantendo os limites de retomada como achados separados. Não há autorização inferida para resolver questões de direitos nem para alterar o PR#1 ou o PR#2.

## Proposta antes da decisão conjunta

Se o foco for confirmado, corrigir a continuidade do foco nos controles recriados, incluindo o caso em que o controle acionado passa a ficar desabilitado. Verificar continuidade no teclado em todas as três missões e idiomas. Evitar transformar isso numa auditoria geral de acessibilidade ou afirmar conformidade WCAG completa. O reparo deve deixar um diff revisável, teste reproduzível e branch/PR reversível sem merge automático.

Para a retomada, um reparo futuro precisa considerar os dois limites simultaneamente. Só bloquear `commit` em 500 não resolve arquivos já produzidos nem o limite de tamanho da exportação. Não recomendo misturar essa segunda mudança com o foco sem uma decisão explícita de escopo.

## Decisão → ação → rastro → consequência

- **Decisão:** investigar comportamento concreto antes de propor nova documentação.
- **Ação:** ler fontes públicas fixadas por commit; executar a API real com registros sintéticos.
- **Rastro:** `repro.mjs`, `school-engine-original.mjs` e esta nota; nenhum envio externo por este interlocutor.
- **Consequência observada:** duas recusas de retomada reproduzidas. Consequência de produto ainda pendente de escolha e publicação pelo pesquisador coordenador.

## Nota de publicação do coordenador

A escolha condicional acima é preservada como registro da investigação inicial. A confirmação e a decisão conjunta aparecem em REVISAO-INDEPENDENTE.md. Nesta entrega, `repro.mjs` foi publicado como `repro-retomada.mjs`, e os dois scripts importam o motor do checkout no lugar da cópia temporária `school-engine-original.mjs`. O motor original não é modificado pelo patch.
