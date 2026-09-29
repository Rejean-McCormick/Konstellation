# Intégrations exécutables — v0.4

Les adaptateurs appartiennent à Konstellation. Les producteurs Kristal et le RuntimeSet SA restent des applications externes. Les schémas dans `contracts/upstream/` proviennent des snapshots fournis. Les exemples sont synthétiques; ils ne constituent ni un corpus validé ni une grammaire SA publiée.

## Pack Kristal sur disque

```bash
KONSTELLATION_BACKEND_CONFIG=examples/integrations/kristal-directory.json npm start
```

Cet exemple lit réellement `assertions.parquet` (637 assertions), son catalogue et sa ReaderPolicy v5. Le manifeste et chaque fichier sont vérifiés par SHA-256 et taille avant décodage. Aucun fichier non déclaré n'est admis; les chemins sortants et liens symboliques hors pack sont refusés. Toutes les tables Parquet déclarées doivent avoir un mapping. Les index annexes sont vérifiés, puis le moteur construit ses propres index en mémoire.

Le contrat Kristal ne fixe pas un schéma universel de colonnes. Le fichier opérateur fournit `rows[].columns` (champ normalisé → chemin de colonne), `jsonColumns`, `qualifiersPreserved`, `relationMappings` et éventuellement `entityMappings`. Les champs épistémiques obligatoires ne sont jamais inventés. Les intervalles normalisés exigent leur règle et leurs entrées de dérivation. Le catalogue fournit les entités, sources et registre; les Lens doivent correspondre à ce registre (`KONSTELLATION_LENSES`). L'import SES antérieur conserve ses propres limites.

`manifestSha256` épingle ici les **octets** du manifeste. Budgets par défaut : 256 Mio de fichiers et 100 000 lignes. Le chargement produit un snapshot immuable; redémarrer pour changer de corpus. Régénérer l'exemple avec `node scripts/generate-integration-example.mjs`.

Pour les signatures Ed25519, configurer `signatures.publicKeys` (key_id → clé publique PEM) et `signatures.excludeFields` (cible canonique explicite, `signatures` obligatoire; `integrity` optionnel). Toutes les signatures du manifeste doivent être vérifiables. Un `integrity.manifest_hash` exige `manifestHashExcludeFields`; un `pack_hash` exige `containerFile`. Sans vérification cryptographique effectuée, `signaturesVerified` reste faux. `attestation` accepte seulement `stale`, `stalenessSeconds`, `revokedKeys`, `federations`, fournis par l'opérateur; ce n'est pas un service de révocation en ligne.

## Projection Kristal HTTP

Adapter `examples/integrations/kristal-http.json` et son URL, puis utiliser la même variable de lancement. Ici `manifestSha256` est le hash du JSON canonique trié; le catalogue doit être couvert par le manifeste, les politiques par leurs empreintes.

L'adaptateur demande la projection complète `assertions`, sous une politique épinglée, avec pagination CURSOR ou OFFSET. Il contrôle sur chaque page le contrat, le runtime pack, l'Exchange, la projection et la politique. Une troncature, une pagination sans progression, un curseur répété ou l'absence de filtrage avant pagination bloque le chargement. Limites : 1000 pages, 100 000 lignes, 8 Mio par réponse, délai de 10 secondes par appel. L'application n'affiche jamais un total partiel comme exact.

Une projection HTTP n'est pas une preuve de vérification des fichiers locaux : une politique exigeant cette preuve ou une signature locale bloque ce mode. Utiliser le lecteur sur disque pour ces politiques. Le snapshot HTTP est acquis au démarrage, pas à chaque clic.

## ReaderPolicy v5

`konstellation.kristal-reader.v1` valide le document amont et évalue les exclusions avant indexation, jointures, facettes, inspection et preuves. Les permissions de l'instance demeurent prioritaires.

