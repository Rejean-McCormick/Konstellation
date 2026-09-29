# Migration de la documentation v0.1

La v0.1 proposait un QuerySpec `version: 1.0` alors que le dépôt était au stade bootstrap. La présente proposition utilise `schemaVersion: 0.2` et ne revendique aucune compatibilité binaire. Les originaux sont conservés dans `legacy/v0.1`.

| Ancien | Nouveau | Condition |
|---|---|---|
| `root.type` | `selection.entityType` | Résolution du type dans le registre |
| `root.entity` | `selection.ids: [id]` | ID stable vérifié |
| `filters` | `selection.filters` | Conjonction conservée |
| `equals` | `in` à une valeur | Valeur identifiée et typée |
| `not_exists` | `missing_in_view` | Explication explicite de la portée de l’absence |
| `not_equals` | Pas de conversion automatique | Décider `none_of` ou `exists` + `none_of` |
| `overlaps` | `overlaps` avec intervalle et `match` | Normalisation temporelle/recette fixées |
| `sort: label` | Non pris en charge dans ce profil | Choisir explicitement tri stable par ID |
| `page.cursor` | Curseur de transport | Non réutilisable après migration |
| Mappings dans Relation Registry | Profil d’adaptateur de confiance | Auditer la signification, pas seulement renommer |

Toute migration ajoute un contexte immuable réellement disponible. Aucun convertisseur ne peut fabriquer les identités de corpus, politique ou profil. L’utilisateur doit voir les modifications sémantiques. Les exemples v0.2 utilisent uniquement des références synthétiques; ils ne remplacent pas des requêtes de production.
