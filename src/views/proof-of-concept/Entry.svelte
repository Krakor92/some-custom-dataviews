<script lang="ts">
import { type App, type Component } from "obsidian";
import { setContext } from "svelte";

import Jukebox from "./Jukebox.svelte";

import { DatacoreTrackFactory, type Track, type TrackBlueprint } from "@/models/Track";
import type { DatacorePage } from '@/types/api'
  import { Logger } from "@/modules/LoggerTs";

const {
  app,
  component,
  container,
  engine,

  filter,
  debug,
  disable,
  ...rest
}: {
  app: App,
  component: Component,
  container: HTMLElement,
  engine: any,

  filter: string,
  debug: boolean,
  disable: string,
} = $props()

setContext("debug", debug);

if (debug) {
  setContext("logger", new Logger({
    app,
    output: 'console',
  }))
}


let result : DatacorePage[] = $derived(engine.getPlugin("datacore")?.api.query(filter))

let items : Track[] = $derived.by(() => {
  if (!result) return []

  return result.map((item) => {
    return DatacoreTrackFactory.create(item)
  })
})

$inspect({result, items, disable})

</script>

<Jukebox {app} {component} {container}
  tracks={items}
  disableSet={new Set(disable.split(","))}
/>
