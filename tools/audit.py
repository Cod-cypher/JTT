"""Pre-launch audit of a built site (default: _site).

Checks every page for a title (<=60 chars), description (<=155), exactly one H1,
canonical, valid JSON-LD, and broken internal links; lists every visible placeholder
([LIKE THIS]) still waiting on content, and greps for claims PLAN.md section 2 forbids.

Usage: python tools/audit.py [site_dir]
"""
import html
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
SITE = sys.argv[1] if len(sys.argv) > 1 else '_site'
FORBIDDEN = [r'\bescrow\b', r'E&O|E&amp;O', r'ALTA member', r'\d+\s?% accura', r'accuracy rate', r'certified']

pages, problems, placeholders = {}, [], []
for root, _, files in os.walk(SITE):
    for f in files:
        if f.endswith('.html'):
            path = os.path.join(root, f)
            url = '/' + os.path.relpath(path, SITE).replace('\\', '/')
            url = url[:-len('index.html')] if url.endswith('index.html') else url
            pages[url] = open(path, encoding='utf-8').read()

for url, s in sorted(pages.items()):
    if 'http-equiv="refresh"' in s:
        continue
    t = html.unescape((re.search(r'<title>(.*?)</title>', s, re.S) or [None, ''])[1])
    d = html.unescape((re.search(r'name="description" content="(.*?)"', s) or [None, ''])[1])
    h1 = re.findall(r'<h1[^>]*>', s)
    noindex = 'name="robots" content="noindex"' in s
    if not t or len(t) > 60: problems.append(f'{url}: title {len(t)} chars: {t}')
    if not d or len(d) > 155: problems.append(f'{url}: description {len(d)} chars')
    if len(h1) != 1: problems.append(f'{url}: {len(h1)} H1s')
    if not noindex and 'rel="canonical"' not in s: problems.append(f'{url}: no canonical')
    for blk in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try:
            json.loads(blk)
        except ValueError as e:
            problems.append(f'{url}: invalid JSON-LD ({e})')
    for href in re.findall(r'href="(/[^"#?]*)', s):
        if href.startswith('/assets/') or href.endswith(('.ico', '.png', '.svg', '.xml', '.txt', '.css', '.js')):
            target = os.path.join(SITE, href.lstrip('/').split('?')[0])
            if not os.path.exists(target): problems.append(f'{url}: missing file {href}')
        elif href not in pages and href + '/' not in pages:
            problems.append(f'{url}: broken link {href}')
    body = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', body)
    for ph in sorted(set(re.findall(r'\[[A-Z][A-Z ,:.\'"\-/()]{3,}[^\]]*\]', text))):
        placeholders.append(f'{url}: {ph[:110]}')
    for pat in FORBIDDEN:
        for m in re.finditer(pat, text, re.I):
            problems.append(f'{url}: forbidden term "{m.group(0)}"')

print(f'{len(pages)} pages checked\n')
print('PROBLEMS' if problems else 'PROBLEMS: none')
for p in problems: print('  ' + p)
print(f'\nPLACEHOLDERS ({len(placeholders)})')
for p in placeholders: print('  ' + p)
