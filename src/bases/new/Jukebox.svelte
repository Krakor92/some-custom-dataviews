<script lang="ts">
  import { JukeboxView } from "@/bases/new/jukebox-view";
  import TrackItem from "@/bases/new/BasesGridTrackItem.svelte";
  import type { Track } from "@/models";
  import { onMount } from "svelte";

  interface Props {
    view: JukeboxView;
  }

  let { view }: Props = $props();

  let data: Track[] = $state([]);
  let xName: string = $state("");
  let yName: string = $state("");

  function onUpdate() {
    data = view.processData();
  }

  onMount(() => {
    view.events.on("data-updated", onUpdate);

    return () => {
      view.events.off("data-updated", onUpdate);
    };
  });

  let height = $state(0);
  let width = $state(0);
</script>

<div class="bases-jukebox-container">
  {#each data as item}
    <TrackItem {item} app={view.app} />
  {/each}
</div>
