# 19 — Contrats de production et présentation v0.1

## Extension compatible

Ne pas changer les schémas Score/Bundle 0.1 ni leurs exemples historiques. Ils constituent la tranche générique initiale. La spécification documentaire v0.2 ajoute trois contrats : [Theme](schemas/theme.schema.json), [Production Request](schemas/production-request.schema.json) et [Presentation Plan](schemas/presentation-plan.schema.json), tous au format 0.1. Leurs versions sont indépendantes de la version documentaire. Les trois sont des drafts, non des routes ni contrats runtime. Les preuves spécialisées demeurent une extension future du Bundle ; ni thème ni Plan ne peuvent les introduire dans un Bundle générique.

| Objet | Rôle | Durée de vie |
|---|---|---|
| Score | intentions, route, profil temporel | sauvegarde explicite |
| Theme | tokens, formes, défauts visuels | ressource locale sans données |
| Production Request | Score embarqué + Theme + encodage + caméra + narration + sorties | demande locale, sensible si Score sensible |
| Bundle | scènes et timeline compilées | mémoire autorisée, export explicite |
| Presentation Plan | hash du Bundle, thème effectif, caméra, captions, QA | lié au Bundle exact, jamais source de droits |
| Manifest | hashes et versions des artefacts remis | privé par défaut, public minimisé après revue |

## Production Request

`format`, `score`, `theme`, `encoding` (`mono/by-kind/by-focus`), `geometry` (`uniform/by-kind`), `camera` (`fixed/auto`), `narration` (`off/captions`), `motion` (`standard/reduced`), `outputs` (liste unique de formats), `resolution` (width/height), `fps`. Les valeurs sont explicites après résolution des defaults UI. Ne pas accepter `by-relation` tant que le Bundle ne transporte pas les preuves requises. Les champs `outputs` décrivent une intention et non une autorisation ; confirmer séparément avant export. Un fichier de demande ne contient ni chemins, ni commandes shell, ni URL, ni permissions. Les formats ne sont pas tous implémentés au même lot. `resolution` doit correspondre à l'aspect du Score ; elle représente les dimensions de sortie raster, le viewport logique peut être différent mais de même aspect. Pour vidéo, encoder et contraintes de dimensions sont vérifiés avant lancement. En mode reduced, SVG animé/vidéo utilisent des états stables avec changements non animés ; si impossible de compiler, refuser le format. `narration=off` supprime seulement les captions facultatives, pas les titres/statuts/transcription.

## Presentation Plan

Le Plan est compilé en même temps que le Bundle effectif. Toute réparation géométrique produit un nouveau Bundle ; le Plan ne patch pas ses coordonnées. Le Plan ne modifie pas les segments. `bundleSha256` = SHA-256 des octets UTF-8 du Bundle exact sérialisé ; conserver ces octets pour le contrôle. `themeSha256` = SHA-256 des octets UTF-8 du thème effectif sérialisé et figé, inclus dans le Plan ; utiliser une canonicalisation JSON JCS (RFC 8785, UTF-8, chaînes non normalisées, nombres finis) ; les fixtures ASCII pour les clés et leurs nombres simples sont compatibles avec le script documentaire, qui n’est pas une implémentation JCS générale. Tester inter-runtime avant promotion. Pour le digest du Bundle, le hash porte sur le fichier effectif, y compris whitespace : une resérialisation exige un nouveau Plan. Les hashes ne sont ni signature, ni droit, ni qualification. Le manifeste d'export peut omettre les digests sensibles. Ne jamais résoudre une référence à partir d'un chemin/URL déclaré par le Plan.

`theme`, `encoding`, `geometry`, `motion`, `cameraMode`, `narrationMode`, `durationMs`, `compilerVersion`, `camera`, `captions`, `qa`. Chaque shot porte start/end, kind de cadrage et deux poses. Chaque caption porte start/end, act, templateId, texte brut, `refs` (sceneId/objectKey). Les captions génériques dérivent du Bundle et des gabarits autorisés ; le texte importé n'est pas une nouvelle assertion et doit être vérifié/recompilé avant toute publication. La transcription est dérivée des captions et des scènes obligatoires. En mode off, captions facultatives vides. Les titres et diagnostics obligatoires restent dérivés du Bundle. `qa` contient état pass/review/fail, samples, passes, diagnostics structurés sans texte libre privé. Un QA déclaré par un fichier importé ne constitue jamais une validation : recalculer localement.

### Validation croisée (hors JSON Schema)

- Vérifier strictement les versions, tailles avant parse (demande ≤128 KiB, plan ≤256 KiB, thème ≤32 KiB, bundle ≤2 MiB), hash, contexte et générations ; refuser Plan orphelin. Vérifier themeSha256 sur la sérialisation canonique explicitée et bundleSha256 sur octets exacts.
- Vérifier durée, aspect, dimensions, segments contigus ; shots alignés exactement 1:1 sur segments, poses continues ; mode fixed impose `(W/2,H/2,1)` pour tout shot ; mode reduced impose fixed lors de la compilation. Bounds et zoom selon [caméra](17-camera-direction.md).
- Vérifier que chaque caption référence des objets présents dans les scènes concernées ou déjà parcourues pour summarize, pas d'IDs du futur ; intervals triés, positifs, non chevauchants, dans durée. Contrôler texte/gabarit avec les champs autorisés, pas seulement schema. Pas de narration spécialisée avec Bundle 0.1.
- Rejouer les contrôles QA localement avant livraison ; `fail` interdit l'export, `review` non essentiel avec confirmation. Vérifier que le mode de couleur, les légendes et la géométrie ne portent pas un sens absent. Refuser les sorties indisponibles, et n'accepter aucun export à destination externe implicite.

## Contrat de fonction proposé

```ts
function resolvePresentation(request: ProductionRequest, supported: Capabilities): PresentationOptions;
function compileProduction(resolved: ResolvedScore, opts: PresentationOptions): { bundle: Bundle; plan: PresentationPlan };
function frameAtPresentation(bundle: Bundle, plan: PresentationPlan, t: number): PresentationFrame;
function inspectProduction(bundle: Bundle, plan: PresentationPlan): QualityReport;
```

Les effets réseau restent dans le Resolver ; vérifier la génération avant chaque commit. Une fois le Bundle et le Plan figés, lecture et export utilisent le même évaluateur. Changer uniquement la palette ne relance pas le Resolver ; recompilation locale des tokens et QA. Changer dimensions/typographie peut recalculer scènes et plan ; changer densité au-delà du snapshot autorisé ou la route demande résolution. Aucun export ne consulte les données cachées. En cas de conflit, les contrats de lecture existants et la policy prévalent.

## Exemples

[Demande Signature](examples/signature.production.json) (Score synthétique) ; [Plan Signature](examples/signature.presentation.json) lié au [Bundle 0.1](examples/exploration.bundle.json). Les deux exemples sont indépendants : la demande illustre une exploration plus longue, le Plan illustre le Bundle court de 4,4 s. Aucun n'est la sortie d'un compilateur existant. Un QA `review` indique que le rendu humain et runtime n'a pas été effectué. Voir [validation](VALIDATION.md).
