"""Attach page numbers to drafted verses, using an archive.org djvu.xml (OCR with line positions).

scan_locate_extract.py finds each verse's text in the scan's plain OCR, but the plain OCR has no page
breaks. This script walks the XML lines in order and finds the line where each drafted verse starts, so a
reviewer can open the exact page:
  https://archive.org/details/<item>/page/n<page_index>/mode/1up
Text is never changed here; only `page_index` is added. Verses it cannot place keep page_index = null.

usage: python3 scan_layout_extract.py --xml item_djvu.xml --draft draft.json --out draft_with_pages.json
Needs: pip install rapidfuzz
"""
import argparse, json, unicodedata
import xml.etree.ElementTree as ET
from rapidfuzz import fuzz

def skeleton(text):
    return ''.join(c for c in unicodedata.normalize('NFC', text) if 'क' <= c <= 'ह')

def read_lines(xml_path):
    """[(page_index, skeleton_of_line)] in reading order."""
    out = []
    for page, obj in enumerate(ET.parse(xml_path).getroot().iter('OBJECT')):
        for line in obj.iter('LINE'):
            text = ' '.join((w.text or '').strip() for w in line.findall('WORD'))
            sk = skeleton(text)
            if len(sk) >= 6:
                out.append((page, sk))
    return out

def attach(lines, verses, head=22, window=1500, min_score=90):
    """Keys like '1.1' are visited in chapter/verse order; the search cursor only moves forward."""
    order = sorted(verses, key=lambda k: tuple(int(x) for x in k.split('.')))
    cursor, placed, missing = 0, 0, []
    for key in order:
        want = skeleton(verses[key]['scan_text'])[:head]
        best, best_j = 0, None
        for j in range(cursor, min(len(lines), cursor + window)):
            s = fuzz.partial_ratio(want, lines[j][1][:head + 8])
            if s > best:
                best, best_j = s, j
                if s >= 90:  # the first good hit going forward wins; a later look-alike must not
                    break
        if best_j is not None and best >= min_score:
            verses[key]['page_index'] = lines[best_j][0]
            cursor = best_j  # a later verse may start on the same line
            placed += 1
        else:
            verses[key]['page_index'] = None
            missing.append(key)
    # unplaced verses: tell the reviewer which pages to look between
    prev = None
    for i, key in enumerate(order):
        page = verses[key]['page_index']
        if page is not None:
            prev = page
            continue
        nxt = next((verses[k]['page_index'] for k in order[i + 1:] if verses[k]['page_index'] is not None), None)
        verses[key]['page_hint'] = [prev, nxt]
    return placed, missing

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--xml', required=True); p.add_argument('--draft', required=True); p.add_argument('--out', required=True)
    a = p.parse_args()
    draft = json.load(open(a.draft, encoding='utf-8'))
    placed, missing = attach(read_lines(a.xml), draft['verses'])
    draft['page_missing'] = missing
    json.dump(draft, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'{placed} verses got a page number; {len(missing)} did not: {missing[:20]}')
