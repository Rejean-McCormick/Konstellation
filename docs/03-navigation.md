# Navigation et Lens

## Écran initial

L’utilisateur choisit une entrée lisible (« Histoire intellectuelle », « Sociodémographie »). Le type racine peut rester discret. Une catégorie qui ajoute une contrainte doit toutefois produire un critère visible : « Philosophe » n’est pas une simple décoration si elle filtre les résultats.

La v0.2 des Lens propose un type racine, des facettes et des pivots; elle n’exécute pas de filtres cachés. Les raccourcis avec critères sont des requêtes enregistrées visibles, séparées des Lens.

## Surface principale

1. Angle d’exploration et politique de lecture, affichés séparément.
2. Facettes : relation, opérateur, valeurs; état disponible, indisponible ou vide.
3. Aperçu des critères avec suppression individuelle et réinitialisation.
4. Résultats et inspecteur « Pourquoi cette correspondance ? ».
5. Chemin des pivots avec retour/annulation.

Une relation est proposée à partir de la Lens et du registre; sa disponibilité provient des capacités du backend. Une facette disponible sans résultat n’est pas une facette non supportée. Ne pas réordonner constamment les facettes en fonction des résultats : garder la structure de la Lens stable.

## Changement de Lens

À type racine identique, changer la Lens ne change aucun filtre. Les filtres absents de la nouvelle Lens restent visibles dans une zone « Autres critères actifs ». Si le type racine diffère, proposer explicitement une nouvelle exploration ou un pivot compatible. Une Lens ne modifie jamais automatiquement la Reader Policy.

Un changement de politique réévalue toute la requête et invalide les curseurs. Les résultats et le contexte actif portent la même révision; une réponse réseau ancienne ne remplace pas l’état récent.

## Compteurs

Dans une même facette, plusieurs valeurs signifient OR. Entre facettes, AND. Pour calculer les compteurs d’une facette, retirer ses propres filtres **au niveau de sélection courant**, tout en conservant les autres contraintes, les sous-sélections et la politique. Compter les entités distinctes. Des totaux peuvent se chevaucher : leur somme n’est pas nécessairement le total.

Les valeurs multivaluées se dédupliquent. Aucun compteur tronqué n’est présenté comme exact. Le premier profil peut renvoyer « non calculé » et charger les compteurs à la demande; le résultat principal ne doit pas attendre tous les compteurs.

## Accessibilité et volume

Tout le parcours fonctionne au clavier et dans une vue structurée sans graphe. Le graphe relationnel se limite d’abord au voisinage demandé, avec budget de nœuds et mention de troncature. Ses limites ne changent jamais la requête de résultats. Charger le voisinage est une inspection; filtrer à partir d’un voisin est une action distincte.

L’état sauvegardé associe QuerySpec, référence de Lens et préférences visuelles. Une URL contient un état compact non sensible, ou une référence de sauvegarde soumise aux permissions. Elle n’inclut ni tokens d’accès ni corpus privé embarqué. Si une release n’est plus disponible, afficher l’indisponibilité et proposer explicitement une migration.

Le schéma `exploration-state` livré sérialise le point courant. L’historique annuler/rétablir est une liste locale bornée de ces snapshots (100 entrées proposées); il n’est pas inclus dans le fichier partagé de cette première version. Restaurer un fichier recharge son point courant, pas toute une session passée.

## Constellation v0.5

La vue Constellation est une **inspection navigable**, pas un autre langage de requête. Elle conserve la QuerySpec courante et place un focus au centre. Un clic peut ouvrir un groupe de navigation (par exemple « Pensée » ou « Œuvres et sources ») ou recentrer une entité/source/valeur. Le fil d’Ariane permet de revenir au focus précédent sans réécrire silencieusement la sélection.

Le nombre maximal de satellites est réglable de 3 à 25. La sélection est faite côté Query Service. Une Lens peut déclarer `constellation.groups` avec une priorité éditoriale et une source `relations` ou `qualifiers`. Si elle ne le fait pas, le service construit des groupes explicables à partir des relations visibles, des qualificatifs préservés et des sources.

La saillance est déterministe. Elle combine priorité de Lens, nombre d’assertions, nombre d’entités atteignables et diversité des sources, puis applique une pénalité de redondance de type maximal-marginal-relevance. Le score signifie uniquement « utile à afficher dans cette exploration »; il ne mesure ni vérité, ni importance historique intrinsèque.

Les qualificatifs servent d’index de navigation. Par exemple un `corpus:theme` peut mener d’un auteur vers « Grâce », puis vers les auteurs et positions portant ce même thème. Cette projection ne crée aucune nouvelle assertion et reste entièrement soumise à la Reader Policy active.
