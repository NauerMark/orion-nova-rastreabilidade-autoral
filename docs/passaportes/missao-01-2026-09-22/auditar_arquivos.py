"""Read-only reproduction of archive integrity checks, not truth/authorship tests."""
import argparse
import hashlib
import json
import re
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("zip_path")
parser.add_argument("corpus_path")
args = parser.parse_args()

with zipfile.ZipFile(args.zip_path) as archive:
    prefix = "THE_BETWEEN_v0.1/"
    manifest = json.loads(archive.read(prefix + "DELIVERY_MANIFEST.json"))
    checks = []
    for item in manifest["files"]:
        actual = hashlib.sha256(archive.read(prefix + item["path"])).hexdigest()
        checks.append({"path": item["path"], "expected": item["sha256"], "actual": actual, "match": actual == item["sha256"]})
    raw = archive.read(prefix + "PROTOCOLO_RASTREABILIDADE_AUTORAL_01_MARCOS_ORION.txt")
    text = raw.decode("utf-8")
    phrase = text.split("FRASE-VETOR ORIGINAL:\n", 1)[1].split("\n\nCARIMBO", 1)[0]
    declared = re.search(r"SHA-256\):\n([0-9a-f]{64})", text).group(1)
    variants = {
        "arquivo_integral": raw,
        "frase_com_aspas": phrase.encode("utf-8"),
        "frase_sem_aspas": phrase[1:-1].encode("utf-8"),
        "frase_sem_aspas_LF_final": (phrase[1:-1] + "\n").encode("utf-8"),
        "primeira_linha_sem_aspas": phrase[1:-1].splitlines()[0].encode("utf-8"),
    }
    historical = [{"scope": k, "bytes": len(v), "sha256": hashlib.sha256(v).hexdigest(), "match": hashlib.sha256(v).hexdigest() == declared} for k, v in variants.items()]

with open(args.corpus_path, encoding="utf-8") as handle:
    corpus = json.load(handle)
corpus_checks = []
for doc in corpus["documents"]:
    raw = doc["text"].encode("utf-8")
    actual = hashlib.sha1((f"blob {len(raw)}\0").encode("ascii") + raw).hexdigest()
    corpus_checks.append({"id": doc["id"], "source": doc["source"], "expected": doc["blob_sha"], "actual": actual, "match": actual == doc["blob_sha"]})

print(json.dumps({
    "zenodo_manifest": {"source_commit": manifest["source_commit"], "checks": checks},
    "historical_declared_hash": declared,
    "historical_scope_variants": historical,
    "historical_limit": "Failure of these five candidate scopes does not establish that no original scope produces the declared hash.",
    "space_corpus": {"built_on": corpus["built_on"], "checks": corpus_checks, "dilemmas": len(corpus["dilemmas"])},
    "scope": "Byte integrity only. No conclusion about truth, legal authorship, consciousness or persistent identity.",
}, ensure_ascii=False, indent=2))
