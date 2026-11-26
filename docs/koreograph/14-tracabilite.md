# 14 — Traçabilité des exigences et décisions à confirmer

Toutes les exigences ci-dessous sont des cibles, non des capacités livrées. `KOR-x` renvoie aux lots de [livraison](11-livraison-exploitation.md).

| ID | Exigence | Lot | Vérification attendue |
|---|---|---|---|
| KR-01 | Animation vectorielle sans IA, à partir d'une vue réelle | KOR-1/2 | Démo SVG, pas d'appel génératif, code audité |
| KR-02 | Réutiliser les API de Konstellation sans nouveau graphe | KOR-1 | Trace des appels et revue adaptateur |
| KR-03 | Intention sémantique au lieu de coordonnées | KOR-1/3 | Score sans coordonnées ni tokens ; capture confirmée |
| KR-04 | Auto déterministe et borné | KOR-3 | Même seed/snapshots → même Score ; cycles/cul-de-sac |
| KR-05 | Continuité visuelle par target, pas label | KOR-2 | Golden G1/G2, aucune fusion ambiguë |
| KR-06 | Une timeline pure pour aperçu et exports | KOR-1/4/5 | frameAt aux limites, comparaisons frames |
| KR-07 | Aucun sens non attesté, preuve et troncature conservées | KOR-2/6 | Golden G4/G7 ; fallback neutre |
| KR-08 | Une interface simple, annulation, contrôles clavier | KOR-3 | Test utilisateur, axe accessibilité |
| KR-09 | Formats sans dépendances lourdes par défaut | KOR-4 | HTML offline, poster, Score sans FFmpeg |
| KR-10 | SVG animé et vidéo optionnels avec compatibilité vérifiée | KOR-5 | Matrice de supports, durée et résolution |
| KR-11 | Aucun contournement de policy, aucune publication implicite | Tous | Tests négatifs, revue export et logs |
| KR-12 | Pas de régression Explorer, v11 isolé | Tous | Flag off, suite existante selon gates |
| KR-13 | Architecture extensible sans moteur spécialisé par domaine | KOR-6 | Adaptateurs déclarés et testés, noyau inchangé |
| KR-14 | Reproductibilité et transparence des limites | KOR-4/5 | Manifeste, versions, diagnostics, preuves de recette |

## Arbitrages retenus pour simplifier (proposés)

- Développer dans Konstellation avant d'envisager un repo Koreograph autonome ; API interne minimale, moteur pur exportable.
- Priorité au lecteur SVG et au HTML offline ; SVG animé autonome et vidéo après stabilisation de la timeline.
- Choisir une tranche Script avant Kapture pour vérifier le cœur avec peu d'UI ; Auto glouton ensuite, pas d'algorithme global de planification.
- Première version limitée au focus Constellation traditionnel ; recettes sémantiques spécialisées soumises à des preuves qualifiées.
- Durée automatique et thème minimal de départ ; les presets et plafonds sont proposés, non calibrés sur utilisateurs.

## Questions ouvertes (ne bloquent pas KOR-0)

1. Quel support de diffusion est prioritaire : site Web, présentation, réseau social ou vidéo ? Cela décide de la matrice SVG animé et formats de sortie.
2. Quels Kristals et politiques sont autorisés pour les premières démos réelles ou publiques ? Utiliser synthétique tant que non confirmé.
3. Quelle esthétique (typographie, contraste, marque) doit être conservée dans les exports ? Ne pas introduire d'assets propriétaires sans vérification de droits.
4. Faut-il un CLI après le MVP ? Envisager `koreograph render score.json` uniquement si le mode local UI ne suffit pas ; aucun CLI actuel.
5. Quelle machine de référence et quels navigateurs/logiciels hôtes doivent constituer les gates ? Les seuils sont à mesurer.
6. Un adaptateur v11 indépendant sera-t-il souhaité ? Exige son propre contrat et modèle d'autorité, non une migration implicite.

La revue propriétaire valide ou modifie les décisions avant implémentation. Les docs peuvent évoluer sans prétendre remplacer les ADRs existants. Tout changement d'autorité, de publication ou de périmètre de lecture nécessite une revue dédiée.
