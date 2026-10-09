"""Private page-aware OCR retrieval for source review; never an approved app corpus."""
import argparse, hashlib, json, pathlib, sqlite3, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('identifier')
parser.add_argument('--query')
args = parser.parse_args()
if not all(c.isalnum() or c in '-_.' for c in args.identifier):
    parser.error('Invalid archive identifier')
root = pathlib.Path(__file__).parent / 'private' / args.identifier
root.mkdir(parents=True, exist_ok=True, mode=0o700)
metadata_url = 'https://archive.org/metadata/' + args.identifier
metadata = json.load(urllib.request.urlopen(metadata_url, timeout=45))
(root / 'metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
files = [f for f in metadata.get('files', []) if f['name'].endswith('_djvu.xml')]
if not files:
    raise SystemExit('No page-aware OCR available; local PDF OCR needed.')
source = root / 'ocr.xml'
if not source.exists():
    url = 'https://archive.org/download/' + args.identifier + '/' + urllib.parse.quote(files[0]['name'])
    with urllib.request.urlopen(url, timeout=60) as response, source.open('wb') as output:
        while chunk := response.read(1024 * 1024): output.write(chunk)
connection = sqlite3.connect(root / 'draft.sqlite')
connection.execute('CREATE VIRTUAL TABLE IF NOT EXISTS pages USING fts5(scan_page UNINDEXED, text, tokenize="unicode61 remove_diacritics 0")')
connection.execute('DELETE FROM pages')
count = 0
for _, element in ET.iterparse(source, events=('end',)):
    if element.tag == 'OBJECT':
        count += 1
        lines = [' '.join(word.text or '' for word in line.iter('WORD')) for line in element.iter('LINE')]
        text = '\n'.join(lines)
        connection.execute('INSERT INTO pages VALUES (?,?)', (count, text))
        element.clear()
connection.commit()
manifest = {'status': 'private_unreviewed_draft', 'publisher_verified': False,
            'rights_verified': False, 'verse_mapping_verified': False,
            'source_url': 'https://archive.org/details/' + args.identifier,
            'ocr_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'scan_pages': count, 'indexed_approved_passages': 0,
            'note': 'Scan page ordinal only; not printed page or verse citation. No external embeddings.'}
(root / 'draft-manifest.json').write_text(json.dumps(manifest, indent=2))
print(json.dumps(manifest, indent=2))
if args.query:
    # Parameterized search. No unreviewed OCR printed to shared logs.
    hits = connection.execute('SELECT scan_page FROM pages WHERE pages MATCH ? ORDER BY rank LIMIT 5', ('"' + args.query.replace('"','""') + '"',)).fetchall()
    print('Draft matching scan pages:', [row[0] for row in hits])
connection.close()
