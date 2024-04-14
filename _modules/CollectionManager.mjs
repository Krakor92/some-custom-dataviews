
/**
 * A function that takes an `HTMLElement` as input and do some computation on it
 * @typedef {Function} HTMLCallback
 * @property {HTMLElement} element
 */

/**
 * The object that should be returned by the `pageToChild` method of this class
 * @typedef {object} PageToHTML
 * @property {string} html
 * @property {object} extra - A set of selectors to html. Needed for specific HTML tags behavior to happen on tag insertion
 * @property {HTMLCallback} postInsertionCb - Used to do some computation on the element after it has been inserted in the DOM
 */

/**
 * @abstract
 * 
 * @description
 * This class is no longer Dataview dependant. This makes it agnostic of the engine its running on
 * It might be Dataview, Datacore or even JS-Engine, this class shouldn't care
 * 
 * This class is the blueprint to use for classes that manage a collection of children node in the DOM.
 * 
 * It handles:
 * - Lazy rendering of a bunch of DOM elements for blazing fast performance
 * - Custom rendering that bypass `MarkdownRenderer.renderMarkdown` capacity
 * - Image fallback
 * 
 * @warning
 * Don't instantiate it directly from its constructor. You should use one of the static methods at the bottom instead.
 * 
 * @example
 * // Initializes the collection manager with all its needed dependencies
 * const gridManager = CollectionManager.makeGridManager({
 *      container,
 *      component,
 *      currentFilePath,
 *      logger, icons, utils,
 *      numberOfElementsPerBatch: 20,
 *  })
 * 
 * // Internaly build the HTML representation of every elements thanks to blueprint
 * await gridManager.buildChildrenHTML({pages, pageToChild: async (p) => {...}})
 * 
 * // Creates the HTML element that will hold every children and push it in the DOM
 * gridManager.buildParent()
 * 
 * // Appends a chunk of element inside the DOM as children of the parent
 * await gridManager.insertNewChunk()
 * 
 * // Initializes the infinite rendering that happens on scroll
 * gridManager.initInfiniteLoading()
 */
export class CollectionManager {
    /**
     * @param {object} _
     * @param {Function} _.buildParent - a function that build, insert in the DOM and set this.parent (must be a regular function)
     */
    constructor({
        //Dependencies
        obsidian,
        container,
        component,
        currentFilePath,
        logger,
        utils,
        icons,

        //Optional
        disableSet,
        numberOfElementsPerBatch = 20,
        extraLogicOnNewChunk = [],

        //Child class injection
        childTag,
        buildParent,
    }) {
        /** Contains the Obsidian instance with its utilities */
        this.obsidian = obsidian

        /** 
         * The parent element of this collection (most of the time, the codeblock div itself)
         * @type {HTMLElement}
         */
        this.container = container

        /** Correspond to the current plugin component where this object is instantiated */
        this.component = component

        /** @type {string} */
        this.currentFilePath = currentFilePath

        this.logger = logger
        this.icons = icons
        this.utils = utils
        this.disableSet = disableSet

        this.childTag = childTag
        this.buildParent = buildParent.bind(this)


        /** @type {HTMLElement} */
        this.collection = null

        /** @type {(string|object)[]} */
        this.children = []

        this.batchesFetchedCount = 0
        this.numberOfElementsPerBatch = numberOfElementsPerBatch

        /** @type {Array<function(CollectionManager): Promise<void>>} */
        this.extraLogicOnNewChunk = extraLogicOnNewChunk

        const intersectionOptions = {
            root: null, // relative to the viewport
            rootMargin: '200px', // 200px below the viewport
            threshold: 0,
        }

        this.childObserver = new IntersectionObserver(this.handleLastChildIntersection.bind(this), intersectionOptions);
    }

    everyElementsHaveBeenInsertedInTheDOM = () => (this.batchesFetchedCount * this.numberOfElementsPerBatch >= this.children.length)

