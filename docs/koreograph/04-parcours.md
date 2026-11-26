# 04 — Modes de création et génération des parcours

## Kapture : observer plutôt que simuler

L'utilisateur lance l'enregistrement depuis un focus résolu. Kapture ajoute `focus` et mémorise les visites suivantes uniquement après confirmation du DTO demandé. Le callback doit transporter l'identifiant de requête et le target confirmé. Un abandon, une erreur, un hover ou un clic sans transition ne crée pas d'étape. Une suite A→B→C ne doit pas devenir A→C par déduplication si B est nécessaire au chemin.

Nettoyage déterministe : supprimer les répétitions consécutives du même target et contexte ; fusionner des révélations consécutives compatibles vers la dernière valeur ; ne pas conserver les temps de lecture réels par défaut. Les délais narratifs sont recalculés à partir de la densité. Les retours valides sont conservés quand ils montrent une navigation réelle. Si le changement est incompatible avec Score 0.1 (Lens, dataset, policy, vue spécialisée), arrêter la capture en préservant uniquement la partie valablement autorisée ; sur changement de sécurité, invalider le tampon et exiger une nouvelle préparation. Ne jamais capturer le token, les coordonnées, le texte saisi ou des champs de portrait non utilisés.

## Script : édition par intentions

Le même Score est modifiable par une liste d'étapes : concept initial, navigation suivante, révéler, pause. L'éditeur propose exclusivement les targets résolus et visibles au pas précédent. Un changement amont invalide les pas dépendants ; les erreurs sont indiquées à leur rang. Un fichier importé peut contenir des targets arbitraires : ils doivent tous être revalidés. L'éditeur ne comporte pas de pistes vidéo, easing manuel ou keyframes au premier lot.

## Auto : parcours déterministe et borné

L'entrée contient un focus, une recette et un budget de sauts. En v0.1, `exploration` et `association` sont les seules recettes : la première favorise la découverte de targets distincts, la seconde privilégie la salience disponible et les transitions cohérentes. Les candidats viennent uniquement de la constellation visible (limite de 3–10), avec `target.focus` et `target.groupId`. Ne pas chercher dans un index global non filtré.

### Algorithme de référence proposé

```text
resolve initial target; visited = { key(initial) }; route = [focus(initial)]
for hop in 1..maxHops:
  candidates = visible satellites of current response
  remove invalid targets, self target and visited targets
  collapse identical target keys (choose by stable order)
  normalize finite salience within current candidate list (equal -> 0.5)
  rank candidates with weights for the recipe and stable tie-break
  select highest candidate whose target resolves in the same context
  if none: report earlyStop; break
  append follow(target); update visited and current
return explicit Score + choice diagnostics
```

En cas d'erreur d'autorisation, interruption totale et diagnostic générique ; ne pas tenter un autre contexte. Un candidat non résoluble sans changement de contexte peut être écarté après erreur générique, dans le budget maximal ; pas de différence de message pour « caché » et « inconnu ». Pour ne pas amplifier les appels, la première version effectue une recherche gloutonne à profondeur bornée, pas de BFS globale. Maximum proposé : 6 sauts Auto, 12 étapes de partition, 24 requêtes de préparation pour un Score, 2 concurrentes, retries transitoires inclus. Dépasser un budget produit un arrêt explicite.

### Score de préférence (et non vérité)

`rank = wS*S + wN*N + wC*C`, où S est la salience normalisée dans les candidats visibles, N vaut 1 pour une famille de target non encore visitée et 0 sinon, C vaut 1 pour un target d'entité sans groupId et 0.5 sinon. Exploration : `(0.40,0.40,0.20)` ; Association : `(0.65,0.15,0.20)`. Ce sont des paramètres initiaux proposés, pas des scores Konstellation existants. Aucune absence de salience ne signifie faible valeur épistémique. S manquante ou non finie → 0.5. Tie-break : clé canonique stable, ou permutation déterministe de ces clés par `seed` si seed non nul (algorithme versionné, aucune utilisation de `Math.random`). Les calculs ne sont pas présentés comme de la pertinence sémantique absolue. Afficher un motif factuel : « nouveau voisin visible », « salience relative de la vue ».

## Recettes futures et préconditions

| Recette | Source requise | Refus / fallback |
|---|---|---|
| Convergence entre deux idées | Chemin explicite visible et borné, projection path/graph | Aucun chemin trouvé → ne pas dessiner de lien fictif |
| Divergence | Branches distinctes visibles ; opposition seulement si preuve qualifiée | Déploiement neutre, pas deux camps inventés |
| Causalité | DTO causal et encodage qualifié par registre + témoins visibles | Animation de relation neutre sans flèche causale |
| Évolution | Dates/périodes explicites avec ordre et incertitudes | Indiquer données non datées, pas d'ordre inventé |
| Argumentation | Relations d'argument/objection qualifiées | Comparaison neutre, pas de verdict |
| Échelle | Hiérarchie/layers attestés | Zoom graphique sans étiquette ontologique |
| Traçabilité | Liens de provenance visibles | Ne pas remonter vers source masquée |

Ces recettes sont futures ; le premier Auto n'utilise pas un `NavigationPlan` comme certificat de vérité. Le plan peut orienter vers une projection disponible dans une version ultérieure ; la projection et son audit déterminent ce qui peut être montré.
