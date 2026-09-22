# Registro de decisões — Missão 02

Registra decisões, ações e consequências observáveis; não contém raciocínio privado.
Base: 5d36561de6a1d9563a75fbcb62520587aa359738.
Os links relativos tornam-se públicos no commit desta branch.

| DECISÃO | AÇÃO | RASTRO REAL ACESSÍVEL | CONSEQUÊNCIA |
| --- | --- | --- | --- |
| Investigar um produto já acessível e confrontar a escolha com outro agente | Leitura do repositório e pesquisa independente delegada | [Seleção independente](SELECAO.md), [fontes](README.md#fontes) | Dois candidatos concretos: retomada de sessões e continuidade por teclado |
| Descartar duas suspeitas sem sustentação suficiente | Conferir normalização de busca e o contrato do verificador anterior | [Autocorreções](CONTRIBUICOES.md) | Busca já normaliza acentos; saída zero de um relatório não foi tratada como falha de um gate |
| Testar se a barreira cotidiana justifica mudar a prioridade | Ativar por Enter um botão real no Chrome público | [Observação DOM](observacao-original.json), [imagem](original-chrome.jpg) | Mudança de turnos observada com foco em BODY |
| Escolher conjuntamente a continuidade por teclado | Comparar a reprodução comum com os dois casos longos; interlocutor reviu sua primeira escolha | [Revisão independente](REVISAO-INDEPENDENTE.md), [achados preservados](ACHADOS-ADIADOS.md) | Foco tornou-se o escopo; falhas de retomada continuam registradas |
| Tratar o controle que se desabilita, além de identificá-lo | Implementar fallback contextual e preservação da fonte; aceitar objeções do interlocutor | [Helper](../../../platforms/agent-space/school-focus.mjs), [integração](../../../platforms/agent-space/school-app.mjs) | Comportamento implementado sem alterar limites de recursos ou histórico |
| Verificar por uma contribuição separada | Interlocutor criou 11 testes e revisou integração; coordenador executou os testes | [Testes](../../../tests/school-focus.test.mjs), [TAP](testes.tap), [roteiro](ROTEIRO-FOCO.md) | 18 testes passam; validação da interface corrigida em navegador segue pendente |
| Respeitar o bloqueio do navegador a arquivos locais | Encerrar tentativa file:// e manter distinção entre testes de lógica e teste de interface | [Autocorreção do coordenador](CONTRIBUICOES.md) | Nenhuma declaração de verificação Chrome da correção |
| Incluir o novo módulo nas verificações futuras de publicação | Incorporar revisão do interlocutor no workflow existente | [Workflow](../../../.github/workflows/publish-agent-space.yml) | Teste de foco e módulo entram na verificação futura; gatilhos e permissões preservados |
| Disponibilizar uma mudança reversível para adoção | Criar branch própria a partir da base; publicar patch e abrir PR em rascunho | [Branch pública](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/tree/orion/missao-02-foco-teclado), histórico e PR associado | Novo código, testes e registros passam a existir fora da conversa; aplicação pública aguarda validação e autorização |

A criação do PR é confirmada pelo próprio objeto público associado à branch. Uma proposta disponível e uma interface implantada são consequências diferentes; somente a primeira integra esta entrega.

