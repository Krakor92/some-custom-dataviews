
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
 * This class is no longer Dataview dependant. This makes it agnostic of the engine its running on.
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
 * // Define the pageToChild function (it might return several HTML elements)
 * const pageToChild = async (p) => {...}
 * 
 * // Initializes the collection manager with all its needed dependencies
 * const gridManager = CollectionManager.makeGridManager({
 *      obsidian,
 *      container,
 *      component,
 *      currentFilePath,
 *      pages,
 *      pageToChild,
 *      logger, icons,
 *      numberOfElementsPerBatch: 20,
 *  })
 * 
 * // Creates the HTML element that will hold every children and push it in the DOM
 * gridManager.buildParent()
 * 
 * // Internaly build the HTML representation of the next batch thanks to the previously given blueprint
 * await gridManager.bakeNextHTMLBatch()
 * 
 * // Appends that previously baked HTML inside the DOM as children of the parent
 * await gridManager.insertNewChunk()
 * 
 * //...
 * 
 * // Prepare for the next batch and imminent infinite rendering
 * await gridManager.bakeNextHTMLBatch(),
 *
 * // Initializes the infinite rendering that happens on scroll
 * gridManager.setupInfiniteLoading()
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
        icons,

        //Mandatory
        pages,
        pageToChild,

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
        this.disableSet = disableSet

        this.childTag = childTag
        this.buildParent = buildParent.bind(this)


        /** @type {HTMLElement} */
        this.collection = null

        /**
         * An array of array of HTML representation of the children
         * Each time `bakeNextHTMLBatch` is called, a new array is pushed
         * @type {(string|object)[][]}
         */
        this.bakedChildren = []
        this.bakedBatchIndex = 0

        /** @type {*} dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface) */
        this.pages = pages

        /**
         * @type {Function} - This function get a page as its parameter and is suppose to return an html string or an array of html strings
         */
        this.pageToChild = pageToChild

        this.numberOfElementsPerBatch = numberOfElementsPerBatch

        /** @type {Array<function(CollectionManager): Promise<void>>} */
        this.extraLogicOnNewChunk = extraLogicOnNewChunk

        const intersectionOptions = {
            root: null, // relative to the viewport
            rootMargin: '200px', // 200px below the viewport
            threshold: 0, // as soon as target is visible, invoke the callback
        }

        this.lastChildObserver = new IntersectionObserver(this.handleLastChildIntersection.bind(this), intersectionOptions);
    }

    /**
     * There aren't any HTML to consume/render anymore (but there was at some point)
     */
    everyElementsHaveBeenInsertedInTheDOM = () => (
        this.bakedChildren.length === 0 &&
        this.bakedBatchIndex > 0
        && this.bakedBatchIndex * this.numberOfElementsPerBatch >= this.pages.length
    )

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

    cleanTheOvens() {
        this.bakedChildren = []
        this.bakedBatchIndex = 0
    }

    /**
     * It bakes a new sliced batch of HTML children every time it is called
     * so they can be rendered in a lazy way by a method of the `insertChunk` family.
     * 
     * A new batch is saved inside `this.bakedChildren` array on each call
     * 
     * @param {object} _
     * @returns {Promise<(string|object)[]>}
     */
    async bakeNextHTMLBatch() {
        const pagesBatch = this.pages.slice(
            this.bakedBatchIndex * this.numberOfElementsPerBatch,
            (this.bakedBatchIndex + 1) * this.numberOfElementsPerBatch);

        let HTMLBatch = [];

        for (const page of pagesBatch) {
            const child = await this.pageToChild(page)

            if (Array.isArray(child)) {
                HTMLBatch = [...HTMLBatch, ...child]
            } else {
                HTMLBatch.push(child)
            }
        }

        this.bakedBatchIndex++;
        if (HTMLBatch.length !== 0) {
            this.bakedChildren.push(HTMLBatch)
        }

        return HTMLBatch
    }

    setupInfiniteLoading() {
        if (this.everyElementsHaveBeenInsertedInTheDOM()) return

        /**
         * I have no idea why but it looks like calling `this.parent.querySelector(`${this.childTag}:last-of-type`)`
         * fails when the VirtualizedGrid removes elements from the parent...
         * 
         * It's super weird but calling `this.parent.querySelectorAll(`${this.childTag}`)` instead does the trick
         */
        const elements = this.parent.querySelectorAll(`${this.childTag}`)
        const anchorElement = elements?.[elements.length - 1] ?? this.collection

        if (anchorElement) {
            this.lastChildObserver.observe(anchorElement)
        }
    }

    /**
     * @param {Event} event
     */
    #handleImageFallback(event) {
        event.target.onerror = null;
        const threeDigitColor = (Math.floor(Math.random() * 999)).toString()
        event.target.outerHTML = this.icons.customObsidianIcon(`#${threeDigitColor.padStart(3, 0)}`);
    }

    /**
     * @param {HTMLImageElement} img 
     */
    #manageImageEvents(img) {
        if (!img) return

        img.onerror = this.#handleImageFallback.bind(this)
    }

    /**
     * It might be difficult to understand what's going on but it could be reduced to a 20 lines long function max
     * if `MarkdownRenderer.renderMarkdown` had a consistent behavior no matter what tags were passed to it
     * 
     * So to circumvent that, this function render the stuborns child (mostly filelinks) in a separate container.
     * Later, it moves these rendered chunks of HTML into the actual DOM where we need to place them.
     * 
     * More like `appendFirstlyBakedChunk`
     */
    async insertNewChunk(position = "beforeend") {
        // Like a queue, we retrieve the first batch of children that has been baked
        const bakedChildrenChunk = this.bakedChildren.shift()

        await this.insertChunk(bakedChildrenChunk, position)
    }

    /**
     * 
     * @param {*} chunk 
     * @param {'beforeend' | 'beforebegin'} position 
     * @returns 
     */
    async insertChunk(chunk, position = "beforeend") {
        // We need to expose this for the virtualisation mechanism to work correctly
        this.lastInsertedChunk = chunk

        console.log({ chunk })

        if (!chunk || chunk.length === 0) return;

        /** @type {string} */
        const actualChunkToInsert = chunk.reduce((acc, cur) => {
            if (typeof cur === "string") {
                return acc + cur
            }
            // Here cur must be an object with an `html` property in it
            return acc + cur.html
        }, "")

        // Needed for metadata-menu to trigger and render extra buttons
        const extraChunkDOM = this.container.createEl('div')
        let extraChunkHTML = ''
        for (let i = 0; i < chunk.length; i++) {
            if (!chunk[i]?.extra) {
                extraChunkHTML += `<div></div>`
                continue;
            }

            extraChunkHTML += `<div>`
            for (const [selector, html] of Object.entries(chunk[i].extra)) {
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

        const numberOfChildrenBeforeInsertion = this.parent.querySelectorAll(this.childTag).length
        if (!numberOfChildrenBeforeInsertion) {
            this.parent.insertAdjacentHTML(position, actualChunkToInsert)
        } else {
            if (position === 'beforeend') {
                this.parent.querySelectorAll(this.childTag)[numberOfChildrenBeforeInsertion - 1].insertAdjacentHTML('afterend', actualChunkToInsert)
            } else {
                this.parent.querySelector(this.childTag).insertAdjacentHTML('beforebegin', actualChunkToInsert)
            }
        }

        /**
         * If we're appending (beforeend), we take a snapshot of the total number of children in the DOM before insertion so we know where to iterate
         * We need to do this because other classes might interact with the DOM at any given time
         */
        const childIndexBaseOffset = position === 'beforeend'
            ? numberOfChildrenBeforeInsertion
            : 0

        // 2nd part with the extraChunkDOM
        for (let i = 0; i < chunk.length; i++) {
            const extra = extraChunkDOM.children[i]
            if (!extra) continue

            const currentChild = this.parent.querySelectorAll(this.childTag)[i + childIndexBaseOffset]
            // That means we've reached the end of the infinite loading
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
                // this.#handleImageLoading(imgNode)
                this.#manageImageEvents(imgNode)
                // this.#handleImageEvents(imgNode)
            }
        }
        extraChunkDOM.remove()
        // ---

        for (const fn of this.extraLogicOnNewChunk) {
            await fn(this)
        }
    }

    /**
     * @param {IntersectionObserverEntry[]} entries 
     */
    handleLastChildIntersection(entries) {
        entries.forEach(async (entry) => {
            if (!entry.isIntersecting) return

            // this.logger.log(entry)
            this.logger.reset()

            this.lastChildObserver.unobserve(entry.target);

            /**
             * We can do both in parallel because the cooking is for the next rendering batch.
             * Note that we do not bake another batch if there is already more than one batch in the ovens.
             */
            await Promise.all([
                this.insertNewChunk(),
                this.bakedChildren.length <= 1 ? this.bakeNextHTMLBatch(): Promise.resolve(),
            ])

            this.logger.logPerf(`Appending new children at the end of the grid + loading next batch (${this.bakedBatchIndex})`)

            this.setupInfiniteLoading()
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
            childTag: 'tr.item',
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
            childTag: 'article.item',
        })
    }
}