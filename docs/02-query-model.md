# QuerySpec : sélection et pivots

## Contrat proposé 0.2

Un QuerySpec contient :

- `schemaVersion`;
- `context` : références immuables au corpus, registre, politique de lecture et profil d’exécution;
- `selection` : arbre de sélection;
- `order` : ordre total; v0.2 ne propose que l’identifiant stable;
- `pageSize` : taille demandée, sans curseur.

Le curseur est un paramètre de transport; l’état visuel et les libellés n’appartiennent pas au sens de la requête. Le profil d’exécution inclut versions du moteur, de l’adaptateur, de la projection éventuelle, normalisation, règles dérivées et limites. Les références d’exemple `fixture:*` sont synthétiques et ne désignent pas des releases réelles.

## Sélection

`entityType` est obligatoire. `ids`, lorsqu’il existe, restreint aux identifiants énumérés. `filters` et `links` sont des conjonctions; une liste vide ne restreint rien. Chaque `in` est une disjonction entre ses valeurs. Les résultats ont une sémantique d’ensemble : une entité n’apparaît qu’une fois, même si plusieurs assertions la font correspondre.

Filtres v0.2 :

| Opération | Sens dans les assertions visibles |
|---|---|
| `exists` | Au moins une valeur existe pour la relation |
| `missing_in_view` | Aucune valeur visible ne correspond à la relation, dans une vue évaluée complètement |
| `in` | Au moins une valeur appartient à l’ensemble demandé |
| `none_of` | Aucune valeur n’appartient à cet ensemble; accepte aussi l’absence de valeur |
| `overlaps` | Un intervalle normalisé correspond à la période selon la règle déclarée |

Pour « une valeur renseignée, mais jamais X », combiner `exists` et `none_of`. On évite `not_equals`, ambigu sur les relations multivaluées.

Un `link` dit : il existe une relation nommée, dans le sens canonique de ce nom, vers une entité satisfaisant une sous-sélection. Les inverses ont des IDs distincts dans le registre, par exemple `author` et `authored_work`. Aucune double inversion via un champ `direction` utilisateur.

## Pivot

À partir de la sélection S de personnes, « leurs œuvres » produit :

```json
{
  "entityType": "work",
  "filters": [],
  "links": [{ "relation": "author", "target": "S inséré ici comme objet de sélection" }]
}
```

Ce bloc illustre la transformation; l’exemple JSON validable se trouve dans `examples/queries/works.json`.

L’auteur d’une œuvre doit satisfaire **tous** les critères de S. On ne substitue pas les 50 IDs affichés à S. Pour « les œuvres de cette personne », S devient une sélection explicitement limitée à son ID. Pour une sélection manuelle, `ids` est conservé explicitement.

Le retour arrière restaure un snapshot antérieur. Revenir des œuvres aux personnes au moyen d’un nouveau pivot peut produire une population différente; ce n’est pas la même action que Retour.

## Corrélation et limites

Deux liens séparés vers la même relation peuvent avoir deux témoins différents. Pour imposer le même témoin, placer les critères dans une seule sous-sélection. Les qualificatifs d’une assertion nécessitent une recette d’adaptateur explicitement définie; cette v0.2 n’offre pas une syntaxe générale pour les requêter.

Limites proposées : profondeur de liens 3, 32 filtres cumulés, 16 liens cumulés, 100 IDs ou valeurs par liste, page de 1 à 100, corps 64 KiB. Le service peut imposer des limites inférieures via un profil immuable. Une quatrième traversée nécessite de revenir, de changer de sélection explicitement ou d’utiliser un futur profil; aucune coupure silencieuse.

La validation JSON ne suffit pas : vérifier IDs, types domaine/portée, opérateurs, ordre des bornes temporelles, support réel et budgets. Pas de migration implicite, de relation devinée ou de conversion d’un label en identité.
