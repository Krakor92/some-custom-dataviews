/**
 * Used by the function below
 */
const dummyDiv: HTMLDivElement = document.createElement("div");

/**
 * Create a document fragment from an HTML string.
 * @param strHTML - the HTML string to create the document fragment from.
 * @returns the document fragment containing the parsed HTML.
 */
export const createFragmentFromString = (strHTML: string): DocumentFragment => {
  const fragment: DocumentFragment = document.createDocumentFragment();

  /**
   * This div is needed for the actual HTML string to be parsed
   */
  dummyDiv.innerHTML = strHTML;

  while (dummyDiv.firstChild) {
    fragment.appendChild(dummyDiv.firstChild);
  }

  return fragment;
};

/**
 *
 * @param element - The starting element to search from.
 * @param className - The class name to search for in the parent elements.
 * @returns the first parent element with the specified class or null if not found.
 */
export const getParentWithClass = (
  element: HTMLElement,
  className: string
): HTMLElement | null => {
  // Traverse up the DOM tree until the root (body or html) is reached
  while (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    element = element.parentElement!;
    if (element?.classList.contains(className)) {
      return element;
    }
  }
  return null;
};

/**
 * Scrolls to the target element smoothly.
 * @param target - The target element or selector to scroll to.
 */
export const scrollToElement = (target: string | Element): void => {
  let element: Element | null;

  // Check if the provided parameter is a string (selector)
  if (typeof target === "string") {
    // If it's a string, use document.querySelector() to get the element
    element = document.querySelector(target);

    // Check if the selector returned a valid element
    if (!element) {
      console.error("Element not found for selector:", target);
      return;
    }
  } else if (target instanceof Element) {
    // If it's already a DOM element, use it directly
    element = target;
  } else {
    // Invalid parameter
    console.error("Invalid element or selector provided.");
    return;
  }

  // Scroll the element into view
  element.scrollIntoView({ behavior: "smooth", block: "start" });
};
