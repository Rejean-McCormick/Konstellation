# Playwright — système de test E2E

Konstellation possède maintenant un harnais Playwright destiné à tester l’application comme un utilisateur réel et à détecter les régressions qui échappent aux tests unitaires.

## Lancement Windows

Double-cliquer sur `Test_Konstellation.cmd`.

Le menu propose :

- **Test rapide** : démarrage, API `/health` et `/bootstrap`, absence de `Failed to fetch`.
- **Astrolabe** : Moïse, faute `ressurection`, Saint-Esprit, parousie, iconoclaste et eudiste.
- **Suite complète** : corpus, Astrolabe, navigation, inspecteur, sauvegarde/import-export et responsive mobile.
- **Playwright UI** : mode interactif pour rejouer chaque étape visuellement.
- **Rapport** : ouvre `playwright-report/index.html`.

Le runner utilise le port `4323` afin de ne pas perturber l’instance normale sur `4321`.

## Diagnostics automatiques

À chaque échec Playwright conserve :

- une capture d’écran ;
- une vidéo ;
- une trace Playwright ;
- `diagnostics.json` contenant les erreurs JavaScript, `console.error`, requêtes réseau échouées et réponses HTTP 5xx.

Une régression comme l’alerte **Failed to fetch** est donc un échec explicite du test de démarrage et des tests de parcours.

## Corpus biblique

La suite vérifie notamment :

- présence des types `person`, `work`, `concept`, `tradition` ;
- au moins 100 œuvres ;
- présence/alias de Moïse, Hénoch, Isaïe, Paul de Tarse et Pierre ;
- Saint-Esprit, Résurrection, Parousie et Iconoclasme ;
- Genèse, Matthieu, 1 Hénoch, Évangile de Thomas et Didachè ;
- au moins 3000 figures lorsque `KONSTELLATION_EXPECT_FULL_BIBLE=1`.

Si le test `@corpus-full` échoue, relancer `Update_Biblical_Corpus.cmd` puis la suite.

## Commandes npm

```text
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:astrolabe
npm run test:e2e:corpus
npm run test:e2e:ui
npm run test:e2e:report
```

Pour tester volontairement une instance déjà lancée : définir `PLAYWRIGHT_BASE_URL`, par exemple `http://127.0.0.1:4321`. Dans ce mode Playwright ne démarre pas son propre serveur.
