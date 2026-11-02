# Calm Feed: how to publish a new edition

Live page: https://raghuramprabhu.github.io/DigitalMarketingLearning/feed/

This feed is a personal, calm, curated stream for Raghu. Any Claude session asked to "refresh the feed" follows these steps.

## 1. Pick the edition name
- Morning run: `YYYY-MM-DD-am`
- Evening run: `YYYY-MM-DD-pm`
- On-demand run: `YYYY-MM-DD-x1`, `-x2`, … (use the next free number; check `feed/data/items.json`)

Use the date in India time (Asia/Kolkata).

## 2. Write 25–35 new items into a scratch JSON list (outside the repo)
The schema is in `feed/tools/merge.py`. Topics and a rough mix per edition:

| topic | what goes there | per edition |
|---|---|---|
| ai | AI & agents news (real, sourced) and first-principles ideas | 3–4 |
| space | sky events, astronomy discoveries, wonder facts | 3 |
| chess | news, ideas, endgame concepts, history | 2–3 |
| writing | ORIGINAL short poems, ORIGINAL micro-stories, storytelling craft | 3–4 |
| adhd | practical, kind, evidence-informed tips | 2 |
| mind | cognitive science, learning, performance | 2–3 |
| craft | Java, system design, distributed systems | 3 |
| history | history facts, especially Indian/Tamil history | 2 |
| computing | history of computing | 2 |
| wisdom | public-domain quotes only (Marcus Aurelius, Seneca, Epictetus, Sun Tzu in Giles 1910, Shakespeare, Gita/Thirukkural in your own rendering) | 2 |
| facts | delightful daily facts | 2–3 |

Rules:
1. **Calm filter (most important).** Nothing that raises blood pressure: no politics, elections, wars, crime, disasters, layoffs, outrage, culture-war, celebrity drama, market crashes, health scares, death or illness themes, comparison/"you're behind" framing. If a story is important but stressful, leave it out.
2. **News must be real and recent.** Use web search; every `news` item needs a `source` URL you actually saw. Never invent news. Prefer the last 3 days.
3. **Facts must be accurate.** If unsure, drop the item. Correct myths rather than repeating them.
4. **Copyright.** Poems and stories must be original. No song lyrics, no modern copyrighted quotes (no Game of Thrones, no modern books or films). Paraphrase news in your own words; don't copy article sentences.
5. **Curiosity.** Most items get a `hook` (a "Wonder:" question) or a `q`/`a` recall pair. Aim for ~40% with `q`/`a`.
6. **No repeats.** Skim titles in `feed/data/items.json` first; don't repeat a fact or quote already there.
7. Interleave topics so no two neighbours share a topic.

## 3. Merge, check, publish
```bash
python3 feed/tools/merge.py /path/to/batch.json YYYY-MM-DD-am
python3 -c "import json;json.load(open('feed/data/items.json'))"
git add feed && git commit -m "Calm feed: YYYY-MM-DD-am edition" && git push origin main
```
GitHub Pages picks it up within a minute or two.
