<script lang="ts">
import { getContext, type Snippet } from "svelte";

const {
  name,
  disable,
  container,
  lazy = true,

  children
}: {
  name: string,
  disable?: string,
  container: HTMLElement
  lazy?: boolean,

  children: Snippet
} = $props()

let root: HTMLDivElement;
let tid = $state((new Date()).getTime());

const disableSet = $derived.by(() => {
  if (!disable) return new Set<string>()

  return new Set(disable.split(" ").map((v) => v.toLowerCase()))
})

let mode = $state(lazy ? "not-ready" : "ready")

const observer = new IntersectionObserver(handleViewIntersection)
function handleViewIntersection(entries: IntersectionObserverEntry[]) {
  entries.map((entry) => {
    if (!entry.isIntersecting) return

    // this.logger?.reset(performance.now(), true)
    observer.unobserve(entry.target);

    // if (!this.managedToHideEditButton) {// try now that it has been loaded in the DOM
    //   this.#hideEditButtonLogic(this.host.parentNode?.nextSibling)
    // }
    mode = "ready"

    console.log(`${name} view is ready`)
  });
}

$effect(() => {
  if (!root) return
  observer.observe(container)

  return () => {
    observer.disconnect()
  }
})


const isDebug: boolean = getContext('debug') || false

const computeClassName = (name: string, disableSet: Set<string>, debug: boolean) => {
  let className = "custom-view " + name
  if (disableSet.has("border")) {
    className += " no-border"
  }
  if (debug) {
    className += " debug"
  }

  return className
}
</script>

<div bind:this={root}
  id={`${name}-${tid}`}
  class={computeClassName(name, disableSet, isDebug)}
  style="position:relative;-webkit-user-select:none!important"
>
  {#if mode === "ready"}
    {#if isDebug}
      <span style="color:orange; font-weight:bold;">{name} debug mode</span>
    {/if}
    {@render children()}
  {/if}
</div>