    /**
     * Susceptible to be overriden by a more specialized Collection instance
     * 
     * *What are the differences with `this.collection`?*
     * 
     * this.collection is the main container of the Collection (`<table>` for Table, `<div>` for Grid, ...)  
     * this.parent is the container that directly contains the children (for example, it should be `<tbody>` for Table)  
     * Both can refer to the same HTML element but not necessarly
     */
    get parent() {
        return this.collection
    }

    /**
     * Build the complete list of children that will eventually be rendered on the screen
     * (if you scroll all the way down)
     * This method params can be quite obscure and for a reason: The `MarkdownRenderer.renderMarkdown` method
     *
     * @param {object} _
     * @param {*} _.pages - dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface)
     * @param {Function} _.pageToChild - This function get a page as its parameter and is suppose to return an html string or an array of html strings
     * @returns {string[]} Each value of the array contains some HTML equivalent to a cell on the grid
     */
    buildChildrenHTML = async ({ pages, pageToChild }) => {
        let children = []

        this.logger.reset()

        for (const p of pages) {
            const child = await pageToChild(p)

            if (Array.isArray(child)) {
                children = [...children, ...child]
            } else {
                children.push(child)
            }
        }

        this.children = children
        this.logger?.log({ children })
        this.logger?.logPerf(`Building the HTML representation of the collection`)
    }

    /**
     * TODO: finish this generator/yield implementation to have a true lazy generation of HTML
     * Hence I need to modify handleLastChildIntersection and insertNewChunk
     * Is it really worth it though? The current buildChildrenHTML isn't that slow
     */
    async *generateChildrenHTML({ pages, pageToChild }) {
        let pageIndex = 0;

        while (pageIndex < pages.length) {
            const batchPages = pages.slice(pageIndex, pageIndex + this.numberOfElementsPerBatch);
            const batchHTML = [];

            for (const page of batchPages) {
                const child = await pageToChild(page)

                if (Array.isArray(child)) {
                    batchHTML = [...batchHTML, ...child]
                } else {
                    batchHTML.push(child)
                }
            }

            pageIndex += this.numberOfElementsPerBatch;

            this.batchChildrenHTML = batchHTML
            yield this.batchChildrenHTML; // Yield the batch of HTML strings
        }
    }

    initInfiniteLoading() {
        if (this.everyElementsHaveBeenInsertedInTheDOM()) return

        const lastChild = this.parent.querySelector(`${this.childTag}:last-of-type`);
        this.logger?.log({ lastChild })
        if (lastChild) {
            this.childObserver.observe(lastChild)
        }
    }

    #handleImageFallback(img) {
        if (!img) return

