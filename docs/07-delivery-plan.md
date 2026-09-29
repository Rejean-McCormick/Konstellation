# Plan de livraison

Les étapes ont des critères de sortie, sans calendrier arbitraire.

| Étape | Livrable | Critère de sortie |
|---|---|---|
| 0. Qualification amont | Pack, lecteur, policies et matrice de capacités | Distinguer réellement supporté / composable / absent; décision argumentée sur projection |
| 1. Contrats et noyau | QuerySpec validé, registre, transformations pures et vecteurs | Filtres multivalués, pivots complets, limites et absence testés |
| 2. Première verticale | Deux Lens, facettes, liste, inspecteur, retour, sauvegarde | Même moteur pour histoire intellectuelle et sociodémographie; aucun branchement par domaine |
| 3. Véritable lecture Kristal | Adaptateur, politiques, statuts et témoins | Résultats attendus sur pack figé; aucune fuite via compteurs ou provenance |
| 4. Qualification opérationnelle | Mesures, annulation, pagination, gestion d’erreurs | Rejeu stable, limites explicites, budgets documentés et UX d’indisponibilité |
| 5. SA optionnel | ACL produit et profil linguistique qualifié | Sources/statuts conservés et couverture intégrale; panne SA sans perte d’exploration |
| 6. Extensions guidées par usage | Graphe avancé, éditeur de Lens ou nouveau backend | Besoin démontré et conformité conservée |

La verticale peut commencer sur données synthétiques clairement étiquetées; elle ne doit jamais être présentée comme une connexion Kristal réelle.

## Scénarios d’acceptation prioritaires

1. Recherche de personnes par période et domaine; motif de correspondance inspectable.
2. Changement de Lens sans suppression des filtres invisibles dans la nouvelle Lens.
3. Pivot sur 120 personnes avec page de 50 : les œuvres des 70 autres participent au résultat.
4. Œuvre à plusieurs auteurs : au moins un même auteur doit satisfaire toute la sous-sélection.
5. Deux valeurs d’une relation, dont X : `none_of X` exclut l’entité, même si l’autre valeur diffère.
6. Valeur cachée par politique : pas de correspondance positive ni de compteur révélateur; absence formulée dans la vue.
7. Pack ou politique changé : curseur rejeté, ancienne requête non remappée silencieusement.
8. Date incomplète : pas de naissance transformée en période de vie infinie.
9. Relation non supportée : diagnostic distinct de zéro résultat.
10. Deux assertions contradictoires : témoin et statuts conservés; pas de synthèse factuelle inventée.
11. Historique : Retour restaure la requête exacte, contrairement à un pivot inverse.
12. Réponse réseau obsolète ignorée; navigation clavier complète.

## Definition of done v1

Un utilisateur choisit une Lens, filtre, comprend les correspondances, pivote sur la sélection entière, consulte la provenance et restaure une exploration. Tout résultat vient d’un contexte identifiable. Les capacités manquantes sont explicites. SA et l’éditeur de graphes ne conditionnent pas cette première livraison.
