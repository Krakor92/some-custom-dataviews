<script lang="ts">
  import type { Track } from "@/models/Track";
  import Timecode from "@/components/Timecode.svelte";
  import { convertDurationToTimecode } from "@/utils";

  import {
    printElementAttachment,
    obsdidianFileBehaviorAttachmentFactory,
  } from "@/runes/attachments.svelte";
  import type { App, TFile } from "obsidian";

  const {
    item,
    app,
  }: {
    item: Track;
    app: App;
  } = $props();
</script>

<article
  class="item"
  {@attach obsdidianFileBehaviorAttachmentFactory({ app, file: item.file })}
>
  <div class="thumb-stack">
    <a
      href={item.url}
      class="external-link"
      draggable="false"
      rel="noopener"
      target="_blank"
    >
      <img
        src={item.thumbnail}
        alt={`${item.title}'s thumbnail'`}
        referrerpolicy="no-referrer"
      />
    </a>
    {#if item.duration}
      <Timecode duration={item.duration} />
    {/if}
  </div>

  {#if item.filepath}
    <span class="file-link">
      <a
        href={item.filepath}
        data-href={item.filepath}
        aria-label={item.filepath}
        class="internal-link"
        draggable="false"
        rel="noopener"
        target="_blank"
      >
        {item.title}
      </a>
    </span>
  {/if}
</article>

<style>
  .item {
    z-index: 0;
    /* needed for mobile ?*/
    position: relative;
    background-color: var(--jukebox-cards-background);
    border: var(--jukebox-cards-border-width) solid
      var(--jukebox-background-modifier-border);
    display: flex;
    flex-direction: column;
    margin: 0;
    border-radius: var(--jukebox-cards-border-radius);
    overflow: hidden;
    transition: box-shadow 0.15s linear;
    min-width: var(--jukebox-cards-min-width);
    max-width: var(--jukebox-cards-max-width);

    --jukebox-cards-link-inline-padding: 1.2em;
  }

  .file-link {
    display: inline-block;
    padding: calc(var(--jukebox-cards-link-inline-padding) / 2) 0;
    border-bottom: none;
    /* font-size: var(--table-text-size); */
    line-height: normal;
    width: calc(100% - var(--jukebox-cards-link-inline-padding));
    margin: auto;
    overflow-wrap: anywhere;
    max-width: 100%;
    display: flex;
    justify-content: space-between;

    /* &>a {
      font-weight: var(--jukebox-cards-link-weight);
    } */
  }

  .thumb-stack {
    display: grid;

    /* When the thumbnail is wrapped in <a> */
    a {
      /* display: flex; */
      grid-column: 1;
      grid-row: 1;

      max-height: var(--jukebox-cards-image-max-height);
      background-image: none;
      padding: 0;
    }

    img {
      display: block;
      /* should be global */
      object-fit: cover;

      width: 100%;

      max-height: var(--jukebox-cards-image-max-height);

      margin: 0;
      pointer-events: none;
      z-index: -1;
      grid-column: 1;
      grid-row: 1;
      align-self: center;
      justify-self: center;
    }

    /* &:has(.player-button[data-state="playing"]) {
      .theme-light & img {
        filter: brightness(
            calc(1 + var(--jukebox-thumbnail-emphased-brigthness-offset))
          )
          blur(var(--jukebox-thumbnail-emphased-bluriness));
      }
      .theme-dark & img {
        filter: brightness(
            calc(1 - var(--jukebox-thumbnail-emphased-brigthness-offset))
          )
          blur(var(--jukebox-thumbnail-emphased-bluriness));
      }
    } */
  }
</style>
