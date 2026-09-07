"""Offline checks for the Admin API helper's write safeguards."""
import contextlib
import io
import json
import unittest
from unittest.mock import patch

import ga4


class AdminHelperTests(unittest.TestCase):
    def run_command(self, arguments, existing=None):
        output = io.StringIO()
        with patch('sys.argv', ['ga4.py', *arguments]), \
             patch.object(ga4.Credentials, 'from_authorized_user_file'), \
             patch.object(ga4, 'AuthorizedSession'), \
             patch.object(ga4, 'list_all', return_value=existing or []), \
             patch.object(ga4, 'request', return_value={'name': 'created'}) as request, \
             contextlib.redirect_stdout(output), contextlib.redirect_stderr(io.StringIO()):
            ga4.main()
            return json.loads(output.getvalue()), request.call_args_list

    def test_preview_does_not_write(self):
        result, calls = self.run_command(['--profile', 'edit', 'create-dimension', '--property', '489868388', '--parameter', 'purpose', '--display-name', 'Survey purpose'])
        self.assertEqual(result['action'], 'preview_create')
        self.assertEqual(calls, [])

    def test_existing_definition_is_reused(self):
        result, calls = self.run_command(['--profile', 'edit', 'create-dimension', '--property', '489868388', '--parameter', 'purpose', '--display-name', 'Survey purpose', '--apply'], [{'parameterName': 'purpose', 'scope': 'EVENT'}])
        self.assertEqual(result['action'], 'already_exists')
        self.assertEqual(calls, [])

    def test_read_profile_cannot_create(self):
        with self.assertRaises(SystemExit):
            self.run_command(['create-dimension', '--property', '489868388', '--parameter', 'purpose', '--display-name', 'Survey purpose', '--apply'])

    def test_explicit_edit_apply_creates_event_dimension(self):
        _, calls = self.run_command(['--profile', 'edit', 'create-dimension', '--property', '489868388', '--parameter', 'purpose', '--display-name', 'Survey purpose', '--apply'])
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args[1:3], ('POST', 'properties/489868388/customDimensions'))
        self.assertEqual(calls[0].kwargs['json']['scope'], 'EVENT')

    def test_measurement_id_is_rejected(self):
        with self.assertRaises(SystemExit):
            self.run_command(['definitions', '--property', 'G-YT0ZDBKL81'])


if __name__ == '__main__':
    unittest.main()
