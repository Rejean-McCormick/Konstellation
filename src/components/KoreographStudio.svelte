<script>
  import { onMount, onDestroy } from 'svelte';
  import '../styles/koreograph.css';
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
