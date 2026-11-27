# 06 — Scènes, continuité, caméra et horloge

## Identité visuelle

Une clé de target est dérivée d'une sérialisation canonique ordonnée de `{focus,groupId}` (qualifier/relation-value conservent tous leurs champs). Une clé de contexte, maintenue en mémoire, inclut dataset, registre, policy, profil d'exécution, Lens, Kristal et génération de session. Ne pas incorporer le token. Les correspondances ne se font qu'au sein de cette même génération. Pour un nœud ayant un target unique, sa clé d'objet est stable même s'il passe de satellite à centre. `nodeKey()` actuel inclut id, kind et target et ne suffit donc pas à garantir la continuité centre/satellite ; le centre doit être adapté à partir du focus/groupId résolu et non du texte du label.

Des satellites partageant un target ne sont pas forcément le même objet visuel. Les occurrences multiples peuvent être distinguées par un identifiant stable dérivé du DTO ; si l'appariement est ambigu, ne pas fusionner ; utiliser fade. Le root local issu d'une sélection est un objet synthétique de présentation, pas une entité. Une arête de navigation est identifiée par ses deux occurrences et son type ; elle n'est pas une assertion.

## Scène normalisée

Le viewport logique initial réutilise un espace de référence proche de 1000 × 620 pour l'adaptation de Constellation, mais le Bundle encode les dimensions effectives correspondant au format choisi (par ex. 1600 × 900). Le calcul de layout reçoit ces dimensions ; la zone sûre est calculée avant rendu. Les objets contiennent une clé, label en texte brut, rôle center/satellite, kind, position, rayon et opacité. Les positions des liens sont dérivées des deux objets à chaque frame ; pas de deuxième liste indépendante de coordonnées. Les propriétés visuelles neutres de la scène n'altèrent pas les données métier.

### Layout stable

1. Construire les positions candidates avec `layoutConstellation` (déterministe pour un ordre d'entrée donné).
2. Trier les nouveaux objets selon un ordre stable ; pour les survivants, conserver au mieux leur ordre angulaire et les affecter aux slots compatibles par coût de déplacement au carré. Pour 10 voisins, un appariement glouton stable suffit initialement ; comparer aux collisions et à la position précédente.
3. Mesurer les libellés (font et locale fixées), réserver marges, titre et légende ; limiter à deux lignes, puis ellipsis visible et texte complet accessible.
4. Corriger les collisions par un nombre borné de passes, en gardant le centre fixe. Si l'espace manque, réduire densité, agrandir l'espace de présentation dans les limites du format ou réduire le nombre montré et signaler la troncature de présentation. Ne pas diminuer indéfiniment la police.

Le layout n'est pas un solveur sémantique. Un déplacement minimal est une optimisation graphique, pas une mesure de parenté. Le format vertical demande une recompilation des positions, pas un simple crop.

## Interpolation

Pour une transition de A vers B sur `[start,end)`, calculer `u=clamp((t-start)/(end-start),0,1)` et `q=u*u*(3-2*u)` (`smoothstep`). Pour toute coordonnée scalaire interpolée : `v=A+(B-A)*q`. Utiliser la même horloge pour nœuds et arêtes. Les survivants interpolent position, rayon et opacité ; les entrées apparaissent depuis un emplacement de présentation neutre proche de la position finale ; les sorties disparaissent sans changer d'identité. Le changement de label ou de rôle est un fondu croisé contrôlé ; les objets n'échangent pas leurs clés. Les liens apparaissent seulement lorsque leurs deux extrémités sont visibles ; un effet transitoire n'ajoute pas un lien sémantique.

`fade` utilise deux groupes séparés dans la même vue ; aucun objet non appariable ne morph en un autre. `reveal` garde le focus et les éléments déjà visibles, avec décalage d'apparition stable selon ordre des objets. `hold` est constant. Les limites et le statut de troncature appartiennent à la scène courante et sont explicités à chaque changement.

## Temporalité

Le Bundle contient des segments contigus à temps entier en millisecondes, et non un ensemble de `setTimeout`. Les intervalles sont semi-ouverts, sauf le dernier qui contient la fin. `frameAt(bundle,t)` est pure : clamp de t, recherche binaire du segment, calcul des propriétés, sortie sérialisable. `t=durationMs` correspond exactement à la dernière scène. Une recherche en arrière ne demande pas un replay des interactions. Pour une session temps réel, `requestAnimationFrame` fournit l'occasion de redessiner ; l'horloge monotone fournit t, avec pause/reprise et seek séparés. Aucun delta accumulé de frame à frame.

### Rythme proposé

- Installation/hold initial : 1200 ms ; transition focus : 1400 ms ; révélation : 900 ms.
- Pause de lecture `clamp(1000 + 45 * motsVisibles + 100 * nouveauxObjets, 1000, 4200)` ms ; compter avec une règle locale versionnée. Les profils modifient ces valeurs dans des bornes, pas le graphe.
- Hold explicite : respecter sa durée. La durée demandée est un objectif, pas une permission d'illisibilité. Allouer d'abord les minimums (400 ms par transition, 900 ms par pause automatique), puis distribuer le reste proportionnellement. Si insuffisant, proposer moins d'étapes ou une durée plus longue ; pas d'accélération cachée. Le Bundle annonce la durée compilée effective.

## Caméra

V0.1 : viewport fixe et zone sûre (marge proposée 8 %), changement de focus par déplacement des objets. Pas de caméra indépendante requise. Après mesure de besoin, une caméra dérivée peut cadrer la boîte englobante des objets importants, avec padding et limites de zoom. L'interpolation de la caméra est synchronisée au même segment et appliquée aux objets/liaisons ensemble. `prefers-reduced-motion` ou réglage utilisateur : vues statiques successives / fondu minimal, commandes manuelles ; ne pas produire de travelling par défaut pour ces utilisateurs.

## Déterminisme

Même Score explicite, mêmes snapshots autorisés et ordonnés, mêmes versions d'adaptateur/compilateur, mêmes métriques de font et viewport ⇒ mêmes scènes/segments. Arrondir les valeurs sérialisées à une précision versionnée (par ex. 0.001 unité), sans arrondir chaque incrément de mouvement. Les pixels ne sont identiques qu'à environnement de rendu épinglé ; l'identité numérique de la timeline est le premier invariant.

## Extension v0.2 : Presentation Plan

La [caméra virtuelle](17-camera-direction.md) et les captions sont des pistes alignées sur la timeline immuable. Le [Presentation Plan](19-production-contracts.md) porte le thème effectif et les poses ; `frameAtPresentation` étend `frameAt` sans seconde horloge. La réparation visuelle se fait avant gel et peut produire un nouveau Bundle ; un changement de palette compatible n'exige pas de relecture. Le temps des captions entre dans le coût de lecture avant compilation.
