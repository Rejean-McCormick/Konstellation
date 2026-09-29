# Intégrations

## Kristal : réutiliser avant de projeter

Le snapshot kristal-framework décrit v5.0.0-rc.2 comme candidat; ses documents de requête et Reader Policy sont des spécifications, pas la preuve d’un lecteur de production installé. Le Query Contract prévoit motifs de triples, ordre/pagination déterministes, métadonnées et jointures contraintes optionnelles.

Premier travail d’intégration : identifier un Runtime Pack réel et son lecteur, vérifier manifest, empreintes, schéma, politiques supportées, sortie portant les statuts, résolution de provenance et limites. Construire une matrice pour les opérations Konstellation. Une composition locale de primitives n’est acceptable que si elle reste complète et bornée; paginer une étape intermédiaire ne donne pas le droit d’en omettre le reste.

Si une projection devient nécessaire, son manifeste enregistre inputs, contrats, hash, règles et version de l’exporteur. Conserver identités d’assertion, portée, provenance, evidence, validation, certitude, autorité, reconnaissance, conflits et lineage. Une table de triples « truthy » seule ne suffit pas pour les usages épistémiques définis ici.

Aucun Runtime Pack amont n’est muté. Les sauvegardes, Lens utilisateur et sessions restent l’état opérationnel de Konstellation. Une mise à jour du corpus prépare une nouvelle projection et un contexte distinct; elle ne remplace pas silencieusement celui d’une requête sauvegardée.

## SA : intégration tardive et explicite

Le snapshot SA contient un pipeline implémenté selon son document de statut. Son entrée canonique inclut `request_schema_version`, `semantic_graph`, `obligations`, `communication_context`, `presentation_constraints`, `requested_capability_profile` et éventuellement `runtime_selector`.

L’adaptateur Konstellation → SA reste à développer. Il sélectionne un périmètre explicite : requête, une fiche ou la page affichée. Il ne demande pas « résumer toute la collection » en transmettant seulement la page courante. Il transporte sources, polarité et statuts communicativement nécessaires dans des obligations obligatoires.

Une réalisation réussie exige la couverture de toutes les obligations. Le RuntimeSet exact, le profil et la langue doivent être admis; un schéma valide n’en constitue pas la preuve. Si le profil manque, l’interface conserve les résultats structurés et indique l’indisponibilité de la formulation SA. Aucun pseudo-GF ou changement de langue silencieux.

Le SemantiK Runtime Orchestrator reste en amont de l’activation des artefacts linguistiques. Konstellation ne reconstruit ni ne promeut un RuntimeSet pendant une navigation.
