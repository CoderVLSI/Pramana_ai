"""Offline, page-aware search of private OCR drafts. Results are review evidence, not verified verses."""
import argparse
import hashlib
import json
import pathlib
import sqlite3
import time
import unicodedata
import urllib.parse
from draft_archive import PRIVATE_ROOT, atomic_json
from repair_ocr import script_metrics

ALIASES = {
    'vishnu': 'विष्णु', 'shiva': 'शिव', 'durga': 'दुर्गा', 'ganesha': 'गणेश',
    'surya': 'सूर्य', 'skanda': 'स्कन्द', 'krishna': 'कृष्ण', 'rama': 'राम',
    'dharma': 'धर्म', 'karma': 'कर्म', 'bhakti': 'भक्ति', 'moksha': 'मोक्ष',
    'atman': 'आत्मा', 'narada': 'नारद', 'garuda': 'गरुड',
}


def query_terms(query):
    if not isinstance(query, str) or not query.strip() or len(query) > 500:
        raise ValueError('Query must contain 1–500 characters')
    terms = []
    current = ''
    for char in unicodedata.normalize('NFC', query).lower() + ' ':
        if unicodedata.category(char)[0] in 'LMN':
            current += char
        elif current:
            terms.append(current)
            current = ''
    terms = list(dict.fromkeys(terms))[:12]
    if not terms:
        raise ValueError('Query must contain searchable words')
    expanded = list(dict.fromkeys(terms + [ALIASES[t] for t in terms if t in ALIASES]))
    return expanded


def read_db(path):
    connection = sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)
    connection.execute('PRAGMA query_only=ON')
    deadline = time.monotonic() + 3
    connection.set_progress_handler(lambda: time.monotonic() > deadline, 1000)
    return connection


def catalog(root=PRIVATE_ROOT):
    root = pathlib.Path(root).resolve()
    sources, rejected = [], []
    for path in sorted(root.rglob('draft-manifest.json')):
        try:
            if not path.resolve().is_relative_to(root):
                raise ValueError('Source escapes private root')
            manifest = json.loads(path.read_text())
            relative = path.parent.relative_to(root)
            identifier = relative.parts[0]
            db = path.parent / 'draft.sqlite'
            if not db.exists() or not db.resolve().is_relative_to(root):
                raise ValueError('Missing or escaped source database')
            with read_db(db) as con:
                count = con.execute('SELECT count(*) FROM pages').fetchone()[0]
                state = con.execute("SELECT value FROM index_state WHERE key='ocr_sha256'").fetchone()
                if not state or state[0] != manifest.get('ocr_sha256'):
                    raise ValueError('OCR manifest/index checksum mismatch')
                samples = con.execute('SELECT text FROM pages WHERE CAST(scan_page AS INTEGER) IN (1,6,20,100,250,500)').fetchall()
            metric = script_metrics('\n'.join(t[0] for t in samples))
            repair_count = 0
            repair_manifest = path.parent / 'repair' / 'repair-manifest.json'
            repair_db = path.parent / 'repair' / 'repair.sqlite'
            if repair_manifest.exists() and repair_db.exists():
                if not repair_db.resolve().is_relative_to(root) or not repair_manifest.resolve().is_relative_to(root):
                    raise ValueError('Repair escapes private root')
                repairs = json.loads(repair_manifest.read_text()).get('pages', {})
                with read_db(repair_db) as con:
                    for page, text in con.execute('SELECT scan_page,text FROM pages'):
                        record = repairs.get(str(page), {})
                        if hashlib.sha256(text.encode()).hexdigest() == record.get('text_sha256'):
                            repair_count += 1

            sources.append({'source_id': str(relative), 'identifier': identifier,
                            'asset_name': manifest.get('asset_name'), 'scan_pages': count,
                            'ocr_sha256': state[0], 'status': 'private_unreviewed_draft',
                            'source_url': 'https://archive.org/details/' + identifier,
                            'sample_script_metrics': metric,
                            'needs_script_repair': not metric['script_smoke_pass'],
                            'approved_passages': 0, 'repaired_scan_pages': repair_count,
                            'scan_pages_without_local_repair': count - repair_count})
        except (ValueError, OSError, sqlite3.Error, KeyError, TypeError) as error:
            rejected.append({'source_id': str(path.parent.relative_to(root)), 'reason': str(error)})
    return {'sources': sources, 'rejected': rejected, 'approved_passages': 0,
            'draft_scan_pages': sum(s['scan_pages'] for s in sources)}


