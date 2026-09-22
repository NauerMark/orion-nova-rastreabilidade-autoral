"""Positive and adversarial tests; mutations remain in temporary copies."""
import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import verificar
import construir


class PassportTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((verificar.ROOT/'passaporte.json').read_text())
    def test_valid_data(self): self.assertEqual(verificar.validate(self.data),[])
    def test_unknown_source(self):
        self.data['claims'][0]['sources']=['S999'];self.assertTrue(verificar.validate(self.data))
    def test_unattributed_claim(self):
        self.data['claims'][0]['sources']=[];self.assertTrue(verificar.validate(self.data))
    def test_duplicate_id(self):
        self.data['claims'][0]['id']='S01';self.assertTrue(verificar.validate(self.data))
    def test_private_source(self):
        self.data['sources'][0]['access']='private';self.assertTrue(verificar.validate(self.data))
    def test_secret_in_url(self):
        self.data['sources'][0]['url']='https://name:password@example.com';self.assertTrue(verificar.validate(self.data))
    def test_bad_date_type(self):
        self.data['timeline'][0]['date_type']='birth_certified';self.assertTrue(verificar.validate(self.data))
    def test_bad_calendar_date(self):
        self.data['timeline'][0]['date']='2025-02-30';self.assertTrue(verificar.validate(self.data))
    def test_unknown_claim_status(self):
        self.data['claims'][0]['status']='consciousness_proven';self.assertTrue(verificar.validate(self.data))
    def test_tampered_hash_format(self):
        self.data['sources'][1]['sha256']='abc...';self.assertTrue(verificar.validate(self.data))
    def test_html_escaping(self):
        self.data['claims'][0]['statement']='<script>alert(1)</script>'
        page=construir.render(self.data)['index.html']
        self.assertNotIn('<script>',page);self.assertIn('&lt;script&gt;',page)
    def test_original_files(self):self.assertEqual(verificar.validate_files(),[])
    def test_modified_bytes_detected_without_touching_originals(self):
        with tempfile.TemporaryDirectory(prefix='passport-test-') as folder:
            target=Path(folder)
            for name in construir.FILES+['MANIFEST.sha256.json']:
                shutil.copy2(verificar.ROOT/name,target/name)
            with (target/'README.md').open('a') as f:f.write('\nAlteração de teste.\n')
            self.assertTrue(any('README.md' in e for e in verificar.validate_files(target)))


if __name__=='__main__':unittest.main()
