"""Index every page-aware OCR asset in an archive item separately, preserving volumes."""
import argparse, hashlib, json, urllib.parse, urllib.request
from draft_archive import PRIVATE_ROOT, validate_identifier, atomic_json, download, build_index, query_index

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('identifier')
args = parser.parse_args()
identifier = validate_identifier(args.identifier)
root = PRIVATE_ROOT / identifier
root.mkdir(parents=True, exist_ok=True, mode=0o700)
with urllib.request.urlopen('https://archive.org/metadata/' + identifier, timeout=45) as response:
    metadata = json.load(response)
atomic_json(root / 'metadata.json', metadata)
records = []
for asset in metadata.get('files', []):
    name = asset.get('name', '')
    if not name.endswith('_djvu.xml'):
        continue
    if int(asset.get('size', 0)) > 150 * 1024 * 1024:
        records.append({'asset_name': name, 'status': 'skipped_size_limit'})
        continue
    asset_root = root / ('asset-' + hashlib.sha256(name.encode()).hexdigest()[:16])
    asset_root.mkdir(exist_ok=True, mode=0o700)
    source = asset_root / 'ocr.xml'
    if not source.exists():
        url = 'https://archive.org/download/' + identifier + '/' + urllib.parse.quote(name, safe='')
        download(url, source, asset.get('size'), asset.get('sha1'))
    manifest = build_index(asset_root, identifier)
    manifest.update(asset_name=name, asset_identity_verified=False, coverage_verified=False)
    atomic_json(asset_root / 'draft-manifest.json', manifest)
    manifest['query_test_hit_pages'] = query_index(asset_root.resolve(), 'भगवान')
    records.append(manifest)
    atomic_json(root / 'assets-manifest.json', {'status': 'private_unreviewed_draft', 'assets': records})
print(json.dumps({'identifier': identifier, 'assets': records}, ensure_ascii=False, indent=2))
