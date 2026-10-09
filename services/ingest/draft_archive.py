"""Private page-aware OCR retrieval for source review; never an approved app corpus."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import sqlite3
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

PRIVATE_ROOT = pathlib.Path(__file__).parent / 'private'


def validate_identifier(identifier):
    # Reject dot directories, separators, escapes and Unicode lookalikes.
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,254}', identifier):
        raise ValueError('Invalid archive identifier')
    return identifier


def atomic_json(path, value):
    fd, name = tempfile.mkstemp(dir=path.parent, prefix=path.name + '.', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            json.dump(value, output, ensure_ascii=False, indent=2)
        os.replace(name, path)
    finally:
        pathlib.Path(name).unlink(missing_ok=True)


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as source:
        while chunk := source.read(1024 * 1024):
            result.update(chunk)
    return result.hexdigest()


def download(url, destination, expected_size=None, expected_sha1=None, opener=urllib.request.urlopen):
    """A failed or truncated request never becomes a reusable source file."""
    fd, name = tempfile.mkstemp(dir=destination.parent, prefix='ocr.', suffix='.part')
    try:
        size, sha1 = 0, hashlib.sha1()
        with os.fdopen(fd, 'wb') as output, opener(url, timeout=60) as response:
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                sha1.update(chunk)
                output.write(chunk)
        if expected_size is not None and size != int(expected_size):
            raise ValueError('Downloaded OCR size does not match archive metadata')
        if expected_sha1 and sha1.hexdigest() != expected_sha1.lower():
            raise ValueError('Downloaded OCR checksum does not match archive metadata')
        # Parse before promotion; HTTP 200 errors and malformed XML are not OCR.
        for _, element in ET.iterparse(name, events=('end',)):
            element.clear()
        os.replace(name, destination)
    finally:
        pathlib.Path(name).unlink(missing_ok=True)


def build_index(root, identifier):
    source, target = root / 'ocr.xml', root / 'draft.sqlite'
    checksum = digest(source)
    manifest_path = root / 'draft-manifest.json'
    if target.exists() and manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        with sqlite3.connect(target) as connection:
            try:
                stored = connection.execute('SELECT value FROM index_state WHERE key = ?', ('ocr_sha256',)).fetchone()
            except sqlite3.OperationalError:
                stored = None
        if stored and stored[0] == checksum and manifest.get('ocr_sha256') == checksum:
            return manifest
    fd, name = tempfile.mkstemp(dir=root, prefix='draft.', suffix='.sqlite.tmp')
    os.close(fd)
    try:
        with sqlite3.connect(name) as connection:
            connection.execute('CREATE VIRTUAL TABLE pages USING fts5(scan_page UNINDEXED, text, tokenize="unicode61 remove_diacritics 0")')
            count = 0
            for _, element in ET.iterparse(source, events=('end',)):
                if element.tag == 'OBJECT':
                    count += 1
                    lines = [' '.join(word.text or '' for word in line.iter('WORD')) for line in element.iter('LINE')]
                    connection.execute('INSERT INTO pages VALUES (?,?)', (count, '\n'.join(lines)))
                    element.clear()
            if not count:
                raise ValueError('OCR contains no scan pages')
            connection.execute('CREATE TABLE index_state (key TEXT PRIMARY KEY, value TEXT)')
            connection.execute('INSERT INTO index_state VALUES (?,?)', ('ocr_sha256', checksum))
        manifest = {'status': 'private_unreviewed_draft', 'publisher_verified': False,
                    'rights_verified': False, 'verse_mapping_verified': False,
                    'source_url': 'https://archive.org/details/' + identifier,
                    'ocr_sha256': checksum, 'scan_pages': count, 'indexed_approved_passages': 0,
                    'note': 'Scan page ordinal only; not printed page or verse citation. No external embeddings.'}
        os.replace(name, target)
        atomic_json(manifest_path, manifest)
        return manifest
    finally:
        pathlib.Path(name).unlink(missing_ok=True)


def query_index(root, query):
    target = root / 'draft.sqlite'
    if not target.exists():
        raise ValueError('No private index exists; run intake without --query first')
    if not query.strip():
        raise ValueError('Query must not be empty')
    with sqlite3.connect(target.as_uri() + '?mode=ro', uri=True) as connection:
        return [row[0] for row in connection.execute(
            'SELECT scan_page FROM pages WHERE pages MATCH ? ORDER BY rank LIMIT 5',
            ('"' + query.replace('"', '""') + '"',))]


def intake(identifier, root):
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    source = root / 'ocr.xml'
    if not source.exists():
        metadata_path = root / 'metadata.json'
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text())
        else:
            with urllib.request.urlopen('https://archive.org/metadata/' + identifier, timeout=45) as response:
                metadata = json.load(response)
            atomic_json(metadata_path, metadata)
        files = [f for f in metadata.get('files', []) if isinstance(f.get('name'), str) and f['name'].endswith('_djvu.xml')]
        if not files:
            raise ValueError('No page-aware OCR available; local PDF OCR needed')
        candidate = files[0]
        url = 'https://archive.org/download/' + identifier + '/' + urllib.parse.quote(candidate['name'], safe='')
        download(url, source, candidate.get('size'), candidate.get('sha1'))
    return build_index(root, identifier)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('identifier')
    parser.add_argument('--query', help='Search an existing private index offline; does not download or reindex')
    args = parser.parse_args()
    try:
        identifier = validate_identifier(args.identifier)
        root = (PRIVATE_ROOT / identifier).resolve()
        if args.query is not None:
            print('Draft matching scan pages:', query_index(root, args.query))
        else:
            print(json.dumps(intake(identifier, root), indent=2))
    except (ValueError, OSError, sqlite3.Error, ET.ParseError) as error:
        parser.exit(1, 'Private OCR intake failed: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
