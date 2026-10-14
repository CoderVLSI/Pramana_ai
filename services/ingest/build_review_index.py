"""Build one private FTS index from verified draft inventories, without approving OCR."""
import argparse
import hashlib
import json
import os
import pathlib
import sqlite3
import time
import unicodedata
from search_drafts import catalog, query_terms, read_db
from repair_ocr import script_metrics


def build(root, output):
    root = pathlib.Path(root).resolve()
    output = pathlib.Path(output).resolve()
    if not output.is_relative_to(root):
        raise ValueError('Review index must remain inside the ignored private directory')
    inventory = catalog(root)
    if inventory['rejected']:
        raise ValueError('Source inventory contains rejected manifests; resolve them before rebuilding')
    temporary = output.with_suffix('.building.sqlite')
    temporary.unlink(missing_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    con = sqlite3.connect(temporary)
    excluded = 0
    try:
        con.executescript('''
          create table sources(source_id text primary key, metadata text not null);
          create table pages(id integer primary key, source_id text not null references sources(source_id), scan_page integer not null,
            text text not null, text_sha256 text not null, engine text not null, unique(source_id,scan_page));
          create virtual table search using fts5(text, content='pages', content_rowid='id',
            tokenize="unicode61 remove_diacritics 0 categories 'L* M* N*'");
          create table state(key text primary key,value text not null);
        ''')
        for source in inventory['sources']:
            folder = root / source['source_id']
            con.execute('insert into sources values (?,?)', (source['source_id'], json.dumps(source)))
            repaired = {}
            manifest_file = folder / 'repair' / 'repair-manifest.json'
            if manifest_file.exists():
                if not manifest_file.resolve().is_relative_to(root):
                    raise ValueError('Escaped repair manifest')
                records = json.loads(manifest_file.read_text()).get('pages', {})
                repair_db = folder / 'repair' / 'repair.sqlite'
                if not repair_db.resolve().is_relative_to(root):
                    raise ValueError('Escaped repair database')
                with read_db(repair_db) as repair:
                    for page, text in repair.execute('select scan_page,text from pages'):
                        if hashlib.sha256(text.encode()).hexdigest() != records.get(str(page), {}).get('text_sha256'):
                            raise ValueError('Repair checksum mismatch; index was not replaced')
                        repaired[int(page)] = text
                if set(map(int, records)) != set(repaired):
                    raise ValueError('Repair inventory/database mismatch')
            with read_db(folder / 'draft.sqlite') as source_db:
                for page, text in source_db.execute('select scan_page,text from pages'):
                    page = int(page)
                    engine = 'local_repair' if page in repaired else 'archive_ocr'
                    text = repaired.get(page, text)
                    if not script_metrics(text)['script_smoke_pass']:
                        excluded += 1
                        continue
                    digest = hashlib.sha256(text.encode()).hexdigest()
                    con.execute('insert into pages(source_id,scan_page,text,text_sha256,engine) values(?,?,?,?,?)',
                                (source['source_id'], page, text, digest, engine))
            con.commit()
        con.execute("insert into search(search) values('rebuild')")
        con.execute("insert into search(search) values('optimize')")
        count = con.execute('select count(*) from pages').fetchone()[0]
        report = {'schema_version': 1, 'status': 'private_unreviewed_index', 'source_assets': len(inventory['sources']),
                  'scan_pages': inventory['draft_scan_pages'], 'searchable_pages': count, 'excluded_pages': excluded,
                  'approved_passages': 0, 'build_ms': round((time.monotonic()-started)*1000)}
        con.execute('insert into state values(?,?)', ('report', json.dumps(report)))
        con.commit()
        if con.execute('pragma integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Review index integrity check failed')
        con.close()
        os.chmod(temporary, 0o600)
        temporary.replace(output)
        return report
    except BaseException:
        con.close()
        temporary.unlink(missing_ok=True)
        raise


def search(index, query, source_ids=None, limit=5):
    if not isinstance(limit, int) or not 1 <= limit <= 10:
        raise ValueError('Result limit must be 1–10')
    started = time.monotonic()
    terms = query_terms(query)
    match = ' OR '.join('"' + term.replace('"', '""') + '"' for term in terms)
    with read_db(pathlib.Path(index)) as con:
        sources = {sid: json.loads(metadata) for sid, metadata in con.execute('select source_id,metadata from sources')}
        if source_ids is not None and (not source_ids or not set(source_ids) <= set(sources)):
            raise ValueError('Unknown or empty source scope')
        scope = '' if source_ids is None else ' and p.source_id in (' + ','.join('?' for _ in source_ids) + ')'
        rows = con.execute('select p.source_id,p.scan_page,p.text,p.text_sha256,p.engine,bm25(search) from search '
                           'join pages p on p.id=search.rowid where search match ?' + scope +
                           ' order by bm25(search),p.source_id,p.scan_page limit ?',
                           [match, *(source_ids or []), limit]).fetchall()
    hits = []
    for sid, page, text, digest, engine, rank in rows:
        if hashlib.sha256(text.encode()).hexdigest() != digest:
            raise ValueError('Stored page integrity check failed')
        lower = unicodedata.normalize('NFC', text).lower()
        locations = [lower.find(t) for t in terms if t in lower]
        start = max(0, min(locations, default=0) - 100)
        hits.append({'source_id': sid, 'scan_page': page, 'source_url': sources[sid]['source_url'],
                     'asset_name': sources[sid]['asset_name'], 'excerpt': text[start:start+1200],
                     'page_text_sha256': digest, 'ocr_engine': engine, 'review_status': 'unreviewed',
                     'printed_page': None, 'verse_reference': None})
    return {'status': 'private_review_evidence', 'query': query, 'hits': hits, 'approved_passages': 0,
            'elapsed_ms': round((time.monotonic()-started)*1000, 2)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--query')
    parser.add_argument('--source', action='append')
    args = parser.parse_args()
    result = search(args.output, args.query, args.source) if args.query else build(args.root, args.output)
    print(json.dumps(result, ensure_ascii=False, indent=2))
