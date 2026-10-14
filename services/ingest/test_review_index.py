import hashlib
import json
import pathlib
import sqlite3
import tempfile
import unittest
from build_review_index import build, search


class ReviewIndexTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temporary.name)
        self.output = self.root / 'unified.sqlite'

    def tearDown(self):
        self.temporary.cleanup()

    def source(self, identifier, rows):
        folder = self.root / identifier
        folder.mkdir()
        (folder / 'draft-manifest.json').write_text(json.dumps({'ocr_sha256': 'a'*64}))
        with sqlite3.connect(folder / 'draft.sqlite') as con:
            con.execute('create virtual table pages using fts5(scan_page UNINDEXED,text)')
            con.execute('create table index_state(key text,value text)')
            con.execute('insert into index_state values(?,?)', ('ocr_sha256', 'a'*64))
            con.executemany('insert into pages values(?,?)', rows)
        return folder

    def repair(self, folder, text, digest=None):
        directory = folder / 'repair'
        directory.mkdir()
        (directory / 'repair-manifest.json').write_text(json.dumps({'pages': {'1': {
            'text_sha256': digest or hashlib.sha256(text.encode()).hexdigest()}}}))
        with sqlite3.connect(directory / 'repair.sqlite') as con:
            con.execute('create table pages(scan_page integer,text text)')
            con.execute('insert into pages values(1,?)', (text,))

    def test_scope_combining_marks_and_wrong_script_exclusion(self):
        self.source('volume-one', [(1, 'धर्म भक्ति सत्य ज्ञान प्रकाश'), (2, 'unusable wrong script page')])
        self.source('volume-two', [(1, 'धर्म भक्ति सत्य ज्ञान प्रकाश')])
        report = build(self.root, self.output)
        self.assertEqual(report['searchable_pages'], 2)
        self.assertEqual(report['excluded_pages'], 1)
        result = search(self.output, 'भक्ति', ['volume-two'])
        self.assertEqual([h['source_id'] for h in result['hits']], ['volume-two'])
        self.assertIsNone(result['hits'][0]['verse_reference'])
        self.assertEqual(result['approved_passages'], 0)
        with self.assertRaises(ValueError): search(self.output, 'धर्म', ['unknown-volume'])

    def test_repaired_pages_override_archive_text(self):
        folder = self.source('volume-one', [(1, 'धर्म कर्म ज्ञान प्रकाश सत्य')])
        self.repair(folder, 'भक्ति राम ध्यान प्रकाश सत्य')
        build(self.root, self.output)
        self.assertEqual(search(self.output, 'कर्म')['hits'], [])
        hit = search(self.output, 'भक्ति')['hits'][0]
        self.assertEqual(hit['ocr_engine'], 'local_repair')

    def test_failed_rebuild_preserves_prior_index(self):
        folder = self.source('volume-one', [(1, 'धर्म कर्म ज्ञान प्रकाश सत्य')])
        build(self.root, self.output)
        before = self.output.read_bytes()
        self.repair(folder, 'भक्ति राम ध्यान प्रकाश सत्य', 'wrong-checksum')
        with self.assertRaises(ValueError): build(self.root, self.output)
        self.assertEqual(self.output.read_bytes(), before)
        self.assertEqual(len(search(self.output, 'कर्म')['hits']), 1)

    def test_public_output_path_and_invalid_query_rejected(self):
        with self.assertRaises(ValueError): build(self.root, self.root.parent / 'public-index.sqlite')
        self.source('volume-one', [(1, 'धर्म कर्म ज्ञान प्रकाश सत्य')])
        build(self.root, self.output)
        with self.assertRaises(ValueError): search(self.output, '""')
        with self.assertRaises(ValueError): search(self.output, 'धर्म', limit=100)


if __name__ == '__main__': unittest.main()
