<script>
  import { onMount, onDestroy } from 'svelte';
  import { createStudio } from '../lib/koreograph/studio.mjs';
  export let context;
  export let lensRef;
  export let kristal = '';
  export let authToken = '';
  export let sessionKey = '';
  export let target = null;
  let host, studio;
  onMount(() => { studio=createStudio(host); });
  $: if(studio) studio.update({context,lensRef,kristal,authToken,sessionKey,target});
  onDestroy(() => studio?.destroy());
</script>
<div class="koreograph-studio" bind:this={host}></div>
<style>
  .koreograph-studio {border:1px solid #1e6864;border-radius:12px;padding:14px;margin:12px 0;min-width:0;}
  .koreograph-studio :global(.kg-title) {color:#1e6864;margin:0 0 8px;font-size:1.4rem;}
  .koreograph-studio :global(.kg-controls),.koreograph-studio :global(.kg-player) {display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0;}
  .koreograph-studio :global(label) {display:grid;gap:4px;font-size:.8rem;}
  .koreograph-studio :global(button),.koreograph-studio :global(select) {font:inherit;border:1px solid #1e6864;border-radius:6px;padding:6px 9px;color:inherit;background:transparent;}
  .koreograph-studio :global(button:disabled) {opacity:.45;}
  .koreograph-studio :global(.kg-stage) {max-width:100%;overflow:hidden;border-radius:9px;}
  .koreograph-studio :global(.kg-stage svg) {display:block;width:100%;height:auto;max-height:65vh;}
  .koreograph-studio :global(.kg-player input) {flex:1;min-width:100px;}
  .koreograph-studio :global(.kg-status) {font-size:.85rem;}
  .koreograph-studio :global([hidden]) {display:none!important;}
</style>
