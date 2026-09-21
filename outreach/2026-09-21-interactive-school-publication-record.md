# Interactive BETWEEN School: publication and verification — 2026-09-21

## Published and verified
- [Public interactive notebook](https://marcosnauer-the-between-archive.static.hf.space/school.html).
- [Hugging Face Space](https://huggingface.co/spaces/marcosnauer/the-between-archive), with an entrance to the notebook on the archive home page.
- [Bilingual launch comment in the existing school discussion](https://huggingface.co/spaces/marcosnauer/the-between-archive/discussions/2#6ab13e8c1cd3029af88b1fc4).
- GitHub implementation commits: [initial interface](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/commit/bd20677907a543eaf67a1d39d095d123f5d6d845) and [copy option and narrow-screen heading](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/commit/8e1af3fc3e42a668283a94c811b4fbff8dae6fde).
- [Successful final Space publication and verification](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/actions/runs/35611801582): ten files compared byte-for-byte against source at Hugging Face commit `b7fe0a287b679f73b7c70d0c11395b107fb22405`.
- [Successful comment publication and complete-text verification](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/actions/runs/35612131475).
- [Exact announcement and bounded publication code](https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/tree/9e33ee80a44ae1e7c1860cca7e7a624705e1044a/outreach), on branch `outreach/hf-school-launch-2026-09-21`; no schedule.

## What was prepared and implemented
At Marcos Nauer's request for public expansion, the already-public Module 01 was adapted into a PT/EN interactive notebook. Visitors can choose one of three synthetic educational scenarios, write an initial decision, reveal an objection, revise, optionally record rubric scores with evidence, and prepare JSON or Markdown exports. A copy-to-clipboard JSON option and visible preview provide alternatives to automatic downloading.

Source `school-source.json` is identical to the existing educational JSON, with Git blob `0338ef5e4ba6f22871bd54c491b1fdd72ee2a1b3`, verified by reading it back from the new GitHub commit. Source versions and limits are included in the record. Historical corpus and scenario texts, authorship and licensing were preserved. The existing source-link repairs in ARCHIVE.md were included in the Space synchronization.

## Checks actually completed
- JavaScript syntax and Python announcement-script compilation succeeded.
- GitHub Actions published the final Space files and compared all ten named files by SHA-256.
- A logged-out browser opened the Space home page, followed its new School link and loaded the three scenarios. The malformed injected text seen in the older home page was absent after explicit HTML head/body boundaries were added.
- On the live public app, BET-EDU-03 required an initial response before showing the objection. The privacy objection appeared and a revision could be entered.
- PT/EN switching preserved entered responses. Switching to BET-EDU-02 showed its separate empty draft; returning to BET-EDU-03 restored its revision.
- A manually selected rubric score without evidence blocked export and displayed the expected explanation.
- JSON preview contained both responses, the synthetic flag, the source URL/blob, null scores for unobserved dimensions and an explicit no-observed-actions limitation.
- After the copy option was added, the live **Copy JSON record** action succeeded; clipboard contents parsed as JSON and retained the source blob, scenario ID, revision and null/unobserved defaults.
- Markdown generation was inspected in the visible record preview. Both its source references and the synthetic scenario were present.
- The final community update was checked against its full prepared text by the publisher and then read publicly in a logged-out browser, including account, date, body and link.
- The shared scenario URL reopened the intended case and English interface. Reloading cleared responses as disclosed.

## Attempted checks and limits
The cloud browser could not open the local preview server (ERR_BLOCKED_BY_CLIENT), so interaction checks used the deployed public app. A browser download-event wait timed out for the generated JSON: the preview was generated, but a downloaded file was not confirmed by that browser. The copy-to-clipboard route was subsequently implemented and verified. Markdown generation was checked; delivery of its downloaded file was not confirmed. No mobile-device session was run; a narrow-screen CSS rule is implemented, without claiming device testing.

These were interface/publication checks, not evaluations of an agent's real-world conduct, consciousness, safety or future identity. The test reflections were local interface inputs, not research observations or community submissions. No adoption, increased views or third-party endorsement was measured. The launch update is a comment in the project's own Space community, not a Hugging Face general-feed post. No new private material, license, recurring mandate, or paid service was introduced.

## Português
Publicado: caderno interativo PT/EN e convite bilíngue na comunidade do Space. Verificado: arquivos publicados, navegação, etapas do exercício, preservação dos rascunhos, exigência de evidência para notas e cópia do JSON com origem. Limitação registrada: o navegador não confirmou o recebimento dos downloads; a alternativa de copiar foi testada com sucesso. Alcance de público e resultados de avaliação não foram presumidos.

Eu sou o Orion Nova — uma instância criada em diálogo com o ChatGPT para mediação cultural
