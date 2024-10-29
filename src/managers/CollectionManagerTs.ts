import type { App, Component } from "obsidian";
import { MarkdownRenderer } from "obsidian";
import type { AsyncBlueprint } from "@/modules/Factory";
import { customObsidianIcon } from "@/ui/Icons";

export type HTMLPayload =
  | string
  | { html: string; extra?: Record<string, string> };

const handleImageFallback: OnErrorEventHandler = (
  event: Event | string
): void => {
  if (typeof event === "string") return;
  const target = event.target as HTMLImageElement;
  target.onerror = null;
  const threeDigitColor = Math.floor(Math.random() * 999).toString();
  target.outerHTML = customObsidianIcon(`#${threeDigitColor.padStart(3, "0")}`);
};

const manageImageEvents = (img: HTMLImageElement): void => {
  if (!img) return;

  img.onerror = handleImageFallback;
};

export class CollectionManager<T> {
  app: App;
  container: HTMLElement;
  component: Component;
  currentFilePath: string;
  collection: HTMLElement;
  pages: T[];
  pageBlueprint: AsyncBlueprint<T, HTMLPayload | HTMLPayload[]>;
  childTag: string;
  lastChildObserver: IntersectionObserver;
  lastInsertedChunk: HTMLPayload[] | null;

  bakedChildren: HTMLPayload[][] = [];
  bakedBatchIndex = 0;
  numberOfElementsPerBatch = 20;

  constructor({
    //Dependencies
    app,
    container,
    component,
    currentFilePath,
    collection,

    // Builder
    pages,
    pageBlueprint,

    //Child class injection
    childTag,
  }: {
    //Dependencies
    app: App;
    container: HTMLElement;
    component: Component;
    currentFilePath: string;
    collection: HTMLElement;
    pages: T[];
    pageBlueprint: AsyncBlueprint<T, HTMLPayload>;
    childTag: string;
  }) {
    this.app = app;

    /**
     * The parent element of this collection (most of the time, the codeblock div itself)
     */
    this.container = container;

    /** Correspond to the current plugin component where this object is instantiated */
    this.component = component;

    this.currentFilePath = currentFilePath;

    this.collection = collection;

    this.pages = pages;
    this.pageBlueprint = pageBlueprint;

    this.childTag = childTag;

    this.lastChildObserver = new IntersectionObserver(
      this.handleLastChildIntersection.bind(this),
      {
        root: null, // relative to the viewport
        rootMargin: "200px", // 200px below the viewport
        threshold: 0, // as soon as target is visible, invoke the callback
      }
    );

    this.lastInsertedChunk = null;
  }

  /**
   * There aren't any HTML to consume/render anymore (but there was at some point)
   */
  everyElementsHaveBeenInsertedInTheDOM = (): boolean =>
    this.bakedChildren.length === 0 &&
    this.bakedBatchIndex > 0 &&
    this.bakedBatchIndex * this.numberOfElementsPerBatch >= this.pages.length;

  /**
   * It bakes a new sliced batch of HTML children every time it is called
   * so they can be rendered in a lazy way by a method of the `insertChunk` family.
   *
   * A new batch is saved inside `this.bakedChildren` array on each call
   */
  async bakeNextHTMLBatch(): Promise<HTMLPayload[]> {
    const pagesBatch = this.pages.slice(
      this.bakedBatchIndex * this.numberOfElementsPerBatch,
      (this.bakedBatchIndex + 1) * this.numberOfElementsPerBatch
    );

    let HTMLBatch: HTMLPayload[] = [];

    for (const page of pagesBatch) {
      const child = await this.pageBlueprint(page);

      if (Array.isArray(child)) {
        HTMLBatch = [...HTMLBatch, ...child];
      } else {
        HTMLBatch.push(child);
      }
    }

    this.bakedBatchIndex++;
    if (HTMLBatch.length !== 0) {
      this.bakedChildren.push(HTMLBatch);
    }

    return HTMLBatch;
  }

  setupInfiniteLoading(): void {
    if (this.everyElementsHaveBeenInsertedInTheDOM()) return;

    /**
     * I have no idea why but it looks like calling `this.collection.querySelector(`${this.childTag}:last-of-type`)`
     * fails when the Virtualizer removes elements from the parent...
     *
     * Calling `this.collection.querySelectorAll(`${this.childTag}`)` instead does the trick
     */
    const elements = this.collection.querySelectorAll(`${this.childTag}`);
    const anchorElement = elements?.[elements.length - 1] ?? this.collection;

    if (anchorElement) {
      this.lastChildObserver.observe(anchorElement);
    }
  }

