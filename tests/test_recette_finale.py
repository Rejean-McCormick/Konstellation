"""Tests de recette finale : refus fermé, source brute jamais autorité."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1]/'tools'/'visual-semantics'/'recette-finale.py'
spec=importlib.util.spec_from_file_location('recette_finale',MODULE)
r=importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

A={'assertion_id':'a:1','statement':{'subject':{'kind':'referent','id':'c'},'predicate':'z.child_of','object':{'kind':'referent','id':'p'}},'valuations':[{'value_semantics':'ordinal','value_state':'known','value':'high'}]}

class TestFinalRecipe(unittest.TestCase):
    def test_source_v6_counts_and_scalar_guard(self):
        statements,counts,scalar,ordinal=r.source_assertions(json.dumps({'schema_version':'6.0','assertions':[A]}).encode(), 'z',1)
        self.assertEqual(list(statements),['a:1']); self.assertEqual(counts['z.child_of'],1)
        self.assertEqual(scalar,0);self.assertEqual(ordinal,1)

    def test_duplicate_assertion_rejected(self):
        with self.assertRaisesRegex(ValueError,'DUPLICATE_ASSERTION'):
            r.source_assertions(json.dumps({'schema_version':'6.0','assertions':[A,A]}).encode(),'z',2)

    def test_unknown_source_format_rejected(self):
        with self.assertRaisesRegex(ValueError,'INVALID_NATIVE_V6'):
            r.source_assertions(json.dumps({'schema_version':'9.0','assertions':[A]}).encode(),'z',1)

    def test_correct_source_witness(self):
        card={'slug':'z','sourceType':'native','approvedRules':[],'qualifiedDiagrams':0,'publicationAuthorized':False,
             'reviewEntries':[{'relationId':'z.child_of','sampleAssertionRefs':['a:1'],'decision':'UNREVIEWED','assertionCount':1,'priority':'REVIEW_GRAPH_RELATION'}]}
        n,counts=r.validate_review_card(card,'z',{'a:1':A},{'z.child_of':1})
        self.assertEqual(n,1);self.assertEqual(counts['REVIEW_GRAPH_RELATION'],1)

    def test_forged_relation_witness_rejected(self):
        card={'slug':'z','sourceType':'native','approvedRules':[],'qualifiedDiagrams':0,'publicationAuthorized':False,
             'reviewEntries':[{'relationId':'z.child_of','sampleAssertionRefs':['fake'],'decision':'UNREVIEWED','assertionCount':1,'priority':'REVIEW_GRAPH_RELATION'}]}
        with self.assertRaisesRegex(ValueError,'WITNESS_MISMATCH'):
            r.validate_review_card(card,'z',{'a:1':A},{'z.child_of':1})

    def test_hierarchy_probe_stays_diagnostic(self):
        p=r.hierarchy_probe({'a:1':A},'z.child_of')
        self.assertEqual(p['referentPairs'],1);self.assertEqual(p['rootCount'],1)
        self.assertIn('NOT_APPROVED',p['classification'])

    def test_multiple_parents_are_detected(self):
        b={**A,'assertion_id':'a:2','statement':{**A['statement'],'object':{'kind':'referent','id':'other'}}}
        p=r.hierarchy_probe({'a:1':A,'a:2':b},'z.child_of')
        self.assertEqual(p['multipleParentSubjects'],1)

    def test_invalid_promotion_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            f=Path(td)/'d.json'
            t={'format':'konstellation.manual-recipe-proposal/1.0','candidateKey':'zoology|zoology.lineage_child_of',
               'decision':'APPROVED','reviewer':None,'reviewedOn':None,'datasetRef':None,'readerPolicyRef':None,
               'readerVisibleAssertionRefs':[],'direction':None,'scope':None,'reviewJustification':None,'publicationAuthorized':False}
            f.write_text(json.dumps(t))
            with self.assertRaisesRegex(ValueError,'UNAUTHORIZED_DECISION'):r.verify_decision(f)

    def test_fabricated_publication_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            f=Path(td)/'d.json'
            t={'format':'konstellation.manual-recipe-proposal/1.0','candidateKey':'zoology|zoology.lineage_child_of',
               'decision':'PENDING','reviewer':None,'reviewedOn':None,'datasetRef':None,'readerPolicyRef':None,
               'readerVisibleAssertionRefs':[],'direction':None,'scope':None,'reviewJustification':None,'publicationAuthorized':True}
            f.write_text(json.dumps(t))
            with self.assertRaisesRegex(ValueError,'PUBLICATION_MUST_REMAIN_FALSE'):r.verify_decision(f)

    def test_review_proposal_is_not_approval(self):
        with tempfile.TemporaryDirectory() as td:
            f=Path(td)/'d.json'
            t={'format':'konstellation.manual-recipe-proposal/1.0','candidateKey':'zoology|zoology.lineage_child_of',
               'decision':'PROPOSE_FOR_RUNTIME_CHECK','reviewer':'Relecteur autorisé','reviewedOn':'2026-11-20',
               'datasetRef':'sha256:'+'a'*64,'readerPolicyRef':'sha256:'+'b'*64,
               'readerVisibleAssertionRefs':['a:1'],'direction':'child-to-parent','scope':'private-pilot',
               'reviewJustification':'Examen des témoins et de la direction; proposition à vérifier dans le lecteur sous sa politique, sans approbation automatique.',
               'publicationAuthorized':False}
            f.write_text(json.dumps(t))
            self.assertIn('NEEDS_VERIFIED_READER_POLICY',r.verify_decision(f)['status'])

    def test_immutable_outputs_refuse_divergence(self):
        with tempfile.TemporaryDirectory() as td:
            out=Path(td)/'private'
            self.assertEqual(r.write_immutable(out,{'a.json':b'abc'}),1)
            self.assertEqual(r.write_immutable(out,{'a.json':b'abc'}),0)
            with self.assertRaisesRegex(ValueError,'OUTPUT_DIVERGED'):
                r.write_immutable(out,{'a.json':b'changed','new.json':b'new'})
            self.assertFalse((out/'new.json').exists())

    def test_output_symlink_is_refused(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);(d/'actual').mkdir()
            try:(d/'link').symlink_to(d/'actual',target_is_directory=True)
            except OSError:self.skipTest('Symlinks prohibited by environment')
            with self.assertRaisesRegex(ValueError,'OUTPUT_'):
                r.write_immutable(d/'link',{'a.txt':b'x'})

    def test_private_workbench_does_not_insert_raw_html(self):
        h=r.make_workbench({'native':1,'other':0,'assertionsVerified':1,'relationsVerified':1,'witnessRefsVerified':1,'gates':{'A':'PASS'}},
          [{'slug':'<script>','type':'native','assertions':1,'relations':1,'missing':0,'status':'REVIEW_REQUIRED'}],[])
        self.assertNotIn(b'<script>',h)
        self.assertIn(b'&lt;script&gt;',h)

if __name__=='__main__':unittest.main()
