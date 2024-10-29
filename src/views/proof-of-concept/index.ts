import { mount, unmount } from "svelte";
import View from "./Entry.svelte";
import type { JsExecutionGlobals } from "@/types/JsEngine";

interface ViewProps {
  /**
   * The filter query to apply
   */
  filter?: string;

  disable?: string;
  debug?: boolean;
}

export async function main(
  { globals }: { globals: JsExecutionGlobals },
  { filter = "", disable = "", debug = false }: ViewProps = {}
): Promise<void> {
  const { component, container } = globals;
  if (!container) return;

  const svelteComponent = mount(View, {
    target: container,
    props: {
      filter,
      disable,
      debug,
      ...globals,
      container,
    },
  });

  component.register(() => {
    unmount(svelteComponent);
  });
}
