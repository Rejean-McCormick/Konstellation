import hashlib,importlib.util,json,unittest,zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

path=Path(__file__).resolve().parents[1]/'tools'/'visual-semantics'/'k9-to-final-batch.py'
spec=importlib.util.spec_from_file_location('k9final',path)
k9=importlib.util.module_from_spec(spec);spec.loader.exec_module(k9)

class K9FinalTests(unittest.TestCase):
  def setUp(self):
    self.temp=TemporaryDirectory();self.addCleanup(self.temp.cleanup)
    self.root=Path(self.temp.name)
  def make_zip(self):
    p=self.root/'result.zip';pre=k9.PREFIX
    native=[{'slug':f'k{i:02d}'} for i in range(84)]
    hetero=[{'slug':f'h{i:02d}'} for i in range(42)]
    with zipfile.ZipFile(p,'w') as z:
      z.writestr(pre+'SUMMARY.json',json.dumps({'format':k9.SOURCE_FORMAT,'approvedRules':0,'assertions':40333,'native':native,'heterogeneous':hetero}))
      for x in native:
        z.writestr(pre+f'revues/{x["slug"]}.json',json.dumps({'slug':x['slug'],'format':'konstellation.k8-private-native-review/1.0',
        'approvedRules':[],'qualifiedDiagrams':0,'sourceSha256':'sha256:'+'a'*64,
        'relations':[{'relationId':'rel:1','assertionCount':1,'candidateFamilies':['REFERENT_GRAPH_CANDIDATE'],'reviewChecks':[],
        'witnessSamples':[{'assertionRef':f'w:{x["slug"]}','relationId':'rel:1'}]}]}))
      for x in hetero:
        z.writestr(pre+f'revues/{x["slug"]}.json',json.dumps({'slug':x['slug'],'format':'konstellation.k8-private-adapter-review/1.0','approvedRules':[], 'qualifiedDiagrams':0}))
    return p
  def test_exact_pins_full_coverage_resume(self):
    z=self.make_zip();sha=k9.digest(z.read_bytes());out=self.root/'output'
    a=k9.run(z,out,sha);self.assertEqual(a['profiles'],126);self.assertEqual(a['items'],126)
    self.assertEqual(a['written'],130)
    b=k9.run(z,out,sha);self.assertEqual(b['written'],0);self.assertEqual(b['reused'],130)
    summary=json.loads((out/'SUMMARY.json').read_text());self.assertEqual(summary['qualifiedDiagrams'],0)
  def test_wrong_archive_pin_is_refused(self):
    z=self.make_zip()
    with self.assertRaisesRegex(ValueError,'SHA256_MISMATCH'):k9.run(z,self.root/'out','sha256:'+'0'*64)
  def test_diverged_existing_output_is_refused_before_rewrite(self):
    z=self.make_zip();out=self.root/'out';k9.run(z,out,k9.digest(z.read_bytes()))
    (out/'QUEUE.json').write_text('tampered')
    with self.assertRaisesRegex(ValueError,'OUTPUT_DIVERGED'):k9.run(z,out,k9.digest(z.read_bytes()))
  def test_no_forged_approval(self):
    z=self.make_zip();raw=z.read_bytes();bad=raw.replace(b'"approvedRules": 0',b'"approvedRules": 9')
    # Raw tamper changes ZIP integrity and is rejected by explicit pin.
    z.write_bytes(bad)
    with self.assertRaisesRegex(ValueError,'SHA256_MISMATCH'):k9.run(z,self.root/'out',k9.digest(raw))
  def test_symlinked_output_directory_refused(self):
    z=self.make_zip();out=self.root/'out';out.mkdir()
    external=self.root/'external';external.mkdir()
    try:(out/'dossiers').symlink_to(external,target_is_directory=True)
    except OSError:self.skipTest('no symlink permission')
    with self.assertRaisesRegex(ValueError,'OUTPUT_REDIRECT'):
      k9.run(z,out,k9.digest(z.read_bytes()))
  def test_no_private_output_inside_repo(self):
    root=path.parents[2]
    with self.assertRaisesRegex(ValueError,'OUTPUT_INSIDE_CODE_REPOSITORY'):
      k9.safe_output(root/'temp-results',[])

if __name__=='__main__':unittest.main()
