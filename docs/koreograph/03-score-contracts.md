# 03 — Koreograph Score et contrats de compilation

## Partition déclarative

Le Score exprime les intentions de navigation, pas les pixels. Sa forme initiale est définie dans le [draft JSON Schema 0.1](schemas/score.schema.json). Il est indépendant d'une session authentifiée, mais pas nécessairement public : IDs et titres peuvent être sensibles. Les exemples de ce dossier sont fictifs.

### Champs

| Champ | Rôle |
|---|---|
| `format` | `koreograph.score/0.1` ; version exacte acceptée |
| `title`, `locale` | libellé fourni et langue choisie ; texte brut |
| `source` | `datasetRef`, `registryRef`, `readerPolicyRef`, `executionProfileRef`, `lensRef`, `kristalRef` facultatif ; références à résoudre dans le contexte actif, jamais des droits |
| `presentation` | profil `minimal`, `cinematic`, `didactic`, durée `auto` ou ms bornés, aspect, densité 3–10 |
| `mode` | `capture`, `script` ou `auto` |
| `steps` | suite explicite de 1–12 intentions pour capture/script |
| `auto` | départ, recette, limite de sauts et seed pour le départ automatique |

Le contexte source est comparé à la lecture courante. Si l'un des champs diffère, proposer de recharger la source ou de créer une nouvelle partition ; ne jamais modifier un Score silencieusement. Le contexte existant de Constellation contient les quatre références `datasetRef`, `registryRef`, `readerPolicyRef`, `executionProfileRef`. Le Lens est transmis séparément par le client. Le v0.1 n'enregistre pas le QuerySpec complet, ne reproduit pas un changement de Lens et ne capture pas la racine locale sans focus. Ces possibilités nécessitent une extension versionnée et revalidation des DTOs.

## Actions de Score 0.1

| Action | Paramètres | Sémantique |
|---|---|---|
| `focus` | `target:{focus,groupId}` | Initialiser une constellation ; seul premier pas, aucune relation avec un état antérieur. |
| `follow` | `target` identique à un satellite visible de la scène précédente | Naviguer via ce satellite ; exactitude du target requise. |
| `reveal` | `limit` 3–10 | Faire apparaître jusqu'au nombre demandé de satellites visibles déjà résolus. N'invente pas une pagination ou une relation. |
| `hold` | `durationMs` 250–10000 | Laisser lire la scène ; sans requête. |

Toute partition explicite DOIT commencer par `focus`, sans autre `focus` ensuite. Le draft impose cette structure ; le resolver impose la cohérence des targets, de la visibilité et des budgets globaux. `back`, `compare`, `expand`, `change-lens`, `inspect`, `switch-view` sont des intentions futures non acceptées par le draft 0.1. Un retour vers un focus voisin peut être exprimé comme `follow` si ce target est effectivement visible ; sinon la capture propose d'arrêter ou scinder le Score.

## Validation en quatre étapes

1. Validation syntaxique JSON Schema stricte (types, limites, champs inconnus, version, tailles avant parse).
2. Validation du contexte actif : identité, Lens, session et policy. Le backend reste l'autorité ; un identifiant de policy fourni n'accorde rien.
3. Validation sémantique séquentielle : focus résoluble, target identique à celui d'un satellite visible, même contexte dans chaque réponse, relations/témoins confirmés lorsqu'un mouvement sémantique est demandé.
4. Validation de compilation : durée, budget, scène bornée, références uniques, transitions compatibles, coordonnées finies, texte rendu sans code.

Une erreur stoppe la préparation ; pas de lecture d'un bundle partiellement compilé comme s'il était complet. Auto peut retourner un parcours plus court que demandé si un cul-de-sac est rencontré, avec diagnostic visible avant confirmation. Une partition importée ne contient pas de script exécutable, URL d'asset, style CSS arbitraire ou instruction de publication.

## Bundle 0.1 proposé

Le [draft Bundle](schemas/bundle.schema.json) définit une structure concrète pour le premier moteur : `format`, `title`, `locale`, `style`, `provenance` (versions, contexte, qualification dérivée), `viewport`, `durationMs`, `scenes`, `segments`, `warnings`. Une scène contient un focusKey, des objets de position finale, des liens explicitement typés `navigation` et un indicateur `truncated`. Un lien de navigation ne constitue pas une assertion. Les scènes sont figées ; les segments les référencent par identifiant et portent un intervalle, une primitive, un easing. L'évaluateur temporel calcule les valeurs intermédiaires. Voir [06](06-scenes-timeline.md).

Le schema Bundle v0.1 n'intègre pas les preuves spécialisées : une extension future doit ajouter un contrat de références et d'audit vérifiable avant d'autoriser les mouvements sémantiques. Aucun champ ne peut déclarer une qualification canonique ou une publication autorisée. Les références de preuve présentes dans le DTO ne sont pas jetées lors d'une future adaptation ; les vues spécialisées restent hors du bundle 0.1.

### Règles transversales non exprimées par JSON Schema

- IDs de scène uniques ; IDs d'objets uniques dans chaque scène ; focusKey résout un objet visible ; liens résolvent deux objets de cette scène ; pas de doublon de clé de lien.
- Segments ordonnés, contigus, strictement positifs, premier `startMs=0`, dernier `endMs=durationMs`. `hold` référence deux fois la même scène. Transition `focus` part d'un objet qui correspond au focus d'arrivée ; sinon refus ou fondu neutre explicitement annoté (`fade`). `reveal` part de la même constellation et ne change pas de focus.
- Proportion et viewport compatibles ; coordonnées et rayons finis dans des bornes sûres ; opacité 0–1.
- `source` d'un Score réutilisé ne suffit pas à attester que les données sont inchangées. Enregistrer dans le manifeste d'export les empreintes des snapshots minimisés et de la partition, sous réserve d'autorisation ; ne pas exposer les empreintes privées dans un export public.

## Évolution

Toute rupture de contrat implique nouvelle version, schéma, migration explicite ou refus, golden tests et mise à jour de la documentation. Une migration n'élargit jamais les droits. Les drafts du dossier ne doivent pas être enregistrés comme contrats de production dans `server/contracts.mjs` avant implémentation et revue. Les versions de Konstellation, Score, Bundle, adaptateur et renderer restent distinctes.

## Extension documentaire v0.2

Score et Bundle 0.1 sont conservés à l'identique. Les styles `minimal/cinematic/didactic` sont des profils de rythme, non des thèmes. Une [demande de production et un plan de présentation](19-production-contracts.md) ajoutent Theme, encodage, géométrie, caméra, narration et QA sans étendre les droits ou les preuves du Bundle. Le Plan est lié au digest du Bundle exact ; les corrections géométriques recompilent le Bundle avant gel.
