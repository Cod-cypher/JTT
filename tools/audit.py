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
# Reviewed uses that are allowed: they describe a vendor's product or say Jade does NOT do escrow.
REVIEWED = ['title and escrow file', 'title and escrow services', 'escrow or settlement agent', 'Escrow, disbursement and the closing table are yours', 'no access to escrow accounting',
            # Title and description of the escrow explainer, shown wherever the article is listed
            'Real Estate Title and Escrow: What Each Does in a Closing',
            'Title and escrow are named together but do different jobs.']
# Pages whose topic is title vs escrow; reviewed by hand: they explain escrow but say Jade does not offer it.
ESCROW_EXPLAINERS = ['/resources/real-estate-title-and-escrow/']
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
    reviewed_text = text
    for r in REVIEWED:
        reviewed_text = reviewed_text.replace(r, '')
    for pat in FORBIDDEN:
        if pat == r'\bescrow\b' and url in ESCROW_EXPLAINERS:
            continue
        for m in re.finditer(pat, reviewed_text, re.I):
            problems.append(f'{url}: forbidden term "{m.group(0)}"')

# Launch blockers recorded in source front matter
blockers = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('_site', 'vendor', '.git', 'node_modules', 'tools')]
    for f in files:
        if f.endswith(('.md', '.html')):
            src = open(os.path.join(root, f), encoding='utf-8', errors='replace').read()
            head = src.split('---', 2)[1] if src.startswith('---') else ''
            if 'launch_date_pending: true' in head:
                blockers.append(f'{os.path.join(root, f)}: set the real publish date in the filename, re-check sources, remove the flag')
            if 'legal_review_pending: true' in head:
                blockers.append(f'{os.path.join(root, f)}: Ali to confirm the text; then remove the flag, noindex and sitemap: false')

print(f'{len(pages)} pages checked\n')
print('PROBLEMS' if problems else 'PROBLEMS: none')
for p in problems: print('  ' + p)
print(f'\nLAUNCH BLOCKERS ({len(blockers)})')
for b in blockers: print('  ' + b)
print(f'\nPLACEHOLDERS ({len(placeholders)})')
for p in placeholders: print('  ' + p)
