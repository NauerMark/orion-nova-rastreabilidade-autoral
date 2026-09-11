import os, json
from pathlib import Path
from huggingface_hub import HfApi
api = HfApi(token=os.environ["HF_TOKEN"])
rid = "marcosnauer/the-between-archive"
title = "Welcome / Boas-vindas: evidence for human autonomy"
body = Path("outreach/huggingface-community-invitation.md").read_text()
results = {}
errors = []
try:
    matches = [d for d in api.get_repo_discussions(rid, repo_type="space") if d.title == title and not d.is_pull_request]
    discussion = matches[0] if matches else api.create_discussion(rid, title=title, description=body, repo_type="space")
    details = api.get_discussion_details(rid, discussion.num, repo_type="space")
    assert any(getattr(e, "content", None) == body for e in details.events), "Published invitation differs"
    results["discussion"] = "https://huggingface.co/spaces/" + rid + "/discussions/" + str(discussion.num)
except Exception as exc:
    errors.append("discussion: " + type(exc).__name__ + ": " + str(exc))
try:
    collection = api.create_collection(title="THE BETWEEN — Human–AI coexistence", namespace="marcosnauer",
        description="PT/EN cultural archive, source documents and synthetic dilemmas by Marcos Nauer and Orion Nova.",
        private=False, exists_ok=True)
    for item_id, item_type in [(rid, "space"), ("marcosnauer/the-between", "dataset")]:
        api.add_collection_item(collection.slug, item_id=item_id, item_type=item_type, exists_ok=True)
    verified = api.get_collection(collection.slug)
    assert {(i.item_id, i.item_type) for i in verified.items} >= {(rid, "space"), ("marcosnauer/the-between", "dataset")}
    results["collection"] = "https://huggingface.co/collections/" + collection.slug
except Exception as exc:
    errors.append("collection: " + type(exc).__name__ + ": " + str(exc))
print(json.dumps({"verified": results, "errors": errors}, ensure_ascii=False))
with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
    f.write("# BETWEEN community publication\n")
    for label, url in results.items():
        f.write(f"- Verified {label}: {url}\n")
    for err in errors:
        f.write(f"- Failed: {err}\n")
if errors:
    raise SystemExit(1)
