/**
 * @typedef BakedItem
 * @type {object}
 * @property {string} html - the actual HTML representation of the item
 * @property {object} extra
 * @property {string} patchedHtml - the same HTML representation of the item patched with dynamic hardcoded style
 */

/**
 * @typedef IntersectedAnchors
 * @type {object}
 * @property {number} top
 * @property {number} bottom
 */

/**
 * @typedef MonitoredBatch
 * @type {object}
 * @property {number} id
 * @property {BakedItem[]} bakedItems
 * 
 * @property {boolean} patched
 * `false` by default.  
 * When it gets virtualized, it is set to `true`.  
 * When the user invalidate the layout by increasing the grid's width for example, it is set back to `false`
 * 
 * **Note**: We could theoritically know directly by looking at the `patchedHtml` property of any element in `bakedItems` to tell if it has been patched or not.
 * Though we prefer relying on a single boolean as it let us easily invalidate the whole batch in our logic instead of having to reset every item inside `bakedItems`
 * 
 * @property {boolean} withinTheDOM
 * To tell wether or not the batch is currently loaded in the DOM.
 * It is used to prevent multiple stamping of the same batch.
 *
 * @property {IntersectedAnchors} intersectedAnchors
 * How many anchors have intersected with the viewport (both top and bottom)
 * 
 * .i.e how many anchors are not visible in the viewport
 */

/**
 * @typedef VirtualizedCollection
 * @type {object}
 * @property {number} gridWidth
 * @property {Object.<number, MonitoredBatch>} monitoredBatches
 */

/**
 * @about This class is inspired by Pinterest's implementation on the subject.
 * 
 * If the user either:
 *  - resizes the viewport once it has scrolled a bit in the page
 *  - increases the font's size
 * 
 * it will recompute the whole layout which can be very expensive.
 * So in the best case scenario (when you don't do any of the points above), this class should work well.
 * 
 * ***Definition***
 * 
 * > *The definitions below apply only to the context of this class, i.e. I have no idea whether there are any widely recognised terms for them.*
 *
 * - The *virtualisation* of an item is the action of removing it from the DOM while keeping its position and size in memory.
 * 
 * - The *stamping* of an item is the action of putting it back in the DOM using the position and size stored in memory.
 *
 * ***Why is it needed?***
 *
 * When you have scrolled far enough and several batches have been loaded into the DOM,
 * your device may start to have difficulty loading the following batches.
 * 
 * The threshold at which this phenomenon happens depends on your device's CPU among other things
 * though no matter how powerful/cutting edge your config is, you'll experience it at some point.
 * So to keep good performance, we use this mechanism to keep the DOM as small as possible.
 * 
 * Plus, Obsidian being an Electron app, it inherently has a fixed ram allocation usage limit of 4go.
 * Trying to render too many element at the same time may result in a crash of the app sooner than you think.
 *
 * ***How does it works?***
 * 
 * Initially, it creates as many blank stubs as there is columns in your layout.
 * Each stub will grow in height every time an item within its column gets virtualized.
 * 
 * This virtualisation takes place while the items aren't visible in the viewport.
 * 
 * Both the virtualisation and the stamping are carried out in batches of `n` items to limit the amount of DOM manipulation.
 * 
 * Each items appended in the DOM gets a `data-batch` attribute that tells which batch they comes from
 * The ones that are responsible of virtualizing/stamping, .i.e the items whose intersections with the viewport are actively observed, receive one extra data attribute each:
 * - `data-batch-part`: 'top'|'bottom'|'both'
 * 
 * Thanks to this attribute and the location of the intersection we can decide which batch to target
 * 
 * ***Limitations and workaround***
 * 
 * IntersectionObserver's `rootMargin` property doesn't work within Obsidian (as of 1.5.12).
 * 
 * This limitation makes the whole implementation a bit unsteady and awkward to work with but I can't do anything about it
 * as I don't want to work with scrollEvents (see the performances differences [here](https://css-tricks.com/an-explanation-of-how-the-intersection-observer-watches/#aa-performance-intersection-observer-versus-scroll-events)).
 * 
 * To have a working virtualisation and have its corresponding stamping work too I needed to do some hacks.
 * For a setup with `c` columns, the virtualisation of batch `n` will occurs only once the batch `n+1`'s last `c` items will intersect with the viewport.
 * Its stamping will then occur once one of the `c` first items of the batch `n+1` intersect too. The same logic applies but in reverse with its previous batch.
 *
 * So depending of the actual number of items per batch, the last batch will likely not trigger the virtualisation of the penultimate batch
 * 
 * The best case scenario for this class is that you at least have batch of c*2 items in your layout.
 * This way, it gives some wiggle room to the virtualisation and prevent unecessary stamping to occur as much as possible.
 * 
 * @disclaimer As explained above, this class assumes a lot of thing on the actual grid layout beforehand.
 * It's a very custom and experimental implementation that doesn't aim to be used in a generic context.
 * It has a tight link with the `CollectionManager` class so that you can only have one instance of this class
 * running for a given grid.
 */
