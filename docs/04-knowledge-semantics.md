# Sémantique de connaissance

## Politique de lecture

Appliquer la politique avant les filtres, jointures, compteurs et pagination. Les statuts d’assertion, validation, certitude, reconnaissance et `validated_as` ne se remplacent pas mutuellement. « Validé » ne signifie pas « universellement vrai ». Une assertion admise comme hypothèse reste présentée comme hypothèse.

Le profil strict initial refuse une exécution dont les informations obligatoires de politique sont manquantes. Les autres comportements permis par Kristal nécessitent un profil spécifique qualifié; ils ne constituent pas des fallbacks implicites de Konstellation.

## Absence et exclusion

`missing_in_view` signifie « aucune valeur visible dans cette vue complètement évaluée ». Il n’autorise jamais « cette personne n’a pas de religion ». Une assertion négative explicite est une donnée différente, dont la prise en charge exige un mapping documenté. Un backend incomplet, un timeout ou un dépassement de limite ne produisent pas une preuve d’absence.

Dans la vue, deux assertions visibles peuvent diverger. `in` correspond dès qu’une assertion visible satisfait le filtre. L’explication identifie ce témoin et signale les conflits connus accessibles; elle n’affirme ni consensus ni absence de conflit lorsqu’aucun marqueur n’est fourni.

## Temps

Pour le pilote, `overlaps` accepte des bornes annuelles entières et `match: definite`. Le profil précise la numérotation astronomique des années (année 0), le calendrier de normalisation et la conversion depuis les sources. Aucun parsing des dates anciennes par le Date natif du navigateur.

Un intervalle exact [s,e] chevauche [a,b] si s <= b et e >= a, bornes inclusives. Une naissance seule n’est pas une preuve que la personne est encore en vie. Une borne inconnue ne devient pas une infinité.

Si le mapping fournit une naissance incertaine [s_min,s_max] et une fin [e_min,e_max], un chevauchement certain exige s_max <= b et e_min >= a, avec bornes cohérentes. Sinon l’état est inconnu ou non correspondant selon les bornes disponibles; seules les correspondances certaines sont incluses par ce profil. Une future option « possible » nécessitera un opérateur/profil explicite.

`lifespan` est une relation dérivée, non un fait ajouté au corpus. Sa recette identifie les assertions de dates utilisées, leur compatibilité de scope et d’autorité, la règle de combinaison et sa version. Ne pas combiner arbitrairement une naissance d’une source et un décès contradictoire d’une autre. Si aucune combinaison autorisée n’existe, conserver l’indétermination.

## Témoins et ResultSet

Chaque résultat peut référencer les assertions ayant satisfait les critères et les liens traversés. Le contrat inclut un chemin de critère, des références d’assertions, des références de provenance et, pour une dérivation, une référence de règle. La preuve d’une absence renvoie au contexte et au critère, sans inventer une assertion.

La vue d’assertion conserve le payload amont et une référence à son contrat; le schéma Konstellation ne prétend pas revalider tous les schémas Kristal. L’adaptateur doit les valider séparément et démontrer le mapping des champs. Si les témoins sont paginés, leur complétude est explicitement signalée.
