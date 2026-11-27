# 16 — Narration et composition procédurales

## Story : un récit sans invention de faits

Le module Story transforme les étapes **résolues** en actes et captions factuels. Il n'est ni LLM, ni résumeur de sources. Les textes proviennent de labels et champs autorisés et de gabarits versionnés. Toute citation ou affirmation provenant d'un contenu doit garder sa provenance exacte ; la v0.1 générique ne crée pas de résumé de portrait. Pas d'analyse émotionnelle, d'intention prêtée aux auteurs, ni de conclusion causale fondée sur l'ordre des scènes.

| Acte | Précondition | Gabarit indicatif (FR) | Repli |
|---|---|---|---|
| introduce | focus visible | « Explorer : {label} » | titre neutre |
| contextualize | voisinage visible | « Voisinage de {label} » | vue seule |
| reveal | nouveaux objets effectivement montrés | « Découvrir les voisins » | aucun décompte non autorisé |
| associate | follow validé | « {A} → {B} : navigation » | transition neutre |
| decompose | hiérarchie qualifiée (futur) | « Constituants visibles de {A} » | contextualize |
| contrast | opposition ou comparaison qualifiée (futur) | « Comparer {A} et {B} » | côte à côte neutre si admissible |
| deepen | navigation suivante | « Explorer : {B} » | associate |
| summarize | parcours effectué | « Parcours : {A}, {B}, … » | dernier focus + transcription |
| conclude | fin | « Fin de l'exploration » | dernier focus stable |

Actes génériques compilables avec Bundle 0.1 : introduce/contextualize/reveal/associate/deepen/summarize/conclude. Decompose/contrast et narration de causalité exigent extension de preuve. Un acte peut couvrir plusieurs segments, mais pas une donnée absente des scènes qu'il référence. Les captions à l'écran doivent être plus courtes que la transcription ; si une caption déborde, raccourcir le gabarit (pas tronquer le sens) ou créer une pause, et rendre le texte complet accessible.

### Algorithme proposé

1. À partir de la route résolue, créer une introduction, une ou plusieurs unités (mise en contexte, changement de focus, lecture), une fin. Préserver ordre et étapes explicites. Un même changement de focus ne doit pas être répété pour meubler la durée.
2. Pour chaque unité, produire un acte, la liste des références scène/objet, le templateId et sa chaîne rendue. Le compilateur ne reçoit pas le graphe brut. Les références doivent être visibles dans l'acte, les éléments de synthèse peuvent référencer des scènes antérieures du parcours (mention « parcouru » explicite).
3. Mesurer le coût de lecture : nombre de mots réellement visibles, labels nouveaux, densité, diagnostics indispensables. Utiliser la formule de [timeline](06-scenes-timeline.md) pour les pauses ; les captions sont comprises dans ce coût. Respecter holds explicites et minimums.
4. Allouer les durées de manière stable : minimums d'abord, reste selon poids du coût ; arrondi en ms par plus grands restes et ordre stable. Si durée insuffisante, signaler, proposer moins d'étapes (nouveau Score avec consentement) ou durée accrue ; ne pas escamoter une preuve.
5. Produire un calendrier de captions à intervalles demi-ouverts, sans chevauchement, une transcription ordonnée et les diagnostics. Le lecteur peut masquer les captions facultatives, jamais les mentions nécessaires à la compréhension et à la policy.

## Intentions et recettes

Découvrir utilise `exploration` ; expliquer commence par une exploration ou association neutre ; comparer n'est disponible que si deux cibles et une projection compatible sont autorisées (KOR-6). Une intention UI n'est pas une recette épistémique. Pour convergence, divergence, causalité, temporalité, argumentation, traçabilité et changement d'échelle, utiliser [les préconditions existantes](04-parcours.md) et [la grammaire](05-grammaire-mouvement.md). Une recherche de chemin future est bornée, sur DTOs autorisés uniquement, et retourne « aucun chemin visible dans le budget », non « aucun chemin n'existe ».

### Durée et structure

Exemple de recette 60 s (indicatif, pas un template obligatoire) : introduction 0–5, contextualisation 5–15, exploration 15–35, découverte 35–50, synthèse 50–60. Un parcours de 4,4 s peut ne contenir qu'une installation, une transition et un hold. L'algorithme ne doit pas inventer une scène pour satisfaire une structure en cinq actes. Les presets de rythme minimal/cinematic/didactic règlent les pauses et le mouvement, les thèmes n'altèrent pas l'ordre narratif. La durée effective est celle du Bundle ; le plan de présentation ne modifie pas silencieusement les segments.

## Langues et audio

Le MVP garde fr/en des contrats Score/Bundle ; gabarits séparés, texte brut, paramètres échappés, pas de concaténation HTML. Langue des données et langue UI sont distinctes ; pas de traduction automatique implicite ni de reconstruction de label absent. Fallback documenté vers la valeur autorisée disponible, sinon diagnostic neutre. L'extension multilingue (RTL, polices et segmentation) n'est pas un prérequis de la première cible FR/EN. Aucun TTS, musique, micro ou génération audio dans le moteur initial. Un fichier SRT/VTT textuel peut être ajouté ultérieurement depuis les captions après validation, sans modifier le contenu.

## Acceptation

Même Score résolu, même versions et profil => même ordre, actes, textes et durées. Tester label malveillant, label absent, corpus tronqué, répétition, parcours sans voisin, durée trop courte, synthèse multi-focus et refus d'acte spécialisé sans preuve. Ne jamais afficher un nombre total déduit du nombre montré. Le récit doit rester compréhensible en lecture muette et image statique accompagnée de transcription.
