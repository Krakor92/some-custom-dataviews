import { mount, unmount } from "svelte";
import type { JsExecutionGlobals } from "@/types/JsEngine";
import Component from "@/views/sandbox/Component.svelte";

export async function main(
  { globals }: { globals: JsExecutionGlobals },
  params: {
    filter: string;
    debug: boolean;
  } = {
    debug: false,
    filter: "",
  }
): Promise<void> {
  const { component, container } = globals;
  if (!container) return;

  const svelteComponent = mount(Component, {
    target: container,
    props: {
      ...params,
      ...globals,
      container,
      disable: "",
      text: "Je suis beaucoup trop hype par la s2 de Arcane",
    },
  });

  component.register(() => {
    unmount(svelteComponent);
  });
}
