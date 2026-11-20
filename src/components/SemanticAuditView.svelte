<script>
  /** K9–K12: read-only audit of SERVER-COMPILED policy-visible evidence. */
  export let data;
  $: audit = data?.visualAudit || null;
  const labels = { hierarchy:'Hiérarchie',opposition:'Opposition',causal:'Causalité',
    shape:'Forme',color:'Couleur',size:'Taille',x:'Axe X',y:'Axe Y' };
</script>

{#if audit}
  <section class="visual-audit" aria-label="Contrôle des preuves visuelles" data-visual-audit={audit.status}>
    <div class="audit-title">
      <strong>Signification vérifiable de cette vue</strong>
      <span>{audit.status === 'qualified' ? 'Témoins vérifiés' : audit.status === 'partial' ? 'Vue partielle' : audit.status === 'refused' ? 'Qualification refusée' : 'Affichage non qualifié'}</span>
    </div>
    <p role="status">{audit.warning}</p>
    {#if audit.proofCount > 0}
      <details>
        <summary>{audit.proofCount} encodage(s) justifié(s) · voir les témoins</summary>
        <ul>
          {#each audit.proofs as proof, index (`${proof.channel}:${proof.ruleId}:${proof.entityId || ''}:${index}`)}
            <li><strong>{labels[proof.channel] || proof.channel}</strong> · {proof.ruleId} · portée : {proof.scope}
              {#if proof.entityId} · entité : {proof.entityId}{/if}
              {#if proof.assertionRefs.length}
                · assertion(s) visible(s) : {proof.assertionRefs.join(', ')}
              {:else}
                · type d'entité visible (sans assertion quantitative)
              {/if}
            </li>
          {/each}
        </ul>
      </details>
    {/if}
    <small>Rendu dérivé, non canonique · aucune autorisation de publication conférée</small>
  </section>
{/if}

<style>
  .visual-audit{border:1px solid #bdd0dd;border-radius:10px;background:#f7fafc;padding:12px;margin:12px 0;color:#25394b;font-size:13px}
  .audit-title{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
  .audit-title span{font-weight:600;color:#395c76}
  .visual-audit p{line-height:1.5}
  .visual-audit summary{cursor:pointer;font-weight:600}
  .visual-audit ul{max-height:240px;overflow:auto;padding-left:20px}
  .visual-audit li{line-height:1.6;overflow-wrap:anywhere}
  .visual-audit small{display:block;margin-top:8px;color:#516b7c}
</style>
