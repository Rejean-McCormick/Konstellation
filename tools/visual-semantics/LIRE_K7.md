# K7 — Mode privé de batch étendu

Prérequis : Konstellation K6 validé, Python 3.10+, snapshot ZIP `kristal-public_Code_snapshot.zip` **exact** (SHA-256 du manifeste K7). 

Sans les résultats K6, la passe K7 couvre 42 index. Avec `--k6-results DIR`, elle inclut aussi la révision ciblée des 84 dossiers K6 si **toutes** les empreintes SHA sont correctes. Les rapports sont strictement privés, non filtrés, non autorisés à publication.

Commande (depuis la racine du dépôt) :

```powershell
py -3 tools/visual-semantics/k7-snapshot-batch.py --zip "$env:USERPROFILE\Downloads\kristal-public_Code_snapshot.zip" --out "$env:LOCALAPPDATA\Konstellation\k7-private-reviews" --k6-results "$env:USERPROFILE\Downloads\KONSTELLATION_K6_RESULTS\KONSTELLATION_K6_RESULTATS_PRIVÉS_84_KRISTALS_20261119"
```

Si le dossier K6 n'est pas disponible, retirer `--k6-results` et son argument. Le programme n'accède pas au réseau, n'écrit pas dans les Kristals, ne modifie aucun renderer et ne crée aucune règle visuelle approuvée. La sortie est `runs/<runId>/REVIEW_WORKBENCH.html`.
