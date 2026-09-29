# Import de Structured Epistemic State Kristal v5

## Commande

```bash
npm run pack:import -- examples/import/state.json examples/import/mapping.json mon-corpus.pack.json
npm run pack:validate -- mon-corpus.pack.json
```

L’import est atomique au sens fonctionnel : toute erreur de mapping empêche l’écriture. Le fichier de sortie doit être nouveau (`wx`); le programme n’écrase pas un pack. Le manifeste conserve le SHA-256 des octets d’entrée, le hash de mapping, l’identité et l’intégralité de l’état amont. Aucune signature n’est déclarée vérifiée.

## Mapping

Le fichier contient `registry`, `entities`, `relationMappings` et `policies`, plus titre/description et le marqueur `synthetic`.

Une entité est décrite par `sourceKey`, `id`, `type`, `label`. Les sourceKeys utilisent les références explicites amont : external_id, IRI, `wikidata:Q…`, ou `wikidata-property:P…` pour un prédicat. Aucun label n’est utilisé comme identité. Une catégorie de type provient du mapping opérateur; elle n’est pas déduite arbitrairement d’un texte.

Le mapping de prédicat indique la relation sémantique du registre. Toute assertion doit être mappée. Les objets acceptés sont : `item` vers une entité connue, `string` vers une relation string, et une quantité entière sans unité vers une relation integer. Les qualificatifs, temps, autres quantités et autres objets sont refusés. Cette restriction empêche une projection silencieusement moins précise que l’original.

Les statuts, certitudes, validations, modes validés, autorités, scopes, conflits et sources d’evidence sont conservés. Les champs de validation manquants restent `not_evaluated`/`unknown`, et une autorité absente `authority:unspecified`. Cela ne leur accorde aucune confiance. Les politiques doivent admettre explicitement ces valeurs pour les rendre visibles.

Le content_hash est vérifié lorsqu’il existe et déclare exactement l’exclusion de `state_id`, `content_hash`, `signatures`. Un autre profil de hash est refusé. Un état sans content_hash demeure importable avec son hash de fichier externe consigné; l’importeur ne prétend pas que son state_id est une preuve cryptographique.

## Limites importantes

Cette commande importe un SES, pas un Runtime Pack binaire. Elle ne valide pas les décisions d’autorité, licences de données, signatures ou racines de confiance. Les source_refs du SES sont conservées dans le pack; seules les sources liées à une assertion via evidence_refs sont présentées comme sources de cette assertion. Les provenance_refs et reconnaissances restent dans le payload amont d’audit, sans être transformées en preuves nouvelles.

Une recette temporelle ou une assertion qualifiée exige un adaptateur explicite et des vecteurs supplémentaires. Le moteur peut déjà lire les intervalles normalisés `startMin/startMax/endMin/endMax`, mais cet importeur ne fabrique pas une période de vie à partir de dates indépendantes.
