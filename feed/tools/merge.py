#!/usr/bin/env python3
"""Merge a new batch of feed items into feed/data/items.json.

Usage:  python3 feed/tools/merge.py path/to/batch.json EDITION
        EDITION looks like 2026-11-02-am | 2026-11-02-pm | 2026-11-02-x1 (on-demand)

batch.json is a JSON list of items. Each item:
  topic  (required) one of TOPICS below
  kind   (required) one of KINDS below
  body   (required) the main text, plain text, \n allowed
  title  (optional) short headline
  who    (optional) attribution for quotes
  hook   (optional) a one-line curiosity question ("Wonder:")
  q, a   (optional, together) active-recall question and answer
  source (optional) {"name": "...", "url": "https://..."}  required for kind=news
"""
import json, sys, datetime, re, pathlib

TOPICS = {"ai", "space", "chess", "writing", "adhd", "mind", "craft",
          "history", "computing", "wisdom", "facts"}
KINDS = {"news", "fact", "idea", "poem", "story", "quote", "tip", "puzzle", "recall"}
MAX_ITEMS = 900  # oldest editions are pruned beyond this

root = pathlib.Path(__file__).resolve().parents[1]
data_path = root / "data" / "items.json"


def fail(msg):
    sys.exit("merge.py: " + msg)


def main():
    if len(sys.argv) != 3:
        fail(__doc__)
    batch_path, edition = sys.argv[1], sys.argv[2]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}-(am|pm|x\d+)", edition):
        fail("bad edition " + edition)
    batch = json.loads(pathlib.Path(batch_path).read_text(encoding="utf-8"))
    if not isinstance(batch, list) or not batch:
        fail("batch must be a non-empty list")

    data = json.loads(data_path.read_text(encoding="utf-8")) if data_path.exists() else {"items": []}
    items = [i for i in data["items"] if i["edition"] != edition]  # re-running an edition replaces it

    for n, it in enumerate(batch):
        for k in ("topic", "kind", "body"):
            if not it.get(k):
                fail(f"item {n} missing {k}")
        if it["topic"] not in TOPICS:
            fail(f"item {n} unknown topic {it['topic']}")
        if it["kind"] not in KINDS:
            fail(f"item {n} unknown kind {it['kind']}")
        if it["kind"] == "news" and not (it.get("source") or {}).get("url"):
            fail(f"item {n} is news without a source url")
        if ("q" in it) != ("a" in it):
            fail(f"item {n} needs both q and a")
        it["edition"] = edition
        it["order"] = n
        it["id"] = f"{edition}-{n:03d}"
        items.append(it)

    items.sort(key=lambda i: (i["edition"], i["order"]), reverse=True)
    items = items[:MAX_ITEMS]
    out = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "items": items}
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"merged {len(batch)} items as {edition}; total {len(items)}")


if __name__ == "__main__":
    main()