def search(query, root=PRIVATE_ROOT, source_ids=None, limit=10):
    if not 1 <= limit <= 30:
        raise ValueError('Result limit must be 1–30')
    start = time.monotonic()
    terms = query_terms(query)
    match = ' OR '.join('"' + t.replace('"', '""') + '"' for t in terms)
    root = pathlib.Path(root).resolve()
    inventory = catalog(root)
    valid = {s['source_id'] for s in inventory['sources']}
    if source_ids is not None and (not source_ids or not set(source_ids) <= valid):
        raise ValueError('Unknown or empty source scope')
    hits, errors = [], list(inventory['rejected'])
    for source in inventory['sources']:
        if source_ids is not None and source['source_id'] not in source_ids:
            continue
        folder = root / source['source_id']
        repaired = {}
        repair_manifest = folder / 'repair' / 'repair-manifest.json'
        if repair_manifest.exists():
            try:
                repaired = json.loads(repair_manifest.read_text()).get('pages', {})
            except (ValueError, OSError):
                errors.append({'source_id': source['source_id'], 'reason': 'Invalid repair manifest'})
        seen = set()
        # Repaired pages take precedence; old OCR never replaces a repaired page.
        for db, is_repair in [(folder / 'repair' / 'repair.sqlite', True), (folder / 'draft.sqlite', False)]:
            if not db.exists():
                continue
            if not db.resolve().is_relative_to(root):
                errors.append({'source_id': source['source_id'], 'reason': 'Escaped repair database'})
                continue
            try:
                with read_db(db) as con:
                    rows = con.execute('SELECT scan_page, text FROM pages WHERE pages MATCH ? ORDER BY rank LIMIT 30', (match,)).fetchall()
                for rank, (page, text) in enumerate(rows, 1):
                    page = int(page)
                    if page in seen or (not is_repair and str(page) in repaired):
                        continue
                    if is_repair:
                        record = repaired.get(str(page), {})
                        if hashlib.sha256(text.encode()).hexdigest() != record.get('text_sha256'):
                            errors.append({'source_id': source['source_id'], 'reason': f'Repair checksum mismatch on scan {page}'})
                            continue
                    metrics = script_metrics(text)
                    if not metrics['script_smoke_pass']:
                        continue
                    seen.add(page)
                    lower = unicodedata.normalize('NFC', text).lower()
                    matches = [t for t in terms if t in lower]
                    location = min((lower.find(t) for t in matches), default=0)
                    excerpt = text[max(0, location - 150):max(0, location - 150) + 1200]
                    hits.append({**source, 'scan_page': page, 'excerpt': excerpt,
                                 'page_text_sha256': hashlib.sha256(text.encode()).hexdigest(),
                                 'ocr_engine': 'local_repair' if is_repair else 'archive_ocr',
                                 'matched_terms': matches, 'score': round(len(matches) + 1 / (60 + rank), 6),
                                 'image_url': None if source['asset_name'] else f'https://archive.org/download/{source["identifier"]}/page/n{page-1}.jpg',
                                 'asset_download_url': ('https://archive.org/download/' + source['identifier'] + '/' + urllib.parse.quote(source['asset_name'], safe='')) if source['asset_name'] else None,
                                 'printed_page': None, 'verse_reference': None, 'review_status': 'unreviewed'})
            except (sqlite3.Error, ValueError) as error:
                errors.append({'source_id': source['source_id'], 'reason': str(error)})
    hits.sort(key=lambda h: (-h['score'], h['source_id'], h['scan_page']))
    return {'query': query, 'expanded_terms': terms, 'status': 'private_review_evidence',
            'approved_passages': 0, 'elapsed_ms': round((time.monotonic() - start) * 1000),
            'searched_sources': len(source_ids) if source_ids is not None else len(valid),
            'hits': hits[:limit], 'errors': errors,
            'note': 'Scan ordinals are not printed pages or verse citations. OCR may contain errors. No generated answer or approval.'}


