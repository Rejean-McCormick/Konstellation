# Contrôle de la livraison documentaire — v0.2, 26 novembre 2026

## Base et périmètre

Cette révision reprend le `/docs` complet de `Konstellation_docs_avec_Koreograph.zip` (v0.1), et le snapshot `znapshot_Konstellation_11260852.zip` pour les références vers le dépôt. Les fichiers historiques de Konstellation hors index sont conservés. Les contrats Score/Bundle et les trois fixtures JSON v0.1 restent inchangés. Le prototype SVG déjà fourni est copié dans les exemples, sans modification ; il précède la décision de marque et n'est pas une sortie du futur compilateur.

## Contrôles réellement effectués sur v0.2

- Script du dépôt `node scripts/check-docs.mjs` exécuté après assemblage du `/docs` avec les autres fichiers du snapshot : liens relatifs vers les sources et les docs vérifiés. Les liens vers les fichiers applicatifs supposent l'intégration à la racine du repo ; un ZIP `/docs` seul ne contient pas ces fichiers externes.
- [Script documentaire](validate-design.py) exécuté avec Python, `jsonschema` et `referencing`, registre de schémas local sans résolution réseau : 5 JSON Schemas Draft 2020-12 valides, 5 exemples Score/Bundle/Request/Plan acceptés, 8 presets Theme acceptés, 26 mutations négatives rejetées (21 par schémas, 5 par contrôles transversaux).
- Contrôles transversaux : Bundle synthétique (identités, liens, focus, viewport, segments), demande (aspect), Plan (digests, durée, alignement et continuité des poses fixes, références et textes des trois captions). Le script est limité aux fixtures, pas un validateur générique de production ni une implémentation générale JCS.
- 48 ratios de contraste de tokens sur fonds opaques : 2 tokens texte et 4 tokens graphiques par thème, seuils 4,5:1 et 3:1 respectés ; minimum texte 5,98:1, minimum graphique 3,61:1. Ces contrôles ne portent pas sur les combinaisons avec alpha, sur les remplissages adjacents, sur le rendu des labels ou sur une simulation du daltonisme. Ils ne constituent pas une qualification WCAG du produit.
- Prototype SVG : XML bien formé, éléments `animate` présents, aucun script/foreignObject, href ou attribut d'événement détecté ; aucune lecture visuelle navigateur effectuée dans cette révision.

Pour répéter localement, depuis le repo avec `/docs` intégré et les dépendances Python déjà installées :

```bash
node scripts/check-docs.mjs
python docs/koreograph/validate-design.py
```

Les assertions du script Python doivent rester actives (ne pas lancer avec `-O`). Aucun ajout aux dépendances applicatives npm n'est nécessaire pour ces contrôles. Les fixtures ne sont pas des Kristals réels. Le plan synthétique porte `review`, et non `pass`, car le moteur et son rendu n'ont pas été validés.

## Non vérifié / décisions proposées

Pas de build Astro, tests Vitest/Playwright, implémentation Svelte, intégration effective des API, test réel Reader Policy, mesure de performance, export vidéo, test de compatibilité des animations SVG, ni qualification de release. Les noms de presets, tokens secondaires, choix de formes, seuils, budgets, ordre des lots et contrats d'extension restent des propositions techniques. Les deux choix propriétaires sont la marque #1E6864 et la possibilité de choisir des thèmes monochromes ou polychromes. Les familles spécialisées et la coloration par type de relation sont documentées comme extensions conditionnées aux preuves ; leur contrat Bundle spécialisé reste à finaliser et valider lors de KOR-6. L'extension multilingue est hors cible de cette itération.

Aucun commit/push, publication, changement de droits ou de code applicatif. Ce livrable est une archive documentaire, non le dépôt distant.

## Mise à jour moteur 0.2.0

Voir [23 — Durcissement](23-durcissement-v0.2.md) et [matrice Chromium synthétique](qualification/runtime-matrix-synthetic.json). Les résultats documentaires historiques ci-dessus ne sont pas une qualification de release.

## Mise à jour 0.3.0

Voir [24 — Spécialisations et production](24-specialisations-v0.3.md) pour les résultats de la tranche 0.3.0 et les limites de qualification sur données réelles.

## Correctif d'intégration 0.3.2

Voir [24 — Correctif d'intégration v0.3.2](24-specialisations-v0.3.md). Les tests Node ciblés sont 31/31 dans l'environnement de préparation ; le nouveau test Vitest et la compilation Astro doivent être exécutés sur le poste propriétaire. Aucun résultat de la révision précédente ne constitue une qualification du nouveau build.
