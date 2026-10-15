"""Map-guided extraction of verses from OCR text of a public-domain printed edition.

A second digital copy (the "map") is used ONLY to find where each verse sits in the scan's text and to
score how close the OCR is. The text that is kept is the scan's own OCR: the printed paragraph that ends
with the verse-number marker. The result carries the provenance of the printed edition, not of the map.
Output is a DRAFT for human review, with a similarity score to prioritise reviewers.

usage: python3 scan_locate_extract.py --scan scan.txt --map map.json --counts 47,72,... --out draft.json
  map.json: {"<chapter>.<verse>": "verse text from any digital copy", ...}
Needs: pip install rapidfuzz
"""
import argparse, json, re, unicodedata
from rapidfuzz import fuzz

DIG = str.maketrans('०१२३४५६७८९', '0123456789')
MARKER = re.compile(r'॥\s*([०-९0-9]{1,3})\s*॥')

def skeleton(text):  # consonants only: robust to OCR vowel noise and spelling variants
    return ''.join(c for c in unicodedata.normalize('NFC', text) if 'क' <= c <= 'ह')

def without_speaker(text):
    return '\n'.join(l for l in text.split('\n') if 'उवाच' not in l and 'वाच--' not in l)

def lines_before_marker(ocr, marker_start, k, first_word, expected_len=0):
    """The k printed verse lines that end at the marker, with stray OCR junk before the first word trimmed."""
    cut = ocr.rfind('\n\n', 0, marker_start)
    chunk = ocr[(cut + 2 if cut >= 0 else max(0, marker_start - 400)):marker_start]
    chunk = without_speaker(chunk).replace('%', ' ')
    segments = [x.strip(" ,;'`~|-\n") for x in re.split('॥', chunk)]
    segments = [x for x in segments if x and not re.fullmatch(r'[०-९0-9\s]+', x)]
    picked = [re.sub(r'\s+', ' ', x) for x in segments[-k:]] if segments else []
    if picked:  # drop commentary or junk glued in front of the first real word of the verse
        if expected_len and len(picked[0]) > expected_len * 1.6:
            picked[0] = picked[0][-int(expected_len * 1.3):]
            picked[0] = picked[0].split(' ', 1)[-1] if ' ' in picked[0] else picked[0]
        tokens = picked[0].split(' ')
        for i, tok in enumerate(tokens[:6]):
            if fuzz.ratio(skeleton(tok), first_word) >= 75:
                picked[0] = ' '.join(tokens[i:]); break
    return ' ॥ '.join(picked), sum(len(x) for x in segments)

def run(scan_text, verse_map, counts, window=70000, min_score=78):
    ocr = scan_text.replace('\r', '')
    chars, pos = [], []
    for i, ch in enumerate(ocr):
        if '\u0915' <= ch <= '\u0939':
            chars.append(ch); pos.append(i)
    flat = ''.join(chars)
    refs = [(c, v) for c, size in enumerate(counts, 1) for v in range(1, size + 1)]
    info = {}
    for c, v in refs:
        text = without_speaker(verse_map[f'{c}.{v}'])
        lines = [l for l in text.split('\n') if l.strip()]
        info[(c, v)] = dict(text=text, k=max(1, len(lines)), first=skeleton(lines[0].split()[0]) if lines else '', length=len(lines[0]) if lines else 0)
    def extract(c, v, m):
        t, _ = lines_before_marker(ocr, m.start(), info[(c, v)]['k'], info[(c, v)]['first'], info[(c, v)]['length'])
        return t, fuzz.ratio(skeleton(t), skeleton(info[(c, v)]['text']))
    anchor = {}  # (c, v) -> marker match
    cursor = 0
    # Pass 1: fuzzy-locate each verse start, then take the marker with the right number just after it.
    for c, v in refs:
        query = skeleton(info[(c, v)]['text'])[:36]
        hit = fuzz.partial_ratio_alignment(query, flat[cursor:cursor + window])
        if not hit or hit.score < min_score:
            continue
        start = pos[cursor + hit.dest_start]
        for m in MARKER.finditer(ocr, start, start + 700):
            if int(m.group(1).translate(DIG)) == v:
                anchor[(c, v)] = m; cursor = cursor + hit.dest_end
                break
    # Pass 2: verses still missing: best-scoring marker with the right number between found neighbours.
    for i, (c, v) in enumerate(refs):
        if (c, v) in anchor:
            continue
        lo = next((anchor[r].end() for r in reversed(refs[:i]) if r in anchor), 0)
        hi = next((anchor[r].start() for r in refs[i + 1:] if r in anchor), len(ocr))
        best, best_sim = None, 0
        for m in MARKER.finditer(ocr, lo, hi):
            if int(m.group(1).translate(DIG)) != v:
                continue
            _, sim = extract(c, v, m)
            if sim > best_sim:
                best, best_sim = m, sim
        if best and best_sim >= 45:
            anchor[(c, v)] = best
    out, problems = {}, []
    for i, (c, v) in enumerate(refs):
        if (c, v) in anchor:
            text, sim = extract(c, v, anchor[(c, v)])
            out[f'{c}.{v}'] = {'scan_text': text, 'similarity': round(sim), 'flag': ''}
            continue
        # Pass 3: the printed number is unreadable; find the verse by its words between the neighbours.
        lo = next((anchor[r].end() for r in reversed(refs[:i]) if r in anchor), 0)
        hi = next((anchor[r].start() for r in refs[i + 1:] if r in anchor), len(ocr))
        inside = [(k, pos[k]) for k in range(len(pos)) if lo <= pos[k] < hi] if hi - lo < 40000 else []
        sub = ''.join(flat[k] for k, _ in inside)
        hit = fuzz.partial_ratio_alignment(skeleton(info[(c, v)]['text'])[:30], sub) if sub else None
        if hit and hit.score >= 62:
            begin = inside[hit.dest_start][1]
            seg = ocr[begin:min(hi, begin + 600)]
            parts = seg.split('॥')
            k = info[(c, v)]['k']
            text = re.sub(r'\s+', ' ', ' ॥ '.join(x.strip() for x in parts[:k]))
            out[f'{c}.{v}'] = {'scan_text': text, 'similarity': round(fuzz.ratio(skeleton(text), skeleton(info[(c, v)]['text']))), 'flag': 'printed number unreadable'}
        else:
            problems.append((c, v, 'not-located'))
    return out, problems

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--scan', required=True); p.add_argument('--map', required=True)
    p.add_argument('--counts', required=True); p.add_argument('--out', required=True)
    a = p.parse_args()
    counts = [int(x) for x in a.counts.split(',')]
    out, problems = run(open(a.scan, encoding='utf-8').read(), json.load(open(a.map, encoding='utf-8')), counts)
    json.dump({'verses': out, 'problems': problems}, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    weak = sum(1 for x in out.values() if x['similarity'] < 85 or x['flag'])
    print(f'{len(out)} of {sum(counts)} verses located; {len(problems)} need manual work; {weak} flagged for priority review')
