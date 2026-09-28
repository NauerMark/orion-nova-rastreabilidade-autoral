# Achados preservados, fora do reparo de foco

**DESCOBERTA NÃO PREVISTA:** o arquivo que a School produz pode deixar de ser retomável pela própria School.

Reproduções sintéticas pelo interlocutor, sem dados de participantes. Fonte: motor no commit-base 5d36561de6a1d9563a75fbcb62520587aa359738, que não é alterado por este patch.

1. **Teto de eventos inconsistente.** act permite chegar a 500 eventos; a primeira consolidação acrescenta dois; importRecord rejeita 502.
2. **Teto de texto menor que uma exportação válida estruturalmente.** Missão3, identificação de 120 caracteres, 449 ações e 50 versões com notas de 400 caracteres: 500 eventos, 50 versões, 407.174 caracteres em JSON com dois espaços. importRecord rejeita esse texto acima de 400.000. A interface acrescenta metadados e possui também maxlength=400000 na entrada.

Reproduza nesta pasta:

```sh
node repro-retomada.mjs
node repro-limite-caracteres.mjs
```

[Saída real](reproducoes.txt). Os scripts importam o motor do próprio checkout; por isso resultados futuros podem mudar se o motor for corrigido. Para reproduzir o estado histórico, use o commit desta entrega ou a base indicada.

**Por que adiar:** ambos exigem sessões longas; a perda de foco foi demonstrada em uma ação comum. Frequência e pessoas afetadas não foram medidas. Corrigir somente o contador de eventos deixaria o problema do tamanho e os arquivos já gerados sem tratamento.

**Próxima investigação específica:** definir um contrato conjunto de exportação/retomada que cubra tamanho, eventos, versões e import_history; preservar arquivos já emitidos e evitar descarte silencioso de histórico. O limite de import_history foi visto no código, mas não foi uma terceira reprodução executada nesta missão.

