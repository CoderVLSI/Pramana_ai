"""Bounded, resumable private OCR repair. Scan ordinals are not verse citations."""
import argparse
import hashlib
import json
import pathlib
import re
import sqlite3
import subprocess
import urllib.request

from draft_archive import PRIVATE_ROOT, atomic_json, validate_identifier

MAX_PAGES = 10
MAX_IMAGE_BYTES = 15_000_000


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def page_selection(value):
    pages = []
    for piece in value.split(','):
        if not re.fullmatch(r'\d+(?:-\d+)?', piece):
            raise ValueError('Pages must be positive scan ordinals or inclusive ranges')
        bounds = [int(n) for n in piece.split('-')]
        first, last = bounds[0], bounds[-1]
        if first < 1 or last < first or last - first + 1 > MAX_PAGES:
            raise ValueError('Invalid page range or more than ten pages requested')
        pages.extend(range(first, last + 1))
    pages = sorted(set(pages))
    if not pages or len(pages) > MAX_PAGES:
        raise ValueError('Request one to ten pages per bounded batch')
    return pages


def download_limited(url, path, cap, opener=urllib.request.urlopen):
    temp = path.with_suffix(path.suffix + '.part')
    try:
        with opener(url, timeout=45) as response, temp.open('wb') as output:
            expected = response.headers.get('Content-Length')
            if expected and int(expected) > cap:
                raise ValueError('Source exceeds bounded download size')
            count = 0
            while chunk := response.read(1024 * 1024):
                count += len(chunk)
                if count > cap:
                    raise ValueError('Source exceeds bounded download size')
                output.write(chunk)
        if expected and count != int(expected):
            raise ValueError('Truncated source download')
        if not count:
            raise ValueError('Empty source download')
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def script_metrics(text):
    letters = sum(c.isalpha() for c in text)
    devanagari = sum('\u0900' <= c <= '\u097f' for c in text)
    script_letters = sum(c.isalpha() and '\u0900' <= c <= '\u097f' for c in text)
    return {'characters': len(text), 'devanagari_characters': devanagari,
            'devanagari_fraction_of_letters': round(script_letters / max(1, letters), 4),
            'script_smoke_pass': devanagari >= 10 and script_letters / max(1, letters) >= 0.25}


def cached_page(record, image, text, fingerprint):
    return bool(record and record.get('engine_fingerprint') == fingerprint and image.exists()
                and text.exists() and record.get('image_sha256') == sha256(image)
                and record.get('text_sha256') == sha256(text))


def repair(identifier, pages, language='hin+san'):
    validate_identifier(identifier)
    if not pages or len(pages) > MAX_PAGES or any(p < 1 for p in pages):
        raise ValueError('Request one to ten positive scan ordinals')
    languages = language.split('+')
    if not languages or any(l not in ('hin', 'san') for l in languages):
        raise ValueError('Only Hindi/Sanskrit repair is supported')
    source_manifest = PRIVATE_ROOT / identifier / 'draft-manifest.json'
    if source_manifest.exists():
        maximum = json.loads(source_manifest.read_text()).get('scan_pages')
        if maximum and any(p > maximum for p in pages):
            raise ValueError('Requested scan ordinal exceeds the recorded source page count')
    root = PRIVATE_ROOT / identifier / 'repair'
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    tessdata = PRIVATE_ROOT / 'tessdata_fast'
    tessdata.mkdir(parents=True, exist_ok=True, mode=0o700)
    for lang in languages:
        trained = tessdata / (lang + '.traineddata')
        if not trained.exists():
            download_limited('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/' + trained.name,
                             trained, 25_000_000)
    version = subprocess.run(['tesseract', '--version'], capture_output=True, text=True,
                             check=True, timeout=15).stdout.splitlines()[0]
    fingerprint = hashlib.sha256((version + language + ''.join(sha256(tessdata / (l + '.traineddata'))
                                for l in languages) + '|psm3').encode()).hexdigest()
    manifest_path = root / 'repair-manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        'identifier': identifier, 'status': 'private_unreviewed_partial_ocr_repair',
        'publisher_verified': False, 'edition_verified': False, 'coverage_verified': False,
        'rights_verified': False, 'verse_mapping_verified': False, 'approved_passages': 0,
        'language': language, 'pages': {}, 'note': 'Partial scan ordinal OCR only; no approved app integration or external embeddings.'}
    manifest['language'] = language
    with sqlite3.connect(root / 'repair.sqlite') as connection:
        connection.execute('CREATE VIRTUAL TABLE IF NOT EXISTS pages USING fts5(scan_page UNINDEXED, text, tokenize="unicode61 remove_diacritics 0")')
        for ordinal in pages:
            image, text = root / f'{ordinal:05d}.jpg', root / f'{ordinal:05d}.txt'
            record = manifest['pages'].get(str(ordinal))
            if not cached_page(record, image, text, fingerprint):
                url = f'https://archive.org/download/{identifier}/page/n{ordinal - 1}.jpg'
                if not image.exists():
                    download_limited(url, image, MAX_IMAGE_BYTES)
                temporary = root / f'{ordinal:05d}.ocr'
                output = temporary.with_suffix('.ocr.txt')
                try:
                    subprocess.run(['tesseract', str(image), str(temporary), '--tessdata-dir', str(tessdata),
                                    '-l', language, '--psm', '3'], capture_output=True, check=True, timeout=90)
                    content = output.read_text(encoding='utf-8')
                    output.replace(text)
                finally:
                    output.unlink(missing_ok=True)
                record = {'scan_page': ordinal, 'image_url': url, 'image_sha256': sha256(image),
                          'text_sha256': sha256(text), 'engine_fingerprint': fingerprint,
                          'language': language, **script_metrics(content)}
                manifest['pages'][str(ordinal)] = record
            record.update(script_metrics(text.read_text(encoding='utf-8')))
            # Replace only this page; other completed batches are retained.
            connection.execute('DELETE FROM pages WHERE scan_page = ?', (ordinal,))
            connection.execute('INSERT INTO pages VALUES (?,?)', (ordinal, text.read_text(encoding='utf-8')))
            connection.commit()
            atomic_json(manifest_path, manifest)
        manifest['database_integrity'] = connection.execute('PRAGMA integrity_check').fetchone()[0]
        manifest['repaired_scan_pages'] = len(manifest['pages'])
        atomic_json(manifest_path, manifest)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('identifier')
    parser.add_argument('--pages', required=True, help='1-based scan ordinals, e.g. 1-5,20; maximum ten per batch')
    parser.add_argument('--language', default='hin+san')
    args = parser.parse_args()
    try:
        manifest = repair(args.identifier, page_selection(args.pages), args.language)
        print(json.dumps({'identifier': args.identifier, 'status': manifest['status'],
                          'repaired_scan_pages': manifest['repaired_scan_pages'],
                          'script_smoke_pass_pages': [p['scan_page'] for p in manifest['pages'].values() if p['script_smoke_pass']],
                          'approved_passages': 0}))
    except (ValueError, OSError, subprocess.SubprocessError, sqlite3.Error) as error:
        parser.exit(1, 'Private OCR repair failed: ' + type(error).__name__ + '\n')


if __name__ == '__main__':
    main()
