# Intégrations et frontières externes

## 1. Types d'intégration

Konstellation peut consommer :

- un `kristal_state` v6 direct ;
- un Runtime Pack Kristal ;
- un pack JSON normalisé ;
- une projection HTTP paginée ;
- des Reader Policies ;
- une intégration SemantiK/SA explicitement configurée.

## 2. Règle de frontière

Les intégrations externes peuvent fournir données, policy et métadonnées. Elles ne peuvent pas injecter :

- composant Svelte ;
- JavaScript exécutable ;
- HTML de confiance ;
- permissions implicites ;
- mutation silencieuse de QuerySpec.

## 3. Kristal v6 direct

Configuration de référence :

```json
{
  "adapter": "kristal-state-v6",
  "state": "kristal-v6-state.json",
  "requireIdentity": true
}
```

L'adaptateur :

1. valide le schéma ;
2. vérifie l'identité lorsque déclarée ;
3. projette seulement les structures représentables sans perte ;
4. préserve les métadonnées v6 utiles ;
5. déclare les pertes ;
6. dérive les affordances.

## 4. navigationHints

Les hints sont des métadonnées de planification non factuelles.

Forme recommandée :

```json
{
  "schemaVersion": "0.1",
  "affordances": {
    "temporal": {"score": 1, "reason": "dates canoniques"},
    "lineage": 0.9
  },
  "relationAffordances": {
    "derived_from": ["lineage", "dependency"]
  },
  "preferredRecipes": ["timeline", "evolution"],
  "recipeLabels": {
    "evolution": "Trajectoire"
  }
}
```

Les aliases `capabilities` et `relationCapabilities` existent pour compatibilité v0.6 mais la terminologie cible est `affordances`.

## 5. SemantiK / SA

Une formulation ou communication externe doit rester explicitement déclenchée. Le serveur recalcule les résultats à partir de QuerySpec ; il ne considère jamais un résultat fourni par le client comme vérité.

## 6. Erreurs d'intégration

Les erreurs doivent être structurées et distinguer au minimum :

- schéma invalide ;
- identité invalide ;
- policy incompatible ;
- capacité externe indisponible ;
- projection non supportée ;
- perte d'import ;
- timeout ;
- source inaccessible.
