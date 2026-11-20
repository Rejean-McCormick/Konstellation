"""K7 fail-closed tests. Python standard library; no network or fixtures from real source."""
from __future__ import annotations
import hashlib
import io
import json
from pathlib import Path
import stat
import sys
import tempfile
import unittest
import zipfile

REPO=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(REPO/'tools'/'visual-semantics'))
import k7_core as k


def fake_index(path='canon/domain/a.json',commitment='compute-json-jcs'):
    return {'format':'kristal.authoring-state-index/2.0.0','canonical_artifacts':[
      {'artifact_id':'urn:kristal:foo:1','path':path,
       'logical_contract':{'id':'foo.reference','version':'1.0'},
       'commitment':{'mode':commitment,'profile':'kristal.logical/jcs-sha256-v1'}}]}


def zip_with(data, include=True):
    b=io.BytesIO()
    with zipfile.ZipFile(b,'w') as z:
        z.writestr('kristals/foo/canon/state.index.json',json.dumps(fake_index()).encode())
        if include:z.writestr('kristals/foo/canon/domain/a.json',json.dumps(data).encode())
    b.seek(0)
    return zipfile.ZipFile(b)


class K7Tests(unittest.TestCase):
    def test_baseline_pins_consistent(self):
        pins=json.loads((REPO/'examples/visual-semantics/k7-index-pins.snapshot-20261119.json').read_text())
        k6=json.loads((REPO/'examples/visual-semantics/k6-pins.snapshot-20261119.json').read_text())
        self.assertTrue(k.validate_pins(pins,k6))
        self.assertEqual(len(pins['indexes']),42)

    def test_duplicate_index_refused(self):
        pins=json.loads((REPO/'examples/visual-semantics/k7-index-pins.snapshot-20261119.json').read_text())
        k6=json.loads((REPO/'examples/visual-semantics/k6-pins.snapshot-20261119.json').read_text())
        pins['indexes'][1]['slug']=pins['indexes'][0]['slug']
        with self.assertRaisesRegex(ValueError,'BAD_INDEX_PIN'):
            k.validate_pins(pins,k6)

    def test_wrong_snapshot_rejected(self):
        pins=json.loads((REPO/'examples/visual-semantics/k7-index-pins.snapshot-20261119.json').read_text())
        k6=json.loads((REPO/'examples/visual-semantics/k6-pins.snapshot-20261119.json').read_text())
        pins['snapshot']['sha256']='sha256:'+'a'*64
        with self.assertRaisesRegex(ValueError,'K6_K7_SNAPSHOT_DISAGREEMENT'):
            k.validate_pins(pins,k6)

    def test_paths_reject_traversal_and_external(self):
        for path in ['../canon/domain/a.json','canon/../a.json','/etc/private.json',
                     'https://bad/a.json','canon\\domain\\a.json','knowledge-base/file.json',
                     'C:/secret.json','canon/domain/x.csv']:
            self.assertFalse(k.safe_member(path,'foo'),path)
        self.assertTrue(k.safe_member('canon/domain/v11/graph.json','foo'))
        self.assertTrue(k.safe_member('knowledge-base/corpus/a.json','foo'))

    def test_index_duplicate_id_or_path_rejected(self):
        doc=fake_index()
        doc['canonical_artifacts'].append(dict(doc['canonical_artifacts'][0]))
        with self.assertRaisesRegex(ValueError,'DUPLICATE_OR_BAD_ARTIFACT_ID'):
            k.validate_index(doc,'foo')
        doc['canonical_artifacts'][1]['artifact_id']='urn:kristal:foo:2'
        with self.assertRaisesRegex(ValueError,'DUPLICATE_OR_UNSAFE_ARTIFACT_PATH'):
            k.validate_index(doc,'foo')

    def test_index_invalid_commitment_rejected(self):
        doc=fake_index()
        doc['canonical_artifacts'][0]['commitment']['mode']='self-declared-approval'
        with self.assertRaisesRegex(ValueError,'UNEXPECTED_COMMITMENT_MODE'):
            k.validate_index(doc,'foo')

    def test_audit_present_technical_metadata_only(self):
        z=zip_with({'portable_contract':'v6','content_hash':'secret','assertion_count':400,'private_value':'NEVER_COPY'})
        pin={'slug':'foo','indexSha256':k.sha256(json.dumps(fake_index()).encode())}
        audit=k.audit_index(z,pin)
        self.assertEqual(audit['canonicalArtifactCount'],1)
        row=audit['canonicalArtifacts'][0]
        self.assertEqual(row['profile']['surface'],'STATE_REFERENCE_ONLY')
        self.assertNotIn('NEVER_COPY',json.dumps(audit))
        self.assertTrue(audit['notPolicyFiltered'])
        self.assertTrue(audit['notApproved'])

    def test_audit_missing_member_marks_blocker(self):
        z=zip_with({},include=False)
        pin={'slug':'foo','indexSha256':k.sha256(json.dumps(fake_index()).encode())}
        audit=k.audit_index(z,pin)
        self.assertEqual(audit['missingCanonicalArtifacts'],1)
        self.assertEqual(audit['status'],'SOURCE_GAPS_REVIEW_REQUIRED')
        self.assertIn('RESOLVE_ABSENT_DECLARED_CANONICAL_BYTES',audit['canonicalArtifacts'][0]['reviewTasks'])

    def test_audit_hash_mismatch_refused(self):
        z=zip_with({})
        with self.assertRaisesRegex(ValueError,'INDEX_BYTE_SHA_MISMATCH'):
            k.audit_index(z,{'slug':'foo','indexSha256':'sha256:'+'0'*64})

    def test_ordinal_does_not_gain_metric_distance(self):
        candidate={'format':'konstellation.k6-review-queue/0.1','slug':'foo',
                   'status':'PASS_2_REVIEW_REQUIRED_NOT_APPROVED','sourceSha256':'sha256:'+'a'*64,
                   'candidateRelations':[{'relationId':'label_not_qualified','assertionCount':4,
                     'candidateGroups':['ORDINAL_NOT_SCALAR']} ]}
        refined=k.review_native_k6(candidate)
        self.assertEqual(refined['recommendations'][0]['improvements'],['KEEP_ORDINAL_AS_ORDER_NOT_DISTANCE_OR_SIZE'])
        self.assertEqual(refined['approvedRules'],[])

    def test_unsupported_shape_refused(self):
        candidate={'format':'konstellation.k6-review-queue/0.1','slug':'foo',
                   'status':'PASS_2_REVIEW_REQUIRED_NOT_APPROVED','sourceSha256':'sha256:'+'a'*64,
                   'candidateRelations':[{'relationId':'a','assertionCount':1,
                     'candidateGroups':['APPROVED_CUS_OF_LABEL']} ]}
        with self.assertRaisesRegex(ValueError,'K6_CANDIDATE_INVALID'):
            k.review_native_k6(candidate)

    def test_svg_escapes_text_and_does_not_claim_approved(self):
        svg=k.svg_bars('foo','<script>alert(1)</script>',[('bad <payload>',5)],'PRIVATE')
        self.assertNotIn('<script>',svg)
        self.assertIn('&lt;script&gt;',svg)
        self.assertIn('NON APPROUVÉ',svg)

    def test_output_rejects_repo_overlap(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            repo=root/'repo';repo.mkdir()
            with self.assertRaisesRegex(ValueError,'OUTPUT_OVERLAPS_SOURCE_OR_REPO'):
                k.ensure_private_output(repo/'result',[repo])
            out=k.ensure_private_output(root/'results',[repo])
            self.assertEqual(out,root/'results')

    def test_immutable_write_prevents_modified_replay(self):
        with tempfile.TemporaryDirectory() as td:
            f=Path(td)/'result.json'
            self.assertTrue(k.write_immutable(f,b'one'))
            self.assertFalse(k.write_immutable(f,b'one'))
            with self.assertRaisesRegex(ValueError,'IMMUTABLE_OUTPUT_COLLISION'):
                k.write_immutable(f,b'two')

    @unittest.skipUnless(hasattr(Path,'symlink_to'),'symlink unsupported')
    def test_output_redirected_link_refused(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);(root/'outside').mkdir();(root/'inside').mkdir()
            try:(root/'inside'/'fake').symlink_to(root/'outside',target_is_directory=True)
            except (OSError,NotImplementedError):self.skipTest('Symlink privilege unavailable')
            with self.assertRaisesRegex(ValueError,'OUTPUT_PARENT_REDIRECT_REFUSED'):
                k.write_immutable(root/'inside'/'fake'/'report.json',b'data')

if __name__=='__main__':unittest.main()
