<script lang="ts">
  import { CONFIG_FIELDS, JukeboxView } from "@/bases/new/jukebox-view";
  import TrackItem from "@/bases/new/BasesGridTrackItem.svelte";
  import type { Track } from "@/models";
  import { onMount } from "svelte";

  interface Props {
    view: JukeboxView;
  }
  let { view }: Props = $props();

  let data: Track[] = $state([]);
  let imageMaxHeight: string = $state(
    (view.config.get(CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT.key) as string) ??
      CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT.default,
  );

  function onUpdate() {
    data = view.processData();

    imageMaxHeight =
      (view.config.get(CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT.key) as string) ??
      CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT.default;
  }

  let cardsMinWidth = $state("140px");

  onMount(() => {
    view.events.on("data-updated", onUpdate);

    return () => {
      view.events.off("data-updated", onUpdate);
    };
  });
</script>

<div
  class="bases-jukebox-container"
  style="
    --jukebox-cards-min-width: {cardsMinWidth};
    --jukebox-cards-image-max-height: {imageMaxHeight};
  "
>
  {#each data as item}
    <TrackItem {item} app={view.app} />
  {/each}
</div>
