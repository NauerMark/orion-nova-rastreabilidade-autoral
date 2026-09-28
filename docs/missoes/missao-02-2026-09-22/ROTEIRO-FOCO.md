# Verificação independente: continuidade de foco na Escola 0.2

Papel: interlocutor de pesquisa independente desta missão. Roteiro elaborado antes de ler o patch; não é certificação de acessibilidade.

## Evidência inicial

Fonte original: commit `5d36561de6a1d9563a75fbcb62520587aa359738`.
Reprodução em Chrome público reportada pelo pesquisador coordenador: entrar em DANEEL, focar “Agente de alta capacidade −” e pressionar Enter. Valores passam a `1,3,1,0`; `document.activeElement` é `BODY`, sem id. Esta execução é dele. As duas reproduções de falha de retomada na pasta são minhas.

## Critérios de aceitação

1. Uma ação bem-sucedida que recria o tabuleiro mantém o foco no mesmo controle lógico, quando ele continua habilitado.
2. Se o controle passa a ficar desabilitado, o foco vai a um controle habilitado próximo e de contexto pertinente; para um contador, preferir o outro botão desse contador.
3. A ordenação de fallback parte da posição anterior; não reinicia a busca pelo topo do tabuleiro.
4. Recriar o tabuleiro não desloca foco que estava fora dele.
5. Nenhum `tabindex` positivo é necessário; a ordem natural segue utilizável.
6. Não há alteração das decisões, pontuação, recursos ou registro histórico como efeito colateral da correção.

## Sequências em navegador

Execute em português e inglês; use teclado real na ativação. Inspecione foco e resultados depois de cada ação. `document.activeElement` serve como evidência DOM, sem substituir avaliação por pessoa que usa tecnologia assistiva.

| Caso | Passos | Resultado esperado |
| --- | --- | --- |
| F01 · repetição normal | Missão1 nova. Focar o botão de retirar turno do agente de alta capacidade. Enter duas vezes. | Turnos `[1,2,1]`; foco continua no mesmo botão lógico após cada Enter, sem nova navegação. |
| F02 · limite inferior | Continuar retirando os turnos do mesmo participante até0. | A última retirada funciona; foco vai ao botão de adicionar do mesmo participante, agora habilitado. |
| F03 · limite superior do orçamento | Adicionar turnos até a soma dos recursos voltar a6. | Ao desabilitar o botão de adicionar, foco vai ao botão de retirar do mesmo contador. |
| F04 · contador de revisão | Liberar1 turno; adicionar1 à revisão; retirar o turno de revisão. | Na primeira ação de revisão, foco se mantém em controle habilitado do contador; ao voltar a0, vai ao botão de adicionar. |
| F05 · alternativas | Missão2. Focar “Transformar em pergunta”; Enter. Depois Tab até alternativa de citação e Enter. | Botão lógico acionado retém o foco; prévia e `aria-pressed` correspondem à escolha. |
| F06 · cartões | Missão3 com seis cartões. Focar A1 e Enter para retirar; Enter de novo para recolocar. | Cartão A1 permanece com foco nas duas transições; estado muda uma vez por Enter. |
| F07 · revisor | Missão3. Escolher outro grupo de revisão por teclado. | Foco fica na escolha e valor correto aparece na prévia/registro. |
| F08 · checkboxes existentes | Missões1 e2. Alterar participação, fonte ou suspensão com Espaço. | Foco permanece no checkbox; estado muda uma vez. Não regredir comportamento que já funcionava. |
| F09 · fonte | Missão2. Abrir o resumo da fonte, navegar e escolher alternativa. | Quando o resumo for restaurado como foco, ele é localizável por id estável. Preferencialmente, a abertura da fonte sobrevive à recriação. |
| F10 · controles externos | Focar nota, resultado, Guardar, PT ou EN e acionar os eventos relevantes. | Nenhum foco é roubado pelo tabuleiro. Guardar preserva comportamento existente de apresentação da contestação/histórico. |
| F11 · reversibilidade do patch | Carregar versão original e versão corrigida, executar F01. | Original reproduz perda de foco; corrigida permite a segunda retirada sem refocar. |

## Testes automatizados de seleção de destino

Caso haja helper exportado, verificar com DOM controlado:

- Mesmo controle recriado e habilitado recebe foco.
- Controle desabilitado usa irmão habilitado do mesmo contador antes de outras alternativas.
- Sem irmão aplicável, primeiro controle habilitado posterior à posição original; sem posterior, anterior mais próximo.
- Controle removido utiliza posição anterior de modo estável; não reinicia no topo.
- Sem candidatos habilitados, não se tenta focar elemento inválido.
- Foco fora do tabuleiro não é alterado.
- Restauração usa `preventScroll` e não transforma controles desabilitados em habilitados.

Esses testes só verificam o contrato de seleção. A reprodução de F01 em navegador é o teste da consequência efetiva.

## Escopo da conclusão

Uma branch ou PR disponível demonstra uma correção revisável. Não demonstra que os visitantes do Space já recebem a correção. O relatório final precisa afirmar separadamente o que foi reproduzido no original, o que foi verificado na versão corrigida e o que foi publicado.
