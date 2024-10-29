<script lang="ts">

import type { Track } from '@/models/Track';

const { item }: { item: Track } = $props()
</script>

<article class="item">
  <div class="thumb-stack">
    <a href={item.url} class="external-link" draggable="false" rel="noopener" target="_blank">
      <img
        src={item.thumbnail}
        alt={`${item.title}'s thumbnail'`}
        referrerpolicy="no-referrer"
      />
    </a>
    {#if item.duration}
      <div class="timecode">
        <span>{item.duration}</span>
      </div>
    {/if}
  </div>

  {#if item.filelink}
    <span class="file-link">
      <a
        href={item.filelink}
        data-href={item.filelink}
        aria-label={item.filelink}
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