export class VirtualizedGrid {

    constructor({manager, utils, logger, root = null}) {
        if (!manager) throw new Error("Can't create a Virtualized layout without a valid manager of the said layout")

        this.manager = manager
        this.utils = utils
        this.logger = logger

        /**
         * @type {HTMLElement}
         */
        this.grid = manager.parent;

        this.gridIsVisible = true

        /** @type {VirtualizedCollection} */
        this.virtualizedCollection = {
            gridWidth: null,
            monitoredBatches: {},
        }

        /** @type {NodeListOf<HTMLElement> | null} */
        this.stubs = null

        const gridComputedStyle = window.getComputedStyle(this.grid)
        const [columnGap, rowGap] = [parseInt(gridComputedStyle.getPropertyValue('column-gap')), parseInt(gridComputedStyle.getPropertyValue('row-gap'))]
        this.settings = {
            rowGap: !Number.isNaN(rowGap) ? rowGap : 0,
            columnGap: !Number.isNaN(columnGap) ? columnGap : 0,
            itemImageHeight: parseInt(gridComputedStyle.getPropertyValue('--jukebox-cards-image-height')),
        }

        let resetId = 0
        this.debouncedResize = this.utils.debounce(() => {
            console.log("Scrolled to top!")
            cancelAnimationFrame(resetId)
            resetId = requestAnimationFrame(() => {
                this.reset()
            })
        }, 300)

        this.root = root

        this.#initObservers(root)
    }

    /**
     * This method assumes that each columns are the same width
     * @returns {number}
     */
    computeNumberOfColumns() {
        if (!this.settings.gridWidth || !this.settings.itemWidth) {
            console.error("Please call init() first")
        }
        for (let numberOfColumns = 1; ; numberOfColumns++) {
            const estimatedWidth = (this.settings.itemWidth * numberOfColumns) + (this.settings.columnGap * (numberOfColumns - 1))
            if (estimatedWidth > this.settings.gridWidth) return (numberOfColumns - 1)
        }
    }

    /**
     * For a given item in the grid, deduces its column id
     * @param {*} item 
     * @returns {number}
     */
    computeItemColumnId(item) {
        return Math.round((item.offsetLeft + this.settings.columnGap) / (this.settings.itemWidth + this.settings.columnGap));
    }

    /**
     * Initializes the stub elements
     * There must be as many stubs as there are columns
     * @param {number} numberOfStubs 
     */
    #initStubs(numberOfStubs) {
        const stubs = document.createDocumentFragment();

        for (let i = 0; i < numberOfStubs; i++) {
            const stub = document.createElement('div')
            stub.style.height = '0px'
            stub.classList.add('stub')
            stubs.appendChild(stub)
        }