def review_page(source_id, scan_page, root=PRIVATE_ROOT):
    """Export exact OCR with an honest empty citation mapping for human review."""
    root = pathlib.Path(root).resolve()
    inventory = catalog(root)
    source = next((s for s in inventory['sources'] if s['source_id'] == source_id), None)
    if source is None or not isinstance(scan_page, int) or not 1 <= scan_page <= source['scan_pages']:
        raise ValueError('Unknown source or scan ordinal outside the indexed source')
    folder = root / source_id
    db = folder / 'draft.sqlite'
    origin = 'archive_ocr'
    repair_manifest = folder / 'repair' / 'repair-manifest.json'
    record = None
    if repair_manifest.exists():
        record = json.loads(repair_manifest.read_text()).get('pages', {}).get(str(scan_page))
        if record:
            db = folder / 'repair' / 'repair.sqlite'
            origin = 'local_repair'
    if not db.resolve().is_relative_to(root):
        raise ValueError('Page database escapes private root')
    with read_db(db) as con:
        row = con.execute('SELECT text FROM pages WHERE scan_page = ?', (scan_page,)).fetchone()
    if not row:
        raise ValueError('No OCR text for this scan page')
    text = row[0]
    digest = hashlib.sha256(text.encode()).hexdigest()
    if record and digest != record.get('text_sha256'):
        raise ValueError('Repaired page checksum mismatch')
    return {**source, 'scan_page': scan_page, 'ocr_text': text, 'ocr_engine': origin,
            'page_text_sha256': digest, 'page_script_metrics': script_metrics(text),
            'review_status': 'unreviewed', 'approved_passages': 0,
            'citation_mapping': {'volume': None, 'printed_page': None, 'hierarchy': [],
                                 'chapter': None, 'verse_start': None, 'verse_end': None},
            'review_checklist': {'publisher_and_edition': False, 'text_matches_scan': False,
                                 'citation_mapping': False, 'coverage': False, 'usage_record': False},
            'note': 'OCR is review material. Fill citation mapping only by comparison with the printed scan; this export is not an approved ingestion pack.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--query')
    parser.add_argument('--source', action='append', help='Exact source_id; repeat to scope search')
    parser.add_argument('--limit', type=int, default=10)
    parser.add_argument('--catalog', action='store_true')
    parser.add_argument('--page', type=int, help='Export one exact scan page; requires one --source')
    parser.add_argument('--output', type=pathlib.Path, help='Private review JSON output')
    args = parser.parse_args()
    try:
        if not args.catalog and args.query is None and args.page is None:
            raise ValueError('Use --catalog or --query')
        if args.page is not None:
            if not args.source or len(args.source) != 1:
                raise ValueError('--page requires exactly one --source')
            result = review_page(args.source[0], args.page)
        else:
            result = catalog() if args.catalog else search(args.query, source_ids=args.source, limit=args.limit)
        if args.output:
            destination = args.output.resolve()
            if not destination.is_relative_to(PRIVATE_ROOT.resolve()):
                raise ValueError('Review excerpts must stay under the private directory')
            destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            atomic_json(destination, result)
            print(json.dumps({'output': str(destination), 'hits': len(result.get('hits', [])), 'approved_passages': 0}))
        else:
            print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError, sqlite3.Error) as error:
        parser.exit(1, 'Draft review search failed: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
