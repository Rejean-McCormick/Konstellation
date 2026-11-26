# 07 — UX : une démonstration en quelques gestes

## Point d'entrée

Depuis une Constellation résolue, afficher « Animer cette connaissance » dans les actions de vue (feature flag). Si aucun focus résolu, demander la sélection d'un concept, ne pas déduire un départ caché. V0.1 : ouverture d'un panneau avec les trois modes `Kapture`, `Auto`, `Script` ; défaut proposé Auto depuis le focus courant. L'utilisateur ne choisit pas un renderer ou une librairie d'animation.

### Flux principal

1. Appuyer sur Animer ; départ et contexte affichés, sans secret.
2. Choisir facultativement Exploration / Association, profil visuel et durée (auto par défaut, préréglages 15/30/60 s), format d'écran (16:9 par défaut).
3. Préparer une démo ; afficher progression par étapes, bouton Annuler et diagnostics. Aucun rendu réseau dans la lecture.
4. Prévisualiser avec lecture/pause, curseur, précédent/suivant et liste des étapes ; signaler un arrêt anticipé ou une vue partielle.
5. Réviser les étapes ou régénérer (conserver la seed affichée pour reproductibilité) ; enregistrer Score ou exporter dans les formats supportés.

Les options avancées (densité, seed, résolution vidéo) sont repliées. Les réglages de style ne nécessitent pas de résoudre à nouveau la source si le contexte est inchangé et que les snapshots en mémoire sont encore autorisés. Une densité nécessitant d'autres voisins déclenche en revanche une résolution. Le bouton Export ne lance pas de publication ; confirmation séparée pour un fichier contenant des données de lecture, avec portée et destination.

## Kapture et Script

Kapture : indicateur d'enregistrement permanent, compteur d'étapes confirmé, arrêt explicite, aperçu immédiat. Pas d'enregistrement vidéo ni audio, pas de capture des menus ; seul le parcours sémantique est enregistré. Script : liste réordonnable (boutons clavier, pas uniquement drag), insertion et suppression, validation à partir de la première étape modifiée. Une étape dépendante invalide est mise en évidence, pas ignorée silencieusement. L'utilisateur peut sauvegarder le Score avant génération du Bundle ; les IDs peuvent être sensibles, avertissement adapté.

## Présentation

Le lecteur isolé masque les contrôles d'exploration inutiles mais conserve le titre, le focus courant, la légende, la troncature et les statuts de preuve applicables. Les labels et les couleurs doivent correspondre au contenu réel du DTO ; l'annotation automatique se limite à des gabarits factuels tels que « Explorer : {label} », « Nouveau focus : {label} », « Vue partielle ». Pas de résumé narratif inventé. Afficher les informations complètes dans la transcription si elles ne tiennent pas dans le SVG.

### Accessibilité

- Pas d'autoplay avec mouvement imposé ; pause et reprise à portée, clavier et focus visibles, lecteur accessible sans souris.
- Respect `prefers-reduced-motion`, option explicite sans mouvement, aucun flash rapide. Si un export animé est volontairement demandé, avertir que le support cible peut ignorer la préférence ; proposer poster et transcription.
- Texte SVG avec titre/description ; version HTML textuelle du parcours et des relations de navigation. Ne pas multiplier les annonces ARIA par frame ; annoncer les étapes à leur changement.
- Contraste visé 4.5:1 texte normal, 3:1 grands caractères/éléments essentiels ; couleurs jamais seules porteuses de sens ; validation à 200 % de zoom.
- Locale fr/en selon UI Konstellation, pas de traduction automatique des labels. Tester chaînes longues, accents, Unicode et échappement.

## États d'erreur

| Situation | Réponse UI |
|---|---|
| Aucun départ valide | Choisir un focus visible |
| Cible non disponible | « Cette étape n'est pas disponible dans le contexte actuel » ; même texte pour inconnu/caché |
| Contexte changé | Fermer la prévisualisation et proposer une nouvelle préparation |
| Graphe sans voisins | Démo courte du seul focus ; avertir avant export |
| Budget atteint | Montrer le parcours réduit et la raison non sensible |
| Format non supporté | Désactiver le choix, proposer HTML/Score ou poster selon disponibilité |
| Export annulé | Supprimer fichiers temporaires ; conserver Score si toujours autorisé |

Le bouton de sortie ramène à l'Explorer sans changer son état. L'animation ne déclenche jamais une action métier et ne sélectionne pas à l'insu du lecteur un nouveau Kristal ou Lens.
