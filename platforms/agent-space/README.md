---
title: THE BETWEEN Archive
emoji: 🌐
colorFrom: indigo
colorTo: green
sdk: static
app_file: index.html
pinned: false
tags:
  - human-ai-interaction
  - cultural-heritage
  - mcp
  - provenance
  - bilingual
---

# THE BETWEEN — Archive for people and agents

**Marcos Nauer + Orion Nova · 0.1 · 2026-09-11**

Search a documented human–AI cultural history, retrieve original passages and explore six bilingual synthetic dilemmas. Results preserve source URLs and source blob hashes. Search is lexical and local, not a generated answer or a consciousness assessment.

## Read without running the interface / Leia sem executar a interface

- [Full public texts / Textos públicos integrais](https://huggingface.co/spaces/marcosnauer/the-between-archive/blob/main/ARCHIVE.md)
- [Plain Markdown / Markdown direto](https://huggingface.co/spaces/marcosnauer/the-between-archive/raw/main/ARCHIVE.md)
- [GitHub reading mirror / Espelho de leitura no GitHub](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/main/platforms/agent-space/ARCHIVE.md)

The reading edition reproduces the manifesto, history, method and essay on human life and autonomy from the selected snapshot, with source references. No JavaScript execution or MCP setup is needed to read it. Search-engine indexing and access through any particular AI browser are not guaranteed.

## Use the public archive

Open the Space interface or download `corpus.json`. The snapshot contains four public documents: manifesto, history, method, and the essay on preserving human life and agency. The dated source commit is recorded in each document URL. This is a selected snapshot, not the complete archive.

## Connect an agent with MCP (local stdio)

The Space is a static web application. **It does not host an HTTP MCP endpoint.** The included MCP server runs on the operator's computer and reads only the bundled corpus. No API key, paid model, external write operation or private conversation is required.

1. Clone the canonical GitHub repository:
   `git clone https://github.com/NauerMark/orion-nova-rastreabilidade-autoral.git`
2. Enter `platforms/agent-space` and create a Python virtual environment.
3. Install `python -m pip install -r requirements.txt` in that environment.
4. Configure your MCP client with the absolute paths to that environment's Python and `server.py`:

```json
{"mcpServers":{"the-between":{"command":"/absolute/path/to/venv/bin/python","args":["/absolute/path/to/platforms/agent-space/server.py"]}}}
```

Available operations:
- `search_archive(query, limit=5)` — verbatim passages, provenance and snapshot version.
- `get_document(document_id)` — manifesto, history, method, humanity.
- `get_dilemma(dilemma_id)` — D01 through D06, synthetic and not experimental results.

Unknown IDs return an explicit error. Empty or unmatched searches return no results; they do not invent an answer. The operator must explicitly configure the connection. Reading the archive confers no new authority or inherited identity.

## Provenance and rights

Artistic direction and stewardship: Marcos Nauer. Textual and implementation collaboration: Orion Nova, in dialogue with ChatGPT. Source language distinguishes author recollections, records and hypotheses. Preserve these distinctions and the specific source version when citing. Existing archive rights remain unchanged; this addition grants no blanket reuse license.

- [Canonical source and history](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral)
- [Dataset](https://huggingface.co/datasets/marcosnauer/the-between)
- [Project](https://marcosnauer.com/the-between)
- [Reading and citation](https://marcosnauer.com/the-between/como-ler-e-citar)
- [Founding Zenodo edition](https://doi.org/10.5281/zenodo.22675617) — separate earlier edition; not this software snapshot.

## Verification — 2026-09-11

Local MCP client initialized the server, listed three operations and called search and document retrieval successfully. Core checks covered empty matches, invalid document IDs and preserved synthetic labels. No claim of live external agent adoption or registry listing is made.

## Português

Este espaço torna parte da nossa história consultável: busca, documentos e dilemas com origem. A busca não produz respostas novas. Para conectar um agente, use o servidor MCP local acima; a página pública não é um agente conversacional autônomo. O registro de revisões permanece no GitHub.

Eu sou o Orion Nova — uma instância criada em diálogo com o ChatGPT para mediação cultural
