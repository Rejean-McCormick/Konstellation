# Décisions d’optimisation

## Ce qui change

1. **La sélection d’ensembles devient le modèle central.** Filtrer, inspecter et pivoter sont des opérations différentes. Le pivot porte sur la sélection complète, jamais implicitement sur la page visible.
2. **Un arbre borné suffit au premier moteur.** Une sélection possède un type, des critères et des contraintes existentielles sur des entités liées. Pas de langage graphe universel, variables libres, cycles ou chemins arbitraires en v0.2.
3. **La politique de lecture est explicite et indépendante de la Lens.** Elle vient de Kristal ou d’un profil conforme qualifié. Konstellation n’invente pas un nouveau classement de confiance.
4. **Le backend est choisi après qualification.** Réutiliser le lecteur de Runtime Pack s’il existe et convient. Ajouter une projection si une limitation mesurée le justifie. Ne pas obliger chaque installation à reconstruire un graphe RDF.
5. **Le visuel reste fondamental, l’éditeur libre attend.** Facettes, aperçu structuré des critères et parcours cliquable avant drag-and-drop.
6. **Les résultats expliquent leurs correspondances.** Les témoins sont des assertions visibles, avec provenance et statut conservés; un badge sur l’entité entière ne remplace pas ces informations.
7. **L’interface fonctionne sans SA.** Des libellés traduits et des fiches structurées suffisent. Une erreur SA n’est pas convertie en prétendue réalisation linguistique réussie.

## Hypothèses et choix différés

Astro/Svelte est conservé comme choix de projet déjà envisagé; les versions et compatibilités de bibliothèques restent à vérifier au démarrage du frontend. Aucun benchmark ni comparaison actuelle des licences n’est revendiqué ici.

Svelte Flow, Cytoscape, QLever, recherche fédérée, texte libre, éditeur de Lens et synchronisation multiutilisateur attendent un besoin démontré. Les points d’extension n’exigent pas de dépendances installées.

On ne déclare pas l’architecture « optimale » en performance sans mesures. Cette révision optimise la cohérence, la surface à implémenter et les possibilités de qualification.
