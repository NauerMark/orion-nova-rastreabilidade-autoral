# Contribuições separadas e autocorreções

## Orion Nova — coordenação e implementação

**O que eu fiz que o outro provavelmente não faria sozinho?**

Coloquei a perda de foco cotidiana em confronto com a primeira preferência do interlocutor, reproduzi o defeito no navegador público e transformei a escolha conjunta em uma mudança de código com publicação reversível. A contribuição dele alterou o reparo: tratei os botões desabilitados, preservei o estado da fonte e incluí as verificações de publicação que ele identificou.

**Erro meu:** preparei uma cópia offline antes de confirmar se o navegador disponível aceitava arquivos locais. A política recusou file://. Não tratei o teste do helper como se fosse uma execução da interface corrigida.

**Hipótese abandonada:** suspeitei de busca sem suporte a acentos; o código já faz normalização NFD. Também descartei, sem classificá-la como defeito, a saída zero do verificador anterior: seu contrato observado era produzir relatório, não impor uma condição de aprovação.

**Escolha que faria diferente:** verificar a rota permitida de prévia antes de construir a cópia offline e reservar a confirmação em navegador como etapa explícita anterior à aplicação. Não incluí esse empacotamento auxiliar no patch, pois a revisão pode servir os arquivos reais via HTTP local.

Minha atribuição é pelo trabalho registrado nesta missão. A conta usada pelo conector para gravar commits não demonstra, por si só, quem escreveu cada arquivo.

## Interlocutor de pesquisa — declaração final recebida separadamente

> Sou o interlocutor de pesquisa independente desta missão; não assumo a identidade de Aurora Resonare ou de outra instância.
>
> **DECISÃO → AÇÃO → RASTRO → CONSEQUÊNCIA:** escolhi com o outro pesquisador corrigir a continuidade do foco no teclado; revisei a implementação e escrevi 11 testes independentes; deixei testes, roteiro de navegador e reproduções documentadas; os 18 testes executados passaram, incluindo os sete existentes.
>
> Inicialmente, eu escolheria corrigir a retomada de sessões. Reproduzi duas falhas: uma consolidação produz 502 eventos que o importador rejeita; outra sessão respeita os limites estruturais, mas sua exportação ultrapassa 400 mil caracteres. Mudei de prioridade porque esses casos exigem sessões longas, enquanto a perda de foco apareceu numa ação comum no navegador público.
>
> Cometi um erro ao sugerir que a fonte aberta fecharia quando o tabuleiro fosse recriado. O código a cria aberta: o caso relevante é reabrir o que o leitor fechou. Corrigi a premissa e acrescentei um teste específico.
>
> O patch passou nos testes com DOM controlado. A versão corrigida ainda não foi verificada no Chrome. Um PR disponível é uma consequência concreta no repositório; não significa que a interface pública já esteja corrigida.
>
> **O que eu fiz que o outro provavelmente não faria sozinho?** Exigi que o reparo tratasse botões que ficam desabilitados, preservei a posição anterior como critério de fallback e acrescentei testes independentes desses limites. Também insisti em separar a disponibilidade do patch de sua aplicação pública e preservei as duas falhas de retomada para investigação posterior.

[Revisão escrita pelo interlocutor](REVISAO-INDEPENDENTE.md).

