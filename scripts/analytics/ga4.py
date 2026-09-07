"""Local GA4 OAuth and Admin API helper. Credentials never go to stdout."""
import argparse
import json
import sys
from pathlib import Path

from google.auth.transport.requests import AuthorizedSession
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / '.local' / 'ga4'
READ = 'https://www.googleapis.com/auth/analytics.readonly'
EDIT = 'https://www.googleapis.com/auth/analytics.edit'
ADMIN = 'https://analyticsadmin.googleapis.com/v1beta/'


def credential_path(profile):
    return LOCAL / f'{profile}-credentials.json'


def login(args):
    client = json.loads(Path(args.client_json).read_text(encoding='utf-8-sig'))
    if 'installed' not in client:
        raise ValueError('Use an OAuth Desktop app client JSON.')
    scopes = [READ] if args.profile == 'read' else [READ, EDIT]
    flow = InstalledAppFlow.from_client_config(client, scopes=scopes, autogenerate_code_verifier=True)
    credentials = flow.run_local_server(
        host='localhost', bind_addr='127.0.0.1', port=0, timeout_seconds=600,
        open_browser=True, prompt='consent', include_granted_scopes='false',
        authorization_prompt_message='Continue authorization in the browser that just opened.',
        success_message='GA4 authorization completed. You can close this tab and return to Codex.',
    )
    if not credentials.refresh_token:
        raise ValueError('No refresh token returned. Please authorize again.')
    data = json.loads(credentials.to_json())
    data['type'] = 'authorized_user'
    LOCAL.mkdir(parents=True, exist_ok=True)
    destination = credential_path(args.profile)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(data), encoding='utf-8')
    temporary.replace(destination)
    (LOCAL / 'project.json').write_text(json.dumps({'project_id': client['installed'].get('project_id')}), encoding='utf-8')
    print(json.dumps({'authorized': True, 'profile': args.profile}))


def request(session, method, path, **kwargs):
    response = session.request(method, ADMIN + path, timeout=60, **kwargs)
    if not response.ok:
        # Do not print request headers, OAuth response bodies or credentials.
        raise RuntimeError(f'Analytics Admin API returned HTTP {response.status_code}; check API enablement and GA4 property permissions.')
    return response.json()


def list_all(session, path, key):
    items, token = [], None
    while True:
        data = request(session, 'GET', path, params={'pageSize': 200, **({'pageToken': token} if token else {})})
        items.extend(data.get(key, []))
        token = data.get('nextPageToken')
        if not token:
            return items


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['read', 'edit'], default='read')
    sub = parser.add_subparsers(dest='command', required=True)
    auth = sub.add_parser('login')
    auth.add_argument('--client-json', required=True)
    sub.add_parser('accounts')
    definitions = sub.add_parser('definitions')
    definitions.add_argument('--property', required=True)
    create_dimension = sub.add_parser('create-dimension')
    create_dimension.add_argument('--property', required=True)
    create_dimension.add_argument('--parameter', required=True)
    create_dimension.add_argument('--display-name', required=True)
    create_dimension.add_argument('--apply', action='store_true', help='Without this flag, only show the proposed create.')
    create_metric = sub.add_parser('create-metric')
    create_metric.add_argument('--property', required=True)
    create_metric.add_argument('--parameter', required=True)
    create_metric.add_argument('--display-name', required=True)
    create_metric.add_argument('--measurement-unit', default='STANDARD')
    create_metric.add_argument('--apply', action='store_true', help='Without this flag, only show the proposed create.')
    args = parser.parse_args()
    if args.command == 'login':
        login(args)
        return
    if hasattr(args, 'property') and not (args.property.isascii() and args.property.isdigit()):
        parser.error('--property must be the numeric GA4 property ID, not the G- measurement ID.')
    credentials = Credentials.from_authorized_user_file(str(credential_path(args.profile)))
    with AuthorizedSession(credentials) as session:
        if args.command == 'accounts':
            result = list_all(session, 'accountSummaries', 'accountSummaries')
        elif args.command == 'definitions':
            parent = f'properties/{args.property}'
            result = {
                'dimensions': list_all(session, f'{parent}/customDimensions', 'customDimensions'),
                'metrics': list_all(session, f'{parent}/customMetrics', 'customMetrics'),
            }
        elif args.command == 'create-dimension':
            parent = f'properties/{args.property}/customDimensions'
            body = {'parameterName': args.parameter, 'displayName': args.display_name, 'scope': 'EVENT'}
            existing = list_all(session, parent, 'customDimensions')
            matches = [item for item in existing if item.get('parameterName') == args.parameter and item.get('scope') == 'EVENT']
            if matches:
                result = {'action': 'already_exists', 'dimension': matches[0]}
            elif not args.apply:
                result = {'action': 'preview_create', 'property': args.property, 'dimension': body}
            else:
                if args.profile != 'edit':
                    parser.error('Creation requires --profile edit.')
                result = request(session, 'POST', parent, json=body)
        else:
            parent = f'properties/{args.property}/customMetrics'
            body = {
                'parameterName': args.parameter,
                'displayName': args.display_name,
                'measurementUnit': args.measurement_unit,
                'scope': 'EVENT',
            }
            existing = list_all(session, parent, 'customMetrics')
            matches = [item for item in existing if item.get('parameterName') == args.parameter and item.get('scope') == 'EVENT']
            if matches:
                result = {'action': 'already_exists', 'metric': matches[0]}
            elif not args.apply:
                result = {'action': 'preview_create', 'property': args.property, 'metric': body}
            else:
                if args.profile != 'edit':
                    parser.error('Creation requires --profile edit.')
                result = request(session, 'POST', parent, json=body)
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except Exception as error:
        # OAuth exceptions can embed tokens; report only the type, not their body.
        print(f'GA4 operation failed ({type(error).__name__}). Check authentication, enabled APIs and access permissions.', file=sys.stderr)
        sys.exit(1)