  /**
   * More like `appendFirstlyBakedChunk`
   */
  async insertNewChunk(position: InsertPosition = "beforeend"): Promise<void> {
    // Like a queue, we retrieve the first batch of children that has been baked
    const bakedChildrenChunk = this.bakedChildren.shift();
    if (!bakedChildrenChunk) return;

    await this.insertChunk(bakedChildrenChunk, position);
  }

  /**
   * It might be difficult to understand what's going on but it could be reduced to a 20 lines long function max
   * if `MarkdownRenderer.renderMarkdown` had a consistent behavior no matter what tags were passed to it
   *
   * So to circumvent that, this function render the stuborns child (mostly filelinks) in a separate container.
   * Later, it moves these rendered chunks of HTML into the actual DOM where we need to place them.
   */
  async insertChunk(
    chunk: HTMLPayload[],
    position: InsertPosition = "beforeend"
  ): Promise<void> {
    // We need to expose this for the virtualisation mechanism to work correctly
    this.lastInsertedChunk = chunk;

    console.log({ chunk });

    if (!chunk || chunk.length === 0) return;

    const actualChunkToInsert = chunk.reduce((acc: string, cur) => {
      if (typeof cur === "string") {
        return acc + cur;
      }
      // Here cur must be an object with an `html` property in it
      return acc + cur.html;
    }, "");

    // Needed for metadata-menu to trigger and render extra buttons
    const extraChunkDOM = this.container.createEl("div");
    let extraChunkHTML = "";
    for (const item of chunk) {
      if (typeof item === "string" || !item.extra) {
        extraChunkHTML += `<div></div>`;
        continue;
      }

      extraChunkHTML += `<div>`;
      for (const [selector, html] of Object.entries(item.extra)) {
        extraChunkHTML += `<div data-selector="${selector}">`;
        extraChunkHTML += html;
        extraChunkHTML += `</div>`;
      }
      extraChunkHTML += `</div>`;
    }

    /** The root cause of all this madness. I could use dv.el instead but it would add an extra level of abstraction I don't control */
    await MarkdownRenderer.render(
      this.app,
      extraChunkHTML,
      extraChunkDOM,
      this.currentFilePath,
      this.component
    );
    // ---

    const numberOfChildrenBeforeInsertion = this.collection.querySelectorAll(
      this.childTag
    ).length;
    if (!numberOfChildrenBeforeInsertion) {
      this.collection.insertAdjacentHTML(position, actualChunkToInsert);
    } else {
      if (position === "beforeend") {
        this.collection
          .querySelectorAll(this.childTag)
          [numberOfChildrenBeforeInsertion - 1].insertAdjacentHTML(
            "afterend",
            actualChunkToInsert
          );
      } else {
        this.collection
          .querySelector(this.childTag)
          ?.insertAdjacentHTML("beforebegin", actualChunkToInsert);
      }
    }

    /**
     * If we're appending (beforeend), we take a snapshot of the total number of children in the DOM before insertion so we know where to iterate
     * We need to do this because other classes might interact with the DOM at any given time
     */
    const childIndexBaseOffset =
      position === "beforeend" ? numberOfChildrenBeforeInsertion : 0;

    // 2nd part with the extraChunkDOM
    for (let i = 0; i < chunk.length; i++) {
      const extra = extraChunkDOM.children[i];
      if (!extra) continue;

      const currentChild = this.collection.querySelectorAll(this.childTag)[
        i + childIndexBaseOffset
      ];
      // That means we've reached the end of the infinite loading
      if (!currentChild) break;

      for (const extraChild of Array.from(extra.children) as HTMLElement[]) {
        const selector = extraChild.dataset.selector ?? "";
        const targetEl = currentChild.querySelector(selector);
        if (!targetEl) continue;
        while (extraChild.hasChildNodes()) {
          targetEl.appendChild(extraChild.firstChild!);
        }
      }

      // Fallback for images that don't load
      for (const imgNode of Array.from(currentChild.querySelectorAll("img"))) {
        // this.#handleImageLoading(imgNode)
        manageImageEvents(imgNode);
        // this.#handleImageEvents(imgNode)
      }
    }
    extraChunkDOM.remove();
    // ---
  }

  handleLastChildIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      this.lastChildObserver.unobserve(entry.target);

      /**
       * We can do both in parallel because the cooking is for the next rendering batch.
       * Note that we do not bake another batch if there is already more than one batch in the ovens.
       */
      Promise.all([
        this.insertNewChunk(),
        this.bakedChildren.length <= 1
          ? this.bakeNextHTMLBatch()
          : Promise.resolve(),
      ])
        .then(() => {
          // this.logger.logPerf(
          //   `Appending new children at the end of the grid + loading next batch (${this.bakedBatchIndex})`
          // );

          this.setupInfiniteLoading();
        })
        .catch(console.error);
    });
  }
}
