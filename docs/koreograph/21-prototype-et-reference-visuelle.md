# 21 — Prototype visuel et référence de mouvement

Le SVG de démonstration déjà produit est conservé comme [référence synthétique](examples/koreograph-focus-demo.svg). C'est un exemple autonome de mouvement déclaratif, non un export du moteur à développer. Il illustre Conscience → Identité, à partir des coordonnées du Bundle court et du viewport 1600 × 900. Sa boucle redémarre abruptement : ce comportement de prototype ne constitue pas la règle de boucle du produit. Il ne prouve ni intégration Kristal, ni qualité des huit thèmes, ni compatibilité générale. Le prototype initial précède la décision de marque : sa palette historique n'est pas normative. Ne pas réutiliser ses couleurs comme tokens produit. La version finale doit tirer ses couleurs du Theme Engine.

## Scénarios de référence à réaliser

| ID | Séquence | Critère visuel |
|---|---|---|
| V1 | Conscience → Identité | satellite devient centre, ancien centre reste identifiable, liens suivent |
| V2 | un centre, révélation de voisins | apparition progressive sans perte du centre ni surcharge |
| V3 | parcours multi-focus | transitions fluides, étapes et liens explicites, fin stable |
| V4 | bascule Signature → Spectrum → Ink | même contenu, couleurs/formes cohérentes et légendes |
| V5 | hiérarchie attestée | branche ouverte, pas de hiérarchie inventée |
| V6 | comparaison / causalité qualifiée | encodage justifié, même scénario sans preuve => fallback |
| V7 | portrait vertical | recadrage et mise en page, pas de crop illisible |
| V8 | reduced-motion | étapes statiques, transcription et contrôles accessibles |

Capturer à temps fixe (début, milieu, fin et points QA), conserver golden par version, navigateur, font, taille et thème. La comparaison pixel peut tolérer l'antialiasing calibré, mais pas la disparition d'un label, d'un nœud ou d'une preuve. Les exemples de design antérieurs illustrent le vocabulaire ; la référence de produit est la combinaison contrats + règles + tests, pas une capture décorative. Voir [rendu](08-rendu-exports.md) et [qualité](18-qualite-autocorrection.md).
