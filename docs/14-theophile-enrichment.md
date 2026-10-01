# Enrichissement Théophile — idées, questions et auteurs

Cette livraison ajoute une couche de navigation sémantique au corpus Théophile sans transformer les rapprochements éditoriaux en faits historiques.

## Relations ajoutées

- `corpus:appuie_sur_position` : une question philosophique vers ses positions documentaires ;
- `corpus:mobilise_theme` : une question vers les thèmes portés par ces positions ;
- `corpus:met_en_dialogue_auteur` : une question vers les auteurs ou instances mobilisés ;
- `corpus:auteurs_mis_en_dialogue` : projection vers les auteurs lorsqu’une relation entre deux positions existe déjà.

Le pack embarqué contient 99 thèmes Théophile comme entités navigables. Les qualificatifs conservent les positions sources, le type de relation et l’origine éditoriale afin que chaque raccourci reste explicable.

## Parcours proposés

- **Auteurs et idées** : auteur → thèmes → positions → autres auteurs ;
- **Questions philosophiques** : question → auteurs / thèmes / positions ;
- **Positions et relations** : position → convergence / divergence / complément / distinction / réception ;
- **Idées et thèmes** : thème → questions et participants reliés.

Le profil `theophile:exploration` affiche à la fois les assertions `sourced` et les liens `claimed` afin que la navigation enrichie soit visible, tout en conservant les statuts épistémiques distincts dans les données.

## Recherche biblique intégrée

Le pack enrichi embarque également le graphe biblique complet (personnes, variantes de noms, relations entre personnes, rôles, œuvres et traditions). Le runtime charge ce pack local par défaut. Le lanceur refuse désormais de se rabattre silencieusement sur un ancien pack externe.

Les homonymes de type `person` reçoivent un champ `disambiguation`. Une recherche `Joseph` expose ainsi les 12 entrées distinctes du graphe biblique, dont « fils de Jacob et Rachel », « époux de Marie », « d’Arimathie », « Barsabbas / Justus » et « Barnabé ». La recherche du catalogue interroge toutes les entités du bootstrap au lieu de filtrer uniquement la page courante.

Trois perspectives sont chargées avec le pack enrichi : **Personnages bibliques** (`person`), **Œuvres bibliques et para-bibliques** (`work`) et **Traditions canoniques** (`tradition`). La perspective des personnages exploite les relations de parenté, disciples/maîtres, rôles et attributions d’œuvres déjà présentes dans le Biblical Graph.
