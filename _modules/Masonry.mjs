/**
 * Apply a masonry layout to a grid layout
 * @author vikramsoni
 * @link https://codepen.io/vikramsoni/pen/gOvOKNz
 */
export class Masonry {
    constructor(container, childSelector = '.item') {
        if (!container) throw new Error("Can't create a Masonry layout without a valid container")

        // you can pass DOM object or the css selector for the grid element
        this.grid = container instanceof HTMLElement ? container : document.querySelector(container);

        this.childSelector = childSelector;
    }

    /**
     * Might be resource-intensive. Try to limit the number of call to this method
     * @param {HTMLElement} item 
     * @param {number} gridRowGap 
     */
    #resizeGridItem(item, gridRowGap) {
        // the higher this value, the less the layout will look masonry
        const rowBasicHeight = 0

        // get grid's row gap properties, so that we could add it to children
        // to add some extra space to avoid overflowing of content
        let rowGap = gridRowGap ?? parseInt(window.getComputedStyle(this.grid).getPropertyValue('row-gap'))
        if (Number.isNaN(rowGap)) {
            rowGap = 0
        }

        const divider = rowBasicHeight + rowGap

        // clientHeight represents the height of the container with contents.
        // we divide it by the rowGap to calculate how many rows it needs to span on
        const rowSpan = divider !== 0 ? Math.ceil((item.clientHeight + rowGap) / divider) : item.clientHeight

        // set the span numRow css property for this child with the calculated one.
        item.style.gridRowEnd = "span " + rowSpan
    }

    resizeAllGridItems() {
        //console.log("resizeAllGridItems!!")
        const gridRowGap = parseInt(window.getComputedStyle(this.grid).getPropertyValue('row-gap'))

        for (const item of this.grid.children) {
            this.#resizeGridItem(item, gridRowGap)
        }
    }
}