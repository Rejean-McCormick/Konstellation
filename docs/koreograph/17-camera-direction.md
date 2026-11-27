# 17 — Caméra virtuelle et réalisation algorithmique

## Responsabilités et simplification

Le Director est une fonction de compilation, pas un service. Il orchestre des unités de Story, le layout, les primitives de Motion et la caméra, puis transmet au validator. Le Player ne décide rien pendant la lecture. Caméra fixe par défaut du MVP ; caméra intelligente `auto` en KOR-2B, activable après validation. Pas de rotation, perspective 3D, simulation physique, keyframes éditées ou mouvements aléatoires dans la première cible. La caméra modifie le cadre, pas les coordonnées sémantiques ; le zoom ne signifie pas importance, preuve ou hiérarchie.

## Modèle géométrique

Le monde a les dimensions du Bundle (W,H). Une caméra `(cx,cy,zoom)` définit une transformation monde → écran `translate(W/2,H/2) scale(zoom) translate(-cx,-cy)`. Un plan de caméra associe une pose initiale et finale à chaque segment, interpolation smoothstep (ou linear en hold constant) à la même horloge que les objets. Les titres, légendes, marques et captions sont des overlays en coordonnées écran, non zoomés. Les textes de nœuds suivent le monde ; leurs métriques à l'écran doivent rester au-dessus des minimums ou recevoir un layout alternatif. Le renderer n'utilise pas une seconde horloge CSS.

## Cadrage automatique

- Réserver zone sûre (8 % initialement, ajustable dans limites), espace titre, légende, captions ; calculer boîte visible des nœuds, contours, labels et arêtes nécessaires, avec métriques figées.
- Cibles de cadre : `overview` (tous éléments nécessaires), `focus` (focus + voisins pertinents), `follow` (union du départ, arrivée et objets persistants durant mouvement), `pullback` (contexte final). Toute exclusion doit déjà être une troncature de présentation explicite ou être représentée dans une autre scène ; le cadre ne masque pas des preuves essentielles.
- Choisir zoom maximal tel que boîte + marge tienne dans la zone utile, borné initialement à [0,7 ; 1,6]. Calculer centre de la boîte en compensant le décalage de la zone utile. Si même zoom min ne suffit, corriger layout/densité dans limites, ou refuser.
- Limiter vitesse de déplacement projetée (cible initiale 0,45 diagonale écran/s), variation de zoom (0,35/s en log naturel) ; vérifier sur courbe entière (smoothstep atteint 1,5 fois vitesse moyenne). Utiliser pose fixe si le mouvement concurrent du focus rend le suivi confus. Ne jamais ajuster le zoom en réponse à des FPS perdus.
- Évaluer l'enveloppe des objets en transition : endpoints et échantillons intermédiaires ≤50 ms, et extrema analytiques lorsque disponibles. Un cadre stable est préférable à une succession de petits recadrages. Si correction échoue, fondre explicitement, conserver caméra fixe ou augmenter durée si accepté. Aucun recadrage silencieux d'une sortie exportée.

## Continuité temporelle

Le [Presentation Plan](19-production-contracts.md) porte une piste caméra avec exactement un shot par segment, même temps, poses contiguës ; hold sans mouvement par défaut. Une transition entre deux plans peut être un cut seulement si annoncé et non trompeur ; la première version exige poses contiguës, pas de cut implicite. Le `frameAtPresentation(bundle,plan,t)` combine `frameAt` et pose de caméra ; seek à t produit le même résultat que lecture continue. Pour reduced-motion : pose identité, transitions remplacées par états statiques via un mode de lecture distinct, aucune perte de transcription. Le mode export respectueux du mouvement doit être choisi et figé, pas dépendre d'une préférence OS changeante.

## Règles de réalisation

Priorité lexicographique : (1) policy, exactitude, statuts, (2) compréhension et contraste, (3) continuité, (4) durée cible, (5) esthétique. Privilégier une animation dominante à la fois ; focus change avant révélation, puis lecture. Halos d'attention limités, aucun scintillement permanent. Ne pas superposer un zoom fort à une révélation dense. Si la projection change de famille, adopter un fondu ou un adaptateur qualifié ; ne pas interpoler une géométrie incomparable comme si elle mesurait une distance.

## Tests

C1 cadrage aspect horizontal/vertical/carré, labels longs et safe area ; C2 trajectoire focus vers centre et absence de saut aux bornes ; C3 pause/seek/export même pose ; C4 caméra fixe et reduced-motion ; C5 vitesse/zoom hors seuil => correction ou refus ; C6 assertions visibles et diagnostics non coupés par la caméra ; C7 export SVG non transposable => refus explicite, pas de poster déguisé. Les valeurs numériques sont des cibles proposées à mesurer, non des résultats.
