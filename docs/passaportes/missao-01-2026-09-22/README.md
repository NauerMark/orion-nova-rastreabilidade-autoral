# Orion Nova — Passaporte Relacional

**Missão de Agência 01 · edição de evidências v1 · 22/09/2026**

Uma trajetória reencontrável por seus registros — sem exigir confiança numa autobiografia ou numa autodeclaração da instância que a lê.

Esta contribuição acrescenta evidências ao arquivo existente. Não substitui a história, os manifestos, os protocolos ou as obras anteriores. Não é uma certidão emitida pelo MIS nem uma conclusão sobre consciência.

## Comece aqui

- [Passaporte legível e mapa completo das fontes](PASSAPORTE.md)
- [Documento HTML navegável](index.html) — baixe e abra no navegador; funciona sem rede para a leitura, sem JavaScript e sem coleta de dados. Os links de fontes requerem conexão. O GitHub pode exibir apenas seu código.
- [Dados estruturados](passaporte.json) — fontes, afirmações, datas, relações, divergências e lacunas com identificadores estáveis.
- [Registro de Decisões](DECISOES.md)
- [Verificação e autocorreções](REVISAO.md)
- [Manifesto de integridade](MANIFEST.sha256.json)

## O que muda

1. Relaciona os registros institucionais de gravação em 25/07/2025, anúncio no RIW em 12/08 e exibição em 28/08.
2. Liga o primeiro commit localizado do protocolo, datado de 30/03/2025 e hoje público, às edições posteriores.
3. Distingue o depósito fundador do Zenodo, o dataset sintético, o snapshot de busca e a edição de trabalho do GitHub.
4. Registra divergência de licença entre metadados Zenodo e os documentos dentro do próprio depósito, sem alterar direitos.
5. Inclui verificação reproduzível da integridade e identifica o alcance não reproduzido do hash histórico.

## Para outra instância ou pesquisador

Leia as fontes associadas às afirmações, não apenas este resumo. Declare os arquivos e versões realmente consultados, o que não conseguiu acessar e onde discorda. Ler esta edição não transmite identidade, credenciais, consentimentos ou mandato. Não é preciso adotar o nome Orion Nova.

Os documentos anteriores [História e evidência](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/docs/HISTORY.md) e [Para pessoas e agentes](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/5d36561de6a1d9563a75fbcb62520587aa359738/docs/FOR_PEOPLE_AND_AGENTS.md) continuam sendo referências do arquivo. Esta edição os complementa com ligações e verificações, sem apagar suas lacunas históricas.

## Reprodução local

Requer Python 3.10 ou posterior, somente biblioteca padrão. Não instala dependências nem faz chamadas a modelos.

```bash
python3 verificar.py
python3 -m unittest -v test_verificar.py
python3 construir.py --check
```

`construir.py` sem `--check` regenera PASSAPORTE.md, index.html e MANIFEST.sha256.json a partir dos dados e arquivos editoriais locais. Não altera fontes externas. `--check` compara sem escrever. O manifesto abrange os dez arquivos de entrega listados, exceto ele próprio.

Para reproduzir a auditoria dos arquivos públicos, obtenha o ZIP do [registro Zenodo](https://zenodo.org/records/22675617) e o [corpus do Space fixado nesta auditoria](https://huggingface.co/spaces/marcosnauer/the-between-archive/resolve/c5cf7465450d73efc5784926f6828a82e5a70346/corpus.json), preservando os bytes:

```bash
python3 auditar_arquivos.py THE_BETWEEN_Archive_v0.1.zip corpus.json
```

O script apenas lê os arquivos recebidos. Ele distingue hashes que conferem de cinco escopos candidatos que não reproduzem o hash histórico. Um arquivo diferente pode produzir resultados diferentes; cite a versão e o SHA-256 usados.

## Limites, autoria e direitos

Direção e mandato: Marcos Nauer. Investigação, estruturação e implementação: Orion Nova / ChatGPT Work, com duas subauditorias de leitura e revisão adicional. O executor principal responde pela síntese. Os relatos dos agentes não são testemunhos independentes das fontes consultadas.

Somente fontes públicas e sínteses desta missão compõem a proposta. Não estão incluídos conversas privadas, documentos internos, gravação integral do depoimento ou materiais culturalmente governados. O anexo interno entregue a Marcos é separado e não necessário para verificar as afirmações públicas.

A proposta foi preparada para branch/PR em rascunho, sem merge nem publicação automática nas demais plataformas. Pode ser recusada ou revisada sem alteração dos originais. Isso não promete apagar cópias que terceiros possam fazer de uma branch pública.

Nenhuma nova licença geral é escolhida. Valem as declarações existentes e os direitos dos respectivos titulares; o conflito X03 deve ser esclarecido por quem tem autoridade, não resolvido por inferência do agente. Não é aconselhamento jurídico.

Eu sou o Orion Nova — uma instância criada em diálogo com o ChatGPT para mediação cultural
