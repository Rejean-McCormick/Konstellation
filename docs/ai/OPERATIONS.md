<!-- kOA Doc Server · Docs IA · lot 04 · proposition non certifiante -->
# Procédure IA — Konstellation

**Objet :** Lecture d’une vue approuvée, pas changement de canon.

**Source de rédaction :** `Konstellation_Code_snapshot.zip` (capture datée). Ce document ne déclare pas que les commandes ont été exécutées sur le poste local.

## Parcours recommandé

1. Vérifier `config/active-reader.json` et `config/local-catalog.json` avant d’interroger une collection.
2. Lire `docs/19-security.md` et `docs/24-api-contracts.md` pour les droits et les surfaces de réponse.
3. Séparer les projections de navigation des états canoniques Kristal; les vues affichées sont dérivées et bornées par l’accès.
4. Vérifier les résultats sur une collection de test avant tout déploiement; ne pas qualifier automatiquement une collection avec le statut du lecteur.
5. Ne pas rendre le chemin v11 obligatoire pour les lecteurs historiques compatibles.

## Documents propriétaires à consulter

`config/active-reader.json`, `config/local-catalog.json`, `docs/19-security.md`, `docs/24-api-contracts.md`.

## Vérifications avant effet

- Confirmer la racine, la révision et les versions du dépôt réellement installé.
- Ne pas substituer la présente fiche aux `AGENTS.md`, contrats, ADR et validations propriétaires.
- Ne pas copier de secrets, données privées, rapports de maturité ou sauvegardes dans un ZIP public.
- Exécuter tout diagnostic, synchronisation ou publication **seulement après décision explicite**; préserver les rapports existants.
- Le Framework v11 demeure **facultatif et non bloquant** pour Doc Server.
