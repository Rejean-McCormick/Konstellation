# Mise à jour consolidée Konstellation — K0 à K8

**État de consolidation : 20 novembre 2026.** Ce document accompagne la livraison de code, et n'atteste pas une publication distante.

## Périmètre

La consolidation réunit les modifications successives de K0–K3, K4, K5, K6, K7 et K8, **46 fichiers applicatifs distincts dans leur état final**. Elle ne change ni la version de `package.json` (toujours `1.0.0-rc.2`), ni les autorisations des sources Kristal, ni les projets Konstellation-Light, Publisher et SPEK.

- **K0–K3 :** grammaire de signaux visuels, oppositions attestées, causalité signée par règle explicite ; politique de lecture respectée.
- **K4 :** canaux de forme, couleur, taille, coordonnées et distances qualifiées avec unités, témoins et refus des ambiguïtés.
- **K5 :** audit de véritables sources et moteur de hiérarchie conditionné à une revue explicite, une identité de données et une politique de lecture.
- **K6 :** traitement privé par lots et deux passes sur états v6 ; inventaires et SVG diagnostiques.
- **K7 :** index canoniques de profils hétérogènes et recommandations ciblées ; absence d'assertion métier inventée.
- **K8 :** ateliers de revue et comparaisons littérales avant/après avec références de témoins.

## Couverture du snapshot utilisé

Le snapshot privé `kristal-public_Code_snapshot.zip` audité lors des exercices K6–K8 contenait **126 dossiers**, dont **84 états natifs v6** (40 333 assertions inventoriées) et **42 profils hétérogènes** analysés au niveau de leurs index. Dans les index hétérogènes, 394 artefacts étaient déclarés : 387 disponibles et 7 absents. Ces chiffres caractérisent **ce snapshot**, et non le dépôt vivant à une date ultérieure.

Les SVG et rapports générés à partir de sources non filtrées sont des **diagnostics privés**, non des sorties autorisées pour des lecteurs. Ils ne doivent pas être publiés ni considérés comme preuve d'une qualification approuvée.

## Portée de la validation

L'opérateur a confirmé, pour chaque jalon jusqu'à K8, des exécutions Windows réussies des tests complets et de la compilation Astro. Le présent pack exécute à nouveau les contrôles avant de déclarer sa propre validation. Le navigateur, la revue métier, les politiques d'accès réelles et un déploiement distant restent des validations distinctes.

**Au moment de K8 : `qualifications_default_inactive = true`, `semantic_qualified_diagrams = 0`.** Aucun graphe de connaissances ne reçoit implicitement une autorisation d'après une légende, un nom de relation ou une statistique d'inventaire.

## Gouvernance

1. Une règle de signification visuelle est proposée avec identifiant exact de relation/attribut, direction, unités, portée, témoin et règle d'autorisation.
2. La revue est explicite ; elle est rattachée à une version des données et une Reader Policy compatibles.
3. Les diagrammes privés issus des assertions filtrées peuvent ensuite être qualifiés.
4. Seules les opérations expressément autorisées peuvent publier des sorties ; aucune autorisation n'est inférée de ce pack.

Consulter `docs/45-procedure-release-k0-k8-20261120.md` pour l'intégration Git contrôlée et les prochaines revues.
