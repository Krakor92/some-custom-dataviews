/**
 * Apply a masonry layout to a grid layout
 * @author vikramsoni
 * @link https://codepen.io/vikramsoni/pen/gOvOKNz
 */
export class Masonry {
  grid: HTMLElement;

  constructor(
    container: HTMLElement | string,
    private childSelector = ".item"
  ) {
    if (!container)
      throw new Error(
        "Can't create a Masonry layout without a valid container"
      );

    this.grid =
      container instanceof HTMLElement
        ? container
        : document.querySelector(container)!;

    if (!this.grid)
      throw new Error(
        "Can't create a Masonry layout without a valid container"
      );
  }

  /**
   * Might be resource-intensive. Try to limit the number of call to this method
   */
  #resizeGridItem(item: HTMLElement, gridRowGap: number): void {
    // the higher this value, the less the layout will look masonry
    const rowBasicHeight = 0;

    // get grid's row gap properties, so that we could add it to children
    // to add some extra space to avoid overflowing of content
    let rowGap =
      gridRowGap ??
      parseInt(window.getComputedStyle(this.grid).getPropertyValue("row-gap"));
    if (Number.isNaN(rowGap)) {
      rowGap = 0;
    }

    const divider = rowBasicHeight + rowGap;

    // clientHeight represents the height of the container with contents.
    // we divide it by the rowGap to calculate how many rows it needs to span on
    const rowSpan =
      divider !== 0
        ? Math.ceil((item.clientHeight + rowGap) / divider)
        : item.clientHeight;

    // set the span numRow css property for this child with the calculated one.
    item.style.gridRowEnd = "span " + rowSpan;
  }

  resizeAllGridItems(): void {
    //console.log("resizeAllGridItems!!")
    const gridRowGap = parseInt(
      window.getComputedStyle(this.grid).getPropertyValue("row-gap")
    );

    for (const item of Array.from(this.grid.children) as HTMLElement[]) {
      this.#resizeGridItem(item, gridRowGap);
    }
  }
}
