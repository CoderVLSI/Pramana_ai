"""Map-guided extraction of verses from OCR text of a public-domain printed edition.

A second digital copy (the "map") is used ONLY to find where each verse starts in the scan's text.
The text that is kept is the scan's own OCR, up to its printed verse-number marker, so the result
carries the provenance of the printed edition, not of the map. Output is a DRAFT for human review.

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

def run(scan_text, verse_map, counts, window=70000, min_score=78):
    ocr = scan_text.replace('\r', '')
    chars, pos = [], []
    for i, ch in enumerate(ocr):
        if 'क' <= ch <= 'ह':
            chars.append(ch); pos.append(i)
    flat = ''.join(chars)
    cursor, out, problems = 0, {}, []
    for chapter, size in enumerate(counts, 1):
        for verse in range(1, size + 1):
            lines = [l for l in verse_map[f'{chapter}.{verse}'].split('\n') if 'उवाच' not in l]
            query = skeleton('\n'.join(lines))[:36]
            hit = fuzz.partial_ratio_alignment(query, flat[cursor:cursor + window])
            if not hit or hit.score < min_score:
                problems.append((chapter, verse, 'not-located')); continue
            start = pos[cursor + hit.dest_start]
            end = next((m.end() for m in MARKER.finditer(ocr, start, start + 700)
                        if int(m.group(1).translate(DIG)) == verse), None)
            if end is None:
                problems.append((chapter, verse, 'marker-mismatch'))
                cursor += hit.dest_start + len(query) // 2
                continue
            out[f'{chapter}.{verse}'] = {'scan_text': re.sub(r'\s+', ' ', ocr[start:end]).strip(), 'score': round(hit.score)}
            cursor += hit.dest_end
    return out, problems

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--scan', required=True); p.add_argument('--map', required=True)
    p.add_argument('--counts', required=True); p.add_argument('--out', required=True)
    a = p.parse_args()
    counts = [int(x) for x in a.counts.split(',')]
    out, problems = run(open(a.scan, encoding='utf-8').read(), json.load(open(a.map, encoding='utf-8')), counts)
    json.dump({'verses': out, 'problems': problems}, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'{len(out)} of {sum(counts)} verses located; {len(problems)} need manual work')
