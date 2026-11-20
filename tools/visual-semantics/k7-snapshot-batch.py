#!/usr/bin/env python3
"""K7 offline private two-pass audit on exact byte-pinned ZIP; no network access."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
from k7_core import run_k7

HERE=Path(__file__).resolve()
REPO=HERE.parents[2]
DEFAULT_PINS=REPO/'examples'/'visual-semantics'/'k7-index-pins.snapshot-20261119.json'
K6_PINS=REPO/'examples'/'visual-semantics'/'k6-pins.snapshot-20261119.json'


def main():
    p=argparse.ArgumentParser(description='K7: 42 index canoniques + seconde passe 84 natifs K6 optionnelle')
    p.add_argument('--zip',required=True,type=Path,help='ZIP kristal-public exactement SHA-pinné')
    p.add_argument('--out',required=True,type=Path,help='Dossier de résultats strictement privé, hors dépôt')
    p.add_argument('--k6-results',type=Path,help='Dossier des résultats privés K6 avec SHA256_CONTENU.txt')
    p.add_argument('--pins',type=Path,default=DEFAULT_PINS)
    a=p.parse_args()
    result=run_k7(a.zip,a.pins,K6_PINS,a.out,REPO,a.k6_results)
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except (ValueError,OSError,KeyError,TypeError,UnicodeError,OverflowError) as e:
        print(json.dumps({'status':'REFUSED','reason':str(e)},ensure_ascii=False),file=sys.stderr)
        sys.exit(2)
