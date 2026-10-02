# Import Kristal

## 1. Principe

L'import crée une **projection de lecture Konstellation**, jamais un nouveau canon.

## 2. Kristal v6 direct

Préférer l'adaptateur `kristal-state-v6` lorsque la source est v6.

```json
{
  "adapter": "kristal-state-v6",
  "state": "state.json",
  "requireIdentity": true
}
```

Le lecteur doit :

- valider le schéma ;
- vérifier l'identité si présente ;
- préserver les metadata v6 nécessaires ;
- projeter seulement les valeurs sans perte ;
- déclarer `importRecord.losses` ;
- ne jamais remplacer l'identité canonique.

## 3. Packs normalisés

Un pack normalisé reste utile comme cache/index local. Il doit porter suffisamment de contexte pour savoir :

- d'où il vient ;
- quelle version du canon il représente ;
- quelle policy a été appliquée si pertinente ;
- quelles pertes ont eu lieu.

## 4. Import ancien SES

L'import des Structured Epistemic States historiques reste un chemin de compatibilité. Toute conversion vers le modèle local doit être stricte et déclarer les structures non représentées.

## 5. Validation

Avant utilisation :

```bash
npm run pack:validate -- path/to/pack.json
```

Pour les imports :

```bash
npm run pack:import -- source.json mapping.json output.pack.json
```

## 6. Navigation après import

Une fois le pack chargé, le profiler analyse automatiquement sa structure. Aucune Lens spécifique n'est obligatoire pour obtenir la navigation générique.

Une Lens ou des `navigationHints` peuvent ensuite améliorer les labels, facettes ou recettes proposées.
