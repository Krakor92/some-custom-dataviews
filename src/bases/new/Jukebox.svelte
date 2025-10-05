<script lang="ts">
  import { CONFIG_FIELDS, JukeboxView } from "@/bases/new/jukebox-view";
  import TrackItem from "@/bases/new/BasesGridTrackItem.svelte";
  import type { Track } from "@/models";
  import { onMount } from "svelte";

  interface Props {
    view: JukeboxView;
  }
  let { view }: Props = $props();

  let configVersion = $state(0);

  let data: Track[] = $state([]);

  // #region Configs
  let imageMaxHeight: string = $derived.by(() => {
    void configVersion;
    return (
      (view.config.get(CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT.key) as string) ??
      CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT.default
    );
  });
  let cardsMinWidth: string = $derived.by(() => {
    void configVersion;
    return (
      (view.config.get(CONFIG_FIELDS.CARDS_MIN_WIDTH.key) as string) ??
      CONFIG_FIELDS.CARDS_MIN_WIDTH.default
    );
  });
  let cardsBorderRadius: number = $derived.by(() => {
    void configVersion;
    return (
      (view.config.get(CONFIG_FIELDS.CARDS_BORDER_RADIUS.key) as number) ??
      CONFIG_FIELDS.CARDS_BORDER_RADIUS.default
    );
  });
  let gridColumnGap: string = $derived.by(() => {
    void configVersion;
    return (
      (view.config.get(CONFIG_FIELDS.GRID_COLUMN_GAP.key) as string) ??
      CONFIG_FIELDS.GRID_COLUMN_GAP.default
    );
  });
  let gridRowGap: string = $derived.by(() => {
    void configVersion;
    return (
      (view.config.get(CONFIG_FIELDS.GRID_ROW_GAP.key) as string) ??
      CONFIG_FIELDS.GRID_ROW_GAP.default
    );
  });
  // #endregion

  function onUpdate() {
    data = view.processData();
    configVersion++; // to trigger recomputation of the config refs
  }

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
    --jukebox-cards-background: transparent;

    --jukebox-cards-min-width: {cardsMinWidth};
    --jukebox-cards-max-width: 1fr;

    --jukebox-cards-image-max-height: {imageMaxHeight};
    --jukebox-cards-border-radius: {cardsBorderRadius}px;

    --jukebox-grid-column-gap: {gridColumnGap};
    --jukebox-grid-row-gap: {gridRowGap};
  "
>
  {#each data as item}
    <TrackItem {item} app={view.app} />
  {/each}
</div>

<style>
  .bases-jukebox-container {
    display: grid;
    grid-template-columns: repeat(
      auto-fit,
      minmax(var(--jukebox-cards-min-width), var(--jukebox-cards-max-width))
    );
    /**
     * Note that even empty elements like stubs are affected by this gap
     * so it should be taken under consideration when applying margin to the rest of the layout
     */
    column-gap: var(--jukebox-grid-column-gap);
    row-gap: var(--jukebox-grid-row-gap);
    margin: 1rem;
  }
</style>
