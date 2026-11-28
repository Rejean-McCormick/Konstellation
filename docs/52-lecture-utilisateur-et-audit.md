# Lecture utilisateur et audit des Kristals — 27 novembre 2026

## Utilisation

Dans Mes Kristals, rechercher un nom, choisir une carte puis ouvrir le lecteur. Les informations de provenance du catalogue, les références et les filtres techniques sont disponibles sur demande. La disponibilité signifie qu'un lecteur est configuré, pas que son contenu canonique est entièrement accessible, qualifié ou publié.

Lorsque la perspective expose uniquement les états ou artefacts du lecteur local v10, Konstellation affiche une explication et propose **Examiner la structure technique**. Cette perspective reste accessible, mais ne propose plus Koreograph. Pour un lecteur mixte, les perspectives de connaissances sont préférées à l'ouverture; les perspectives techniques restent dans un groupe séparé. Le lecteur d'hébergement GitHub v10 est explicitement technique. Aucune classification n'est déduite du nom d'un domaine, d'une URN ou d'un texte libre. Les autres vues conservent leurs garanties de provenance et leurs limites.

## Audit automatique local

Avec le serveur local démarré, lancer depuis le dépôt :

```powershell
$Out = Join-Path (Get-Location).Path ('artifacts\audit-kristals-' + (Get-Date -Format yyyyMMdd_HHmmss))
node scripts/audit-kristals.mjs --catalogue-prive --out $Out
python scripts/koreograph-visite-layout.py --catalogue-prive --audit (Join-Path $Out 'audit.json') --headless --sans-pause --familles 1 --max-kristals 6 --tempo 0.5
```

L'audit interroge toutes les entrées du catalogue autorisé, sans lire les entrées indisponibles. Pour chaque lecteur accessible, il utilise la politique par défaut. Les vues non techniques sont échantillonnées sur trois perspectives au maximum, une page et un focus par perspective. Les réponses sont validées par les contrats existants; les voisins d'entité doivent appartenir à la vue visible. Une erreur reste une erreur d'observation. Une vue vide ou une absence de voisin dans cet échantillon ne prouve pas une absence canonique.

- `structure-technique` : le lecteur expose une topologie explicitement technique.
- `navigation-observee` : au moins un voisin d'entité non technique est observé dans l'échantillon.
- `entites-observees` : des lignes sont lisibles, sans voisin non technique observé.
- Autres états : limites, absence de résultat visible, lecteur indisponible, observation synthétique ou erreur. Ils ne sont pas promus automatiquement en succès.

Le rapport `audit.json` reste local (identifiants de lecteurs et perspectives). `audit-partage.json` retire ces identifiants, mais conserve les noms de Kristals et les mesures; vérifier sa diffusion. Les captures contiennent les connaissances affichées. Aucun fichier canonique, aucune configuration de lecteur, aucune politique et aucune publication ne sont modifiés. La visite utilise le rapport pour privilégier des lecteurs ayant fourni des résultats, et vérifie aussi une vue technique lorsqu'elle existe. Une famille spécialisée absente n'est pas inventée.

## Limite de livraison

Dans le snapshot `11271813`, la configuration du catalogue ne déclare un modèle `node-edge-json/1` que pour `A-Kristal-Catho`. L'audit sur le serveur réel est nécessaire pour confirmer la couverture. Ouvrir un autre domaine n'implique pas la disponibilité de ses assertions sémantiques. Les modèles de lecture supplémentaires doivent être explicitement configurés, reconstruisibles et vérifiés selon les contrats du propriétaire. Ce correctif ergonomique ne réalise aucune migration automatique des 127 Kristals. La version officielle reste `1.0.0-rc.2` jusqu'aux gates de livraison existants.
