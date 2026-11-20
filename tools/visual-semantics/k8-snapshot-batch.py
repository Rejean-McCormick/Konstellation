#!/usr/bin/env python3
"""Private K8 review generation, exact K6/K7/source snapshots only."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
from k8_core import run_batch

HERE=Path(__file__).resolve()
REPO=HERE.parents[2]
PINS=REPO/'examples'/'visual-semantics'/'k8-input-pins.snapshot-20261119.json'
K6=REPO/'examples'/'visual-semantics'/'k6-pins.snapshot-20261119.json'
K7=REPO/'examples'/'visual-semantics'/'k7-index-pins.snapshot-20261119.json'

def main():
    p=argparse.ArgumentParser(description='K8: dossiers témoins + avant/après privés, aucune qualification automatique')
    p.add_argument('--zip',required=True,type=Path,help='kristal-public_Code_snapshot.zip épinglé')
    p.add_argument('--k6-results',required=True,type=Path,help='archive originale des résultats K6')
    p.add_argument('--k7-results',required=True,type=Path,help='archive originale des résultats K7')
    p.add_argument('--out',required=True,type=Path,help='dossier privé hors dépôt et sources')
    a=p.parse_args()
    print(json.dumps(run_batch(a.zip,a.k6_results,a.k7_results,PINS,K6,K7,a.out,REPO),indent=2,ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except (ValueError,OSError,KeyError,TypeError,OverflowError,UnicodeError,RuntimeError) as e:
        print(json.dumps({'status':'REFUSED','reason':str(e)},ensure_ascii=False),file=sys.stderr)
        sys.exit(2)
