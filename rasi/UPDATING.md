# Jathagam page: how to add horoscopes

Live page: https://raghuramprabhu.github.io/DigitalMarketingLearning/rasi/

Raghu pastes horoscope details in chat (usually English): photos of matrimony ads, profile screenshots, or PDF lists such as the Swastik chart. Phone numbers ARE included (Raghu asked for them: they are the most important part); emails and photos are not copied. Any Claude session asked to add them follows these steps.

## 1. Translate into Tamil and add to `rasi/data/jathagams.json`
- Append new entries to `items`. Never change or reuse an existing `id`: the reader's seen / liked / hidden marks and notes are stored on his phone against that id.
- Next id: `j` + next number (`j008`, `j009`, …). `added` = today's date in India time (`YYYY-MM-DD`).
- When the first real entries arrive, delete the sample entries and set `"sample": false` (this removes the "sample data" banner).
- Bump `updated`.

### Fields (only `id` and `name` are required; leave out anything not given)
| field | example | notes |
|---|---|---|
| `name` | `ஆனந்த் கிருஷ்ணன்` | Tamil script |
| `rasi` | `கடகம்` | must be one of the 12 spellings below, so the chart can highlight it |
| `nakshatram` | `பூசம்` | spellings below |
| `padam` | `3` | number 1–4 |
| `lagnam` | `ரிஷபம்` | same spellings as rasi |
| `gothram` | `ஸ்ரீவத்ஸ` | without the word கோத்திரம் |
| `dob` | `1995-05-20` | ISO date; the page shows the Tamil date, weekday and age |
| `tob` | `06:45` | 24-hour; the page shows காலை / மதியம் / மாலை / இரவு |
| `pob` | `மயிலாப்பூர், சென்னை` | |
| `sect` | `ஐயர் — வடமாள்` | sect / subsect |
| `native` | `தஞ்சாவூர்` | native place, if different from birth place |
| `education`, `job`, `workplace`, `income`, `height`, `parents`, `father`, `mother`, `siblings` | | free Tamil text (`height` may include weight: `5 அடி 4 அங்குலம் · 58 கிலோ`) |
| `phones` | `[{"tel": "+919842160903", "show": "+91 98421 60903", "label": "தொடர்பு எண்"}]` | shown as big tap-to-call buttons; `tel` must be international format |
| `source` | `ஸ்வஸ்திக் பட்டியல் … · GIY2601024` | where the profile came from, with its registration number |
| `dosham` | `இல்லை` or `செவ்வாய் தோஷம் (7-ஆம் இடம்)` | anything other than `இல்லை` shows in red |
| `notes` | | extra details from the source, translated |
| `kattam` | `{ "2": ["La","Su","Me"], "4": ["Mo"] }` | rasi number (1 = மேஷம் … 12 = மீனம்) → planet codes `La Su Mo Ma Me Ju Ve Sa Ra Ke` |

Rasi spellings: மேஷம், ரிஷபம், மிதுனம், கடகம், சிம்மம், கன்னி, துலாம், விருச்சிகம், தனுசு, மகரம், கும்பம், மீனம்

Nakshatram spellings: அசுவினி, பரணி, கார்த்திகை, ரோகிணி, மிருகசீரிடம், திருவாதிரை, புனர்பூசம், பூசம், ஆயில்யம், மகம், பூரம், உத்திரம், அஸ்தம், சித்திரை, சுவாதி, விசாகம், அனுஷம், கேட்டை, மூலம், பூராடம், உத்திராடம், திருவோணம், அவிட்டம், சதயம், பூரட்டாதி, உத்திரட்டாதி, ரேவதி

### Translation rules
1. Translate meaning, not word by word. Use the Tamil terms families already use (லக்னம், பாதம், தோஷம்), not literal translations of English.
2. Names and places: write in Tamil script, keep the spelling the family uses.
3. Do not add anything that is not in the source. If something is unclear, ask Raghu instead of guessing.
4. Check that the nakshatram belongs to the rasi given (e.g. பூசம் is only in கடகம்). If it doesn't, ask Raghu.

### Bulk lists (Swastik PDF)
The 31 Oct 2026 Swastik PDF was converted with a script: words were read by column position (`pdftotext -bbox`), then star / rasi / gothram / places / degrees mapped to Tamil with lookup tables. Only the Iyer sections were included (Raghu's choice). Ids are `sw-<regn>`; photo/ad entries are `img-…`.

## 2. Check and publish
```bash
python3 -c "import json;json.load(open('rasi/data/jathagams.json'))"
git add rasi && git commit -m "Jathagam: add <names>" && git push origin main
```
GitHub Pages updates within a minute or two. The page fetches the data fresh each time, so the reader sees new entries marked புதிது without reinstalling anything.

If you change `jathagam.js`, `jathagam.css` or `index.html`, also bump `CACHE` in `rasi/sw.js` (`jathagam-v2`, …).

## Privacy
The page is public to anyone with the link (it is `noindex` and not linked from the home page, but that is not a lock). Real horoscopes include names, birth dates and birth times of real people.
