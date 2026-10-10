"""Bounded OCR repair reliability checks; no network, trained data or OCR engine."""
import io
import pathlib
import tempfile
import unittest
import repair_ocr as repair


class RepairTests(unittest.TestCase):
    def test_page_ranges_enforce_bound_before_expansion(self):
        self.assertEqual(repair.page_selection('1-3,3,9'), [1, 2, 3, 9])
        for value in ('0', '-1', '3-2', '1-999999999', '1-10,11', '', '../1'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                repair.page_selection(value)

    def test_script_smoke_distinguishes_wrong_script(self):
        self.assertFalse(repair.script_metrics('wrong latin transliteration only')['script_smoke_pass'])
        self.assertTrue(repair.script_metrics('नारद पुराण हिन्दी अनुवाद')['script_smoke_pass'])
        self.assertFalse(repair.script_metrics('')['script_smoke_pass'])

    def test_interrupted_and_oversize_sources_never_promoted(self):
        class Response(io.BytesIO):
            headers = {}
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / 'page.jpg'
            with self.assertRaises(ValueError):
                repair.download_limited('unused', path, 5, lambda *a, **k: Response(b'123456'))
            self.assertFalse(path.exists())
            self.assertFalse(path.with_suffix('.jpg.part').exists())
            class Truncated(Response):
                headers = {'Content-Length': '10'}
            with self.assertRaises(ValueError):
                repair.download_limited('unused', path, 20, lambda *a, **k: Truncated(b'123'))
            self.assertFalse(path.exists())
            path.write_bytes(b'previous good source')
            with self.assertRaises(ValueError):
                repair.download_limited('unused', path, 5, lambda *a, **k: Response(b'123456'))
            self.assertEqual(path.read_bytes(), b'previous good source')

    def test_resume_checks_source_output_and_engine(self):
        with tempfile.TemporaryDirectory() as folder:
            image, text = pathlib.Path(folder) / 'page.jpg', pathlib.Path(folder) / 'page.txt'
            image.write_bytes(b'image')
            text.write_bytes(b'ocr')
            record = {'engine_fingerprint': 'engine', 'image_sha256': repair.sha256(image),
                      'text_sha256': repair.sha256(text)}
            self.assertTrue(repair.cached_page(record, image, text, 'engine'))
            self.assertFalse(repair.cached_page(record, image, text, 'otherengine'))
            text.write_bytes(b'changed')
            self.assertFalse(repair.cached_page(record, image, text, 'engine'))


if __name__ == '__main__':
    unittest.main()
