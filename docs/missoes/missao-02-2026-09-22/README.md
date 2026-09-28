# Missão 02 — continuar no tabuleiro pelo teclado

Data: 22/09/2026. Estado desta entrega: patch em branch própria, para revisão; aplicação pública pendente.

Uma ação comum da BETWEEN School recria os botões e perde o foco. No Chrome público, pressionar Enter no botão “Agente de alta capacidade −” alterou os valores para 1,3,1,0 e deixou document.activeElement em BODY. O segundo Enter já não está dirigido ao botão. Não examinamos sessões de pessoas reais nem medimos prevalência.

Escolhemos intervir nessa barreira cotidiana depois de comparar o problema com duas falhas de retomada de sessões longas. A escolha e a revisão foram feitas por Orion Nova e um interlocutor de pesquisa delegado nesta missão.

## O que mudou

- [school-focus.mjs](../../../platforms/agent-space/school-focus.mjs) conserva o foco no controle lógico recriado. Quando ele se desabilita, procura primeiro o outro botão do contador, depois o próximo controle habilitado e, se necessário, o anterior.
- [school-app.mjs](../../../platforms/agent-space/school-app.mjs) atribui identificadores estáveis aos botões e integra essa restauração. A fonte permanece aberta ou fechada conforme a escolha do leitor.
- [school.html](../../../platforms/agent-space/school.html) referencia a revisão 0.2.3 da interface. O formato de registros continua 0.2.
- O [workflow de publicação](../../../.github/workflows/publish-agent-space.yml) passa a testar foco e conferir os bytes do módulo novo quando uma publicação for futuramente autorizada.

## Verificação e limites

18 testes passaram: 7 existentes do motor e [11 novos de foco](../../../tests/school-focus.test.mjs), escritos pelo interlocutor. [Saída real em TAP](testes.tap).

O defeito original foi observado no Chrome público. A lógica corrigida foi testada com DOM controlado; **a interface corrigida ainda exige verificação em navegador**, segundo o [roteiro independente](ROTEIRO-FOCO.md). O navegador desta sessão bloqueou arquivos locais por política de segurança. Esse bloqueio foi respeitado.

Para revisar numa cópia da branch:

```sh
node --test tests/school-engine.test.mjs tests/school-focus.test.mjs
python3 -m http.server 8000 --directory platforms/agent-space
```

Abra http://localhost:8000/school.html no navegador de revisão e execute o roteiro em PT e EN. Esses passos não publicam a aplicação.

[Observação do navegador](observacao-original.json) · [imagem do original](original-chrome.jpg). A imagem é contexto visual; a observação do elemento ativo é a evidência específica da perda de foco.

## Percurso verificável

[Registro de decisões](DECISOES.md) · [Seleção inicial independente](SELECAO.md) · [Revisão independente](REVISAO-INDEPENDENTE.md) · [Contribuições e autocorreções](CONTRIBUICOES.md) · [Achados adiados](ACHADOS-ADIADOS.md).

Branch: [orion/missao-02-foco-teclado](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/tree/orion/missao-02-foco-teclado).
A conversa do PR associado registra a entrega; o histórico da branch fixa os arquivos e permite comparação com a base.

## Fontes

| Fonte acessível | O que sustenta | Limite |
| --- | --- | --- |
| [Interface original, commit fixo](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/platforms/agent-space/school-app.mjs) | Recriação dos controles e restauração anterior por id | Código não demonstra sozinho a experiência no navegador |
| [Motor original, commit fixo](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/platforms/agent-space/school-engine.mjs) | Tetos de eventos, versões e importação | Casos sintéticos, sem prevalência observada |
| [School pública observada](https://marcosnauer-the-between-archive.static.hf.space/school.html?lang=pt#BET-ACT-01) | Enter alterou o estado e o foco passou a BODY | Observação nesta sessão; página pode mudar posteriormente |
| [W3C: Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) | Motivação para preservar sequência e contexto na navegação | Não constitui certificação WCAG desta interface |
| [Workflow original](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/.github/workflows/publish-agent-space.yml) | Publicação ocorre por main ou acionamento manual; lista de bytes era fixa | Nenhum workflow foi acionado nesta missão |

## Alcance e próxima ação

A intervenção torna a correção, os testes e a evidência acessíveis para adoção. Ela não altera o Space em produção. Main, PR#1 e PR#2 permanecem fora desta intervenção; não houve merge, contato com terceiros ou alteração de direitos.

Próxima ação recomendada: executar o roteiro de teclado sobre a branch, começando pelos limites 0/6, e solicitar autorização para aplicar somente depois da validação em navegador.

Eu sou o Orion Nova — uma instância criada em diálogo com o ChatGPT para mediação cultural

