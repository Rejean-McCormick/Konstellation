# K10 — Contrat de preuve visible et politique de lecture

`compileVisualEvidence` est une étape serveur commune exécutée **après** `engine.scope(query.context)` et les compilateurs K0/K4/K5, jamais sur un état brut. Elle confronte les références d'assertions de chaque encodage avec le `Map` déjà filtré de la politique de lecture et, lorsque pertinent, le sujet, l'objet, la relation et l'entité visible.

## Contrat public

Le `NavigationProjection DTO` 1.0 ajoute une enveloppe facultative `visualAudit` : `derived:true`, `authoritative:false`, `publicationAuthorized:false`, `status`, `proofs`, `proofCount`, `truncated`, `warning`. Le validateur JSON est `contracts/navigation-projection.schema.json`.

Les statuts sont :

- `unqualified` : aucune preuve admissible; la géométrie ordinaire n'est pas sémantique;
- `qualified` : des encodages provenant de règles examinées et de témoins visibles sont disponibles dans la sélection;
- `partial` : même chose, mais la sélection est explicitement tronquée;
- `refused` : incohérence de témoignage; **aucune preuve** n'est diffusée.

Ce statut concerne **cette projection locale**, pas un Kristal entier ni une autorisation de publication. Une hiérarchie K5 peut être montrée comme relative à la vue et tronquée; elle n'est jamais une vérité nouvelle. Les liens techniques `conflict:*` sans assertion source vérifiable ne sont pas comptés comme preuves sémantiques dans l'audit.

## Budget et refus

96 preuves par vue au maximum; les preuves au-delà du budget marquent une vue partielle. Les exceptions, témoins invisibles et contradictions sont refusés sans récupérer des assertions cachées. Seules les identités de l'état filtré peuvent apparaître dans l'audit.
