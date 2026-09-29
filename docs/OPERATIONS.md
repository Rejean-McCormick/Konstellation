# Exécution locale et API

## Configuration

| Variable | Valeur par défaut | Rôle |
|---|---|---|
| `HOST` | `127.0.0.1` | Interface d’écoute |
| `PORT` | `4321` | Port HTTP |
| `KONSTELLATION_BACKEND_CONFIG` | Non défini | Configuration lecteur Kristal, prioritaire sur PACK |
| `KONSTELLATION_SA_CONFIG` | Non défini | Configuration service SA et profil publié |
| `KONSTELLATION_PACK` | `data/demo.pack.json` | Fichier JSON normalisé |
| `KONSTELLATION_LENSES` | `examples/lenses` | Répertoire des Lens chargées au démarrage |
| `KONSTELLATION_ROLES` | `public` | Rôles statiques de l’instance, séparés par virgules |
| `KONSTELLATION_CURSOR_SECRET` | Aléatoire par processus | Secret opérateur pour HMAC; le changer invalide les curseurs |
| `KONSTELLATION_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` | Noms d’hôte permis, sans ports |

Le serveur ne charge pas automatiquement `.env`; définir les variables dans le processus de lancement. `npm run dev` lance l’API en 4322 et Astro en 4321 avec proxy local. `npm start` sert le frontend construit et l’API sur le même port.

L’arrêt/redémarrage recharge le pack et les Lens. Un nouveau hash de pack invalide les anciens contextes; il n’est pas remappé vers les nouvelles données. Une exploration ancienne n’est restaurable que si son contexte exact est chargé.

## API JSON

Toutes les réponses d’erreur utilisent `{ "error": { "code": "...", "message": "..." } }`. Les POST exigent `Content-Type: application/json` et une limite de 64 Kio.

| Méthode et chemin | Entrée | Sortie |
|---|---|---|
| GET `/api/health` | — | Statut et version |
| GET `/api/bootstrap` | — | Métadonnées autorisées, registre, Lens, politiques, contexte, capacités |
| POST `/api/query` | `{query, cursor?}` | ResultSet 0.2 |
| POST `/api/facets` | `{query, relations}` | Compteurs exacts sous le même contexte |
| POST `/api/entity` | `{id, context}` | Entité, assertions et sources visibles |
| POST `/api/evidence` | `{ids, context}` | Assertions visibles par identité |
| POST `/api/validate-state` | ExplorationState 0.2 | `{valid:true}` ou erreur |
| POST `/api/sa` | Options de communication (voir ci-dessous) | CommunicationResult contrôlé ou erreur explicite |

La sortie API ne contient pas les payloads SES bruts conservés pour audit dans le pack. Les références de conflit inaccessibles sont retirées. Les contrats complets du frontend se trouvent dans `contracts/`.

## Reproductibilité

Conserver le pack exact, le registre, les Lens, package-lock.json et la version du code. `npm ci` utilise les dépendances verrouillées. La construction statique ne nécessite aucun accès réseau à l’exécution; toutes les fontes utilisent la pile système. Sans intégration configurée, les données et requêtes restent locales. Les intégrations HTTP configurées contactent les services décrits dans INTEGRATIONS.md.

Les liens partageables contiennent l’état de requête dans le fragment d’URL. Ils ne distribuent pas le corpus et ne confèrent aucune permission. Pour un contenu confidentiel, privilégier une exportation contrôlée; le bouton de partage n’est pas un mécanisme d’autorisation.

## Communication et capacités

GET `/api/capabilities` retourne les capacités par relation et celles de SA. POST `/api/sa/request` génère une CommunicationRequest. POST `/api/sa` la valide et la réalise via le service configuré. Entrée : `{query, cursor?, entityId?, action: "query"|"page"|"entity", language?, locale?}`. Le serveur recalcule les résultats; aucun texte ni résultat fourni par le client n’est tenu pour vrai. Voir INTEGRATIONS.md.
