# 20 — Production, expérience finale et définition de terminé

## Expérience cible

Depuis un focus valide : bouton « Animer cette connaissance », intention (Découvrir/Expliquer/Comparer si qualifié), durée Auto/15/30/60, thème ; le focus courant est prérempli. Défauts proposés Signature, mono, caméra fixe au MVP puis auto si qualifiée, aspect 16:9, captions factuelles. Le bouton « Prévisualiser » résout/compile et affiche la durée effective, la route, les statuts, diagnostics, la légende et les contrôles. Choix avancés repliés : mode chromatique, géométrie, aspect, densité, rythme, caméra, reduced-motion, seed, formats et résolution. L'utilisateur n'édite pas des keyframes. Changer de thème dans l'aperçu conserve position temporelle après recompilation compatible, affiche l'état QA et ne relance pas le réseau. Si durée modifiée, préserver l'étape correspondante plutôt que prétendre à une continuité temporelle exacte. Export distinct et explicite, jamais publication automatique.

### Écrans et états

| État | Action disponible | Sortie/erreur |
|---|---|---|
| idle | générer, importer, Kapture, Script | focus absent => demander sélection |
| preparing | annuler | progression résolution / compilation / QA ; aucune durée estimée inventée |
| ready/review | play, seek, modifier, export si permis | avertissements et options compatibles |
| blocked | revoir paramètres / route | diagnostic stable, export bloqué |
| exporting | annuler | format, progression frames, disque, échec propre |
| completed | ouvrir fichier local | manifeste et statut, aucun upload |

## Production en série (KOR-7)

Ne pas construire de service de jobs pour la première version. Une file locale séquentielle, alimentée par des demandes explicitement autorisées, suffit. Un job = un Score + un profil de sortie et variantes ; regrouper thèmes/formats compatibles pour éviter une résolution répétée dans la même génération. Une variante peut réutiliser uniquement un snapshot autorisé dans le contexte exact ; jamais entre principaux, Kristals ou policies. Les sorties de lot sont privées, stockées sous un répertoire choisi explicitement, noms sanitisés et collision évitée. Aucun accès à tous les Kristals par défaut : sélectionner une liste autorisée ; tout changement de contexte stoppe le lot. Un échec d'export format peut continuer les autres formats si contexte valide, un échec policy annule tout. Chaque sortie a statut success/skipped/failed, raison, durée, hash local si permis ; pas de faux succès global. Annulation purge temporaires, ne supprime pas fichiers finaux déjà remis sans action explicite.

CLI facultatif proposé (aucune commande actuelle) : `koreograph render --request request.json --out ./exports` et `koreograph batch --manifest jobs.json --out ./exports`. Ne pas inventer une méthode d'auth : passer par l'adaptateur et la session locale déjà autorisée, pas de token en arguments ou dans manifeste. Si CLI ne peut respecter le modèle de lecture, le limiter à un Bundle explicitement exporté et validé localement ou le repousser. Pas de glob de fichiers privés, pas de shell évalué, pas de URL importée. Plafonds proposés : 10 demandes, 8 thèmes par demande, 20 sorties totales, concurrence 1 export, budget 2 GiB de temporaires par export et vérification d'espace, interruption à deadline explicite locale. Le batch ne promet pas la publication ni le rendu universel.

## Cible de produit finale (hors extension multilingue)

| Domaine | Definition of Done / preuves attendues |
|---|---|
| Connexion réelle | G2 API et Reader Policy testées, parcours réels autorisés sur au moins deux corpus de structures différentes ; aucune dépendance à un graphe brut |
| Replay et Auto | Script/Kapture/Auto partagent Score ; départ depuis focus, seed stable, arrêt borné explicite ; mode Auto ne nécessite aucune IA |
| Motion | pivot identitaire, survivants stables, temps explicite, pause/seek/reduced ; pas de clignotement majeur sur golden |
| Story/Director | captions factuelles, timing lisible, caméra safe area, diagnostics ; règles déterministes testées |
| Thèmes | 8 presets, marque #1E6864, choix mono/by-kind/by-focus, formes/labels, import/export strict, contraste vérifié ; bascule sans relecture |
| Qualité | autocorrection bornée et reproductible, refus des cas impossibles, rapport QA fiable ; revue humaine des cas critiques |
| Exports | HTML hors ligne, SVG poster et animé sur supports déclarés, vidéo optionnelle avec encodeur, PNG, JSON, transcription ; même contenu et durée, absence de requête externe |
| Recettes spécialisées | chaque recette livrée déclarée et testée avec preuve, fallback et refus ; aucune prétention de couverture de toutes structures sans tests |
| Production locale | file séquentielle, annulation, quotas, nettoyage, manifeste privé, erreurs par sortie |
| Accessibilité | clavier, reduced-motion, alternatives textuelles, contraste et distinctions non chromatiques |
| Sécurité & release | gates G0–G5, build et suites du repo, revue propriétaire ; publication séparée, flag off sans régression |

Objectifs UX proposés : démo Auto depuis focus en un clic avec defaults, choix avancés non requis ; test d'usage : au moins 4 utilisateurs sur 5 produisent une démo valide sans assistance sur corpus synthétique, après une consigne courte. Ce seuil n'est pas une mesure effectuée. Mesurer temps, nombre de gestes et taux d'abandon, sans stocker de données de navigation privées. Une sortie n'est « prête » que si ses contrôles passent ; une version produit n'est « finale » que si les gates et la revue sont attestées. Les langues supplémentaires, audio, montage libre, cloud, v11 et distribution publique ne sont pas nécessaires à cette cible et restent hors scope tant que non décidés.

## Ordonnancement de livraison

Voir [lots KOR](11-livraison-exploitation.md). Priorité à une tranche complète Script + SVG/HTML ; ajouter thèmes par tokens plutôt que renderer dupliqué ; enrichir Story et caméra seulement après continuité ; automatiser QA avant batch. Chaque lot a un flag/rollback ; aucun lot de design ne change l'état de `IMPLEMENTATION.md`. Les nouveaux contrats ne seront promus dans `contracts/` qu'après revue et tests réels.
