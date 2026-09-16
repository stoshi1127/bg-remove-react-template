"""Read-only Google Search Console OAuth and reporting helper."""
import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import quote

from google.auth.transport.requests import AuthorizedSession
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parents[2]
GA4_LOCAL = ROOT / '.local' / 'ga4'
LOCAL = ROOT / '.local' / 'gsc'
CREDENTIALS = LOCAL / 'read-credentials.json'
READ = 'https://www.googleapis.com/auth/webmasters.readonly'
BASE = 'https://www.googleapis.com/webmasters/v3'


def existing_google_client_config():
    """Reuse the local Google OAuth desktop client without exposing its secret."""
    source = GA4_LOCAL / 'read-credentials.json'
    data = json.loads(source.read_text(encoding='utf-8'))
    required = ('client_id', 'client_secret', 'token_uri')
    if any(not data.get(key) for key in required):
        raise ValueError('The existing GA4 OAuth desktop client is incomplete.')
    project = {}
    project_path = GA4_LOCAL / 'project.json'
    if project_path.exists():
        project = json.loads(project_path.read_text(encoding='utf-8'))
    return {
        'installed': {
            'client_id': data['client_id'],
            'client_secret': data['client_secret'],
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': data['token_uri'],
            'redirect_uris': ['http://localhost'],
            'project_id': project.get('project_id'),
        }
    }


def login(_args):
    flow = InstalledAppFlow.from_client_config(
        existing_google_client_config(),
        scopes=[READ],
        autogenerate_code_verifier=True,
    )
    credentials = flow.run_local_server(
        host='localhost',
        bind_addr='127.0.0.1',
        port=0,
        timeout_seconds=600,
        open_browser=True,
        prompt='consent',
        include_granted_scopes='false',
        authorization_prompt_message='Continue Search Console authorization in the browser that just opened.',
        success_message='Search Console authorization completed. You can close this tab and return to Codex.',
    )
    if not credentials.refresh_token:
        raise ValueError('No refresh token returned. Please authorize again.')
    data = json.loads(credentials.to_json())
    data['type'] = 'authorized_user'
    LOCAL.mkdir(parents=True, exist_ok=True)
    temporary = CREDENTIALS.with_suffix('.tmp')
    temporary.write_text(json.dumps(data), encoding='utf-8')
    temporary.replace(CREDENTIALS)
    print(json.dumps({'authorized': True, 'scope': READ}))


def api_request(session, method, path, **kwargs):
    response = session.request(method, f'{BASE}{path}', timeout=60, **kwargs)
    if not response.ok:
        status = None
        reasons = []
        try:
            error = response.json().get('error', {})
            status = error.get('status')
            reasons.extend(item.get('reason') for item in error.get('errors', []) if item.get('reason'))
            reasons.extend(item.get('reason') for item in error.get('details', []) if item.get('reason'))
        except (ValueError, AttributeError):
            pass
        detail = ', '.join(filter(None, [status, *reasons])) or 'no public error code'
        raise RuntimeError(
            f'Search Console API returned HTTP {response.status_code} ({detail}); '
            'check API enablement, OAuth authorization and property permissions.'
        )
    return response.json()


def site_path(site_url, suffix=''):
    return f'/sites/{quote(site_url, safe="")}{suffix}'


def search_analytics(session, args, dimensions):
    body = {
        'startDate': args.start_date,
        'endDate': args.end_date,
        'type': 'web',
        'dataState': 'final',
        'dimensions': dimensions,
        'rowLimit': args.limit,
    }
    return api_request(
        session,
        'POST',
        site_path(args.site_url, '/searchAnalytics/query'),
        json=body,
    )


def parse_args():
    default_end = date.today() - timedelta(days=3)
    default_start = default_end - timedelta(days=27)
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('login')
    sub.add_parser('sites')
    for name in ('summary', 'pages', 'queries', 'daily'):
        report = sub.add_parser(name)
        report.add_argument('--site-url', required=True)
        report.add_argument('--start-date', default=default_start.isoformat())
        report.add_argument('--end-date', default=default_end.isoformat())
        report.add_argument('--limit', type=int, default=10 if name in ('pages', 'queries') else 1000)
    sitemaps = sub.add_parser('sitemaps')
    sitemaps.add_argument('--site-url', required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    if args.command == 'login':
        login(args)
        return
    credentials = Credentials.from_authorized_user_file(str(CREDENTIALS), scopes=[READ])
    with AuthorizedSession(credentials) as session:
        if args.command == 'sites':
            result = api_request(session, 'GET', '/sites')
        elif args.command == 'sitemaps':
            result = api_request(session, 'GET', site_path(args.site_url, '/sitemaps'))
        elif args.command == 'summary':
            result = search_analytics(session, args, [])
        elif args.command == 'pages':
            result = search_analytics(session, args, ['page'])
        elif args.command == 'queries':
            result = search_analytics(session, args, ['query'])
        else:
            result = search_analytics(session, args, ['date'])
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except Exception as error:
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
        else:
            print(
                f'Search Console operation failed ({type(error).__name__}). '
                'Check authentication, API enablement and property access.',
                file=sys.stderr,
            )
        sys.exit(1)
