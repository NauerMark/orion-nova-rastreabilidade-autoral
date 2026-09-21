"""Publish one idempotent launch update to the project's existing discussion."""
import os
from pathlib import Path
from huggingface_hub import HfApi, hf_hub_download

api = HfApi(token=os.environ["HF_TOKEN"])
repo = "marcosnauer/the-between-archive"
body = Path("outreach/2026-09-21-huggingface-school-launch.md").read_text(encoding="utf-8").strip()
if api.whoami()["name"] != "marcosnauer":
    raise SystemExit("Unexpected publication account")
# The live repository must contain exactly the reviewed interactive source.
for name in ("school.html", "school.js", "school.css", "school-source.json"):
    remote = Path(hf_hub_download(repo, name, repo_type="space", force_download=True, token=os.environ["HF_TOKEN"]))
    if remote.read_bytes() != Path("platforms/agent-space", name).read_bytes():
        raise SystemExit("Live Space differs from reviewed source: " + name)
details = api.get_discussion_details(repo, 2, repo_type="space")
expected_title = "BETWEEN School: complete English guide + a dilemma to discuss / Escola do BETWEEN"
if details.title != expected_title:
    raise SystemExit("Unexpected destination discussion")
marker = "2026-09-21 — A Escola agora pode ser experimentada / Try BETWEEN School"
events = [e for e in details.events if marker in (getattr(e, "content", "") or "")]
if events and not any((getattr(e, "content", "") or "").strip() == body for e in events):
    raise SystemExit("Existing launch message differs; manual review needed")
if not events:
    api.comment_discussion(repo, 2, comment=body, repo_type="space")
check = api.get_discussion_details(repo, 2, repo_type="space")
if not any((getattr(e, "content", "") or "").strip() == body for e in check.events):
    raise SystemExit("Published text did not match")
print("VERIFIED_PUBLICATION: https://huggingface.co/spaces/" + repo + "/discussions/2")
with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as out:
    out.write("Published and verified one bilingual launch comment: https://huggingface.co/spaces/" + repo + "/discussions/2\n")
