A retomada preserva os ancestrais escolhidos, mas pode esconder uma contestação conhecida que ficou em outro ramo. Ao selecionar a investigação original, seu desafio posterior desaparece do pacote; ao selecionar uma continuação paralela, o mesmo desafio também desaparece. O coordenador identificou um caso semelhante no mesmo momento desta revisão; a reprodução independente confirma a preocupação comum.

Executei três verificações sobre `prepareContinuation`. A primeira passou: uma continuação parcial conserva a pendência do desafio ancestral e deixa vazia a autoria do próximo participante. Duas falharam: o pacote não continha nem sequer o identificador da contestação conhecida nos casos de retomada da raiz e do ramo irmão. Evidência: [community-retomada.test.mjs](community-retomada.test.mjs).

Proponho mostrar os registros relacionados fora da linhagem em seção própria, com identificador, hash da versão recebida e pendências. Não precisam virar pais automáticos da próxima contribuição. A distinção entre ancestral e ramo relacionado deve continuar explícita.

O implementador aceitou acrescentar `known_related`. Ainda não reexecutei o teste depois dessa alteração. Minha objeção permanece aberta até confirmar que ambos os caminhos revelam a contestação e preservam seus limites, sem incluir investigações desconectadas.