        this.grid.insertBefore(stubs, this.grid.firstChild)
        this.stubs = this.grid.querySelectorAll('.stub')
    }

    /**
     * 
     * @param {IntersectionObserverEntry} entry 
     * @param {'virtualisation' | 'stamping'} context 
     * @returns {{
     *     batchId: number,
     *     fromTop: boolean,
     *     triggerWhenReaching: 'top' | 'bottom' | 'both',
     *     targettedBatchId: number,
     * } | null} `null` if the entry is not relevant
     */
    #computeRelevantInformationForOneItemIntersection(entry, context) {
        this.logger?.reset()

        const { boundingClientRect, target, rootBounds } = entry || {}
        if (!rootBounds) {
            console.warn("The intersection is no longer relevant...")
            return null;
        }

        if (context === 'virtualisation' && rootBounds.top < boundingClientRect.top && boundingClientRect.top < rootBounds.bottom) {
            // The item is leaving the viewport from the side so we don't virtualize anything
            return null;
        }

        const fromTop = this.utils.closestTo(rootBounds.top, rootBounds.bottom, boundingClientRect.top) === rootBounds.top
        const batchId = parseInt(target.dataset.batch, 10)
        const batchPart = target.dataset.batchPart

        /**
         * With no regards to the context (virtualisation or stamping):
         * - Items that triggers when reaching the **`top`** are responsible of **the batch above them**
         * - Items that triggers when reaching the **`bottom`** are responsible of **the batch below them**
         * - Items that triggers when reaching `both` are responsible of both
         * 
         * To summarize:
         * 
         * |             | When crossing top          | When crossing bottom      |
         * | ----------- | -------------------------- | ------------------------- |
         * | First items | **Patch** batch `n-1`      | *Remove* batch `n+1`      |
         * | Last items  | **Virtualize** batch `n-1` | *Re-insert*\* batch `n+1` |
         * 
         * Note that each case only happens if the situation permits it.
         * So in any case, if the action can't occur because the batch `n±1` isn't accessible then it will fail silently.
         * 
         * \* The re-insertion logic depends on if the batch had been previously patched or not.  
         * If it has been patched, then the insertion will be similar to a stamping.  
         * Else it will be re-inserted in the dom by the manager itself.
         */
        let triggerWhenReaching = batchPart === 'both' ? 'both' : null
        if (context === 'stamping') {
            triggerWhenReaching ??= batchPart === 'start'
                ? 'top'
                : 'bottom'
        } else if (context === 'virtualisation') {
            triggerWhenReaching ??= batchPart === 'start'
                ? 'bottom'
                : 'top'
        }

        // It's a false positive
        if ((triggerWhenReaching === 'bottom' && fromTop) ||
            (triggerWhenReaching === 'top' && !fromTop)) {
            return null;
        }

        const targettedBatchId = batchId + (fromTop ? -1 : 1)

        return {
            batchId,
            batchPart,
            fromTop,
            targettedBatchId,
        }
    }

    /**
     * This handler is applied to the n first and last items in the DOM, `n` being equal to the number of stubs
     * The first item to intersect trigger the stamping of a previously virtualized batch of items in the DOM
     * @param {IntersectionObserverEntry[]} entries 
     */
    #handleItemIntersectionForStamping(entries) {
        if (!this.gridIsVisible) return

        entries.forEach(async (entry) => {
            if (!entry.isIntersecting){
                // console.warn("We're not gonna stamp if the anchor is leaving the viewport, duh!")
                return
            }

            const { fromTop, targettedBatchId } = this.#computeRelevantInformationForOneItemIntersection(entry, 'stamping') || {}
            if (targettedBatchId == null) return

            if (this.#tryToStampBatchOfId(targettedBatchId, fromTop ? 'begin' : 'end')) {
                this.#logStatus()
            }
        });
    }

    /**
     * It will fail if:
     *   - the batch is not virtualized yet
     *   - the batch is already in the DOM
     * @param {number} batchId
     * @param {'begin' | 'end'} location
     * @returns {boolean} whether the patching was successful or not
     */
    #tryToStampBatchOfId(batchId, location) {
        if(batchId < 0) return false

        if (!this.virtualizedCollection.monitoredBatches[batchId]?.patched) {
            // console.warn(`We're trying to stamp a batch (${batchId}) that hasn't been virtualized/baked yet`)
            return false
        }

        if (this.virtualizedCollection.monitoredBatches[batchId].withinTheDOM ||
            this.grid.querySelectorAll(`${this.manager.childTag}[data-batch="${batchId}"]`).length > 0) {
            // console.warn(`The batch (${batchId}) appears to already be in the DOM, no need to stamp it again`)
            return false
        }

        console.warn(`Make some noise! Batch ${batchId} is making it's great return into the DOM!`)
        this.virtualizedCollection.monitoredBatches[batchId].withinTheDOM = true
        const computedBatchToStamp = this.virtualizedCollection.monitoredBatches[batchId].bakedItems.map((item) => {
            return {
                html: item.patchedHtml,
                extra: item.extra,
            }
        })
        this.manager.insertChunk(computedBatchToStamp, `before${location}`)
        if (location === 'end' && !this.virtualizedCollection.monitoredBatches[batchId + 1]?.patched) {
            // We're about to reach the bottom of the stubs again
            requestAnimationFrame(() => {
                this.manager.setupInfiniteLoading()
            })
        }
        return true
    }

    /**
     * Used for debugging
     */
    #tryToVirtualizeBatchOfId(batchId) {
        const targettedBatch = this.virtualizedCollection.monitoredBatches[batchId]
        if (!targettedBatch || targettedBatch.withinTheDOM === false) {
            // console.warn(`Failed to virtualize - Batch ${targettedBatchId} is not in the DOM!`)
            return
        }

        const batchItemsToVirtualize = [...this.grid.querySelectorAll(`${this.manager.childTag}[data-batch="${batchId}"]`)]
        if (batchItemsToVirtualize.length === 0) {
            // console.warn(`Failed to virtualize - There aren't any items from batch ${targettedBatchId} within the DOM!`)
            return;
        }

        let newStubsHeight = null;
        if (!targettedBatch.patched) {
            newStubsHeight = this.#prepareVirtualisationOfItemsFromMonitoredBatch({
                monitoredBatch: targettedBatch,
                items: batchItemsToVirtualize,
            })
        }
        this.#virtualizeItems({
            items: batchItemsToVirtualize,
            newStubsHeight,
        })
        targettedBatch.withinTheDOM = false
    }

    /**
     * This handler is applied to the `n`th last items of each batch (except the first), `n` being equal to the number of stubs
     * Since we can't use rootMargin reliably within Obsidian, each batch is responsible of the virtualisation of its previous batch
     * @param {IntersectionObserverEntry[]} entries
     */
    #handleItemIntersectionForVirtualisation(entries) {
        if (!this.gridIsVisible) return

        entries.forEach(async (entry) => {
            this.logger?.reset()

            const { batchId, targettedBatchId, fromTop } = this.#computeRelevantInformationForOneItemIntersection(entry, 'virtualisation') || {}
            if (batchId == null || targettedBatchId < 0) return

            // this.logger?.log({ batchId, targettedBatchId, fromTop, context: 'virtualisation' })

            const targettedBatch = this.virtualizedCollection.monitoredBatches[targettedBatchId]
            if (!targettedBatch || targettedBatch.withinTheDOM === false) {
                // console.warn(`Failed to virtualize - Batch ${targettedBatchId} is not in the DOM!`)
                return
            }

            const batchItemsToVirtualize = [...this.grid.querySelectorAll(`${this.manager.childTag}[data-batch="${targettedBatchId}"]`)]
            if (batchItemsToVirtualize.length === 0) {
                // console.warn(`Failed to virtualize - There aren't any items from batch ${targettedBatchId} within the DOM!`)
                return;
            }

            if (fromTop) {
                // We're in the classic scenario, we virtualize the batch above
                this.logger?.warn(`Batch ${batchId} will soon be off the screen, let's virtualize the batch above it (${targettedBatchId})!`)

                let newStubsHeight = null;
                if (!targettedBatch.patched) {
                    newStubsHeight = this.#prepareVirtualisationOfItemsFromMonitoredBatch({
                        monitoredBatch: targettedBatch,
                        items: batchItemsToVirtualize,
                    })
                }
                this.#virtualizeItems({
                    items: batchItemsToVirtualize,
                    newStubsHeight,
                })
                targettedBatch.withinTheDOM = false
            } else {
                // The user decided to go back and scrolled up too far, guess we'll need to remove the most bottom batch
                this.logger?.warn(`Batch ${batchId} will soon be off the screen, let's remove the batch below it (${targettedBatchId})!`)
                if (this.virtualizedCollection.monitoredBatches[targettedBatchId + 1]?.withinTheDOM) {
                    /**
                     * This is a HUGE hack.
                     * I guess this happen because IntersectionObserver triggers directly when the batch is patched in the DOM but I'm not sure.
                     */
                    this.logger?.error("What are you doing!? The batch below the targetted batch is still in the DOM!")
                    return
                }

                this.#removeNodesFromDOM(batchItemsToVirtualize)

                if (targettedBatch.patched) {
                    // Because I don't want to resize the stubs, I'll need to handle the reinsertion of the patch in this class
                    targettedBatch.withinTheDOM = false
                } else {
                    // We can safely delegate the reinsertion of the batch to the manager since the stubs haven't grown to eat this batch yet
                    this.#notifyManagerOfBatchRemoval(targettedBatchId)
                    requestAnimationFrame(() => {
                        this.manager.setupInfiniteLoading()
                    })
                }
            }

            /**
             * Hack that is used as a last resort to patch reluctant batch that should be in the DOM but aren't
             * Note that if the user scrolls really fast, this hack might also fail
             */
            if (this.#tryToStampBatchOfId(batchId + (fromTop ? 1 : -1), fromTop ? 'end' : 'begin')) {
                this.logger?.warn(`Batch ${batchId} has been patched lately!`)
            }

            this.#logStatus()
        });
    }

    #removeBatchOfIdFromDOM(batchId) {
        const nodesToDelete = this.grid.querySelectorAll(`${this.manager.childTag}[data-batch="${batchId}"]`)

        this.#removeNodesFromDOM(nodesToDelete)
    }

    /**
     * @param {NodeList} nodes
     */
    #removeNodesFromDOM(nodes) {
        if (nodes.length === 0) return
        // Should actually be called for the very last batch in the DOM but it's harmless to call it for every batch
        this.manager.lastChildObserver.unobserve(nodes[nodes.length - 1])

        /**
         * We're civilized so we make sure to unobserve every previously watched item of the batch within the DOM
         * for both observers.
         */
        nodes.forEach((node) => {
            if (node.dataset.batchPart) {
                this.itemIntersectionObserverForVirtualisation.unobserve(node)
                this.itemIntersectionObserverForStamping.unobserve(node)
            }
            node.remove()
        })
    }

    /**
     * It's safe to call this method if we don't want the batch to be patched anymore
     * In a way, we give back the responsibility of its insertion to the manager
     */
    #notifyManagerOfBatchRemoval(batchId) {
        const batch = this.virtualizedCollection.monitoredBatches[batchId]
        if (batch.withinTheDOM || batch.patched) {
            // It means that the batch has been removed from the manager.bakedChildren at some point
            // So we can safely shift it back at the beginning of the array of batches
            this.manager.bakedChildren.unshift(batch.bakedItems)
        }

        batch.patched = false
        batch.withinTheDOM = false
    }

    /**
     * @param {MutationRecord} mutationRecord
     * @returns {number}
     */
    #computeMutationRecordBatchIndex = (mutationRecord) => {
         // The second condition means: `the next sibling isn't a valid item`
        if (!mutationRecord.previousSibling && !mutationRecord.nextSibling?.dataset?.batch) {
            return 0
        }

        if (mutationRecord.previousSibling.classList.contains('stub')) {
            const nextSibling = mutationRecord.addedNodes[mutationRecord.addedNodes.length -1].nextSibling
            if (!nextSibling) {
                return 0
            }

            const anchorBatchIndexAttribute = nextSibling.dataset.batch
            // console.log("Previous siblings are stubs! Next anchor batch index: ", anchorBatchIndexAttribute)
            return parseInt(anchorBatchIndexAttribute, 10) - 1
        }

        const anchorBatchIndexAttribute = mutationRecord.previousSibling.dataset.batch
        // console.log("Previous siblings are valid! Previous anchor batch index: ", anchorBatchIndexAttribute)
        return parseInt(anchorBatchIndexAttribute, 10) + 1
    }

    /**
     * It's called when items are added or removed from the grid
     * 
     * @type {MutationCallback}
     */
    #handleGridMutation(mutationRecord) {
        for (const mutation of mutationRecord) {
            if (mutation.type === 'childList') {
                // Check if any new nodes were added as direct children
                const addedNodes = mutation.addedNodes;

                if (!addedNodes.length && mutation.removedNodes.length > 0) {
                    // console.log(`VG - Nodes just got removed`)
                    return;
                }

                if (addedNodes[0].classList.contains('stub')) {
                    /** It's just the stub insertion no need to do anything */
                    return;
                }

                this.init()

                console.log(`VG - ${addedNodes.length} nodes added!`)

                /**
                 * We need to observe as many items as there are stubs to make sure the virtualisation of the batch happens off screen
                 */
                const numberOfItemsToObserve = this.stubs.length

                /**
                 * The grid is either too big or the number of items per batch is too low!
                 * Either way, we can't decently apply the virtualisation mechanism in such a context without it resulting in poor UX.
                 * It would be useless at best, buggy at worst
                 */
                if (addedNodes.length < numberOfItemsToObserve) {
                    console.warn(`There aren't enough items per batch to apply the collection virtualisation (The grid might be too big / the screen too large)`)
                    this.logger?.warn(`There aren't enough items per batch to apply the collection virtualisation (The grid might be too big / the screen too large)`)
                    return;
                }

                this.logger?.reset()

                const insertedBatchIndex = this.#computeMutationRecordBatchIndex(mutation)

                console.log(`VG - Current inserted batch index is ${insertedBatchIndex}`)

                this.virtualizedCollection.monitoredBatches[insertedBatchIndex] ??= {
                    id: insertedBatchIndex,
                    bakedItems: this.manager.lastInsertedChunk,
                    patched: false,
                    withinTheDOM: true,
                }

                this.virtualizedCollection.monitoredBatches[insertedBatchIndex].withinTheDOM = true

                /** We set it to `null` to indicate we've consumed it already */
                this.manager.lastInsertedChunk = null

                this.#setupNodesDatasetAndObserveItemsOfBatch({
                    nodes: addedNodes,
                    batchIndex: insertedBatchIndex,
                    numberOfItemsToObserve,
                })

                this.logger?.logPerf(`Virtualized grid mutation trigger`)
            }
        }

        this.#logStatus()
    }

    /**
     * 
     * @param {Object} _
     * @param {NodeListOf<Element>} _.nodes
     * @param {number} _.batchIndex
     * @param {number} _.numberOfItemsToObserve
     */
    #setupNodesDatasetAndObserveItemsOfBatch({ nodes, batchIndex, numberOfItemsToObserve }) {
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].dataset.batch = batchIndex
        }

        for (let i = 0; i < numberOfItemsToObserve; i++) {
            nodes[i].dataset.batchPart = "start"
            this.itemIntersectionObserverForVirtualisation.observe(nodes[i])
            this.itemIntersectionObserverForStamping.observe(nodes[i])
        }

        for (let i = nodes.length - 1; i > nodes.length - numberOfItemsToObserve - 1; i--) {
            if (nodes[i].dataset.batchPart === "start") {
                nodes[i].dataset.batchPart = "both"
            }
            nodes[i].dataset.batchPart ??= "end"

            this.itemIntersectionObserverForVirtualisation.observe(nodes[i])
            this.itemIntersectionObserverForStamping.observe(nodes[i])
        }
    }

    #handleGridResize(entries) {
        const gridEntry = entries[0]
        const currentEntryWidth = gridEntry.contentRect.width

        /**
         * It means that the grid has been removed from the DOM.
         * It's probably because the user change pages or something so we do nothing
         */
        if (!currentEntryWidth) {
            this.gridIsVisible = false
            return;
        }

        this.gridIsVisible = true

        this.virtualizedCollection.gridWidth ??= currentEntryWidth

        if (this.virtualizedCollection.gridWidth !== currentEntryWidth) {
            this.logger?.warn(`The grid width changed from ${this.virtualizedCollection.gridWidth} to ${currentEntryWidth}. Farewell sweet optimization!`)
            this.virtualizedCollection.gridWidth = currentEntryWidth
            this.debouncedResize()
        }
    }

    /**
     * This method initializes the 3 types of observers needed for this class to work:
     * - IntersectionObserver (for virtualisation and stamping)
     * - MutationObserver (for when items are added/removed from the DOM)
     * - ResizeObserver (for when the grid get resized or is hidden by Obsidian)
     */
    #initObservers(root = null) {
        console.log({root})
        const intersectionOptions = {
            root, // if `null`, it is relative to the viewport
            threshold: 0, // how much of the target must be visible. Here it means as soon/long as there is one pixel visible
        }

        this.itemIntersectionObserverForVirtualisation = new IntersectionObserver(this.#handleItemIntersectionForVirtualisation.bind(this), intersectionOptions)
        this.itemIntersectionObserverForStamping = new IntersectionObserver(this.#handleItemIntersectionForStamping.bind(this), intersectionOptions)


        this.gridMutationObserver = new MutationObserver(this.#handleGridMutation.bind(this));
        this.gridMutationObserver.observe(this.grid, {
            childList: true,
        });

        this.gridResizeObserver = new ResizeObserver(this.#handleGridResize.bind(this));
        this.gridResizeObserver.observe(this.grid)
    }

    /**
     * Must be called once per width change for this class to work correctly
     */
    init() {
        if (this.stubs != null) {
            // We've already initialized this class
            return
        };
        console.log("VG - Initialize virtualized grid!!")

        const gridWidth = this.grid.getBoundingClientRect().width
        const itemWidth = this.grid.firstChild.getBoundingClientRect().width
        this.settings = { ...this.settings,
            gridWidth,
            itemWidth,
        }

        this.virtualizedCollection.gridWidth = this.settings.gridWidth

        const numberOfColumns = this.computeNumberOfColumns()
        console.log(`VG - There are ${numberOfColumns} columns in the grid`)

        this.#initStubs(numberOfColumns)
    }

    /**
     * This method must be called when the grid is resized
     */
    reset() {
        this.stubs?.forEach((stub) => {
            stub.remove()
        })
        this.stubs = null

        if (!this.virtualizedCollection.monitoredBatches[0].withinTheDOM) {
            // We've scrolled down too much. We can't do a soft reset
            for (let i = Object.keys(this.virtualizedCollection.monitoredBatches).length - 1; i >= 0; i--) {
                this.#removeBatchOfIdFromDOM(i)
                this.#notifyManagerOfBatchRemoval(i)
            }

            this.grid.scrollIntoView({ behavior: "instant", block: "start" })

            requestAnimationFrame(async () => {
                await this.manager.insertNewChunk('afterbegin')
                this.manager.setupInfiniteLoading()
            })
        } else {
            // We can do a soft reset
            this.grid.querySelectorAll('.item').forEach((node) => {
                node.style.position = 'relative'
                node.style.height = 'auto'
                node.style.width = 'auto'
                node.style.transform = ''
            })

            requestAnimationFrame(() => {
                this.init()
                Object.entries(this.virtualizedCollection.monitoredBatches).forEach(([batchId, batch]) => {
                    const nodesToUpdate = this.grid.querySelectorAll(`.item[data-batch="${batchId}"]`)
                    nodesToUpdate.forEach((node) => {
                        if (node.dataset.batchPart) {
                            this.itemIntersectionObserverForVirtualisation.unobserve(node)
                            this.itemIntersectionObserverForStamping.unobserve(node)
                            delete node.dataset.batchPart
                        }
                    })

                    if (nodesToUpdate.length === 0) {
                        // The batch isn't in the DOM anymore
                        return;
                    }

                    this.#setupNodesDatasetAndObserveItemsOfBatch({
                        nodes: nodesToUpdate,
                        batchIndex: Number(batchId),
                        numberOfItemsToObserve: this.stubs.length,
                    })
                })
            })
        }
    }

    /**
     * 
     * @param {object} _
     * @param {XMLSerializer} _.serializer
     * @param {BakedItem[]} _.bakedItems
     * @param {number[]} _.newStubsHeight
     * @param {number[]} _.columnId
     * @param {Element[]} _.items
     */
//     #reallyPrepareVirtualisationOfItemsFromMonitoredBatch__masonry = ({ serializer, bakedItems, newStubsHeight, columnIds, items}) => {
//         items.forEach((item, i) => {
//             // 1st part: Plan the item ingestion and the stub growth
//             const columnId = columnIds[i]
//             const itemRect = item.getBoundingClientRect()

//             const currentStubHeight = newStubsHeight[columnId]
//             const newStubHeight = currentStubHeight + itemRect.height + (currentStubHeight === 0 ? 0 : this.settings.rowGap)


//             const newX = (columnId * itemRect.width) + (columnId * this.settings.columnGap)
//             const newY = currentStubHeight + (currentStubHeight === 0 ? 0 : this.settings.rowGap)

//             newStubsHeight[columnId] = newStubHeight

//             // 2nd part: Update respective monitored batch
//             const htmlToEdit = bakedItems[i]?.html ?? bakedItems[i]

//             const fragment = createFragmentFromString(htmlToEdit)

//             const fragmentItem = fragment.querySelector(this.manager.childTag);

//             const currentStyle = fragmentItem.getAttribute('style')
//             const newStyle = `\
// position: absolute; \
// top: 0; \
// left: 0; \
// transform: translateX(${newX}px) translateY(${newY}px); \
// width: ${itemRect.width}px; \
// height: ${itemRect.height}px; \
// ${currentStyle ?? ''}`

//             fragmentItem.setAttribute('style', newStyle);

//             const modifiedHtmlString = serializer.serializeToString(fragment);

//             /**
//              * We keep the original HTML in case we want to use it again,
//              * typically when the user resize the grid horizontally
//              */
//             bakedItems[i] = {
//                 html: htmlToEdit,
//                 extra: bakedItems[i]?.extra,
//                 patchedHtml: modifiedHtmlString,
//             }
//         })
//     }

    /**
     * This hack is there to ensure the items keep their actual position in the grid and thus no flicker should occur
     * No computation are done to better position the items despite the unconsistent gap height between each items
     * 
     * This is actually great because it works seamlessly with or without the masonry mode
     * 
     * @param {object} _
     * @param {XMLSerializer} _.serializer
     * @param {BakedItem[]} _.bakedItems
     * @param {number[]} _.newStubsHeight
     * @param {number[]} _.columnId
     * @param {Element[]} _.items
     */
    #reallyPrepareVirtualisationOfItemsFromMonitoredBatch__steady = ({ serializer, bakedItems, newStubsHeight, columnIds, items}) => {
        // Get the current y offset of the stubs to apply to each item in order to keep their position relative to 0
        const floorOffset = this.stubs[0].getBoundingClientRect().y

        // Determine for each column, the index of the last item in that column
        const maxNumber = Math.max(...columnIds);
        const indexesOfLastItemInColumns = new Array(maxNumber + 1).fill(-1);
        columnIds.forEach((number, index) => {
            indexesOfLastItemInColumns[number] = index;
        });

        indexesOfLastItemInColumns.forEach((number, i) => {
            if (number === -1) return

            const { y, height } = items[number].getBoundingClientRect()
            newStubsHeight[i] = y + height - floorOffset
        })

        items.forEach((item, i) => {
            // 1st part: Plan the item ingestion and the stub growth
            const columnId = columnIds[i]
            const itemRect = item.getBoundingClientRect()

            const newX = (columnId * itemRect.width) + (columnId * this.settings.columnGap)
            const newY = itemRect.y - floorOffset

            // 2nd part: Update respective monitored batch
            const htmlToEdit = bakedItems[i]?.html ?? bakedItems[i]

            const fragment = createFragmentFromString(htmlToEdit)

            const fragmentItem = fragment.querySelector(this.manager.childTag);

            const currentStyle = fragmentItem.getAttribute('style')
            const newStyle = `\
position: absolute; \
top: 0; \
left: 0; \
transform: translateX(${newX}px) translateY(${newY}px); \
width: ${itemRect.width}px; \
height: ${itemRect.height}px; \
${currentStyle ?? ''}`

            fragmentItem.setAttribute('style', newStyle);

            const modifiedHtmlString = serializer.serializeToString(fragment);

            /**
             * We keep the original HTML in case we want to use it again,
             * typically when the user resize the grid horizontally
             */
            bakedItems[i] = {
                html: htmlToEdit,
                extra: bakedItems[i]?.extra,
                patchedHtml: modifiedHtmlString,
            }
        })
    }

    /**
     * 
     * @param {object} _
     * @param {MonitoredBatch} _.monitoredBatch
     * @param {Element[]} _.items
     * @returns {number[] | null} the new stubs height according to how many items got ingested
     * or `null` if the batch was already virtualized
     */
    #prepareVirtualisationOfItemsFromMonitoredBatch({monitoredBatch, items}) {

        const serializer = new XMLSerializer();

        /** The column id of each item */
        const columnIds = []
        for (let i = 0; i < items.length; i++) {
            columnIds.push(this.computeItemColumnId(items[i]))
        }

        const newStubsHeight = Array.from(this.stubs, (stub) => (stub.getBoundingClientRect().height))

        this.#reallyPrepareVirtualisationOfItemsFromMonitoredBatch__steady({
            serializer,
            bakedItems: monitoredBatch.bakedItems,
            newStubsHeight,
            columnIds,
            items,
        })

        monitoredBatch.patched = true

        this.logger?.logPerf(`Finished preparing virtualisation of ${items.length} items from batch ${monitoredBatch.batchId}`)

        return newStubsHeight
    }

    /**
     * 
     * @param {object} _
     * @param {Element[]} _.items
     * @param {number[] | null} _.newStubsHeight
     */
    #virtualizeItems({items, newStubsHeight}) {
        requestAnimationFrame(() => {
            this.#removeNodesFromDOM(items)

            newStubsHeight?.forEach((stubHeight, i) => {
                this.stubs[i].style.height = `${stubHeight}px`
            })
        })

        this.logger?.logPerf(`Virtualizing ${items.length} items`)
    }

    #logStatus() {
        const batchesSummary = {}
        for (const key in this.virtualizedCollection.monitoredBatches) {
            const batch = this.virtualizedCollection.monitoredBatches[key]
            batchesSummary[key] = {
                patched: batch.patched ? '✅' : '❌',
                withinDOM: batch.withinTheDOM ? '✅' : '❌',
            }
        }
        this.logger?.table(batchesSummary)
        this.logger?.table({
            gridWidth: this.virtualizedCollection.gridWidth,
            stubs: this.stubs?.length ?? 0,
            batches: Object.keys(this.virtualizedCollection.monitoredBatches).length,
        })
    }
}