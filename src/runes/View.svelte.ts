import type { Logger } from "@/modules/LoggerTs";
import { getParentWithClass } from "@/utils/html";

export function useViewContext({
  container,
  logger,
}: {
  container: HTMLElement;
  logger: Logger | undefined;
}) {
  const amiInCallout = (): boolean => {
    return !!getParentWithClass(container, "callout-content");
  };

  const amiInEmbed = (): boolean => {
    return !!getParentWithClass(container, "markdown-embed-content");
  };

  const amiInLivePreview = (): boolean => {
    return container.closest("[contenteditable]") != null;
  };

  const amiInPopover = (): boolean => {
    if (getParentWithClass(container, "popover")) return true;

    // Weird case: It happens when the view is burried in the popover file. It is in a strange dual state: Loaded but outside of the main DOM.
    if (
      !container?.parentNode?.parentNode // <div> // undefined
    )
      return true;

    return false;
  };

  const inWhichFiletypeAmi = (): string => {
    if (getParentWithClass(container, "canvas-node-content")) {
      return "canvas";
    }
    if (getParentWithClass(container, "kanban-plugin")) {
      return "kanban";
    }
    return "normal";
  };

  /**
   * The goal of this function is the opposite of `resolveCurrentLeaf`.
   * It's supposed to find the closest DOM element that encapsulate this view
   * to provide a complete virtualisation process no matter which file were in.
   */
  const resolveCurrentContent = (): HTMLElement | null => {
    let content = getParentWithClass(container, "markdown-embed-content");
    if (content) {
      logger?.log("We're in a specific type of file");
      return content;
    }

    content = getParentWithClass(container, "kanban-plugin");
    if (content) {
      logger?.log("We're in a Kanban card");
      if (
        content.firstChild &&
        (content.firstChild as HTMLElement).classList?.contains(
          "kanban-plugin__horizontal"
        )
      ) {
        content = getParentWithClass(container, "kanban-plugin__lane-items");
      }
      return content;
    }

    content = getParentWithClass(container, "view-content");
    if (content) {
      logger?.log("We're in a classic file");
      return content;
    }

    logger?.log("Weird, we haven't found a content node");
    return null;
  };

  const whereami = (): Record<string, boolean> => {
    return {
      popover: amiInPopover(),
      callout: amiInCallout(),
      embed: amiInEmbed(),
      livepreview: amiInLivePreview(),
    };
  };

  return {
    inWhichFiletypeAmi,
    whereami,
    resolveCurrentContent,
  };
}
