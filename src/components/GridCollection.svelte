<script lang="ts">
  type T = any;

  import { App, Component, Platform } from "obsidian";
  import { onMount, getContext } from "svelte";

  import {
    CollectionManager,
    type HTMLPayload,
  } from "@/managers/CollectionManagerTs";
  import { Masonry } from "@/ui/MasonryTs";
  import { Virtualizer } from "@/ui/Virtualizer";

  import type { AsyncBlueprint } from "@/modules/Factory";

  import { useViewContext } from "@/runes/View.svelte";
  import type { Logger } from "@/modules/LoggerTs";

  const {
    app,
    component,
    container,
    result,
    cellBlueprint,
    disableSet,
  }: {
    app: App;
    component: Component;
    container: HTMLElement;

    result: T[];
    cellBlueprint: AsyncBlueprint<T, HTMLPayload>;
    disableSet: Set<string>;
  } = $props();

  let collection: HTMLDivElement;

  const logger: Logger | undefined = getContext("logger");

  const vc = useViewContext({ container, logger });

  onMount(async () => {
    const collectionManager = new CollectionManager<T>({
      app,
      component,
      container,
      currentFilePath: "",
      collection,
      childTag: "article",
      pages: result,
      pageBlueprint: cellBlueprint,
    });

    if (
      !disableSet.has("virtualisation") &&
      result.length >= 60 &&
      vc.inWhichFiletypeAmi() !== "canvas"
    ) {
      const virtualizedGridManager = new Virtualizer({
        root: vc.resolveCurrentContent(),
        manager: collectionManager,
        logger,
      });
    }

    await collectionManager.bakeNextHTMLBatch();
    await collectionManager.insertNewChunk();

    await collectionManager.bakeNextHTMLBatch();
    collectionManager.setupInfiniteLoading();

    if (!disableSet.has("masonry")) {
      const masonryManager = new Masonry(collectionManager.collection);

      const gridResizeObserver = new ResizeObserver(() => {
        masonryManager.resizeAllGridItems();
      });

      /**
       * Since I don't unobserve anywhere, it could give memory leaks...
       * According to this SO post: https://stackoverflow.com/questions/67581868/should-i-call-resizeobserver-unobserve-for-removed-elements
       * The garbage collector should disconnect it once the grid has been removed from the DOM
       * But when does it get removed by Obsidian ¯\_(ツ)_/¯
       */
      gridResizeObserver.observe(masonryManager.grid);

      /**
       * This workaround is only there because sometimes, when the view sits in a full popout window,
       * the insertion of element alone won't trigger the resize observer above
       * for a reason I don't understand so we have to give it a hand.
       *
       * There is no need to add this overhead on mobile since extra windows aren't available
       */
      if (!Platform.isMobile) {
        const gridMutationObserver = new MutationObserver((mutationRecord) => {
          for (const mutation of mutationRecord) {
            if (mutation.type !== "childList") return;

            const addedNodes = mutation.addedNodes;
            if (!addedNodes.length) return;

            masonryManager.resizeAllGridItems();
          }
        });
        gridMutationObserver.observe(masonryManager.grid, {
          childList: true,
        });
      }
    }
  });

  // onDestroy(() => {
  //   gridResizeObserver.unobserve()
  // });
</script>

<div class="grid" bind:this={collection}></div>
