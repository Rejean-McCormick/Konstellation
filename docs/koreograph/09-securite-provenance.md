# 09 — Sécurité, confidentialité, autorité

La [sécurité de Konstellation](../19-security.md) demeure normative. Koreograph est un consommateur des vues de lecture autorisées, non un nouvel interprète du Kristal. Les limites de la preview v11 et les décisions [d'autorité](../04-knowledge-semantics.md) ne changent pas.

## Frontières de confiance

| Asset / menace | Protection exigée |
|---|---|
| Lecture de données masquées par ID importé | Resolver via API authentifiée et Reader Policy, refus indistinguable inconnu/caché |
| Rejeu sous autre contexte / principal | Contexte exact, génération de session, invalidation et abort ; aucune réutilisation inter-scope |
| Cache de preview et réponses tardives | Partition par contexte, purge à changement, vérifier identifiant de génération avant commit |
| Graphe brut ou agrégats non filtrés | N'utiliser que les DTOs déjà filtrés ; ne pas compléter à partir de fichiers ou compteurs globaux |
| XSS via texte, JSON embarqué, SVG | Validation stricte, échappement par contexte, texte DOM et attributs contrôlés ; pas de `innerHTML` de données ni `eval` |
| Exécution de script/asset externe | Runtime et fonts approuvés ; pas d'URL arbitraire, `foreignObject`, code importé, chargement de renderer dynamique |
| DoS via Score/Bundle/capture | Limites avant parse, budgets, annulation, timeout, concurrence, espace disque borné |
| Vol de token / fuite de logs | Pas de credentials, clés contenant des tokens, QuerySpec sensible, labels ou corps de DTO dans télémétrie |
| Injection de commande ou chemin | Nom généré/sanitisé, chemins sous dossier temporaire contrôlé, args séparés, pas de shell interpolé |
| Export redistribué | Avertissement et consentement local ; revue de publication par autorité habilitée ; export non révocable |
| Inférence de sens par animation | Registre code-owned et preuves visibles, sinon mouvement neutre ; troncature et qualification visibles |

## Politique d'export

La Reader Policy s'applique avant toute lecture de données. Elle ne certifie pas qu'un fichier peut être distribué. Dans le produit, un export contenant des données nécessite une intention explicite de l'utilisateur et ne part jamais automatiquement vers un service distant. Le projet n'ajoute pas une permission `publish` implicite. Les démos publiques doivent être générées à partir d'une source explicitement autorisée pour publication (idéalement données synthétiques), suivies d'une revue du contenu final, y compris textes, preuves, noms de fichiers, métadonnées, posters et frames transitoires. Toute preuve `visualAudit.qualified` est locale et dérivée ; `publicationAuthorized:false` reste une limite, non un problème à « corriger » côté client.

Un fichier déjà exporté, téléchargé ou copié échappe aux contrôles d'accès du serveur. Ce fait doit être expliqué avant export. Un changement de rôle, fermeture de session ou policy invalide le Bundle en mémoire et interrompt toute préparation/export en cours. En mode offline à partir d'un Bundle déjà remis, aucune révocation ne peut être promise. Le lecteur offline ne contacte pas le serveur ; l'utilisateur est responsable de la conservation et distribution selon autorisation.

## Provenance et exactitude

Conserver pour le Score les références du contexte autorisé ; pour un Bundle interne, les versions et les avertissements, et seulement les identités de source permises. La scène générique indique « navigation dérivée » ; elle n'attribue pas de statut de preuve. Dans une future projection spécialisée, transporter les références exactes et le statut d'audit, refuser les preuves incohérentes, conserver les mentions de troncature et le fallback. Les références absentes ne sont pas recherchées dans une policy plus large. Une orientation de flèche purement décorative n'est pas acceptable si elle peut être lue comme une influence causale non qualifiée.

## Opérations et incidents

Déploiement local uniquement dans le premier lot, sous les mécanismes existants. Ne pas ajouter de route de rendu anonyme, de serveur de navigateur distant ou de job persistant. Pour partagé/public, revue des profils, CSP, auth, quotas, traitement du disque, stockage et révocation requise. En incident : stopper préparation/export, invalider caches, supprimer fichiers temporaires, désactiver le flag, suivre [runbook Incident](../runbooks/INCIDENT.md). Si un export a quitté le système, avertir l'autorité compétente ; ne pas promettre une suppression à distance.

## Menaces supplémentaires v0.2

Theme et Production Request sont non fiables à l'import : limiter taille, schéma strict, allowlist fonts et formes ; refuser CSS, scripts, URLs, commandes et champs arbitraires. Un Presentation Plan importé ne certifie jamais son QA ou ses captions : vérifier digests, recompilation factuelle et autorité locale ; aucun hash n'est une signature. Le batch reste local, explicitement sélectionné, borné et invalidé sur changement de contexte. Les logs et manifestes ne révèlent pas de labels ou IDs cachés. Voir [contrats](19-production-contracts.md).
