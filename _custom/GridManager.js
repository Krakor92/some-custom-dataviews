class GridManager {
    /**
     * @implements {import('../view').CollectionManager}
     */
    GridManager = class {
        constructor({dv, logger, utils, icons, fileManager, disableSet, numberOfPagePerBatch = 20, extraLogicOnNewChunk = []}) {
            this.dv = dv
            this.logger = logger
            this.icons = icons
            this.utils = utils
            this.fileManager = fileManager
            this.disableSet = disableSet

            this.grid = null

            /** @type {string[]} */
            this.articles = []

            // 
            this.nbPageBatchesFetched = 0
            this.numberOfPagePerBatch = numberOfPagePerBatch

            /** @type {Array<function(GridManager): Promise<void>>} */
            this.extraLogicOnNewChunk = extraLogicOnNewChunk

            this.articleObserver = new IntersectionObserver(this.handleLastArticleIntersection.bind(this));
        }

        getParent = () => (this.grid)

        everyArticlesHaveBeenInsertedInTheDOM = () => (this.nbPageBatchesFetched * this.numberOfPagePerBatch >= this.articles.length)

        /**
         * Build the complete list of article that will eventually be rendered on the screen
         * (if you scroll all the way down)
         * @param {object} _
         * @param {*} _.pages - dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface)
         * @param {Function} _.pageToArticle - This function get a page as its parameter and is suppose to return an html string or an array of html strings
         * @returns {string[]} Each value of the array contains some HTML equivalent to a cell on the grid
         */
        buildArticles = async ({pages, pageToArticle}) => {
            let articles = []

            for (const p of pages) {
                const article = await pageToArticle(p)

                if (Array.isArray(article)) {
                    articles = [...articles, ...article]
                } else {
                    articles.push(article)
                }
            }

            this.articles = articles
            this.logger?.log({articles})
        }

        buildGrid = () => {
            this.grid = this.dv.el("div", null, { cls: "grid" })
            this.utils.removeTagChildDVSpan(this.grid)
            this.grid.lastChild.remove()
        }

        initInfiniteLoading() {
            if (this.everyArticlesHaveBeenInsertedInTheDOM()) return

            const lastArticle = this.grid?.querySelector('article:last-of-type');
            this.logger.log({lastArticle})
            if (lastArticle) {
                this.articleObserver.observe(lastArticle)
            }
        }

        #handleImageFallback(img) {
            if (!img) return

            img.onerror = () => {
                this.logger?.log({img})
                img.onerror = null;
                img.outerHTML = this.icons.newObsidianIcon;
                // img.outerHTML = imageOffIcon(24);
            }
        }

        async insertNewChunkInGrid(loadAll = false) {
            const newChunk = loadAll ? this.articles.join("") : this.articles.slice(
                this.nbPageBatchesFetched * this.numberOfPagePerBatch,
                (this.nbPageBatchesFetched + 1) * this.numberOfPagePerBatch
            ).join("")


            // Needed for metadata-menu to trigger and render extra buttons
            const newChunkDOM = this.dv.el("div", newChunk)
            const newChunkFragment = document.createDocumentFragment();
            newChunkDOM.querySelectorAll("article").forEach(article => {
                this.#handleImageFallback(article.querySelector("img"))
                newChunkFragment.appendChild(article)
            })

            if (!this.grid) {
                return console.error("Something went wrong, the grid doesn't exist")
            }
            this.grid.appendChild(newChunkFragment);

            this.nbPageBatchesFetched++

            this.logger.log({nbPageBatchesFetched: this.nbPageBatchesFetched})

            for (const fn of this.extraLogicOnNewChunk) {
                await fn(this)
            }
        }

        handleLastArticleIntersection(entries) {
            entries.map(async (entry) => {
                if (entry.isIntersecting) {
                    this.logger.reset()

                    this.articleObserver.unobserve(entries[0].target);

                    await this.insertNewChunkInGrid()

                    this.logger.logPerf("Appending new articles at the end of the grid")

                    if (this.nbPageBatchesFetched * this.numberOfPagePerBatch < this.articles.length) {
                        this.logger?.log(`Batch to load next: ${this.nbPageBatchesFetched * this.nbPageBatchesFetched}`)
                        const lastArticle = this.grid.querySelector('article:last-of-type')
                        this.articleObserver.observe(lastArticle)
                    }
                }
            });
        }
    }

    /**
     * Apply a masonry layout to a grid layout
     * @author vikramsoni
     * @link https://codepen.io/vikramsoni/pen/gOvOKNz
     */
    VGrid = class {
        constructor(container) {
            if (!container) throw new Error("Can't create a VGrid without a valid container")

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
}