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
  {@attach printElementAttachment}
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
  .thumb-stack {
    display: grid;

    /* Hide Sanctum's img overflowing */
    /* overflow: hidden; */

    /* When the thumbnail is wrapped in <a> */
    a {
      /* display: flex; */
      grid-column: 1;
      grid-row: 1;

      background-image: none;
      padding: 0;
    }
    /* transition: transform .5s ease; */

    img {
      /* should be global */
      object-fit: cover;

      width: 100%;

      /* should be global */
      max-height: 200px;
      border-radius: 6px;

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
