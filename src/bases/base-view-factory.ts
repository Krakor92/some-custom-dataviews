/**
 * Bases View Factory for TaskNotes Integration
 * 
 * This module provides a factory function that creates TaskNotes views within the Bases plugin.
 * It handles formula computation, data transformation, and rendering of TaskNotes items in Bases views.
 * 
 * Key features:
 * - Formula computation with access to TaskNote properties
 * - Proper handling of missing/empty formula values
 * - Integration with Bases' view lifecycle management
 */
import { mount, unmount } from 'svelte';

import MyPlugin from '@/main';
import type {
  BasesContainer,
  BasesDataItem,
  BasesViewObject,
  FormulaOutput,
} from '@/bases';

import GridVirtualizerDynamic from '@/components/GridVirtualizerDynamic.svelte';
import GridTrackItem from '@/components/GridTrackItem.svelte';
import Counter from '@/components/Counter.svelte';

import { BasesTrackFactory } from '@/models/Track';
import { extractDataItems } from '@/bases/api';



export function buildMyPluginJukeboxBasesViewFactory(plugin: MyPlugin) {
  return function basesViewFactory(basesContainer: BasesContainer): BasesViewObject {
    let currentRoot: HTMLElement | null = null;

    let counter: ReturnType<typeof Counter> | null = null;
    let trackItem: ReturnType<typeof GridTrackItem> | null = null;

    console.log("basesViewFactory")

    const { viewContainerEl } = basesContainer;
    if (!viewContainerEl) {
      console.error('[BasesPOC] No viewContainerEl found');
      return { destroy: () => { } } as any;
    }

    viewContainerEl.innerHTML = '';

    // Root container for view
    const root = document.createElement('div');
    // root.className = 'tn-bases-integration tasknotes-plugin tasknotes-container';
    viewContainerEl.appendChild(root);
    currentRoot = root;


    // const itemsContainer = document.createElement('div');
    // itemsContainer.className = 'tn-bases-items-container';
    // itemsContainer.style.cssText = 'margin-top: 12px;';
    // root.appendChild(itemsContainer);

    const cleanup = () => {
      if (counter) {
        console.log("unmount counter")
        unmount(counter)
      }

      if (trackItem) {
        console.log("unmount trackItem")
        unmount(trackItem)
      }
    }

    /**
     * Called 
     */
    const render = async () => {
      if (!currentRoot) return;
      console.log('Render!')
      try {
        cleanup()

        const { results } = basesContainer
        const dataItems = results ? extractDataItems(results) : [];
        console.log(dataItems)

        // itemsContainer.innerHTML = '';
        // const emptyEl = document.createElement('div');
        // emptyEl.style.cssText = 'padding: 20px; text-align: center; color: #666;';
        // emptyEl.textContent = 'No notes found for this Base.';
        // itemsContainer.appendChild(emptyEl);

        console.log("mount")
        counter = mount(Counter, {
          target: currentRoot,
          props: {
            startCount: dataItems.length,
          }
        })

        if (dataItems[0]) {
          trackItem = mount(GridTrackItem, {
            target: currentRoot,
            props: {
              item: BasesTrackFactory.create(dataItems[0]),
            }
          })
        }

        /*
        const taskNotes = await identifyTaskNotesFromBasesData(dataItems, plugin);

        // Render body
        itemsContainer.innerHTML = '';
        if (taskNotes.length === 0) {
          const emptyEl = document.createElement('div');
          emptyEl.className = 'tn-bases-empty';
          emptyEl.style.cssText = 'padding: 20px; text-align: center; color: #666;';
          emptyEl.textContent = 'No TaskNotes tasks found for this Base.';
          itemsContainer.appendChild(emptyEl);
        } else {
          // Build a map from task path to its properties/frontmatter
          const pathToProps = new Map<string, Record<string, any>>(
            dataItems.filter(i => !!i.path).map(i => [i.path || '', (i as any).properties || (i as any).frontmatter || {}])
          );


          // Apply Bases sorting if configured
          const { getBasesSortComparator } = await import('./sorting');
          const sortComparator = getBasesSortComparator(basesContainer, pathToProps);
          if (sortComparator) {
            taskNotes.sort(sortComparator);
          }

          // Render tasks using existing helper
          await renderTaskNotesInBasesView(itemsContainer, taskNotes, plugin, basesContainer);
        }
        */
      } catch (error: any) {
        console.error(`[BasesPOC] Error rendering Jukebox Bases View :`, error);
        const errorEl = document.createElement('div');
        errorEl.className = 'tn-bases-error';
        errorEl.style.cssText = 'padding: 20px; color: #d73a49; background: #ffeaea; border-radius: 4px; margin: 10px 0;';
        errorEl.textContent = `Error loading`;
        // itemsContainer.appendChild(errorEl);
      }
    };

    // Kick off initial async render
    void render();

    // Create view object with proper listener management
    let queryListener: (() => void) | null = null;

    const viewObject: BasesViewObject = {
      refresh: async () => {
        console.log("refresh")
        await render();
      },
      onResize: () => {
        // Handle resize - no-op for now
      },
      onDataUpdated: () => {
        void render();
      },
      getEphemeralState: () => {
        return { scrollTop: currentRoot?.scrollTop || 0 };
      },
      setEphemeralState: (state: any) => {
        if (state?.scrollTop && currentRoot) {
          currentRoot.scrollTop = state.scrollTop;
        }
      },
      destroy: () => {
        console.log("destroy")
        if (queryListener && basesContainer.query?.off) {
          try {
            basesContainer.query.off('change', queryListener);
          } catch (e) {
            // Query listener removal may fail if already disposed
          }
        }
        if (currentRoot) {
          currentRoot.remove();
          currentRoot = null;
        }
        queryListener = null;
      },
      load: () => {
        console.log("load")

        if (basesContainer.query?.on && !queryListener) {
          queryListener = () => void render();
          try {
            basesContainer.query.on('change', queryListener);
          } catch (e) {
            // Query listener registration may fail for various reasons
          }
        }

        // Trigger initial formula computation on load
        const controller = basesContainer.controller;
        if (controller?.runQuery) {
          controller.runQuery().then(() => {
            void render(); // Re-render with computed formulas
          }).catch((e: any) => {
            console.warn('[BasesPOC] Initial formula computation failed:', e);
          });
        }
      },
      unload: () => {
        console.log("unload")

        if (queryListener && basesContainer.query?.off) {
          try {
            basesContainer.query.off('change', queryListener);
          } catch (e) {
            // Query listener removal may fail if already disposed
          }
        }
        if (currentRoot) {
          currentRoot.remove();
          currentRoot = null;
        }
        queryListener = null;
      },

      display() {
        console.log("Called display method from Bases internal plugin")
      }
    };

    return viewObject;
  };
}
