class CollectionManager {
    /**
     * @abstract
     * @warning This class need CustomJS enabled to work since it uses MarkdownRenderer.renderMarkdown which is exposed by the plugin
     * This class is the blueprint to use for classes that manage a collection of children node in the DOM
     * Don't instantiate directly from its constructor. You should use one of the static methods at the bottom instead
     * It handles:
     * - Lazy rendering of a bunch of DOM elements for blazing fast performance
     * - Custom rendering that bypass MarkdownRenderer.renderMarkdown capacity
     * - Image fallback
     */
    CollectionManager = class {
        /**
         * @param {object} _
         * @param {Function} _.buildParent - a function that build, insert in the DOM and set this.parent (must be a regular function)
         * @param {() => HTMLElement} _.getParent - get the actual parent of all your children (must be a regular function)
         */
        constructor({
            //Dependencies
            dv,
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
            getParent,
        }) {
            this.dv = dv
            this.logger = logger
            this.icons = icons
            this.utils = utils
            this.disableSet = disableSet

            this.childTag = childTag
            this.buildParent = buildParent.bind(this)
            this.getParent = getParent.bind(this)


            /** @type {HTMLElement} */
            this.parent = null

            /** @type {(string|object)[]} */
            this.children = []

            this.batchesFetchedCount = 0
            this.numberOfElementsPerBatch = numberOfElementsPerBatch

            /** @type {Array<function(TableManager): Promise<void>>} */
            this.extraLogicOnNewChunk = extraLogicOnNewChunk

            this.childObserver = new IntersectionObserver(this.handleLastChildIntersection.bind(this));
        }

        everyElementsHaveBeenInsertedInTheDOM = () => (this.batchesFetchedCount * this.numberOfElementsPerBatch >= this.children.length)


        /**
         * Build the complete list of children that will eventually be rendered on the screen
         * (if you scroll all the way down)
         * This method params can be quite obscure and for a reason: The MarkdownRenderer.renderMarkdown method 
         * @param {object} _
         * @param {*} _.pages - dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface)
         * @param {Function} _.pageToChild - This function get a page as its parameter and is suppose to return an html string or an array of html strings
         * @returns {string[]} Each value of the array contains some HTML equivalent to a cell on the grid
         */
        buildChildrenHTML = async ({ pages, pageToChild }) => {
            let children = []

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
        }

        initInfiniteLoading() {
            if (this.everyElementsHaveBeenInsertedInTheDOM()) return

            const lastChild = this.getParent().querySelector(`${this.childTag}:last-of-type`);
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
         * @warning CustomJS plugin is needed to run this function
         * 
         * It might be difficult to understand what's going on but it could be reduced to a 20 lines long function max
         * if MarkdownRenderer.renderMarkdown had a consistent behavior no matter what tags were passed to it
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
            const extraChunkDOM = this.dv.container.createEl('div')
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
            await customJS.obsidian.MarkdownRenderer.renderMarkdown(extraChunkHTML, extraChunkDOM, this.dv.currentFilePath, this.dv.component)
            // ---

            if (!this.getParent()) {
                return console.error("Something went wrong, the collection parent element doesn't exist in the DOM")
            }

            this.getParent().insertAdjacentHTML('beforeend', newChunk)

            // 2nd part with the extraChunkDOm
            for (let i = 0; i < this.numberOfElementsPerBatch; i++) {
                const extra = extraChunkDOM.children[i]
                if (!extra) continue

                const currentChild = this.getParent().children[i + fromSliceIndex]
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
                    this.logger.reset()

                    this.childObserver.unobserve(entries[0].target);

                    await this.insertNewChunk()

                    this.logger.logPerf("Appending new children at the end of the grid")

                    if (this.batchesFetchedCount * this.numberOfElementsPerBatch < this.children.length) {
                        this.logger?.log(`Batch to load next: ${this.batchesFetchedCount * this.numberOfElementsPerBatch}`)
                        const lastChild = this.getParent().querySelector(`${this.childTag}:last-of-type`)
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
                        const th = this.dv.container.createEl("th", { cls: "table-view-th" })
                        th.insertAdjacentHTML('beforeend', headerHTML)
                        trFragment.appendChild(th)
                    })

                    const tr = this.dv.container.createEl("tr", { cls: "table-view-tr-header" })
                    tr.appendChild(trFragment)

                    const thead = this.dv.container.createEl("thead", { cls: "table-view-thead" })
                    thead.appendChild(tr)

                    return thead
                }

                const thead = buildTHead(headers)
                const tbody = this.dv.container.createEl("tbody", { cls: "table-view-tbody" })

                const table = this.dv.container.createEl("table", { cls: "table-view-table" })
                table.appendChild(thead)
                table.appendChild(tbody)

                this.parent = table
            }

            function getParent() {
                return this.parent?.lastChild
            }

            return new customJS["CollectionManager"].CollectionManager({
                ...dependencies,
                buildParent,
                getParent,
                childTag: 'tr',
            })
        }

        static makeGridManager(dependencies) {
            function buildParent() {
                this.parent = this.dv.container.createEl("div", { cls: "grid" })
            }

            function getParent() {
                return this.parent
            }

            return new customJS["CollectionManager"].CollectionManager({
                ...dependencies,
                buildParent,
                getParent,
                childTag: 'article',
            })
        }

    }
}