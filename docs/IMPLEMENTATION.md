# Implémentation v0.5

## Surface livrée

Le moteur Node traite les QuerySpec 0.2. Il utilise les opérateurs `exists`, `missing_in_view`, `in`, `none_of` et `overlaps`, les conjonctions, les liens existentiels corrélés et les IDs explicites. Les traversées inverses proviennent du registre. Les témoins constituent une preuve suffisante choisie de manière déterministe; `witnessesComplete` signifie que ce parcours de preuve est complet, pas que toutes les assertions alternatives ont été énumérées. L’inspecteur donne les assertions visibles complémentaires.

Le pack normalisé est chargé et validé une fois au démarrage. Son hash de contenu, celui du registre, du profil d’exécution et de la politique constituent le contexte. La version d’adaptateur dans le profil doit être incrémentée à chaque changement sémantique. L’ordre stable est celui des identifiants selon la comparaison ECMAScript des chaînes. La canonicalisation JSON triée est locale à cette implémentation; l’interopérabilité avec d’autres implémentations de hash n’est pas certifiée.

Les facettes retirent leurs filtres propres uniquement au niveau courant. Elles conservent les sous-sélections. Une relation sans inverse reste filtrable mais n’est pas offerte comme pivot. La vue Constellation expose de 3 à 25 satellites selon la préférence utilisateur; le moteur de sélection conserve la population entière. Les satellites sont projetés côté service depuis les relations, sources et qualificatifs visibles, puis classés de façon déterministe.

L’état de sélection appartient à QuerySpec. Lens, vue, panneau et identité inspectée appartiennent à ExplorationState. Les 100 snapshots d’historique restent en mémoire; seuls les points sauvegardés sont persistés dans localStorage. La sauvegarde exportée n’inclut pas l’historique complet. Le chemin de constellation et sa limite de satellites appartiennent à ExplorationState. Les coordonnées SVG sont déterministes et ne sont pas persistées.

## Lecture et permissions

Le profil `konstellation.normalized-reader.v1` exige des listes explicites pour statuts, certitudes, statuts de validation, modes validés et autorités. `*` signifie explicitement « toute valeur ». Une liste vide n’admet rien. Les sources peuvent être obligatoires. Un `domain` optionnel restreint la portée. Tout champ de politique non reconnu est rejeté; un profil amont complexe doit être adapté et qualifié, jamais ignoré.

Les rôles sont des permissions statiques de l’instance. Les entités, assertions et sources peuvent porter `roles`. L’utilisateur du serveur dispose des rôles configurés côté opérateur; il ne peut les choisir via HTTP. Les caches et curseurs comprennent cette partition. Le catalogue d’entités et sa classification sont des métadonnées de publication du pack, distinctes de ses assertions : ils respectent les rôles mais ne disparaissent pas automatiquement quand une politique masque toutes les assertions. Une évolution vers une classification intégralement justifiée par assertions exige un profil supplémentaire.

Aucun service d’authentification ou environnement multitenant n’est livré. L’instance écoute par défaut sur 127.0.0.1. Les Host et Origin sont vérifiés. Un déploiement partagé demande authentification, isolation par utilisateur et qualification du périmètre; changer simplement HOST n’ajoute pas ces fonctions.

## Capacités amont

| Intégration | Statut |
|---|---|
| Pack local normalisé | Exécutable, validé au chargement |
| Import SES v5, identités explicites, objets item/string/entier sans unité | Exécutable et testé |
| Qualificatifs arbitraires, dates amont, quantités avec unités | Refus explicite; recette dédiée nécessaire |
| Vérification du content_hash SES pour le profil d’exclusion pris en charge | Implémentée; absence de content_hash consignée, aucune signature prétendue vérifiée |
| Runtime Pack Kristal | Lecture Parquet/JSON et projection HTTP, mappings explicites et contrôles d’intégrité |
| ReaderPolicies Kristal v5 | Profil exécutable documenté dans INTEGRATIONS.md; extensions inconnues refusées |
| RDF/Oxigraph, QLever | Non nécessaires au moteur livré; futurs adaptateurs |
| SA/GF | Génération, export, découverte, validation, rendu et contrôle de couverture; service externe à configurer |
| Interaction Kernel | Pas de profil exigé par le fonctionnement local; pas de bus UI |

## Limites opérationnelles

Le backend charge un pack en mémoire et publie le catalogue autorisé au démarrage de l’interface. Cette implémentation vise un corpus local ciblé, pas un graphe de milliards de triples. Les budgets sont de 3 traversées, 32 filtres, 16 liens, 100 valeurs/IDs par liste, 100 résultats par page et 64 Kio par requête HTTP. Le moteur refuse plus de 2 millions d’opérations ou un calcul dépassant environ 3 secondes (contrôle périodique). Un cache de 64 requêtes est conservé par instance.

Une opération synchrone peut bloquer brièvement le processus Node dans ce budget; une séparation en workers ou un backend indexé devra précéder une mise à l’échelle multiutilisateur. Les totaux sont exacts lorsque la requête réussit; aucun résultat tronqué n’est présenté comme complet.

Les facets de plus de 100 valeurs montrent les premières valeurs; les IDs supplémentaires restent accessibles via QuerySpec. La recherche de la barre de résultats est explicitement limitée à la page affichée. Une recherche plein texte globale n’est pas annoncée.

## Choix frontend

Le frontend conserve une seule implémentation interactive Svelte. La Constellation est un SVG borné sans bibliothèque supplémentaire; le Query Service, et non le composant graphique, choisit les satellites. L’interface est en français; les labels français et anglais restent dans les configurations. La traduction intégrale de l’interface reste distincte des langues publiées par le service SA configuré.