- Axes : statut d'artefact/assertion/validation/reconnaissance, certitude, validated_as; listes autorisées/interdites, autorités, portée et domaines.
- Modes : `reference_only`, `validated_only`, `high_certainty_only` ajoutent leurs restrictions; research/creative/all_with_labels/custom utilisent les règles explicites.
- Listes autorisées absentes : aucune restriction supplémentaire; explicitement vides : aucune valeur admise. Les exclusions priment. Les drapeaux d'inclusion ne contournent pas une exclusion.
- Traceabilité, evidence, politique de validation, autorité, intégrité, signatures, fraîcheur, révocations et lineage sont contrôlés selon la politique. Les labels et identités sont conservés.
- Désaccords : conserver, marquer, exclure; un choix/review requis bloque explicitement. Les restrictions multiportée/multiautorité sont vérifiées sur l'ensemble visible avant requête : elles peuvent exiger un pack déjà restreint.
- Règles custom : cible `assertion`; condition `{field, op, value}`, opérateurs `eq`, `in`, `exists`. Champs : status, certainty, validationStatus, validatedAs, authority, recognitionStatus, artifactStatus, scope.domain/language/jurisdiction. Effets de blocage, labels et demandes de review exécutés; `allow` ne contourne jamais une exclusion.

Une condition inconnue, un ordre autre que `stable`, des priorités langue/juridiction, une composition par précédence d'autorité, une extension de politique ou une limite de résumé non prise en charge désactive la politique avec diagnostic. Les exigences indécidables produisent une erreur, même si le fallback amont autoriserait une omission : une omission ne doit pas devenir une fausse preuve d'absence. Les préférences de masquage de labels ne suppriment pas les métadonnées de l'inspecteur; `show_labels:false` rend la politique indisponible. Ce profil documenté ne prétend pas interpréter toutes les extensions possibles de Kristal.

## SemantiK Architect

```bash
KONSTELLATION_SA_CONFIG=/chemin/semantik.json npm start
```

Copier `examples/integrations/semantik.json`, remplacer le runtime, vérifier le profil publié et la version du contrat GF. `tokenEnv`, facultatif, désigne une variable contenant le jeton Bearer; le secret ne passe pas au navigateur. Les URL sont fixées par l'opérateur, jamais par une requête utilisateur.

Dans « Expliquer cette exploration », choisir critères, page affichée ou entité inspectée. L'export CommunicationRequest fonctionne sans service. L'envoi vérifie `/ready`, `/v1/capabilities`, puis appelle `/v1/validate-request` et `/v1/render`. Le runtime et le profil linguistique doivent être publiés et prêts. Aucun fallback de langue ni texte simulé n'est produit.

Le profil **konstellation-explorer-2** est le vocabulaire de communication de Konstellation; un runtime externe doit l'implémenter et le publier. Le générateur émet :

| Famille de prédicats | Contenu |
|---|---|
| `konstellation:selection-type`, `selection-identities`, `selection-link` | Type, identités explicites, sous-sélections corrélées |
| `konstellation:filter-*` | Opérateur exact, relation et valeurs/intervalle |
| `konstellation:read-context` | Dataset et ReaderPolicy épinglés |
| `konstellation:result-page` | Membres de cette page, total exact, taille, existence de page suivante |
| `konstellation:inspected-entity` | Identité inspectée |
| `konstellation:reported-assertion`, `assertion-*` | Assertion rapportée, axes épistémiques, portée, qualificatifs, sources et divergences |

Les rôles sont préfixés `konstellation-role:`. Chaque assertion et ses qualifications font partie d'une même obligation PRESENT, ordonnée FIXED. La réponse doit couvrir toutes les obligations, avec blocs cohérents, sources conservées, runtime/profil/langue/locale identiques et types de blocs autorisés. Les blocs non rattachés à une obligation sont refusés. L'interface affiche du texte échappé et invalide une réponse lorsque la sélection change. La vérification structurelle ne prouve pas la fidélité linguistique d'une grammaire externe : sa qualification reste nécessaire.

Le service externe reçoit le contenu sémantique uniquement lors de l'action de formulation; bootstrap consulte ses capacités et son état. Les tests HTTP utilisent un serveur de contrat identifiable comme fixture, pas une réalisation GF.


### Frontière de planification linguistique

Konstellation n’émet aucun `sa:operation`, `sa:role-map`, `sa:slot-map` ou autre hint de réalisation. Il transporte seulement le graphe sémantique, les obligations, les sources et les contraintes de présentation. Le mapping vers les opérations SA, la résolution lexicale et la réalisation GF appartiennent au RuntimeSet/profil de SemantiK Architect. `konstellation-explorer-1` reste un profil historique de display canonique; `konstellation-explorer-2` est le profil structuré recommandé.
