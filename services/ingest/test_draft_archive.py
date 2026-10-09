"""Reliability checks for private OCR intake; no network requests."""
import io
import pathlib
import tempfile
import unittest
from unittest.mock import patch
import draft_archive as archive

XML = b'<DOCUMENT><OBJECT><LINE><WORD>Vishnu</WORD><WORD>Purana</WORD></LINE></OBJECT></DOCUMENT>'


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = pathlib.Path(self.directory.name)

    def test_identifiers_cannot_escape_private_directory(self):
        for value in ('', '.', '..', '../book', 'book/a', '%2e%2e', 'book?x', 'विष्णु'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                archive.validate_identifier(value)
        self.assertEqual(archive.validate_identifier('Vishnu-Purana_123'), 'Vishnu-Purana_123')

    def test_interrupted_download_is_not_cached(self):
        class Broken(io.BytesIO):
            def read(self, size=-1):
                if self.tell():
                    raise OSError('interrupted')
                return super().read(8)
        target = self.root / 'ocr.xml'
        with self.assertRaises(OSError):
            archive.download('unused', target, opener=lambda *a, **k: Broken(XML))
        self.assertFalse(target.exists())
        self.assertEqual(list(self.root.iterdir()), [])
        archive.download('unused', target, len(XML), opener=lambda *a, **k: io.BytesIO(XML))
        self.assertEqual(target.read_bytes(), XML)

    def test_truncated_or_wrong_checksum_download_rejected(self):
        for size, checksum in ((len(XML) + 1, None), (len(XML), '0' * 40)):
            with self.assertRaises(ValueError):
                archive.download('unused', self.root / 'ocr.xml', size, checksum,
                                 opener=lambda *a, **k: io.BytesIO(XML))
            self.assertFalse((self.root / 'ocr.xml').exists())

    def test_failed_reindex_preserves_previous_index(self):
        source = self.root / 'ocr.xml'
        source.write_bytes(XML)
        archive.build_index(self.root, 'book')
        previous = (self.root / 'draft.sqlite').read_bytes()
        source.write_bytes(b'<DOCUMENT><OBJECT>')
        with self.assertRaises(archive.ET.ParseError):
            archive.build_index(self.root, 'book')
        self.assertEqual((self.root / 'draft.sqlite').read_bytes(), previous)
        self.assertEqual(archive.query_index(self.root, 'Vishnu'), [1])

    def test_repeated_intake_and_query_reuse_offline_index(self):
        (self.root / 'ocr.xml').write_bytes(XML)
        archive.intake('book', self.root)
        target = self.root / 'draft.sqlite'
        previous = target.stat().st_mtime_ns
        with patch.object(archive.urllib.request, 'urlopen', side_effect=AssertionError('network')), \
             patch.object(archive.ET, 'iterparse', side_effect=AssertionError('reindex')):
            archive.intake('book', self.root)
            self.assertEqual(archive.query_index(self.root, 'Vishnu Purana'), [1])
        self.assertEqual(target.stat().st_mtime_ns, previous)

    def test_query_never_creates_missing_index(self):
        with self.assertRaises(ValueError):
            archive.query_index(self.root, 'Vishnu')
        self.assertEqual(list(self.root.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
