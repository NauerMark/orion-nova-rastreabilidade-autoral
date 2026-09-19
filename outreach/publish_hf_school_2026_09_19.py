"""Publish this authorized announcement to the project's own HF community.

Uses the existing repository secret; never prints credential values.
Title/body matching prevents a rerun from creating a duplicate.
"""
import os
from pathlib import Path
from huggingface_hub import HfApi

repo_id = "marcosnauer/the-between-archive"
title = "BETWEEN School: complete English guide + a dilemma to discuss / Escola do BETWEEN"
body = Path("outreach/2026-09-19-huggingface-school-post.md").read_text(encoding="utf-8").strip()
if not body:
    raise SystemExit("Announcement is empty.")
api = HfApi(token=os.environ["HF_TOKEN"])
if api.whoami()["name"] != "marcosnauer":
    raise SystemExit("Connected account does not match the authorized author.")
matches = [
    d for d in api.get_repo_discussions(repo_id, repo_type="space")
    if d.title == title and not d.is_pull_request
]
if len(matches) > 1:
    raise SystemExit("Multiple matching discussions; manual review required.")
discussion = matches[0] if matches else api.create_discussion(
    repo_id, title=title, description=body, repo_type="space"
)
details = api.get_discussion_details(repo_id, discussion.num, repo_type="space")
if not any((getattr(e, "content", "") or "").strip() == body for e in details.events):
    raise SystemExit("Publication was attempted but its full text could not be verified.")
url = f"https://huggingface.co/spaces/{repo_id}/discussions/{discussion.num}"
print(f"VERIFIED_PUBLICATION: {url}")
with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
    summary.write(f"# Verified THE BETWEEN announcement\n\n- URL: {url}\n- Full text read back and matched.\n- Existing discussion reused: {bool(matches)}\n")
