import hashlib
import json
import pathlib
import sqlite3
import tempfile
import unittest
from search_drafts import catalog, search, query_terms, review_page


class DraftSearchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def source(self, name, pages, asset=None):
        folder = self.root / name
        folder.mkdir(parents=True)
        digest = hashlib.sha256(name.encode()).hexdigest()
        with sqlite3.connect(folder / 'draft.sqlite') as c:
            c.execute('CREATE VIRTUAL TABLE pages USING fts5(scan_page UNINDEXED,text,tokenize="unicode61 remove_diacritics 0")')
            c.executemany('INSERT INTO pages VALUES (?,?)', pages)
            c.execute('CREATE TABLE index_state(key TEXT,value TEXT)')
            c.execute('INSERT INTO index_state VALUES (?,?)', ('ocr_sha256', digest))
        (folder / 'draft-manifest.json').write_text(json.dumps({'ocr_sha256': digest, 'asset_name': asset}))
        return folder

    def test_federated_scoped_results_preserve_asset_identity_and_never_claim_verses(self):
        self.source('epic/asset-one', [(1, 'राम धर्म मोक्ष भक्ति भगवान विष्णु')], 'Volume 1_djvu.xml')
        self.source('purana', [(1, 'विष्णु धर्म भक्ति भगवान परमात्मा')])
        results = search('vishnu dharma', self.root)
        self.assertEqual(results['searched_sources'], 2)
        self.assertEqual(len(results['hits']), 2)
        self.assertEqual(results['approved_passages'], 0)
        epic = next(h for h in results['hits'] if h['asset_name'])
        self.assertIsNone(epic['image_url'])  # Generic page URL would identify wrong volume.
        self.assertIn('Volume%201_djvu.xml', epic['asset_download_url'])
        self.assertIsNone(epic['verse_reference'])
        self.assertEqual(epic['review_status'], 'unreviewed')
        scoped = search('dharma', self.root, source_ids=['purana'])
        self.assertEqual([h['source_id'] for h in scoped['hits']], ['purana'])
        with self.assertRaises(ValueError):
            search('dharma', self.root, source_ids=['../outside'])

    def test_repaired_text_supersedes_original_and_requires_checksum(self):
        folder = self.source('purana', [(1, 'राम भक्ति धर्म भगवान मोक्ष')])
        repair = folder / 'repair'
        repair.mkdir()
        text = 'शिव धर्म भगवान भक्ति मुक्ति परमात्मा'
        with sqlite3.connect(repair / 'repair.sqlite') as c:
            c.execute('CREATE VIRTUAL TABLE pages USING fts5(scan_page UNINDEXED,text)')
            c.execute('INSERT INTO pages VALUES (?,?)', (1, text))
        (repair / 'repair-manifest.json').write_text(json.dumps({'pages': {'1': {'text_sha256': hashlib.sha256(text.encode()).hexdigest()}}}))
        self.assertEqual(search('rama', self.root)['hits'], [])
        hit = search('shiva', self.root)['hits'][0]
        self.assertEqual(hit['ocr_engine'], 'local_repair')
        (repair / 'repair-manifest.json').write_text(json.dumps({'pages': {'1': {'text_sha256': 'tampered'}}}))
        result = search('shiva', self.root)
        self.assertEqual(result['hits'], [])
        self.assertTrue(result['errors'])

    def test_wrong_script_is_reported_and_not_returned_as_hindi_evidence(self):
        self.source('broken', [(1, 'dharma vishnu bhakti wrong script text')])
        self.assertTrue(catalog(self.root)['sources'][0]['needs_script_repair'])
        self.assertEqual(search('dharma', self.root)['hits'], [])

    def test_manifest_tampering_and_symlink_escape_are_rejected(self):
        folder = self.source('broken', [(1, 'विष्णु धर्म भगवान भक्ति मुक्ति')])
        (folder / 'draft-manifest.json').write_text(json.dumps({'ocr_sha256': 'wrong'}))
        inventory = catalog(self.root)
        self.assertEqual(inventory['sources'], [])
        self.assertTrue(inventory['rejected'])
        with tempfile.TemporaryDirectory() as outside:
            pathlib.Path(outside, 'draft-manifest.json').write_text('{}')
            (self.root / 'outside').symlink_to(outside, target_is_directory=True)
            self.assertEqual(catalog(self.root)['sources'], [])

    def test_review_export_keeps_exact_text_and_empty_mapping(self):
        text = 'विष्णु धर्म भगवान भक्ति मुक्ति परमात्मा'
        self.source('purana', [(1, text)])
        review = review_page('purana', 1, self.root)
        self.assertEqual(review['ocr_text'], text)
        self.assertEqual(review['page_text_sha256'], hashlib.sha256(text.encode()).hexdigest())
        self.assertIsNone(review['citation_mapping']['printed_page'])
        self.assertFalse(any(review['review_checklist'].values()))
        self.assertEqual(review['approved_passages'], 0)
        with self.assertRaises(ValueError):
            review_page('purana', 2, self.root)
        with self.assertRaises(ValueError):
            review_page('../outside', 1, self.root)

    def test_queries_are_bounded_and_sql_operators_are_data(self):
        self.source('purana', [(1, 'विष्णु धर्म भगवान भक्ति मुक्ति')])
        self.assertIn('विष्णु', query_terms('VISHNU'))
        self.assertEqual(search('" OR ( धर्म *', self.root)['hits'][0]['scan_page'], 1)
        for query in ['', '*' , 'x' * 501]:
            with self.assertRaises(ValueError):
                search(query, self.root)


if __name__ == '__main__':
    unittest.main()
