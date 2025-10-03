<script lang="ts">
  import {
    JukeboxView,
    AUDIO_FIELD,
    LENGTH_FIELD,
    THUMBNAIL_FIELD,
    type ProcessedData,
  } from "@/bases/new/jukebox-view";
  import { onMount } from "svelte";

  interface Props {
    view: JukeboxView;
  }

  let { view }: Props = $props();

  let data: ProcessedData[] = $state([]);
  let xName: string = $state("");
  let yName: string = $state("");

  function onUpdate() {
    const xField = view.config?.getAsPropertyId(X_FIELD);
    const yField = view.config?.getAsPropertyId(Y_FIELD);

    xName = xField ? `${view.config.getDisplayName(xField)} →` : "";
    yName = yField ? `↑ ${view.config.getDisplayName(yField)}` : "";

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

<div
  class="bases-chart-container"
  bind:clientHeight={height}
  bind:clientWidth={width}
>
  Enorme
</div>
