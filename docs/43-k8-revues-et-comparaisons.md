# K8 — Revue par lots, témoins exacts et comparaison visuelle (2026-11-19)

## Périmètre

Correctif **K7 → K8**, destiné au dépôt Konstellation complet. K7 est déjà validé localement et a produit 84 + 42 rapports techniques. K8 ne modifie ni les données canoniques, ni Light, ni Publisher, ni SPEK. Le seul composant existant modifié est `TreeView.svelte`; les autres fichiers sont nouveaux.

Le but est de faire évoluer des diagnostics de *comptage* vers une **revue d'assertions explicitement attestées**. Une représentation par flèches des triples source–prédicat–objet n'est qu'une **lecture littérale**, non une interprétation de hiérarchie, causalité, quantité ou opposition.

## Preuves et non-fabrication

Un dossier K8 natif comporte un `sourceSha256`, les identifiants de relations et leurs comptages vérifiés contre le fichier v6, les échantillons exacts (identifiant d'assertion, sujet, prédicat, objet, statut et références d'évidence), et les conseils de revue K7. Toutes les sorties sont inactives et privées. Une unité manquante, un prédicat trompeur, un référent non visible ou un artefact sans adaptateur ne peut créer de règle.

Le traitement charge uniquement les trois ZIPs épinglés (source `kristal-public`, sorties privées K6 et K7). Il vérifie les SHA-256 des ZIPs puis la cohérence des états v6, des préconisations et des sources. Aucun chemin de sortie ne peut se trouver dans le dépôt ou les sources. Les sorties sont immuables et relançables si leurs bytes sont identiques.

## Réel vs revu

| Niveau | Entrée | Utilisation permise |
|---|---|---|
| Source brute K8 | ZIP exact et rapports privés K6/K7 | Diagnostics privés, échantillons d'assertions, avant/après littéral |
| Candidat de sémantique | Dossier K8 + revue proposée | Travail éditorial seulement; aucune activation |
| Règle explicitement examinée K4/K5 | Décision éditoriale, identités exactes, témoins visibles | Vue dérivée de la Reader Policy correspondante |
| Publication | Autorité distincte | **Non comprise** dans K8 |

Le vrai comparateur **Avant / Après K8** du renderer `TreeView` n'est visible que lorsque `hierarchySemantics.status === 'reviewed-visible-hierarchy'`, un résultat du compilateur K5 alimenté par l'état de lecture filtré. Il affiche le mode brut (orientation de navigation) et la hiérarchie justifiée avec les témoins par arc. Hors qualification, la vue reste neutre. Une vue tronquée reste explicitement partielle.

## Sécurité et limites

- Aucune autorisation déduite du champ `reviewer` d'un rapport de lot. Le **seul** registre actif de hiérarchie demeure `config/visual-hierarchy-reviews.json`.
- Les 126 dossiers concernent des snapshots : leur couverture ne prouve pas une couverture réelle des lecteurs ou des autorisations.
- L'archive K8 peut inclure des identifiants et des échantillons de sources **non filtrées**. Conserver localement; ne pas transférer sur une interface publique.
- Les 7 fichiers canoniques absents et les 7 JSON surdimensionnés signalés par K7 ne sont pas réparés par K8.
- La validation Astro sur le Windows de l'utilisateur est requise avant de déclarer l'installation K8 validée.

## Étapes de qualification après K8

1. Prioriser Zoologie comme premier cas de direction/hiérarchie; Météorologie comme garde négative scalaire.
2. Obtenir les vrais `datasetRef`, `readerPolicyRef`, témoins visibles et une revue externe approuvée.
3. Renseigner le registre K5 strict, tester politiques positives/négatives puis visualiser la comparaison en navigateur.
4. Mesurer la qualité : taux de témoins visibles, bornes de troncature, erreurs/refus, lisibilité, accessibilité et stabilité interlangue.
