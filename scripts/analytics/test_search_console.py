import importlib.util
import sys
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name('search_console.py')
SPEC = importlib.util.spec_from_file_location('search_console', MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class SearchConsoleHelperTests(unittest.TestCase):
    def test_site_path_encodes_url_property(self):
        self.assertEqual(
            MODULE.site_path('https://bg.quicktools.jp/', '/searchAnalytics/query'),
            '/sites/https%3A%2F%2Fbg.quicktools.jp%2F/searchAnalytics/query',
        )

    def test_site_path_encodes_domain_property(self):
        self.assertEqual(
            MODULE.site_path('sc-domain:quicktools.jp'),
            '/sites/sc-domain%3Aquicktools.jp',
        )


if __name__ == '__main__':
    unittest.main()
