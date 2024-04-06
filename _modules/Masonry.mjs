/**
 * Apply a masonry layout to a grid layout
 * @author vikramsoni
 * @link https://codepen.io/vikramsoni/pen/gOvOKNz
 */
export class Masonry {
    constructor(container) {
        if (!container) throw new Error("Can't create a Masonry layout without a valid container")

        // you can pass DOM object or the css selector for the grid element
        this.grid = container instanceof HTMLElement ? container : document.querySelector(container);

        // get HTMLCollection of all direct children of the grid span created by dv.el()
        /** @type {HTMLCollection} */
        this.gridItemCollection = this.grid.children;
    }

    #resizeGridItem(item, gridRowGap) {
        // the higher this value, the less the layout will look masonry
        const rowBasicHeight = 0

        // get grid's row gap properties, so that we could add it to children
        // to add some extra space to avoid overflowing of content
        const rowGap = gridRowGap ?? parseInt(window.getComputedStyle(this.grid).getPropertyValue('grid-row-gap'))

        // clientHeight represents the height of the container with contents.
        // we divide it by the rowGap to calculate how many rows it needs to span on
        const rowSpan = Math.ceil((item.clientHeight + rowGap) / (rowBasicHeight + rowGap))

        // set the span numRow css property for this child with the calculated one.
        item.style.gridRowEnd = "span " + rowSpan
    }

    resizeAllGridItems() {
        const gridRowGap = parseInt(window.getComputedStyle(this.grid).getPropertyValue('grid-row-gap'))

        for (const item of this.gridItemCollection) {

            this.#resizeGridItem(item, gridRowGap)
        }
    }
}