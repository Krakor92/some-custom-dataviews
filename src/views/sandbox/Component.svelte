<script lang="ts">
import { type App, type Component } from "obsidian";
import { setContext } from "svelte";

import type { DatacorePage } from '@/types/api'
import CustomView from "@/components/CustomView.svelte";
import GridAudioItem from "@/components/GridTrackItem.svelte";
import { TrackFactory, type Track, type TrackBlueprint } from "@/models/Track";

const {
  app,
  component,
  container,
  engine,

  filter,
  debug,
  disable,
  text,
  ...rest
}: {
  app: App,
  component: Component,
  container: HTMLElement,
  engine: any,

  filter: string,
  debug: boolean,
  disable: string,
  text: string,
} = $props()

setContext("debug", debug);


let result : DatacorePage[] = $derived(engine.getPlugin("datacore")?.api.query(filter))

const getPropFromDatacorePage = (prop: string, data: DatacorePage) => data?.$frontmatter?.[prop]?.value || data?.$infields?.[prop]?.value

// Define a different conversion function for another data format
const trackBlueprint: TrackBlueprint<DatacorePage> = (data) => ({
  title: getPropFromDatacorePage("title", data)?.toString() || data.$path.split("/").pop()!.split(".")[0],
  duration: Number(getPropFromDatacorePage("length", data)),
  url: getPropFromDatacorePage("url", data)?.toString() || '',
  thumbnail: getPropFromDatacorePage("thumbnail", data)?.toString() || undefined,
  filepath: data.$path,
});

const trackFactory = new TrackFactory<DatacorePage>(trackBlueprint)

let items : Track[] = $derived.by(() => {
  if (!result) return []

  return result.map((item) => {
    return trackFactory.create(item)
  })
})

$inspect({result, items})

</script>

<CustomView
  name="jukebox"
  {disable} {container}
>
  <h2 class="sandbox">Salut {text}</h2>
  <div class="grid">
    {#each items as item}
      <GridAudioItem {item} />
    {/each}
  </div>
</CustomView>
