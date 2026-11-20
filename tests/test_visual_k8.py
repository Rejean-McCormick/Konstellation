"""K8 fail-closed offline checks; source integration is run separately."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
import zipfile

CORE=Path(__file__).resolve().parents[1]/'tools'/'visual-semantics'
sys.path.insert(0,str(CORE))
import k8_core as k8


def tiny(slug='example', predicate='sample.rel', ref='a:1'):
    state={'schema_version':'6.0','assertions':[
        {'assertion_id':ref,'statement':{'subject':{'kind':'referent','id':'node:a'},
         'predicate':predicate,'object':{'kind':'referent','id':'node:b'}},
         'assertion_status':'sourced','evidence_refs':['s:1']} ]}
    raw=json.dumps(state).encode()
    digest=k8.sha(raw)
    p1={'status':'OBSERVATION_ONLY_NOT_POLICY_FILTERED_NOT_APPROVED',
        'source':{'sha256':digest},'assertionCount':1,
        'predicates':[{'relationId':predicate,'assertionCount':1}]}
    p2={'slug':slug,'sourceSha256':digest,'status':'PASS_2_REVIEW_REQUIRED_NOT_APPROVED',
        'candidateRelations':[{'relationId':predicate,'assertionCount':1,
                               'sampleAssertionRefs':[ref],
                               'candidateGroups':['REFERENT_GRAPH_CANDIDATE']}]}
    p7={'slug':slug,'sourceSha256':digest,'status':'PASS_2_REFINED_REVIEW_NOT_APPROVED',
        'approvedRules':[],'recommendations':[{'relationId':predicate,'improvements':['CHECK_GRAPH_DIRECTION_CYCLES_AND_SCOPES']}]}
    return raw,digest,p1,p2,p7

class K8Tests(unittest.TestCase):
    def test_native_witnesses_are_literal_and_not_approved(self):
        raw,d,p1,p2,p7=tiny()
        result=k8.compile_native_card('example',raw,d,p1,p2,p7)
        self.assertEqual(result['approvedRules'],[])
        self.assertEqual(result['qualifiedDiagrams'],0)
        self.assertEqual(result['relations'][0]['witnessSamples'][0]['subject']['value'],'node:a')
        self.assertEqual(result['relations'][0]['witnessSamples'][0]['object']['value'],'node:b')
        self.assertEqual(result['relations'][0]['witnessSamples'][0]['evidenceRefs'],['s:1'])

    def test_source_hash_mismatch_refused(self):
        raw,d,p1,p2,p7=tiny()
        with self.assertRaisesRegex(ValueError,'K8_SOURCE_PIN_MISMATCH'):
            k8.compile_native_card('example',raw,badsha(),p1,p2,p7)

    def test_k6_k7_counts_and_witness_mismatch_refused(self):
        raw,d,p1,p2,p7=tiny()
        p1['predicates'][0]['assertionCount']=2
        with self.assertRaisesRegex(ValueError,'RELATION_COUNTS_TAMPERED'):
            k8.compile_native_card('example',raw,d,p1,p2,p7)
        p1['predicates'][0]['assertionCount']=1
        p2['candidateRelations'][0]['sampleAssertionRefs']=['a:secret']
        with self.assertRaisesRegex(ValueError,'K6_SAMPLE_ASSERTION_MISSING'):
            k8.compile_native_card('example',raw,d,p1,p2,p7)

    def test_no_auto_semantic_hierarchy_from_names(self):
        raw,d,p1,p2,p7=tiny(predicate='zoology.lineage_child_of')
        result=k8.compile_native_card('example',raw,d,p1,p2,p7)
        svg=k8.svg_comparison(result,prefer_relation='zoology.lineage_child_of').decode()
        self.assertIn('flèches : sujet vers objet',svg)
        self.assertIn('NON FILTRÉE',svg)
        self.assertIn('node:a',svg)
        self.assertNotIn('QUALIFIED',result['relations'][0]['qualification'])
        self.assertEqual(result['qualifiedDiagrams'],0)

    def test_escaped_svg_and_truncated_literal(self):
        raw,d,p1,p2,p7=tiny(slug='example',predicate='a<b&c')
        result=k8.compile_native_card('example',raw,d,p1,p2,p7)
        svg=k8.svg_comparison(result).decode()
        self.assertIn('a&lt;b&amp;c',svg)
        self.assertNotIn('<script',svg)
        lit=k8.literal({'kind':'string','value':'x'*300})
        self.assertTrue(lit['truncated'])
        self.assertEqual(len(lit['value']),180)

    def test_duplicate_witnesses_refused(self):
        raw,d,p1,p2,p7=tiny()
        state=json.loads(raw)
        state['assertions'].append(state['assertions'][0])
        mutated=json.dumps(state).encode()
        newdigest=k8.sha(mutated)
        p1['source']['sha256']=p2['sourceSha256']=p7['sourceSha256']=newdigest
        with self.assertRaisesRegex(ValueError,'DUPLICATE_OR_BAD_ASSERTION'):
            k8.compile_native_card('example',mutated,newdigest,p1,p2,p7)

    def test_no_overwrite_and_resume_byte_equal(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'secret.json'
            self.assertTrue(k8.immutable_write(p,b'a'))
            self.assertFalse(k8.immutable_write(p,b'a'))
            with self.assertRaisesRegex(ValueError,'OUTPUT_COLLISION_OR_TAMPERING'):
                k8.immutable_write(p,b'b')

    def test_output_cannot_overlap_repo(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            repo=root/'repo';repo.mkdir()
            with self.assertRaisesRegex(ValueError,'OUTPUT_OVERLAPS_PROTECTED_SOURCE'):
                k8.verify_output_root(repo/'results',[repo])

    def test_reject_zip_member_escape_and_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            zpath=Path(tmp)/'test.zip'
            with zipfile.ZipFile(zpath,'w') as z:z.writestr('safe.json','{}')
            with zipfile.ZipFile(zpath) as z:
                with self.assertRaisesRegex(ValueError,'BAD_ZIP_MEMBER_PATH'):
                    k8.read_zip(z,'../safe.json',100)
                with self.assertRaisesRegex(ValueError,'MISSING_OR_DUPLICATE_ZIP_MEMBER'):
                    k8.read_zip(z,'missing.json',100)

    def test_ordinal_is_not_scalar_size(self):
        raw,d,p1,p2,p7=tiny(predicate='weather.states')
        result=k8.compile_native_card('example',raw,d,p1,p2,p7)
        self.assertEqual(result['qualifiedDiagrams'],0)
        self.assertNotIn('size',json.dumps(result))

    def test_heterogeneous_requires_adaptation(self):
        card=k8.compile_heterogeneous_card('example',
            {'slug':'example','canonicalArtifacts':[],'canonicalArtifactCount':1,'missingCanonicalArtifacts':1},
            {'slug':'example','recommendations':[]})
        self.assertEqual(card['status'],'ADAPTER_AND_POLICY_REVIEW_REQUIRED')
        self.assertEqual(card['qualifiedDiagrams'],0)


def badsha():return 'sha256:'+'0'*64

if __name__=='__main__':unittest.main()
