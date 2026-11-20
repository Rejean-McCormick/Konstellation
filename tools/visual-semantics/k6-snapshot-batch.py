#!/usr/bin/env python3
"""K6 private batch from exact SHA-pinned ZIP without unpacking 700MB.

Python stdlib + Node.js >= 24.15. Raw source is extracted only to a temporary
private directory; all outputs are marked non-policy-filtered and non-public.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from zipfile import ZipFile

HERE = Path(__file__).resolve()
REPO = HERE.parents[2]
SCRIPT = HERE.parent / 'k6-batch.mjs'
SHA = re.compile(r'^sha256:[0-9a-f]{64}$')


def digest(file: Path) -> str:
    h = hashlib.sha256()
    with file.open('rb') as f:
        for block in iter(lambda: f.read(2 * 1024 * 1024), b''):
            h.update(block)
    return 'sha256:' + h.hexdigest()


def find_node(explicit: str | None) -> Path:
    paths = []
    if explicit:
        paths.append(Path(explicit))
    for k in ('ProgramFiles', 'ProgramFiles(x86)'):
        if os.environ.get(k):
            paths.append(Path(os.environ[k]) / 'nodejs' / 'node.exe')
    from shutil import which
    if which('node'):
        paths.append(Path(which('node')))
    for p in paths:
        if not p.is_file():
            continue
        try:
            c = subprocess.run([str(p), '--version'], capture_output=True, text=True, timeout=10)
        except (OSError, subprocess.SubprocessError):
            continue
        m = re.fullmatch(r'v(\d+)\.(\d+)\.(\d+)\s*', c.stdout)
        if c.returncode == 0 and m and tuple(map(int, m.groups())) >= (24, 15, 0):
            return p
    raise ValueError('NODE_24_15_MINIMUM_NOT_FOUND; utiliser C:\\Program Files\\nodejs\\node.exe')


def main() -> int:
    parser = argparse.ArgumentParser(description='K6, deux passes sur un ZIP source SHA-épinglé')
    parser.add_argument('--zip', dest='snapshot', type=Path, required=True)
    parser.add_argument('--pins', type=Path, default=REPO / 'examples' / 'visual-semantics' / 'k6-pins.snapshot-20261119.json')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--node', type=str)
    parser.add_argument('--max', type=int, default=512)
    a = parser.parse_args()
    if not a.snapshot.is_file() or not a.pins.is_file():
        raise ValueError('SOURCE_OR_PINS_NOT_FOUND')
    pins = json.loads(a.pins.read_text('utf8'))
    if pins.get('format') != 'konstellation.k6-source-pins/0.1' or not SHA.fullmatch(pins.get('snapshot', {}).get('sha256','')):
        raise ValueError('INVALID_K6_PINS')
    if digest(a.snapshot) != pins['snapshot']['sha256']:
        raise ValueError('SNAPSHOT_ZIP_SHA256_MISMATCH')
    node = find_node(a.node)
    # Source bytes are never copied to code or distribution folders.
    with tempfile.TemporaryDirectory(prefix='konstellation-k6-native-') as td:
        extracted = Path(td)
        with ZipFile(a.snapshot) as z:
            entries = pins['entries'][:a.max]
            seen = set()
            for e in entries:
                if e.get('profile') != 'native-v6':
                    continue
                name = e.get('path')
                slug = e.get('slug')
                if (not isinstance(name, str) or not isinstance(slug, str) or
                    not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,98}', slug) or
                    not re.fullmatch(r'kristals/' + re.escape(slug) + r'/canon/domain/[A-Za-z0-9_.-]+\.json', name) or
                    '..' in name or name in seen or not SHA.fullmatch(e.get('sha256',''))):
                    raise ValueError('UNSAFE_OR_DUPLICATE_PIN')
                seen.add(name)
                try:
                    info = z.getinfo(name)
                except KeyError:
                    continue  # K6 records SOURCE_NOT_PRESENT, does not fabricate content
                if info.is_dir() or info.file_size > 12*1024*1024 or info.file_size < 2:
                    raise ValueError('ZIP_MEMBER_SIZE_REFUSED')
                if ((info.external_attr >> 16) & 0o170000) == 0o120000:
                    raise ValueError('ZIP_SYMLINK_REFUSED')
                content = z.read(info)
                if 'sha256:' + hashlib.sha256(content).hexdigest() != e['sha256']:
                    raise ValueError('NATIVE_MEMBER_SHA256_MISMATCH: ' + name)
                dest = extracted.joinpath(*name.split('/'))
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(content)
        result = subprocess.run([str(node), str(SCRIPT), '--collection-root',str(extracted),
            '--pins',str(a.pins), '--out',str(a.out), '--max',str(a.max)],
            check=False, timeout=300)
        return result.returncode

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        print(json.dumps({'status':'REFUSED','reason':str(exc)},ensure_ascii=False),file=sys.stderr)
        sys.exit(2)