        img.onerror = () => {
            this.logger?.log({ img })
            img.onerror = null;
            const threeDigitColor = (Math.floor(Math.random() * 999)).toString()
            img.outerHTML = this.icons.customObsidianIcon(`#${threeDigitColor.padStart(3, 0)}`);
        }
    }

    /**
     * It might be difficult to understand what's going on but it could be reduced to a 20 lines long function max
     * if `MarkdownRenderer.renderMarkdown` had a consistent behavior no matter what tags were passed to it
     */
    async insertNewChunk() {
        const fromSliceIndex = this.batchesFetchedCount * this.numberOfElementsPerBatch
        const toSliceIndex = (this.batchesFetchedCount + 1) * this.numberOfElementsPerBatch

        const newChunk = this.children.slice(fromSliceIndex, toSliceIndex).reduce((acc, cur) => {
            if (typeof cur === "string") {
                return acc + cur
            }
            // Here cur must be an object with an `html` property in it
            return acc + cur.html
        }, "")

        // Needed for metadata-menu to trigger and render extra buttons
        const extraChunkDOM = this.container.createEl('div')
        let extraChunkHTML = ''
        for (let i = fromSliceIndex; i < toSliceIndex; i++) {
            if (!this.children[i]?.extra) {
                extraChunkHTML += `<div></div>`
                continue;
            }

            extraChunkHTML += `<div>`
            for (const [selector, html] of Object.entries(this.children[i].extra)) {
                extraChunkHTML += `<div data-selector="${selector}">`
                extraChunkHTML += html
                extraChunkHTML += `</div>`
            }
            extraChunkHTML += `</div>`
        }
        /** The root cause of all this madness. I could use dv.el instead but it would add an extra level of abstraction I don't control */
        await this.obsidian.MarkdownRenderer.renderMarkdown(extraChunkHTML, extraChunkDOM, this.currentFilePath, this.component)
        // ---

        if (!this.parent) {
            return console.error("Something went wrong, the collection parent element doesn't exist in the DOM")
        }

        this.parent.insertAdjacentHTML('beforeend', newChunk)

        // 2nd part with the extraChunkDOm
        for (let i = 0; i < this.numberOfElementsPerBatch; i++) {
            const extra = extraChunkDOM.children[i]
            if (!extra) continue

            const currentChild = this.parent.children[i + fromSliceIndex]
            // That means we've reach the end of the infinite loading
            if (!currentChild) break

            for (const extraChild of extra.children) {
                const targetEl = currentChild.querySelector(extraChild.dataset.selector)
                if (!targetEl) continue
                while (extraChild.hasChildNodes()) {
                    targetEl.appendChild(extraChild.firstChild)
                }
            }

            // Fallback for images that don't load
            for (const imgNode of currentChild.querySelectorAll("img")) {
                this.#handleImageFallback(imgNode)
            }
        }
        extraChunkDOM.remove()
        // ---

        this.batchesFetchedCount++

        this.logger?.log({ batchesFetchedCount: this.batchesFetchedCount })

        for (const fn of this.extraLogicOnNewChunk) {
            await fn(this)
        }
    }

    handleLastChildIntersection(entries) {
        entries.map(async (entry) => {
            if (entry.isIntersecting) {
                this.logger.log(entry)
                this.logger.reset()

                this.childObserver.unobserve(entries[0].target);

                await this.insertNewChunk()

                this.logger.logPerf("Appending new children at the end of the grid")

                if (this.batchesFetchedCount * this.numberOfElementsPerBatch < this.children.length) {
                    this.logger?.log(`Batch to load next: ${this.batchesFetchedCount * this.numberOfElementsPerBatch}`)
                    const lastChild = this.parent.querySelector(`${this.childTag}:last-of-type`)
                    this.childObserver.observe(lastChild)
                }
            }
        });
    }

    static makeTableManager(dependencies) {
        function buildParent(headers) {
            const buildTHead = (headers) => {
                const trFragment = document.createDocumentFragment();
                headers.forEach(header => {
                    const headerHTML = `<p>${header}</p>`
                    const th = this.container.createEl("th", { cls: "table-view-th" })
                    th.insertAdjacentHTML('beforeend', headerHTML)
                    trFragment.appendChild(th)
                })

                const tr = this.container.createEl("tr", { cls: "table-view-tr-header" })
                tr.appendChild(trFragment)

                const thead = this.container.createEl("thead", { cls: "table-view-thead" })
                thead.appendChild(tr)

                return thead
            }

            const thead = buildTHead(headers)
            const tbody = this.container.createEl("tbody", { cls: "table-view-tbody" })

            const table = this.container.createEl("table", { cls: "table-view-table" })
            table.appendChild(thead)
            table.appendChild(tbody)

            this.collection = table
        }

        const tableManager = new CollectionManager({
            ...dependencies,
            buildParent,
            childTag: 'tr',
        })

        Object.defineProperty(tableManager, "parent", {
            get: function () {
                return tableManager.collection?.lastChild;
            },
        });

        return tableManager
    }

    static makeGridManager(dependencies) {
        function buildParent() {
            this.collection = this.container.createEl("div", { cls: "grid" })
        }

        return new CollectionManager({
            ...dependencies,
            buildParent,
            childTag: 'article',
        })
    }
}