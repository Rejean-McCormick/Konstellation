# 13 — Exemples et glossaire

## Démonstration fictive de référence

Les identifiants `demo:conscience`, `demo:identite`, `demo:memoire` désignent des concepts inventés pour cette fixture documentaire. Ils ne désignent aucune entité vérifiée du corpus fourni et aucune relation philosophique canonique n'est affirmée. Pour une démo réelle, substituer les targets résolus dans le Kristal actif.

[exploration.score.json](examples/exploration.score.json) : partir de Conscience, révéler jusqu'à trois voisins, suivre Identité, tenir 1800 ms, suivre Mémoire. La préparation doit vérifier que chaque target est un satellite du pas précédent. [auto.score.json](examples/auto.score.json) : même départ, exploration automatique de trois sauts maximum. La sortie exacte dépend des réponses visibles et de la seed. [exploration.bundle.json](examples/exploration.bundle.json) : mini-exemple illustratif d'un passage Conscience → Identité, volontairement plus court que le Score complet ; il démontre le format Bundle et non une compilation attestée de la partition complète.

| Temps du mini-bundle | État |
|---|---|
| 0–1200 ms | Conscience au centre, Identité comme satellite |
| 1200–2600 ms | Identité se recentre ; Conscience survit comme satellite |
| 2600–4400 ms | Hold sur Identité, nouvelle scène stable |

## Exemples de refus

- Score vers `demo:secret` absent des satellites visibles : `KOR_TARGET_UNAVAILABLE` ; pas de label récupéré ailleurs.
- Focus et groupId différents malgré même label : deux targets distincts ; ne pas fusionner.
- Même seed, autre Reader Policy : nouvelle résolution obligatoire ; l'ancien Bundle n'est pas réutilisé.
- Relation « influence » seulement dans un texte : aucune flèche causale sémantique automatique.
- Score demandant 30 transitions en 15 secondes : rejet des budgets ou durée à renégocier, pas de montage accéléré silencieux.

## Glossaire

| Terme | Définition |
|---|---|
| Kristal | Source de connaissance dont l'autorité ne relève pas de Koreograph |
| Konstellation | Lecteur adaptatif et navigateur des vues autorisées |
| Koreograph | Couche procédurale de mise en mouvement de ces vues |
| Kapture | Mode d'enregistrement des intentions confirmées |
| Auto | Mode de génération bornée d'un parcours |
| Script | Mode de composition explicite des étapes |
| Score | Partition déclarative versionnée |
| Target | Couple focus structuré et groupId nullable |
| Snapshot | Réponse de lecture autorisée figée pour préparation |
| Scene | État visuel à un instant clé, sans animation implicite |
| Bundle | Scènes, segments, métadonnées et avertissements compilés |
| Segment | Intervalle temporel et primitive reliant deux scènes |
| Frame | État calculé pour un instant précis |
| Primitive | Opération de mouvement, neutre sauf preuve qualifiée |
| Recette | Règles de sélection d'un parcours ou de mise en scène |
| Salience | Indice de préférence de navigation, non valeur de vérité |
| Reader Policy | Frontière de lecture appliquée par le moteur existant |
| visualAudit | Statut et preuves locales d'encodages dérivés dans une projection |
| Troncature | Limite explicite des données ou de la présentation, pas absence canonique |
| Seed | Paramètre déterministe de départage, non source d'aléa implicite |
| Poster | Frame statique exportée avec contexte de lecture |
