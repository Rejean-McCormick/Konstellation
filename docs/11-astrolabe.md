# Astrolabe — couche d’orientation

## Intention

L’Astrolabe se place avant le catalogue et les facettes. Il répond à une intention utilisateur plus floue : « j’ai un mot, où est-ce que je peux aller ? ».

Il ne remplace ni les QuerySpec, ni les Lens, ni la Constellation. Un cap choisi est converti en sélection Konstellation normale, puis le reste de l’exploration utilise le moteur existant.

## Entrées acceptées

- terme déjà présent : `résurrection`
- variante typographique : `ressurection`
- vocabulaire religieux ou historique plus large que l’index : `parousie`, `iconoclaste`
- famille spirituelle ou école : `eudiste`
- forme abrégée : `st-esprit`

## Trois niveaux de réponse

1. **Correspondance directe** : le mot est trouvé dans le libellé, la description ou l’identifiant d’une entité.
2. **Correspondance approximative** : tolérance légère aux accents, traits d’union et fautes d’orthographe.
3. **Piste voisine** : un petit lexique d’orientation traduit un terme absent vers des ancres réellement présentes dans le corpus. L’interface le signale explicitement afin de ne pas présenter une proximité éditoriale comme une donnée documentée.

## Exemples initiaux

- `eudiste` → Eudes si présent, sinon mystique, contemplation, amour, christologie, Trinité, mission, grâce.
- `Saint-Esprit` / `st-esprit` → Esprit, pneumatologie si présente, Trinité, grâce, salut, mission.
- `parousie` → eschatologie, espérance, résurrection, salut, christologie.
- `iconoclaste` → image, christologie, incarnation, art et beauté, culte, mystère et présence.
- `résurrection` / `ressurection` → correspondances directes puis espérance, eschatologie et salut.

## Principe d’intégrité

Le lexique d’orientation ne crée aucune assertion et ne modifie pas le corpus. Il sert uniquement à trouver un point d’entrée. Lorsqu’un terme n’est pas explicitement indexé, l’interface le dit.

## Évolution recommandée

À terme, déplacer le lexique sémantique dans un fichier de données versionné par corpus, afin que Théophile puisse enrichir les synonymes, variantes historiques et termes de tradition sans modifier le composant UI. Une étape ultérieure pourrait utiliser les relations du graphe pour classer les caps par proximité documentée.
