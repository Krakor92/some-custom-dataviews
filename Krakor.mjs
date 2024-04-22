
export class AudioManager {
    constructor({
        app,
        enableSimultaneousPlaying = false,
        autoplay = true,
        stopAutoplayWhenReachingLastMusic = true,
        defaultVolume = 0.5,
        logger, utils, icons,
    } = {}) {
        // Dependencies
        this.logger = logger
        this.icons = icons
        this.utils = utils
        this.os = utils.getOS(app)

        // Options
        this.enableSimultaneousPlaying = enableSimultaneousPlaying
        this.autoplay = autoplay
        this.stopAutoplayWhenReachingLastMusic = stopAutoplayWhenReachingLastMusic
        this.currentAudioPlaying = -1
        this.numberOfAudiosLoaded = -1
        this.defaultVolume = defaultVolume
    }

    /**
     * @param {HTMLInputElement} timeline
     * @param {HTMLAudioElement} audio
     */
    onChangeTimelinePosition = (timeline, audio) => {
        const percentagePosition = (100 * audio.currentTime) / audio.duration;
        timeline.style.backgroundSize = `${percentagePosition}% 100%`;
        timeline.value = percentagePosition;
    }

    /**
     * @param {HTMLInputElement} timeline
     * @param {HTMLAudioElement} audio
     */
    onChangeSeek = (timeline, audio) => {
        const time = (timeline.value * audio.duration) / 100;
        audio.currentTime = time;
    }

    /**
     * @param {object} _
     * @param {number} _.index
     * @param {HTMLAudioElement[]} _.audios
     * @param {HTMLButtonElement[]} _.playButtons
     */
    onPlayAudio = async ({ index, audios, playButtons }) => {
        if (!this.enableSimultaneousPlaying && this.currentAudioPlaying !== -1 && this.currentAudioPlaying !== index) {
            audios[this.currentAudioPlaying].pause()
        }

        // Handle volume
        const dataVolume = parseFloat(audios[index].dataset.volume)
        if (!isNaN(dataVolume)) {
            audios[index].volume = this.utils.clamp(this.defaultVolume + dataVolume, 0.1, 1)
        } else {
            audios[index].volume = this.utils.clamp(this.defaultVolume, 0.1, 1)
        }

        this.currentAudioPlaying = index;

        await this.reloadMp3IfCorrupt(audios[index])

        playButtons[index].innerHTML = this.icons.pauseIcon;
    }

    /**
     * 
     * @param {object} _ 
     * @param {HTMLButtonElement} _.playButton 
     * @param {HTMLAudioElement} _.audio 
     */
    onPauseAudio = ({ playButton, audio, index }) => {
        if (this.currentAudioPlaying === index) {
            // This if check is needed to not break the 'disable simultaneous playing of mp3' feature
            this.currentAudioPlaying = -1;
        }
        audio.pause();
        playButton.innerHTML = this.icons.playIcon;
    }

    /**
     * @param {object} _
     * @param {number} _.index
     * @param {HTMLAudioElement[]} _.audios
     */
    onPlayButtonClick = async ({ index, audios }) => {
        if (audios[index].paused) {
            await audios[index].play()
        } else {
            audios[index].pause()
        }
    }

    onEnded = async ({audios, index, timeline, playButton,}) => {
        this.currentAudioPlaying = -1
        playButton.innerHTML = this.icons.playIcon
        timeline.value = 0
        timeline.style.backgroundSize = "0% 100%"

        if (!this.autoplay
            || audios.length === 1
            || (this.stopAutoplayWhenReachingLastMusic && index + 1 === audios.length)) {
            return;
        }

        let nextIndex = 0
        if (index + 1 != audios.length) nextIndex = index + 1

        if (this.os === "Android") {
            this.checkLoadedMp3Status(audios[nextIndex])
        }

        await audios[nextIndex].play()
    }

    /**
    * This function should be called every time new scores are added at the end of the grid (because of scroll)
    * or if the grid of score is re-arranged because of new filters ?
    * It:
    * - Binds the update of the audio to the progress of the timeline
    * - Handle what happened when you click on the custom button
    * - Make possible to drag the timeline to change the audio timecode
    * - Supports automatic playback of the next found mp3 (which is already loaded in the grid of course)
    * 
    * I'm using on... properties here because I only need one handler per audio at all time
    * and I don't want to handle the adding and removing of eventListener manually
    * 
    * @param {import('./_views').CollectionManager} collectionManager - An object responsible of a collection of DomElement
    * It must implement a function getParent() that returns the parent DomElement of the collection
    */
    manageMp3Scores(collectionManager) {
        this.logger?.reset()

        /** @type {HTMLAudioElement[]} */
        const audios = collectionManager.parent.querySelectorAll('audio')

        /** @type {HTMLButtonElement[]} */
        const playButtons = collectionManager.parent.querySelectorAll('.audio-player button')

        /** @type {HTMLInputElement[]} */
        const trackTimelines = collectionManager.parent.querySelectorAll('input.timeline')

        if (this.numberOfAudiosLoaded === audios.length) return;
        this.numberOfAudiosLoaded = audios.length


        // Must never happen
        if (audios.length !== playButtons.length) {
            console.error("The number of play buttons doesn't match the number of audios")
        }

        for (let i = 0; i < audios.length; i++) {
            if (this.os === "Android") {
                audios[i].onloadedmetadata = () => this.checkLoadedMp3Status(audios[i])
            }

            audios[i].ontimeupdate = () => this.onChangeTimelinePosition(trackTimelines[i], audios[i])

            audios[i].onplay = () => this.onPlayAudio({ index: i, audios, playButtons })

            audios[i].onpause = () => this.onPauseAudio({ playButton: playButtons[i], audio: audios[i], index: i })

            playButtons[i].onclick = () => this.onPlayButtonClick({ index: i, audios })

            trackTimelines[i].onchange = () => this.onChangeSeek(trackTimelines[i], audios[i])

            audios[i].onended = () => this.onEnded({
                audios,
                index: i,
                timeline: trackTimelines[i],
                playButton: playButtons[i],
            })
        }

        this.logger?.logPerf("Reloading all the mp3 management")
    }

    /**
    * @description Since Android audios are sometimes corrupted, this function flag them (by coloring the timecode tag) to:
    *  - Skip them on autoplay
    *  - Visually mark them so that the user know they didn't load correctly
    * Edit: Big twist as of today (2023-01-04). Even mp3 with correct loading time may not play completely. I've experienced this with Elegia today, i was flabbergasted...
    *       So it truly is unreliable on Android after all 😥. I still keep this function though because i'm sure it's still better than nothing
    * @param {HTMLAudioElement} audio
    */
    checkLoadedMp3Status = (audio) => {
        const timecodeTag = audio.parentNode.parentNode.querySelector(".timecode")
        if (!timecodeTag) return;

        const timecodeDuration = this.utils.convertTimecodeToDuration(timecodeTag.querySelector("span").innerText)

        // Even in this state, the audio may not play completely...
        if (Math.abs(timecodeDuration - audio.duration) <= 1) {
            timecodeTag.style.backgroundColor = "#060D"
            return true;
        }

        if (audio.classList.contains("corrupt")) {
            timecodeTag.style.backgroundColor = "#600D"
            return
        }

        // Modifying the src property after it has been loaded doesn't do anything (https://stackoverflow.com/a/68797896)
        audio.classList.add("corrupt")
        timecodeTag.style.backgroundColor = "#F808"

        return false;
    }

    /**
    * @description I don't know why but most of the time, audios fail to load on Android for no specific reasons
    * I tried to:
    *  - Remove the <source> and replace it with a new one but it doesn't load it
    *  - Set the src of the audio tag to the one of the source to override it but that doesn't work either
    * 
    * I guess it can't be patched like that 😕, so i should report this bug on obsidian forum
    * Edit: Here is the link to the issue i've created : https://forum.obsidian.md/t/bug-audio-files-fail-to-load-randomly-on-android/49684
    * Edit 2: Hahaha nobody cares (as expected 😅)
    * Edit 3: @Majed6 on Discord said he had the same problem and he found a workaround, unfortunately, it doesn't completely solve the issue 😞
    * @param {HTMLAudioElement} audio
    */
    reloadMp3IfCorrupt = async (audio) => {
        if (!audio.classList.contains("corrupt")) return;

        // from: https://github.com/Majed6/android-audio-fixer/blob/master/main.ts
        if (!audio.classList.contains("processed")) {
            audio.classList.add('processed');
            const file = await fetch(audio.firstElementChild.src);
            const fileBlob = await file.blob();
            audio.src = URL.createObjectURL(fileBlob);
        }
    }
}

export class ButtonBar {
    constructor({
        buttonsOrder = [],
        buttonsMap = new Map(),
        logger,
    } = {}) {
        this.logger = logger

        /** @type{string[]} */
        this.buttonsOrder = buttonsOrder

        /** @type {Map<string, import('./_views').ViewButton>} */
        this.buttonsMap = buttonsMap
    }

    addButton({name, icon, event}) {
        this.buttonsMap.set(name, { icon, event })
        this.buttonsOrder.push(name)
    }

    buildHTMLButtons() {
        let html = ''

        for (const buttonId of this.buttonsOrder) {
            if (!buttonId) continue

            const button = this.buttonsMap.get(buttonId)
            if (!button) {
                console.warn(`${buttonId} isn't a valid view button`)
                continue
            }

            html += `<button class='${buttonId}'>
                ${button.icon}
            </button>
            `
        }
        return html
    }

    /**
     * 
     * @param {HTMLButtonElement[]} buttons 
     */
    setEvents(buttons) {
        for (const btn of buttons) {
            btn.onclick = (async (e) => {
                const button = this.buttonsMap.get(btn.className)
                await button?.event()

                e.stopPropagation() // used for preventing callout default behavior in live preview
                btn.blur()
            })
        }
    }
}


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
 * // Initializes the collection manager with all its needed dependencies
 * const gridManager = CollectionManager.makeGridManager({
 *      container,
 *      component,
 *      currentFilePath,
 *      logger, icons,
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
        this.totalNumberOfChildrenInsertedInTheDOM = 0

        /** @type {*} dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface) */
        this.pages = pages

        /**
         * @type {Function} - This function get a page as its parameter and is suppose to return an html string or an array of html strings
         */
        this.pageToChild = pageToChild

        // this.batchesFetchedCount = 0
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

    /**
     * There aren't any HTML to consume/render anymore (but there was at some point)
     */
    everyElementsHaveBeenInsertedInTheDOM = () => (
        this.bakedChildren.length === 0 &&
        this.bakedBatchIndex > 0 
        && this.totalNumberOfChildrenInsertedInTheDOM >= this.pages.length
    )
    // everyElementsHaveBeenInsertedInTheDOM = () => (this.batchesFetchedCount * this.numberOfElementsPerBatch >= this.children.length)

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
        this.totalNumberOfChildrenInsertedInTheDOM = 0
    }

    /**
     * It bakes a new batch of HTML children every time it is called
     * so they can be rendered in a lazy way by the `insertNewChunk` method.
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

        const HTMLBatch = [];

        for (const page of pagesBatch) {
            const child = await this.pageToChild(page)

            if (Array.isArray(child)) {
                HTMLBatch = [...HTMLBatch, ...child]
            } else {
                HTMLBatch.push(child)
            }
        }

        if (HTMLBatch.length !== 0) {
            this.bakedBatchIndex++;
            this.bakedChildren.push(HTMLBatch)
        }

        return HTMLBatch
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
        // Like a queue, we retrieve the first batch of children that has been baked
        const bakedChildrenChunk = this.bakedChildren.shift()
        if (bakedChildrenChunk.length === 0) return;

        const actualChunkToInsert = bakedChildrenChunk.reduce((acc, cur) => {
            if (typeof cur === "string") {
                return acc + cur
            }
            // Here cur must be an object with an `html` property in it
            return acc + cur.html
        }, "")

        // Needed for metadata-menu to trigger and render extra buttons
        const extraChunkDOM = this.container.createEl('div')
        let extraChunkHTML = ''
        for (let i = 0; i < bakedChildrenChunk.length; i++) {
            if (!bakedChildrenChunk[i]?.extra) {
                extraChunkHTML += `<div></div>`
                continue;
            }

            extraChunkHTML += `<div>`
            for (const [selector, html] of Object.entries(bakedChildrenChunk[i].extra)) {
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

        this.parent.insertAdjacentHTML('beforeend', actualChunkToInsert)

        // 2nd part with the extraChunkDOM
        for (let i = 0; i < bakedChildrenChunk.length; i++) {
            const extra = extraChunkDOM.children[i]
            if (!extra) continue

            const currentChild = this.parent.children[i + this.totalNumberOfChildrenInsertedInTheDOM]
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

        this.totalNumberOfChildrenInsertedInTheDOM += bakedChildrenChunk.length
        this.logger?.log({ totalNumberOfChildrenInsertedInTheDOM: this.totalNumberOfChildrenInsertedInTheDOM })
        // this.batchesFetchedCount++

        // this.logger?.log({ batchesFetchedCount: this.batchesFetchedCount })

        for (const fn of this.extraLogicOnNewChunk) {
            await fn(this)
        }
    }

    handleLastChildIntersection(entries) {
        entries.map(async (entry) => {
            if (!entry.isIntersecting) return

            this.logger.log(entry)
            this.logger.reset()

            this.childObserver.unobserve(entry.target);

            /**
             * We can do both in parallel because the cooking is for the next rendering batch
             */
            await Promise.all([
                this.insertNewChunk(),
                this.bakeNextHTMLBatch(),
            ])

            this.logger.logPerf("Appending new children at the end of the grid + loading next batch")

            if (this.totalNumberOfChildrenInsertedInTheDOM < this.pages.length) {
                this.logger?.log(`Estimated batch to load next: ${this.bakedBatchIndex * this.numberOfElementsPerBatch}`)
                const lastChild = this.parent.querySelector(`${this.childTag}:last-of-type`)
                this.childObserver.observe(lastChild)
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

/**
 * TODO: see if I can easily remove dv dependency and use Obsidian internal API instead to access the created file
 * Class used to create files and automatically insert metadata
 * based on the filters present in the view where the file creation is triggered
 */
export class FileManager {
    /**
     * @param {object} _
     * @param {string?} _.directoryWhereToAddFile
     * @param {Array<Function>} _.logicOnAddFile
     */
    constructor({ dv, app, utils, currentFilePath, properties, userFields, directoryWhereToAddFile, logicOnAddFile = [] }) {
        this.dv = dv,
        this.app = app
        this.utils = utils
        this.currentFilePath = currentFilePath
        this.directoryWhereToAddFile = directoryWhereToAddFile
        this.properties = properties
        this.userFields = userFields
        this.logicOnAddFile = logicOnAddFile
    }

    /**
     * from there : https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/CreateNoteModal.ts
     * Handles creating the new note
     * A new markdown file will be created at the given file path {input}
     * @param {string} input
     * @param {"current-pane"|"new-pane"|"new-tab"} mode - current-pane / new-pane / new-tab
     * @returns {TFile}
     */
    createNewNote = async (input, mode = "new-tab") => {
        const { vault } = this.app;
        const { adapter } = vault;
        const filePath = `${input}.md`;

        try {
            const fileExists = await adapter.exists(filePath);
            if (fileExists) {
                // If the file already exists, respond with error
                throw new Error(`${filePath} already exists`);
            }
            const file = await vault.create(filePath, '');
            // Create the file and open it in the active leaf
            let leaf = this.app.workspace.getLeaf(false);
            if (mode === "new-pane") {
                leaf = this.app.workspace.splitLeafOrActive();
            } else if (mode === "new-tab") {
                leaf = this.app.workspace.getLeaf(true);
            } else if (!leaf) {
                // default for active pane
                leaf = this.app.workspace.getLeaf(true);
            }
            await leaf.openFile(file);
            console.log({ file, leaf })
            return file;
        } catch (error) {
            alert(error.toString());
        }
    }

    /**
     * Didn't find a better way for now to wait until the metadata are loaded inside a newly created file
     * @param {string} pathToFile 
     */
    #waitUntilFileMetadataAreLoaded = async (pathToFile) => {
        let dvFile = null
        while (!dvFile) {
            await this.utils.delay(20); // very important to wait a little to not overload the cpu
            console.log("Metadata in the newly created file hasn't been loaded yet")
            dvFile = this.dv.page(pathToFile)
            if (!dvFile) continue; // the file isn't even referenced by dataview api yet
            if (Object.keys(dvFile).length === 1) { // metadata hasn't been loaded yet in the page, so we continue
                dvFile = null
            }
        }
    }

    handleAddFile = async ({directoryWhereToAddFile, properties, userFields} = {}) => {
        const computed = {
            directoryWhereToAddFile: directoryWhereToAddFile ?? this.directoryWhereToAddFile,
            properties: properties ?? this.properties,
            userFields: userFields ?? this.userFields,
        }

        const newFilePath = `${computed.directoryWhereToAddFile}/Untitled`
        const newFile = await this.createNewNote(newFilePath)

        const mmenuPlugin = this.app.plugins.plugins["metadata-menu"]?.api
        if (!mmenuPlugin) {
            return console.warn("You don't have metadata-menu enabled so you can't benefit from the smart tag completion")
        }

        await this.#waitUntilFileMetadataAreLoaded(newFilePath)

        // If I don't wait long enough to apply auto-complete, it's sent into oblivion by some mystical magic I can't control.
        await this.utils.delay(2500)

        console.log("At last, we can start the autocomplete")

        const fieldsPayload = []

        for (const fn of this.logicOnAddFile) {
            await fn(this, fieldsPayload)
        }

        const current = this.dv.page(this.currentFilePath)

        if (computed.properties?.current) {
            fieldsPayload.push({
                name: computed.properties.current,
                payload: { value: `[[${current.file.name}]]` }
            })
            delete computed.properties.current
        }

        for (const field in computed.properties) {
            console.log(`${field}: ${computed.properties[field]}`)
            if (computed.userFields.get(field) === "date") continue;
            fieldsPayload.push({
                name: field,
                payload: {
                    value: Array.isArray(computed.properties[field])
                        ? `[${computed.properties[field].join(", ")}]`
                        : computed.properties[field]
                }
            })
        }

        await mmenuPlugin.postValues(newFile.path, fieldsPayload)
    }
}

/**
 * Class that contains svg icons directly in string format or sizable via a function
 * TODO: See if I can directly use Obsidian internal way of rendering Lucide icons instead of doing this mess
 */
export class IconManager {
    constructor({hide} = {}) {
        this.hide = !!hide
    }

    // ------------------------
    // - Company/Service icons
    // ------------------------
    // youtubeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1-.5-3.4-.5-5s.2-3.9.5-5c.2-.7.7-1.2 1.4-1.4C5.6 5.2 9.7 5 12 5s6.4.2 8.1.6c.7.2 1.2.7 1.4 1.4.3 1.1.5 3.4.5 5s-.2 3.9-.5 5c-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6 0 0 0 0 0 0z"></path><polygon points="10 15 15 12 10 9"></polygon></svg>'
    youtubeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa0000${this.hide ? "00" : ""}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1-.5-3.4-.5-5s.2-3.9.5-5c.2-.7.7-1.2 1.4-1.4C5.6 5.2 9.7 5 12 5s6.4.2 8.1.6c.7.2 1.2.7 1.4 1.4.3 1.1.5 3.4.5 5s-.2 3.9-.5 5c-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6 0 0 0 0 0 0z"></path><polygon points="10 15 15 12 10 9"></polygon></svg>`

    // from: https://www.svgrepo.com/svg/89412/soundcloud-logo
    soundcloudIcon = `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 317.531 317.531" stroke-width="4" stroke="#ff5400${this.hide ? "00" : ""}" fill="#ff5400${this.hide ? "00" : ""}" style="enable-background:new 0 0 317.531 317.531;" xml:space="preserve"><g><path d="M270.275,141.93c-3.134,0-6.223,0.302-9.246,0.903c-3.289-15.779-11.423-30.182-23.436-41.249c-14.363-13.231-33.037-20.518-52.582-20.518c-9.533,0-19.263,1.818-28.139,5.256c-3.862,1.497-5.78,5.841-4.284,9.703c1.496,3.863,5.838,5.781,9.703,4.284c7.165-2.776,15.022-4.244,22.72-4.244c32.701,0,59.532,24.553,62.411,57.112c0.211,2.386,1.548,4.527,3.6,5.763c2.052,1.236,4.571,1.419,6.778,0.49c3.948-1.66,8.146-2.501,12.476-2.501c17.786,0,32.256,14.475,32.256,32.267c0,17.792-14.473,32.268-32.263,32.268c-1.002,0-106.599-0.048-110.086-0.061c-3.841-0.084-7.154,2.778-7.591,6.659c-0.464,4.116,2.497,7.829,6.613,8.292c0.958,0.108,109.962,0.109,111.064,0.109c26.061,0,47.263-21.205,47.263-47.268C317.531,163.134,296.332,141.93,270.275,141.93z"/><path d="M7.5,153.918c-4.142,0-7.5,3.358-7.5,7.5v60.039c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-60.039C15,157.276,11.642,153.918,7.5,153.918z"/><path d="M45.917,142.037c-4.142,0-7.5,3.358-7.5,7.5v71.07c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-71.07C53.417,145.395,50.059,142.037,45.917,142.037z"/><path d="M85.264,110.21c-4.142,0-7.5,3.358-7.5,7.5v111c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5v-111C92.764,113.568,89.406,110.21,85.264,110.21z"/><path d="M125.551,111.481c-4.142,0-7.5,3.358-7.5,7.5v109.826c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5V118.981C133.051,114.839,129.693,111.481,125.551,111.481z"/></g></svg>`

    dailymotionIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
    <g fill="none" fill-rule="evenodd">
        <path fill="#232323${this.hide ? "00" : ""}" d="M310.744275,457.219014 C290.104691,478.116711 264.241017,488.566555 233.154248,488.566555 C202.576055,488.566555 177.222946,478.372629 157.091937,457.983783 C136.961923,437.594936 126.896916,411.344856 126.896916,379.232547 C126.896916,348.648779 137.216708,323.289934 157.856292,303.15601 C178.496872,283.022086 203.84998,272.955622 233.918604,272.955622 C254.303403,272.955622 272.777313,277.669703 289.340336,287.099855 C305.903358,296.530008 318.771001,309.400623 327.94426,325.7117 C337.117519,342.021782 341.703651,359.8614 341.703651,379.232547 C341.703651,410.324169 331.383859,436.320322 310.744275,457.219014 Z M334.823458,27.524694 L334.823458,204.907162 C316.98651,187.067543 298.004024,174.196928 277.874011,166.296313 C257.743001,158.395697 235.192529,154.445389 210.220603,154.445389 C169.95958,154.445389 133.777109,164.384391 101.670205,184.264388 C69.5633006,204.142393 44.5923698,231.284703 26.7554219,265.691317 C8.91847395,300.097932 0,338.199931 0,379.99632 C0,422.8124 8.7910814,461.424245 26.3732442,495.829864 C43.955407,530.236478 68.9263379,557.378788 101.288027,577.257789 C133.649717,597.137786 170.724931,607.076788 212.513669,607.076788 C273.159491,607.076788 315.457799,587.197787 339.41158,547.439785 L340.939296,547.439785 L340.939296,601.809047 L461.720374,601.809047 L461.720374,0 L334.823458,27.524694 Z" transform="translate(248 202)"/>
    </g>
    </svg>`
    // #0061d1
    // #324b73

    // - https://lucide.dev/icon/package-open?search=package-open
    dropboxIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0061fe${this.hide ? "00" : ""}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"></path><path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"></path><line x1="12" y1="22" x2="12" y2="13"></line><path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"></path></svg>`

    // #0061fe

    // from: https://www.flaticon.com/free-icon/spotify_1946539
    spotifyIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 512 512" stroke="#1ed760${this.hide ? "00" : ""}" fill="#1ed760${this.hide ? "00" : ""}" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><path d="M436.8,75.2C390.5,28.8,326.4,0,255.6,0C114.5,0,0,114.5,0,255.6c0,70.8,28.8,134.8,75.2,181.1c46.3,46.5,110.4,75.2,181.1,75.2C397.5,512,512,397.5,512,256.4C512,185.6,483.2,121.5,436.8,75.2z M256,475.1c-120.8,0-219.1-98.3-219.1-219.1S135.2,36.9,256,36.9S475.1,135.2,475.1,256S376.8,475.1,256,475.1z"/><path d="M406.5,195.9c-81.3-48.3-210-52.8-287.4-29.3c-8.5,2.6-14.6,10.4-14.6,19.6c0,11.3,9.2,20.5,20.5,20.5l6.1-0.9l-0.1,0c67.4-20.5,183.9-16.6,254.6,25.3c3,1.8,6.6,2.9,10.5,2.9c11.3,0,20.5-9.2,20.5-20.5C416.6,206.1,412.6,199.5,406.5,195.9L406.5,195.9L406.5,195.9z"/><path d="M351.9,334.1c-57.8-35.3-129.3-43.5-212.8-24.4c-6.1,1.4-10.6,6.9-10.6,13.3c0,7.5,6.1,13.7,13.7,13.7l3.1-0.4l-0.1,0c76.3-17.4,141-10.3,192.5,21.1c2,1.3,4.5,2,7.2,2c7.5,0,13.7-6.1,13.7-13.7C358.5,340.9,355.9,336.6,351.9,334.1L351.9,334.1z"/><path d="M377.7,269.8c-67.6-41.6-166.5-53.3-246.1-29.1c-7.1,2.2-12.1,8.7-12.1,16.3c0,9.4,7.6,17.1,17.1,17.1l5.1-0.8l-0.1,0c69.7-21.2,159.4-10.7,218.3,25.5c2.5,1.6,5.6,2.5,8.9,2.5c6.1,0,11.5-3.2,14.5-8.1l0-0.1c1.6-2.5,2.5-5.6,2.5-8.9C385.9,278.2,382.6,272.8,377.7,269.8L377.7,269.8L377.7,269.8z"/></g></svg>`

    // manually edited this one: https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Deezer_logo.svg/2560px-Deezer_logo.svg.png
    // The icon doesn't hide when this.hide is set to true...
    // deezerIcon = `<svg version="1.1" id="Calque_1" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="22" height="22" viewBox="0 0 198.4 129.7" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;fill:#40AB5D${this.hide ? "00" : ""};}.st1{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8192_1_);}.st2{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8199_1_);}.st3{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8206_1_);}.st4{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8213_1_);}.st5{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8220_1_);}.st6{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8227_1_);}.st7{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8234_1_);}.st8{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8241_1_);}.st9{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8248_1_);}</style><g id="g8252" transform="translate(0,25.2)"><rect id="rect8185" x="155.5" y="-25.1" class="st0" width="42.9" height="25.1"/><linearGradient id="rect8192_1_" gradientUnits="userSpaceOnUse" x1="-111.7225" y1="241.8037" x2="-111.9427" y2="255.8256" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"><stop offset="0" style="stop-color:#358C7B${this.hide ? "00" : ""}"/><stop offset="0.5256" style="stop-color:#33A65E${this.hide ? "00" : ""}"/></linearGradient><rect id="rect8192" x="155.5" y="9.7" class="st1" width="42.9" height="25.1"/><linearGradient id="rect8199_1_" gradientUnits="userSpaceOnUse" x1="-123.8913" y1="223.6279" x2="-99.7725" y2="235.9171" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"><stop offset="0" style="stop-color:#222B90${this.hide ? "00" : ""}"/><stop offset="1" style="stop-color:#367B99${this.hide ? "00" : ""}"/></linearGradient><rect id="rect8199" x="155.5" y="44.5" class="st2" width="42.9" height="25.1"/><linearGradient id="rect8206_1_" gradientUnits="userSpaceOnUse" x1="-208.4319" y1="210.7725" x2="-185.0319" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"><stop offset="0" style="stop-color:#FF9900${this.hide ? "00" : ""}"/><stop offset="1" style="stop-color:#FF8000${this.hide ? "00" : ""}"/></linearGradient><rect id="rect8206" x="0" y="79.3" class="st3" width="42.9" height="25.1"/> <linearGradient id="rect8213_1_" gradientUnits="userSpaceOnUse" x1="-180.1319" y1="210.7725" x2="-156.7319" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#FF8000${this.hide ? "00" : ""}"/> <stop offset="1" style="stop-color:#CC1953${this.hide ? "00" : ""}"/> </linearGradient> <rect id="rect8213" x="51.8" y="79.3" class="st4" width="42.9" height="25.1"/> <linearGradient id="rect8220_1_" gradientUnits="userSpaceOnUse" x1="-151.8319" y1="210.7725" x2="-128.4319" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#CC1953${this.hide ? "00" : ""}"/> <stop offset="1" style="stop-color:#241284${this.hide ? "00" : ""}"/> </linearGradient> <rect id="rect8220" x="103.7" y="79.3" class="st5" width="42.9" height="25.1"/> <linearGradient id="rect8227_1_" gradientUnits="userSpaceOnUse" x1="-123.5596" y1="210.7725" x2="-100.1596" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#222B90${this.hide ? "00" : ""}"/> <stop offset="1" style="stop-color:#3559A6${this.hide ? "00" : ""}"/> </linearGradient> <rect id="rect8227" x="155.5" y="79.3" class="st6" width="42.9" height="25.1"/> <linearGradient id="rect8234_1_" gradientUnits="userSpaceOnUse" x1="-152.7555" y1="226.0811" x2="-127.5083" y2="233.4639" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#CC1953${this.hide ? "00" : ""}"/> <stop offset="1" style="stop-color:#241284${this.hide ? "00" : ""}"/> </linearGradient> <rect id="rect8234" x="103.7" y="44.5" class="st7" width="42.9" height="25.1"/> <linearGradient id="rect8241_1_" gradientUnits="userSpaceOnUse" x1="-180.9648" y1="234.3341" x2="-155.899" y2="225.2108" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="2.669841e-03" style="stop-color:#FFCC00${this.hide ? "00" : ""}"/> <stop offset="0.9999" style="stop-color:#CE1938${this.hide ? "00" : ""}"/> </linearGradient> <rect id="rect8241" x="51.8" y="44.5" class="st8" width="42.9" height="25.1"/> <linearGradient id="rect8248_1_" gradientUnits="userSpaceOnUse" x1="-178.1651" y1="257.7539" x2="-158.6987" y2="239.791" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="2.669841e-03" style="stop-color:#FFD100${this.hide ? "00" : ""}"/> <stop offset="1" style="stop-color:#FD5A22${this.hide ? "00" : ""}"/> </linearGradient> <rect id="rect8248" x="51.8" y="9.7" class="st9" width="42.9" height="25.1"/> </g> </svg>`

    // ----------------
    // - Other icons
    // ----------------
    linkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${this.hide ? "transparent" : "currentColor"}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`

    mediaIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"></path><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"></path><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"></path></svg>`

    playIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
    </svg>`

    pauseIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>`

    filePlusIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`

    filterIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>';

    // Taken from Alexandru Dinu Sortable plugin
    sortIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M49.792 33.125l-5.892 5.892L33.333 28.45V83.333H25V28.45L14.438 39.017L8.542 33.125L29.167 12.5l20.625 20.625zm41.667 33.75L70.833 87.5l-20.625 -20.625l5.892 -5.892l10.571 10.567L66.667 16.667h8.333v54.883l10.567 -10.567l5.892 5.892z"></path></svg>'

    saveIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>'

    listMusicIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15V6"></path><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path><path d="M12 12H3"></path><path d="M16 6H3"></path><path d="M12 18H3"></path></svg>'

    micOffIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path><path d="M5 10v2a7 7 0 0 0 12 5"></path><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path><path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`

    mic2Icon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12"></path><circle cx="17" cy="7" r="5"></circle></svg>`

    venetianMaskIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"></path><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"></path><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"></path></svg>`

    imageOffIcon = (size) => `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-image-off'><line x1='2' x2='22' y1='2' y2='22'/><path d='M10.41 10.41a2 2 0 1 1-2.83-2.83'/><line x1='13.5' x2='6' y1='13.5' y2='21'/><line x1='18' x2='21' y1='12' y2='15'/><path d='M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59'/><path d='M21 15V5a2 2 0 0 0-2-2H9'/></svg>`

    eraserIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eraser"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`


    customObsidianIcon = (color = "#6C31E3", id="") => `<svg id="custom-logo" width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="height:100%;width:100%;">
        <defs>
            <radialGradient id="b${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-48 -185 123 -32 179 429.7)"><stop stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-opacity=".1"/></radialGradient>
            <radialGradient id="c${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(41 -310 229 30 341.6 351.3)"><stop stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></radialGradient>
            <radialGradient id="d${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(57 -261 178 39 190.5 296.3)"><stop stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></radialGradient>
            <radialGradient id="e${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-79 -133 153 -90 321.4 464.2)"><stop stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-opacity=".3"/></radialGradient>
            <radialGradient id="f${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-29 136 -92 -20 300.7 149.9)"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></radialGradient>
            <radialGradient id="g${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(72 73 -155 153 137.8 225.2)"><stop stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></radialGradient>
            <radialGradient id="h${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(20 118 -251 43 215.1 273.7)"><stop stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></radialGradient>
            <radialGradient id="i${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-162 -85 268 -510 374.4 371.7)"><stop stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></radialGradient>
            <filter id="a${id}" x="80.1" y="37" width="351.1" height="443.2" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="6.5" result="effect1_foregroundBlur_744_9191"/></filter>
        </defs>
        <g filter="url(#a${id})"><path d="M359.2 437.5c-2.6 19-21.3 33.9-40 28.7-26.5-7.2-57.2-18.6-84.8-20.7l-42.4-3.2a28 28 0 0 1-18-8.3l-73-74.8a27.7 27.7 0 0 1-5.4-30.7s45-98.6 46.8-103.7c1.6-5.1 7.8-49.9 11.4-73.9a28 28 0 0 1 9-16.5L249 57.2a28 28 0 0 1 40.6 3.4l72.6 91.6a29.5 29.5 0 0 1 6.2 18.3c0 17.3 1.5 53 11.2 76a301.3 301.3 0 0 0 35.6 58.2 14 14 0 0 1 1 15.6c-6.3 10.7-18.9 31.3-36.6 57.6a142.2 142.2 0 0 0-20.5 59.6Z" fill="#000" fill-opacity=".3"/></g>
        <path id="arrow" d="M359.9 434.3c-2.6 19.1-21.3 34-40 28.9-26.4-7.3-57-18.7-84.7-20.8l-42.3-3.2a27.9 27.9 0 0 1-18-8.4l-73-75a27.9 27.9 0 0 1-5.4-31s45.1-99 46.8-104.2c1.7-5.1 7.8-50 11.4-74.2a28 28 0 0 1 9-16.6l86.2-77.5a28 28 0 0 1 40.6 3.5l72.5 92a29.7 29.7 0 0 1 6.2 18.3c0 17.4 1.5 53.2 11.1 76.3a303 303 0 0 0 35.6 58.5 14 14 0 0 1 1.1 15.7c-6.4 10.8-18.9 31.4-36.7 57.9a143.3 143.3 0 0 0-20.4 59.8Z" fill="${color}"/>
        <path d="M182.7 436.4c33.9-68.7 33-118 18.5-153-13.2-32.4-37.9-52.8-57.3-65.5-.4 1.9-1 3.7-1.8 5.4L96.5 324.8a27.9 27.9 0 0 0 5.5 31l72.9 75c2.3 2.3 5 4.2 7.8 5.6Z" fill="url(#b${id})"/>
        <path d="M274.9 297c9.1.9 18 2.9 26.8 6.1 27.8 10.4 53.1 33.8 74 78.9 1.5-2.6 3-5.1 4.6-7.5a1222 1222 0 0 0 36.7-57.9 14 14 0 0 0-1-15.7 303 303 0 0 1-35.7-58.5c-9.6-23-11-58.9-11.1-76.3 0-6.6-2.1-13.1-6.2-18.3l-72.5-92-1.2-1.5c5.3 17.5 5 31.5 1.7 44.2-3 11.8-8.6 22.5-14.5 33.8-2 3.8-4 7.7-5.9 11.7a140 140 0 0 0-15.8 58c-1 24.2 3.9 54.5 20 95Z" fill="url(#c${id})"/>
        <path d="M274.8 297c-16.1-40.5-21-70.8-20-95 1-24 8-42 15.8-58l6-11.7c5.8-11.3 11.3-22 14.4-33.8a78.5 78.5 0 0 0-1.7-44.2 28 28 0 0 0-39.4-2l-86.2 77.5a28 28 0 0 0-9 16.6L144.2 216c0 .7-.2 1.3-.3 2 19.4 12.6 44 33 57.3 65.3 2.6 6.4 4.8 13.1 6.4 20.4a200 200 0 0 1 67.2-6.8Z" fill="url(#d${id})"/>
        <path d="M320 463.2c18.6 5.1 37.3-9.8 39.9-29a153 153 0 0 1 15.9-52.2c-21-45.1-46.3-68.5-74-78.9-29.5-11-61.6-7.3-94.2.6 7.3 33.1 3 76.4-24.8 132.7 3.1 1.6 6.6 2.5 10.1 2.8l43.9 3.3c23.8 1.7 59.3 14 83.2 20.7Z" fill="url(#e${id})"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M255 200.5c-1.1 24 1.9 51.4 18 91.8l-5-.5c-14.5-42.1-17.7-63.7-16.6-88 1-24.3 8.9-43 16.7-59 2-4 6.6-11.5 8.6-15.3 5.8-11.3 9.7-17.2 13-27.5 4.8-14.4 3.8-21.2 3.2-28 3.7 24.5-10.4 45.8-21 67.5a145 145 0 0 0-17 59Z" fill="url(#f${id})"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M206 285.1c2 4.4 3.7 8 4.9 13.5l-4.3 1c-1.7-6.4-3-11-5.5-16.5-14.6-34.3-38-52-57-65 23 12.4 46.7 31.9 61.9 67Z" fill="url(#g${id})"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M211.1 303c8 37.5-1 85.2-27.5 131.6 22.2-46 33-90.1 24-131l3.5-.7Z" fill="url(#h${id})"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M302.7 299.5c43.5 16.3 60.3 52 72.8 81.9-15.5-31.2-37-65.7-74.4-78.5-28.4-9.8-52.4-8.6-93.5.7l-.9-4c43.6-10 66.4-11.2 96 0Z" fill="url(#i${id})"/>
    </svg>`
}

/**
 * Class that contains functions used to measure performance and log things in file
 * TODO: Ease the writing of nested callout inside debug file
 */
export class Logger {
    /**
     * @param {object} _ 
     * @param {'console' | 'file' | 'both'} _.output
     * TODO: Fails silently if output is set to 'file' or 'both' yet the filepath isn't specified
     * TODO: Supports "level" property
     */
    constructor({app, output = 'console', filepath = '', level = "debug", dry = false} = {}) {
        this.inceptionTime = performance.now()
        this.startTime = this.inceptionTime
        this.perfTime = null
        this.app = app
        this.dry = dry
        this.level = level
        this.output = output
        this.filepath = filepath

        /** @private */
        this.methods = new Map()

        this.methods.set("console", {
            log: (...vargs) => console.log.apply(this, vargs),
            info: (...vargs) => console.info.apply(this, vargs),
            warn: (...vargs) => console.warn.apply(this, vargs),
            error: (...vargs) => console.error.apply(this, vargs),
            clear: () => console.clear(),
        })

        this.methods.set("file", {
            log: (...vargs) => this.#fileLoggingMethod("", ...vargs),
            info: (...vargs) => this.#fileLoggingMethod("info", ...vargs),
            warn: (...vargs) => this.#fileLoggingMethod("warning", ...vargs),
            error: (...vargs) => this.#fileLoggingMethod("error", ...vargs),
            clear: () => this.clearNote(this.filepath),
        })
    }

    #fileLoggingMethod(calloutType, ...vargs) {
        if (calloutType) {
            this.appendCalloutHeadToNote({
                path: this.filepath,
                text: vargs[0],
                type: calloutType.toUpperCase(),
                mode: '+',
            })
        }

        for (let i = 0; i < vargs.length; i++) {
            if (i === 0 && calloutType) continue

            this.appendTextToNote(this.filepath, vargs[i])
        }
    }

    #method(method, ...vargs) {
        if (this.dry) return

        if (this.output !== 'file') {
            this.methods.get("console")[method](...vargs)
        }

        if (this.output !== 'console') {
            this.methods.get("file")[method](...vargs)
        }
    }
    log(...vargs) { this.#method("log", ...vargs) }
    info(...vargs) { this.#method("info", ...vargs) }
    warn(...vargs) { this.#method("warn", ...vargs) }
    error(...vargs) { this.#method("error", ...vargs) }
    clear() { this.#method("clear") }


    /**
     * Hacky but it's for debug purposes
     * @param {number} duration
     * @returns {string} The duration expressed as a string
     */
    #buildDurationLog = (duration) => {
        if (duration >= 1000) {
            return `${(duration / 1000.0).toPrecision(3)} seconds`
        }
        return `${duration.toPrecision(3)} milliseconds`
    }

    /**
     * Log how many time occured since the last time this function was called
     * or since inception time if this function was called for the first time
     * @param {string} label 
     */
    logPerf = (label) => {
        if (this.dry) return

        this.perfTime = performance.now()
        this.info(
            `${label} took ${this.#buildDurationLog(
                this.perfTime - this.startTime
            )}`
        )
        this.startTime = this.perfTime
    }

    /**
     * Call this method at the end of your view to measure its total computing time
     */
    viewPerf = () => {
        if (this.dry) return

        this.info(
            `View took ${this.#buildDurationLog(
                performance.now() - this.inceptionTime
            )} to run`
        )
    }

    reset = (number = performance.now(), complete = false) => {
        if (complete) this.inceptionTime = number
        this.startTime = number
    }

    #handleCalloutLevel(text, calloutLevel) {
        if (calloutLevel < 1) {
            return text
        }

        const prefix = '>'.repeat(calloutLevel)
        const lines = text.split('\n')

        const prefixedLines = lines.map(line => prefix + ' ' + line)

        return prefixedLines.join('\n')
    }

    /**
     * Only works on Markdown file
     * It creates the note if it doesn't exist though the folders in the path must exists
     * TODO: Create the folders in the path if they doesn't exist
     * @param {string} path - The function automatically adds '.md' at the end if it isn't already there
     * @param {string} text - The text to append at the end of the note
     */
    appendTextToNote = async (path, text, calloutLevel = 0) => {
        if (this.dry) return

        // TODO: Make a JSON.stringify to callout with nested callouts to render deep objects. Move that logic into a CalloutManager class?
        if (typeof text !== "string") return

        // if (typeof text !== "string") {
        //     text = JSON.stringify(text, (key, value) => {
        //         if (key === "file") {
        //             return undefined
        //         }
        //         return value;
        //     });
        // }

        if (!path.endsWith('.md')) {
            path += '.md'
        }

        text = this.#handleCalloutLevel(text, calloutLevel)

        let file = this.app.metadataCache.getFirstLinkpathDest(path, "")
        if (!file) {
            return await this.app.vault.create(path, text)
        }

        this.app.vault.process(file, (data) => {
            if (!data.endsWith('\n')) data += '\n'
            if (!text.endsWith('\n')) text += '\n'
            return data + text
        })
    }

    /**
     * 
     * @param {object} _ 
     * @param {string} _.path
     * @param {string} _.text
     * @param {string} _.type
     * @param {'' | '+' | '-'} _.mode 
     * @param {boolean} _.solo - Wether or not it should append a newline below the callout
     * @returns 
     */
    appendCalloutHeadToNote = async ({path, text, type, mode, solo = true, level = 0}) => {
        if (!type) return

        const calloutHead = `[!${type.toUpperCase()}]${mode}`

        text = this.#handleCalloutLevel(`${calloutHead} ${text}`, level + 1)
        text += solo ? '\n\n' : ''

        await this.appendTextToNote(path, text, level)
    }


    clearNote = async (path) => {
        if (this.dry) return

        if (!path.endsWith('.md')) {
            path += '.md'
        }

        let file = this.app.metadataCache.getFirstLinkpathDest(path, "")
        if (!file) return

        this.app.vault.process(file, (data) => {
            return ''
        })
    }
}

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

export class Orphanage {
    /**
     * @param {Utils} _.utils
    */
    constructor({
        utils,
        directory,
        thumbnailDirectory,
        thumbnailProp = "thumbnail",
    }) {
        this.utils = utils
        this.directory = directory
        this.thumbnailDirectory = thumbnailDirectory
        this.thumbnailProp = thumbnailProp
    }
    /**
     * Used to disguise orphans as real ScoreFile (mock Link to TFile)
     * It also specializes each orphans based on the context in which they are defined
     * 
     * @param {object} _
     * @param {string[]} _.data
     * @param {object} _.context - The context in which the orphans should be raised. Contains the actual file in which they are defined and the filters they should apply to
     * @returns {import('./_views').ScoreFile[]}
     */
    raise({data, context}) {
        const orphans = this.utils.normalizeArrayOfObjectField(data)

        // Needed to disguise orphans as real ScoreFile (mock Link to TFile)
        for (const o of orphans) {
            // If thumbnail includes a '/', that means it's an url
            if (o[this.thumbnailProp] && !o[this.thumbnailProp].includes("/")) {
                o[this.thumbnailProp] = {
                    path: `${this.thumbnailDirectory}/${o[this.thumbnailProp].replace(/\[|\]/g, '')}`
                }
            }

            if (context.disguiseAs) {
                o[context.disguiseAs] = {
                    path: context.currentFilePath
                }
            }

            o.file = {
                name: o.title,
                path: `${this.directory}/${o.title}.md`
            }
        }

        return orphans
    }
}

const SORTING_KEYWORDS = {
    asc: "ascending",
    ascending: "ascending",
    firstly: "ascending",
    oldly: "ascending",
    desc: "descending",
    descending: "descending",
    newly: "descending",
    recently: "descending",
    lastly: "descending",
}

/**
 * It's build on top of the Query class which is itself built on top of DataviewAPI
 * 
 * *What's the difference between both?*
 * 
 * The Query class is an agnostic service that enhance the default capability of dataview querying by adding new "primitives" to it.
 * 
 * This class on the other hand leverage the functions provided by the Query class to use them at a higher level of abstraction in the shape of a simple filter/sort object
 * Also it doesn't store the state of the query unlike the Query object
 */
export class PageManager {
    /**
     * @param {object} _
     * @param {DataviewAPI} _.dv
     * @param {Logger} _.logger
     * @param {Utils} _.utils
     * @param {Orphanage} _.orphanage
     * @param {Map<string, Function>} _.customFields - Example: <"mp3", (qs) => ...>
     * @param {Map<string, string>} _.userFields - Example: '<"artist", "link">'
     * @param {number?} _.seed - Used for the shuffle when sorting
     */
    constructor({
        // Dependencies
        dv, logger, utils, orphanage,

        currentFilePath,
        customFields,
        userFields,
        defaultFrom = '-"_templates"',
        seed = null,
    }) {
        this.dv = dv
        this.logger = logger
        this.utils = utils
        this.orphanage = orphanage

        if (!dv) {
            console.error(
                "dv instance is needed to initialize PageManager!"
            )
        }

        if (!utils) {
            console.error(
                "An Utils instance is needed to initialize PageManager!"
            )
        }

        this.currentFilePath = currentFilePath
        this.defaultFrom = defaultFrom
        this.seed = seed

        this.queryFilterFunctionsMap = this.#buildQueryFilterFunctionMap()
        if (customFields){
            customFields.forEach((value, key) =>
                this.queryFilterFunctionsMap.set(key, value)
            )
        }
        

        this.queryDefaultFilterFunctionsMap = this.#buildDefaultQueryFilterFunctionMap()
        this.userFields = userFields ?? new Map()

        /** @type {string[]} */
        this.dateUserFields = Array.from(this.userFields).reduce((acc, [field, type]) => {
            if (type === "date") {
                acc.push(field)
            }
            return acc
        }, [])

        // Draft for special sort functions just like filters above
        this.querySortFunctionsMap = new Map()
        this.querySortFunctionsMap.set("manual", async (pages, field) => {
            const rawSortingPages = this.dv.page(this.currentFilePath)[field]
            if (!rawSortingPages) {
                console.warn(
                    `${value} property could not be found in your file`
                )
                return pages
            }

            const sortingPages = await this.utils.normalizeLinksPath(
                rawSortingPages,
                this.orphanage.directory,
            )

            /* https://stackoverflow.com/a/44063445 + https://gomakethings.com/how-to-get-the-index-of-an-object-in-an-array-with-vanilla-js/ */
            return pages.sort((a, b) => {
                return (
                    sortingPages.findIndex(
                        (spage) => spage.path === a.file.path
                    ) -
                    sortingPages.findIndex(
                        (spage) => spage.path === b.file.path
                    )
                )
            })
        })

        this.queryDefaultSortFunctionsMap = new Map()
        this.queryDefaultSortFunctionsMap.set("date", (pages, field, value) => {
            return pages.sort((a, b) => {
                const aDate = this.utils.valueToDateTime({
                    value: a[field],
                    dv: this.dv,
                }) ?? (value === "ascending" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER)
                const bDate = this.utils.valueToDateTime({
                    value: b[field],
                    dv: this.dv,
                }) ?? (value === "ascending" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER)

                return value === "descending"
                    ? bDate - aDate
                    : aDate - bDate
            })
        })
        this.queryDefaultSortFunctionsMap.set("path", (pages, value) => {
            return pages.sort((a, b) => {
                return value === "descending"
                    ? b.file.path.localeCompare(a.file.path)
                    : a.file.path.localeCompare(b.file.path)
            })
        })
    }

    /**
     * @returns {Map<string, Function>}
     */
    #buildQueryFilterFunctionMap = () => {
        const queryFilterFunctionsMap = new Map()

        queryFilterFunctionsMap.set("manual", async (qs, value) => {
            const links = this.dv.page(this.currentFilePath)[value]
            if (!links) {
                return console.warn(
                    "You must set an inline field inside your file containing pages links for the manual filter to work"
                )
            }
            await qs.setLinks(links)
        })

        queryFilterFunctionsMap.set("current", (qs, value) => {
            const currentPath = this.dv.page(this.currentFilePath).file.path
            qs.withLinkFieldOfPath({ field: value, path: currentPath })
        })

        queryFilterFunctionsMap.set("tags", (qs, value) => {
            qs.withTags(value)
        })

        queryFilterFunctionsMap.set('bookmarks', (qs, value) => {
            qs.inBookmarkGroup(value)
        })

        return queryFilterFunctionsMap
    }

    /**
     * @returns {Map<string, Function>}
     */
    #buildDefaultQueryFilterFunctionMap = () => {
        const queryDefaultFilterFunctionsMap = new Map()

        queryDefaultFilterFunctionsMap.set("date", (qs, field, value) => {
            this.logger?.log({ value })

            if (!this.utils.isObject(value)) {
                return qs.withDateFieldOfTime({ name: field, value })
            }

            if (value.before)
                qs.withDateFieldOfTime({
                    name: field,
                    value: value.before,
                    compare: "lt",
                })
            if (value.after)
                qs.withDateFieldOfTime({
                    name: field,
                    value: value.after,
                    compare: "gt",
                })
        })

        /**
         * @param {string} field 
         * @param {string} value 
         */
        const linkFilterFunction = (qs, field, value) => {
            if (value instanceof RegExp) {
                return qs.withLinkFieldOfPathRegex({
                    field,
                    path: value,
                })
            }

            const inLink = this.dv.parse(value) // transform [[value]] into a link
            this.logger?.log({ inLink })

            if (this.utils.isObject(inLink)) {
                const page = this.dv.page(inLink.path)
                if (!page) {
                    qs.withLinkFieldOfPath({
                        field,
                        path: inLink.path,
                        acceptStringField: true,
                    })
                } else {
                    qs.withLinkFieldOfPath({
                        field,
                        path: page.file.path,
                        acceptStringField: false,
                    })
                }
            } else {
                qs.withLinkFieldOfPathRegex({
                    field,
                    path: value,
                    acceptStringField: true,
                })
            }
        }

        queryDefaultFilterFunctionsMap.set("link", (qs, field, value) => {
            if (Array.isArray(value)) {
                const temporaryQueryService = new qs.constructor({ dv: this.dv, logger: this.logger })

                const results = value.map((v) => {
                    temporaryQueryService.from(qs._source)
                    linkFilterFunction(temporaryQueryService, field, v)
                    return [...temporaryQueryService._pages]
                })

                const resolvedPages = qs.constructor.innerJoinPages(qs._pages, qs.constructor.joinPages(...results))
                qs.setPages(resolvedPages)
            } else {
                linkFilterFunction(qs, field, value)
            }
        })

        return queryDefaultFilterFunctionsMap
    }

    /**
     * Needed to profit of Dataview's implementation of backlinks
     * @warning This function mutate the filter argument
     * @param {string} from
     * @param {object} filter
     */
    #updateFromStringBasedOnSpecialFilters = (from, filter) => {
        if (filter?.current === "backlinks") {
            delete filter.current
            return (from += ` AND [[${this.dv.page(this.currentFilePath).file.path}]]`)
        }

        return from
    }

    /**
     * @param {object} _
     * @param {string} _.filter - 
     * @param {Query} _.qs
     * @param {boolean} _.keepCurrentPages
     */
    #runStringFilterQuery = ({filter, qs, keepCurrentPages = false}) => {
        switch (filter) {
            case "backlinks":
                qs.from(`${this.defaultFrom} AND [[${this.dv.page(this.currentFilePath).file.path}]]`, keepCurrentPages)
                break;
            default:
                break;
        }
    }

    /**
     * @param {object} _
     * @param {string[]} _.filter
     * @param {Query} _.qs
     */
    #runArrayFilterQuery = async ({filter, qs}) => {
        // TODO: Add support for array of link representation
        // await qs.setLinksFromString(filter)
    }

    /**
     * @param {object} _
     * @param {object} _.filter
     * @param {Query} _.qs
     * @param {boolean} _.keepCurrentPages
     */
    #runObjectFilterQuery = async ({ filter, qs, keepCurrentPages = false}) => {
        let fromQuery = filter?.from ?? this.defaultFrom
        fromQuery = this.#updateFromStringBasedOnSpecialFilters(
            fromQuery,
            filter
        )

        qs.from(fromQuery, keepCurrentPages)

        for (const prop in filter) {
            this.logger?.log(`filter.${prop} =`, filter[prop])

            if (prop === "from") continue

            // The property has a special meaning. It's either a default property (manual, tags, ...) or a custom one (mp3Only, voice, ...)
            let propFilterFunc = this.queryFilterFunctionsMap.get(prop)
            if (propFilterFunc) {
                // The queryService and the value (note that the value isn't necessarly used by the func)
                await propFilterFunc(qs, filter[prop])
                continue
            }

            // The property is in the userFields so it has a special meaning (example: link, date, ...)
            propFilterFunc = this.queryDefaultFilterFunctionsMap.get(this.userFields.get(prop))
            this.logger?.log({ propType: this.userFields.get(prop), prop, value: filter[prop], propFilterFunc })
            if (propFilterFunc) {
                // The queryService, the field name and the value
                await propFilterFunc(qs, prop, filter[prop])
                continue
            }

            // Default filter
            if (Array.isArray(filter[prop])) {
                filter[prop].forEach((value) => {
                    qs.withFieldOfValue({ name: prop, value })
                })
            } else if (this.utils.isObject(filter[prop])) {
                if (filter[prop].not) {
                    qs.withoutFieldOfValue({
                        name: prop,
                        value: filter[prop].not,
                    })
                }
            } else {
                qs.withFieldOfValue({
                    name: prop,
                    value: filter[prop],
                })
            }
        }
    }

    /**
     * Build and query the pages from your vault based on some filters
     *
     * @param {object} _
     * @param {*} [_.filter]
     * @param {Query} _.qs
     * @param {import('./_views').UserFile[]} [_.initialSubset]
     * @returns {import('./_views').UserFile[]}
     */
    buildAndRunFileQuery = async ({ filter, qs, initialSubset }) => {
        if (initialSubset) {
            qs.setPages(initialSubset)
        }

        if (typeof filter === "function") {
            await filter(qs)
        } else if (typeof filter === "string") {
            this.#runStringFilterQuery({ filter, qs, keepCurrentPages: !this.utils.isEmpty(initialSubset) })
        } else if (Array.isArray(filter)) {
            this.#runArrayFilterQuery({ filter, qs, keepCurrentPages: !this.utils.isEmpty(initialSubset) })
        } else if (filter instanceof RegExp) {
            this.#runStringFilterQuery({ filter, qs, keepCurrentPages: !this.utils.isEmpty(initialSubset) })
        } else {
            await this.#runObjectFilterQuery({ filter, qs, keepCurrentPages: !this.utils.isEmpty(initialSubset) })
        }

        this.logger?.logPerf("Dataview js query: filtering")

        return qs.query()
    }

    /**
     * @param {string} value 
     */
    #specialStringSort = (value, pages) => {
        switch (value) {
            case "shuffle":
            case "random":
                this.utils.shuffleArray(pages)
                return true

            case "filter":
            case "none":
                return true

            default: break;
        }

        const [keyword, field] = value?.split(' ')

        if (!keyword || !field) {
            console.warn(`The '${value}' sort value isn't recognized by this view`);
            return false
        }

        const sortOrder = SORTING_KEYWORDS[keyword.toLowerCase()] ?? SORTING_KEYWORDS[keyword.toLowerCase() + 'ly']

        const lowerCaseField = field.toLowerCase()

        // try date field
        const actualField = this.dateUserFields.find(dateField => dateField.toLowerCase() === lowerCaseField)
        if (actualField) {
            this.queryDefaultSortFunctionsMap.get("date")(pages, actualField, sortOrder)
            return true
        }

        // try other
        if (lowerCaseField === 'alphabetical') {
            this.queryDefaultSortFunctionsMap.get("path")(pages, sortOrder)
            return true
        }

        console.warn(`The '${value}' sort value isn't recognized by this view`);
        return false
    }

    /**
     * @param {object} _
     * @param {object} _.sort
     * @param {import('./_views').ScoreFile[]} _.pages
     * @param {object} _.options
     */
    #sortPages = async ({ sort, pages, options }) => {
        if (typeof sort === "function") {
            return pages.sort(sort)
        }

        if (typeof sort === "string") {
            return this.#specialStringSort(sort, pages)
        }

        if (sort?.manual) {
            const rawSortingPages = this.dv.page(this.currentFilePath)[sort.manual]
            if (!rawSortingPages) {
                console.warn(`${sort.manual} property could not be found in your file`)
                return pages
            }

            const sortingPages = await this.utils.normalizeLinksPath(rawSortingPages, this.orphanage.directory)

            /* https://stackoverflow.com/a/44063445 + https://gomakethings.com/how-to-get-the-index-of-an-object-in-an-array-with-vanilla-js/ */
            return pages.sort((a, b) => {
                return sortingPages.findIndex((spage) => spage.path === a.file.path)
                    - sortingPages.findIndex((spage) => spage.path === b.file.path)
            });
        }

        if (sort?.recentlyAdded === true) {
            return pages.sort((a, b) => b.file.ctime - a.file.ctime)
        }
        if (sort?.recentlyAdded === false) {
            return pages.sort((a, b) => a.file.ctime - b.file.ctime)
        }

        if (sort?.shuffle) {
            if (typeof sort.shuffle === "boolean") {
                if (options?.standardizeOrder && typeof this.seed === 'number') {
                    this.queryDefaultSortFunctionsMap.get("path")(pages)
                }
                return this.utils.shuffleArray(pages, this.seed);
            } else if (typeof sort.shuffle === "number") {
                this.queryDefaultSortFunctionsMap.get("path")(pages)
                return this.utils.shuffleArray(pages, sort.shuffle);
            }
        }

        // - Alphabetical order by default
        return pages.sort((a, b) => a.file.name.localeCompare(b.file.name))
    }

    sortPages = async ({ sort, pages }) => {
        const result = await this.#sortPages({ sort, pages })
        this.logger?.logPerf("Dataview js query: sorting")
        return result
    }
}

/**
 * Extends the capability of dv utility (completely ignore DataArray implementation)
 * @depends on DataviewJS
 * 
 * It doesn't support OR query out of the box
 * 
 * If you want to do an OR, you must do two separated queries then merge their results with this:
 * const orPages = [...new Set(pages1.concat(pages2))]
 */
export class Query {
    constructor({dv, utils, logger}) {
        this.dv = dv
        this.utils = utils
        this.logger = logger
        this._pages = null
        this._source = ''
    }

    _warningMsg = "You forgot to call from or pages before calling this"
    _delimiter = "=-------------------------------="

    /**
     * There is probably a better way (less space/time complexity) to do it but using a map was the easiest solution for me
     * @param  {...any} vargs 
     */
    static innerJoinPages = (...vargs) => {
        const pagesEncounteredMap = new Map()

        for (const pages of vargs) {
            let values = pages

            if (Array.isArray(pages.values)) {
                // .values in this context is not the function of the Array prototype
                // but the property of the DataArrayImpl proxy target returned by a dataview function
                values = [...pages.values]
            }

            values.forEach(page => {
                const path = page.file.link.path

                if (!pagesEncounteredMap.has(path)) {
                    return pagesEncounteredMap.set(path, {
                        page,
                        count: 1
                    })
                }
                pagesEncounteredMap.set(path, {
                    page,
                    count: pagesEncounteredMap.get(path).count + 1
                })
            })
        }

        const result = []

        for (const [_, value] of pagesEncounteredMap) {
            if (value.count === vargs.length) {
                result.push({...value.page})
            }
        }

        return result
    }

    //distinct outer join
    static joinPages = (...vargs) => {
        let joinedArray = []

        for (const pages of vargs) {
            if (Array.isArray(pages.values)) {
                // .values in this context is not the function of the Array prototype
                // but the property of the DataArrayImpl proxy target returned by a dataview function
                joinedArray = [...joinedArray, ...pages.values]
            }
            else {
                joinedArray = [...joinedArray, ...pages]
            }
        }

        const result = [];
        const set = new Set();
        for (const page of joinedArray) {
            if (!set.has(page.file.link.path)) {
                set.add(page.file.link.path);
                result.push({ ...page });
            }
        }
        return result
    }

    hello = () => {
        console.log("Hello")
        return this
    }

    /**
     * 
     * @param {string} source - a valid dataview source
     * @param {boolean} keepCurrentPages
     */
    from(source, keepCurrentPages = false) {
        const newPages = this.dv.pages(source)
        this._pages = keepCurrentPages ? [...this._pages, ...newPages] : newPages
        this._source = source
        return this
    }

    sort(fn) {
        this._pages = this._pages.sort(fn)
        return this
    }

    /**
     * @param {function} fn - It must return an array of pages
     */
    custom(fn) {
        this._pages = fn(this._pages)
        return this
    }

    /**
     * 
     * @param {string} value - A value of format `[[File]]` is expected
     */
    _convertStringToLink(value) {
        if (!value) return null
        const link = this.dv.parse(value);// transform [[value]] into a link

        return link
    }

    /**
     * @param {import('./view').Link} link
     */
    _convertLinkToTFile(link) {
        if (!link.path) return null
        return this.dv.page(link.path)
    }
    
    /**
     * TODO: same as setLinks but parse the links using dv.parse before
     * @param {string[] | string} links
     */
    // setLinksFromString(links) {
    // }

    /**
     * @param {import('./view').Link | import('./view').Link[]} links
     */
    setLinks(links) {
        if (!Array.isArray(links)) {
            this._pages = [this._convertLinkToTFile(links)]
            return
        }

        this._pages = links.reduce((a, c) => {
            const file = this._convertLinkToTFile(c)
            if (!file) return a

            return [...a, file]
        }, [])
        return this
    }

    setPages(pages) {
        this._pages = [...pages]
        return this
    }

    pages(pages) {
        return this.setPages(pages)
    }

    // Transfrom the proxy target to a regular array for easier manipulation later on
    query() {
        return [...this._pages]
    }

    filter(cb) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        this._pages = this._pages.filter((p) => cb(p))
        return this
    }

    where(cb) {
        return this.filter(cb)
    }

    async asyncFilter(cb) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        /* from: https://stackoverflow.com/a/63932267 */
        const filterPromise = (values, fn) =>
            Promise.all(values.map(fn)).then((booleans) =>
                values.filter((_, i) => booleans[i])
            )

        this._pages = await filterPromise(
            this._pages,
            async (p) => await cb(p)
        )
    }

    /**
     * @param {string[] | string} tags
     */
    withTags(tags) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }
        if (!tags) return null

        if (Array.isArray(tags)) {
            tags.forEach((t) => this._withTag(t))
        } else {
            this._withTag(tags)
        }

        return this
    }

    /**
     * @param {string} tag
     */
    _withTag(tag) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        this._pages = this._pages.filter((p) => {
            // to support naïve orphans
            if (!p.file.etags) {
                return p.tags.includes(tag[0] === '#' ? tag.slice(1) : tag)
            }
            return p.file.etags?.includes(tag)
        })
    }

    withExistingField(name) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        this._pages = this._pages.filter((p) => {
            return !!p[name]
        })
        return this
    }

    //#region Date fields

    /**
     * Private function used inside with/outDateFieldOfValue
     * @warn Only works for YYYY-MM-DD right now (don't support THH:mm)
     * @private
     * @param {object} _
     * @param {string} _.name
     * @param {string} _.value
     * @param {'eq'|'lt'|'gt'} _.compare
     * @param {boolean} _.with_ if false, it means the function does a without
     */
    _dateFieldOfValue({ name, value, compare = "eq", with_ = true }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        const dateValue = this.dv.date(value)
        if (dateValue.toString() === "Invalid Date") {
            console.error(`${value} isn't a valid date fromat`)
            return this
        }

        this.logger?.log(
            `Before filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        this._pages = this._pages.filter((p) => {
            if (!p[name]) return !with_

            let pValue = null
            if (typeof p[name] === "number") {
                // that means its just a year
                pValue = this.dv.luxon.DateTime.fromObject({
                    year: p[name],
                })
            } else {
                pValue = this.dv.date(p[name])
            }

            if (!pValue || pValue.toString() === "Invalid Date") {
                console.warn(`${p[name]} isn't a valid date fromat`)
                return !with_
            }

            switch (compare) {
                case "eq":
                    return (pValue.ts === dateValue.ts) === with_
                case "lt":
                    return pValue < dateValue === with_
                case "gt":
                    return pValue > dateValue === with_
                default:
                    return !with_
            }
        })

        this.logger?.log(
            `After filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        return this
    }

    /**
     * Only works with scalar type (string, boolean, number)
     * To work with file use withLinkFieldOfPath function
     * @param {object} _
     * @param {string} _.name
     * @param {string} _.value - Must be in a valid date fromat
     * @param {string} _.compare
     * @param {boolean} _.acceptArray
     * - If true, then it will return false if {{value}} is find inside the array {{name}}.
     * - If false, it will return true as soon as an array is encountered
     */
    withDateFieldOfTime({ name, value, compare = "eq" }) {
        return this._dateFieldOfValue({
            name,
            value,
            compare,
            with_: true,
        })
    }

    //#endregion

    //#region Scalar fields and File fields

    /**
     * Only works for fields of scalar type (string, boolean, number) and array of scalar type
     * 
     * Private function used inside with/outFieldOfValue
     * @param {object} _
     * @param {string} _.name
     * @param {string|boolean|number} _.value
     * @param {boolean} _.with_ if false, it means the function does a without
     * @param {boolean} _.fileField if true, it means the property belongs to the `file` field
     * @param {boolean} _.acceptArray
     * - If true, then it will return {{with_}} if {{value}} is find inside the array {{name}}.
     * - If false, it will return !{{with_}} as soon as an array is encountered
     */
    _fieldOfValue({
        name,
        value,
        with_ = true,
        fileField = false,
        acceptArray = true,
    }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return this
        }

        if (typeof value === "object") {
            console.error(`This function only accept scalar value`)
            return this
        }

        this.logger?.log(
            `Before filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        this._pages = this._pages.filter((p) => {
            const field = fileField ? p.file[name] : p[name]

            if (!field) return !with_

            if (Array.isArray(field)) {
                if (!acceptArray) return !with_

                return field.some((el) => {
                    return el === value
                })
            }

            // Like a number or anything
            if (typeof field !== "string") {
                return (field === value) === with_
            }

            // Alors en fait j'ai besoin de faire un XNOR et c'est comme ça que je m'y prend
            return (
                (field.toLocaleLowerCase() === value.toLocaleLowerCase()) === with_
            )
        })

        this.logger?.log(
            `After filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        return this
    }

    /**
     * Only works with scalar type (string, boolean, number)
     * To work with file use withLinkFieldOfPath function
     * @param {object} _
     * @param {string} _.name - For a given file, if the field of this name is not scalar, the file will be ignored.
     * @param {string|boolean|number} _.value
     * @param {boolean} _.acceptArray
     * - If true, then it will return true if {{value}} is find inside the array {{name}}.
     * - If false, it will return false as soon as an array is encountered
     */
    withFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            acceptArray,
            with_: true,
        })
    }

    withFileFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            fileField: true,
            acceptArray,
            with_: true,
        })
    }

    /**
     * Only works with scalar type (string, boolean, number)
     * To work with file use withLinkFieldOfPath function
     * @param {object} _
     * @param {string} _.name
     * @param {string} _.value
     * @param {boolean} _.acceptArray
     * - If true, then it will return false if {{value}} is find inside the array {{name}}.
     * - If false, it will return true as soon as an array is encountered
     */
    withoutFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            acceptArray,
            with_: false,
        })
    }

    withoutFileFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            fileField: true,
            acceptArray,
            with_: false,
        })
    }

    /**
     * Only works for fields of scalar type (string, boolean, number) and array of scalar type
     * 
     * Private function used inside with/outFieldOfValue
     * @param {object} _
     * @param {string} _.name
     * @param {string|RegExp} _.value
     * @param {boolean} _.with_ if false, it means the function does a without
     * @param {boolean} _.fileField if true, it means the property belongs to the `file` field
     * @param {boolean} _.acceptArray
     * - If true, then it will return {{with_}} if {{value}} is find inside the array {{name}}.
     * - If false, it will return !{{with_}} as soon as an array is encountered
     */
    // #fieldOfRegexValue({
    //     name,
    //     value,
    //     with_ = true,
    //     fileField = false,
    //     acceptArray = true,
    // }) {
    //     if (!this._pages) {
    //         console.error(this._warningMsg)
    //         return null
    //     }

    //     if (typeof path !== "string" && !path instanceof RegExp) {
    //         console.error(`${path} must be a regex`)
    //         return null
    //     }

    //     const regex = path instanceof RegExp ? path : new RegExp(path)
    //     if (!regex) {
    //         console.error(`${path} must be a valid regex`)
    //         return null
    //     }
    //     this.logger?.log(
    //         `Before filtering on ${name} with value '${with_ ? "" : "-"
    //         }${value}', we have a total number of ${this._pages.length
    //         } pages`
    //     )

    //     this._pages = this._pages.filter((p) => {
    //         if (!p[field]) return false

    //         if (Array.isArray(p[field])) {
    //             return p[field].some((l) => {
    //                 if (typeof l !== "object") {
    //                     return acceptStringField ? !!l?.match(regex) : false
    //                 }

    //                 return !!l?.path?.match(regex)
    //             })
    //         }

    //         if (typeof p[field] !== "object") {
    //             return acceptStringField ? !!p[field].match(regex) : false
    //         }

    //         const match = p[field].path.match(regex)
    //         return !!match
    //     })

    //     this.logger?.log(
    //         `After filtering on ${name} with value '${with_ ? "" : "-"
    //         }${value}', we have a total number of ${this._pages.length
    //         } pages`
    //     )
    //     return this
    // }

    //#endregion

    //#region Link fields

    withLinkField({field, value}) {
        const link = this._convertStringToLink(value)
        if (!this.utils.isObject(link)) {
            console.warn(`File named ${value} couldn't be parsed by dv.page. Make sure to wrap the value with [[]]`)
            return this
        }

        const page = this.dv.page(link.path)
        if (!page) {
            return this.withLinkFieldOfPath({ field, path: link.path, acceptStringField: true })
        }

        return this.withLinkFieldOfPath({ field, path: page.file.path, acceptStringField: false })
    }

    /**
     *
     * @param {object} _
     * @param {string} _.field - Name of the field to query on
     * @param {string} _.path
     * @param {string} _.acceptStringField - If true, it fallbacks to comparing p[field] and path if p[field] isn't a link
     */
    withLinkFieldOfPath({ field, path, acceptStringField = false }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        if (typeof path !== "string") {
            console.error(
                `${path} must a be a single string. Call withLinkFieldOfAnyPath instead`
            )
            return null
        }

        this._pages = this._pages.filter((p) => {
            if (!p[field]) return false

            if (Array.isArray(p[field])) {
                return p[field].some((l) => {
                    if (typeof l !== "object") {
                        return acceptStringField ? l === path : false
                    }

                    return l?.path === path
                })
            }

            if (typeof p[field] !== "object") {
                return acceptStringField ? p[field] === path : false
            }

            return p[field].path === path
        })
        return this
    }

    /**
     *
     * @param {object} _
     * @param {string} _.field - Name of the field to query on
     * @param {RegExp | string} _.path - A regex / representation of a regex
     * @param {string} _.acceptStringField - If true, it fallbacks to comparing p[field] and path if p[field] isn't a link
     */
    withLinkFieldOfPathRegex({ field, path, acceptStringField = false }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        if (typeof path !== "string" && !path instanceof RegExp) {
            console.error(`${path} must be a regex`)
            return null
        }

        const regex = path instanceof RegExp ? path : new RegExp(path)
        if (!regex) {
            console.error(`${path} must be a valid regex`)
            return null
        }

        this._pages = this._pages.filter((p) => {
            if (!p[field]) return false

            if (Array.isArray(p[field])) {
                return p[field].some((l) => {
                    if (typeof l !== "object") {
                        return acceptStringField ? !!l?.match(regex) : false
                    }

                    return !!l?.path?.match(regex)
                })
            }

            if (typeof p[field] !== "object") {
                return acceptStringField ? !!p[field].match(regex) : false
            }

            const match = p[field].path.match(regex)
            return !!match
        })
        return this
    }

    /**
     *
     * @param {object} _
     * @param {string} _.field - Name of the field to query on
     * @param {string[]} _.paths
     *
     * @param {boolean} _.and
     */
    withLinkFieldOfAnyPath({ field, paths }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        if (!Array.isArray(paths)) {
            console.error(
                `${paths} isn't an array. Call withLinkFieldOfPath instead`
            )
            return null
        }

        this._pages = this._pages.filter((p) => {
            if (!p[field]) return false

            if (Array.isArray(p[field])) {
                for (const path of paths) {
                    if (
                        p[field].some((l) => {
                            if (typeof l !== "object") return false

                            return l.path === path
                        })
                    ) {
                        return true
                    }
                }
                return false
            }

            return paths.some((path) => path === p.type.path)
        })
        return this
    }

    //#endregion

    //#region Bookmarks
    _getBookmarkGroupFilesFromItems(items) {
        return items?.reduce((acc, cur) => {
            if (cur.type === "file") return [...acc, cur]
            return acc
        }, [])
    }

    /**
     * 
     * @param {*} items 
     * @param {string[]} groupPath 
     */
    _getBookmarksGroupItemsFromPath(items, groupPath) {
        const groupTitle = groupPath.shift()

        if (!groupTitle) return items

        for (const item of items) {
            if (item.type === "group" && item.title === groupTitle) {
                return this._getBookmarksGroupItemsFromPath(item.items, groupPath)
            }
        }

        throw new Error(`The bookmark group named ${groupTitle} couldn't be find`)
    }

    /**
     * @param {string[]} _.groupPath
     */
    _getBookmarkGroupFilesFromPath(items, groupPath = []) {
        if (!groupPath || groupPath.length === 0) {
            return this._getBookmarkGroupFilesFromItems(items)
        }

        try {
            const nestedItems = this._getBookmarksGroupItemsFromPath(items, groupPath)
            return this._getBookmarkGroupFilesFromItems(nestedItems)
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * When calling this function, this._pages must be a standard array
     */
    _sortPagesByBookmarks(bookmarksFiles) {
        const pages = [...this._pages]

        /* https://stackoverflow.com/a/44063445 + https://gomakethings.com/how-to-get-the-index-of-an-object-in-an-array-with-vanilla-js/ */
        pages.sort((a, b) => {
            return bookmarksFiles.findIndex((spage) => spage.path === a.file.path)
            - bookmarksFiles.findIndex((spage) => spage.path === b.file.path)
        });

        this._pages = this.dv.array(pages)
        this.logger?.log(this._pages)
    }

    /**
     * Filter pages to correspond to links found in the bookmark group passed as parameter (global "Bookmarks" by default)
     * @param {object} _
     * @param {string[]} _.groupPath - It isn't an array of groups but the hierarchy that let me access to a nested group.
     * Since a bookmark group can have a '/' inside (any character actually), I can't rely on a classic group.split('/')
     * @param {boolean} _.in_ - inside or outside
     */
    _bookmarkGroup({ groupPath = [], in_ = true } = {}) {
        const bookmarksItems = this.dv.app.internalPlugins.plugins.bookmarks.instance.items

        const filteredBookmarksFiles = this._getBookmarkGroupFilesFromPath(bookmarksItems, groupPath)

        const convertBookmarksFilesArrayToSetOfPaths = (items) => {
            const set = new Set()
            items.forEach(item => {
                set.add(item.path)
            })
            return set
        }
        const setOfPaths = convertBookmarksFilesArrayToSetOfPaths(filteredBookmarksFiles)

        this._pages = this._pages.filter((p) => setOfPaths.has(p.file.path) === in_)

        return filteredBookmarksFiles
    }

    inBookmarkGroup(value) {
        const bookmarksFiles = this._bookmarkGroup({ groupPath: value?.split('/') })
        this._sortPagesByBookmarks(bookmarksFiles)
        return this;
    }

    notInBookmarkGroup(value) {
        return this._bookmarkGroup({ groupPath: value?.split('/'), in_: false })
    }
    //#endregion


    /**
     * For debug purposes only
     */
    printField(name) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null;
        }

        this._pages.forEach(p => {
            if (!p[name]) return

            if (Array.isArray(p[name])) {
                console.log("Array")
                console.log(p[name])
                return
            }

            if (typeof (p[name]) === 'object') {
                console.log("Object")
                console.log({ ...p[name] })
                return
            }

            console.log("Scalar")
            console.log({ name, "typeof": typeof (p[name]), value: p[name] })
            return
        })

        console.log(this._delimiter)

        return this;
    }
}

/**
 * Class for rendering things in Obsidian.
 * @author Krakor <krakor.faivre@gmail.com>
 */
export class Renderer {
    constructor({utils, icons}) {
        this.utils = utils
        this.icons = icons
    }

    //#region Image

    imgBaseAttributes = `referrerpolicy="no-referrer"`

    /**
     * @param {string} display
     * @returns The style attribute used by some gallery thumbnail
     */
    #resolveThumbnailStyle(display) {
        const thumbnailY = parseFloat(display)
        if (isNaN(thumbnailY)) return null

        return `style="object-position: 50% ${
            this.utils.clamp(thumbnailY, 0, 1) * 100
        }%"`
    }

    #resolveUrlThumbnailStyle(str) {
        const startOfDisplayId = str.indexOf("[")
        const endOfDisplayId = str.indexOf("]")

        // Either there is no [], or there is but its empty
        if (
            startOfDisplayId === -1 ||
            endOfDisplayId - startOfDisplayId === 1
        )
            return null

        let display = str.substring(startOfDisplayId + 1, endOfDisplayId)
        const firstPipeId = str.indexOf("|", startOfDisplayId)
        if (firstPipeId !== -1) {
            // Instead of having display be "0.2|400", it's going to be "0.2" only
            display = str.substring(startOfDisplayId + 1, firstPipeId)
        }

        return this.#resolveThumbnailStyle(display)
    }

    #resolveVaultImageStyle(thumb) {
        let display = thumb.display

        if (display === undefined) return null

        const firstPipeId = display.indexOf("|")
        if (firstPipeId !== -1) {
            // Instead of having display be "0.2|400", it's going to be "0.2" only
            display = display.substring(0, firstPipeId)
        }

        return this.#resolveThumbnailStyle(display)
    }

    /**
     * @param {string} url
     * @param {object} modules
     * @returns
     */
    #computeImageTagFrom3rdPartyUrl(url, { YouTubeManager } = {}) {
        const ytVideo = YouTubeManager?.extractInfoFromYouTubeUrl(url)
        if (ytVideo) {
            return `<img src="${YouTubeManager.buildYouTubeImgUrlFromId(ytVideo.id)}" ${this.imgBaseAttributes}>`
        }

        if (url.includes("dailymotion")) {
            const startOfId = url.lastIndexOf('/') + 1
            const id = url.substring(startOfId)
            return `<img src="https://www.dailymotion.com/thumbnail/video/${id}" ${this.imgBaseAttributes}>`
        }

        return null
    }

    /**
     * Compute the HTML tag representation of an image
     * It accepts either internal link, absolute path or an url
     * @param {import('./_views').Link | string | Array} img - In case of an array, only the first element will be rendered
     */
    renderImage(img) {
        if (Array.isArray(img)) return this.renderImage(img[0])

        if (typeof img === "string" && this.utils.uriRegex.test(img)) {
            return this.renderImageFromUrl(img)
        }

        return this.renderImageFromVault(img)
    }

    /**
     * @param {string} url
     * @param {object} settings
     * @param {object} modules
     */
    renderImageFromUrl = (url, {tryToInfer = false} = {}, { YouTubeManager } = {}) => {
        if (!url) return ""

        if (tryToInfer) {
            const resolvedUrl = this.#computeImageTagFrom3rdPartyUrl(url, { YouTubeManager })
            if (resolvedUrl) return resolvedUrl
        }

        let style = null;
        if (url[0] === '!') {
            style = this.#resolveUrlThumbnailStyle(url)

            const startOfUrl = url.lastIndexOf('(') + 1
            url = url.substring(startOfUrl, url.length - 1)
        }

        return `<img src="${url}" ${this.imgBaseAttributes} ${style ?? ""}>`
    }

    /**
     *
     * @param {import('./_views').Link | string | Array} img - In case of an array, only the first element will be rendered
     */
    renderImageFromVault(thumb) {
        if (!thumb) return ""

        if (Array.isArray(thumb)) {
            return this.renderImageFromVault(thumb[0])
        }

        if (typeof thumb === "string") {
            return this.#renderImageFromVaultPath(thumb)
        } else {
            return this.#renderImageFromVaultLink(thumb)
        }
    }

    /**
     * @param {import('./_views').Link} link
     */
    #renderImageFromVaultLink(link) {
        if (!link) return ""

        const style = this.#resolveVaultImageStyle(link)

        return `<img src="${window.app.vault.adapter.getResourcePath(
            link.path
        )}" ${this.imgBaseAttributes} ${style ?? ""}>`
    }

    #renderImageFromVaultPath(path) {
        if (!path) return ""

        return `<img src="${window.app.vault.adapter.getResourcePath(
            path
        )}" ${this.imgBaseAttributes}>`
    }

    //#endregion

    //#region Links

    /**
     * @todo why do I need this again?
     * @param {*} link
     * @param {*} fallback
     * @returns
     */
    renderLink(link, fallback = "link") {
        if (!link) return fallback
        if (typeof link === "string") return link

        const file = window.app.vault.getAbstractFileByPath(link.path);
        if (!file) return fallback;

        return `<a
data-href="${file.basename}"
href="${file.basename}"
class="internal-link"
target="_blank"
rel="noopener"
>${file.basename}</a>`;
    }



    /**
     * Returns a string of the form: `data-service="${service}"`
     * @param {string} url
     */
    #computeAnchorServicePartFromUrl = (url) => {
        if (url.includes("youtu")) return `data-service="youtube"`
        if (url.includes("soundcloud")) return `data-service="soundcloud"`
        if (url.includes("dailymotion")) return `data-service="dailymotion"`
        if (url.includes("dropbox")) return `data-service="dropbox"`
        if (url.includes("spotify")) return `data-service="spotify"`
        if (url.includes("deezer")) return `data-service="deezer"`

        return ""
    }

    /**
     *
     * @param {object} _
     * @param {string} _.url
     */
    renderExternalUrlAnchor = ({ url, children = "" }) => {
        const attributes = `\
href="${url}" \
draggable="false" \
class="external-link" \
rel="noopener" \
target="_blank" \
${this.#computeAnchorServicePartFromUrl(url)}`
        return `<a ${attributes}>${children}</a>`;
    }

    /**
     * @param {object} file
     * @param {string} file.path
     * @param {string} file.name
     */
    renderInternalFileAnchor({
        path,
        name,
        ariaLabel = true,
        mdmIcon = true,
    } = {}) {
        // look at https://github.com/mdelobelle/metadatamenu/issues/247 for explanation on mdmIcon
        return `<a
            class="internal-link ${mdmIcon ? "" : "metadata-menu-button-hidden"}"
            ${ariaLabel ? `aria-label="${path}"` : ""}
            data-href="${path}"
            href="${path}"
        >
            ${name}
        </a>`
    }

    //#endregion

    /** Taken from Dataview */
    renderMinimalDate(time, defaultDateTimeFormat = "HH:mm - dd MMMM yyyy") {
        if (!this.utils.isObject(time)) return time

        const locale = window.navigator?.language ?? "en-US"

        return time.toLocal().toFormat(defaultDateTimeFormat, { locale });
    }

    //#region Audio

    #renderMP3Audio = ({src, preload, dataVolume = ""}) => (`
        <div class="audio-player">
            <button class="player-button">
                ${this.icons.playIcon}
            </button>
            <audio preload="${preload}" ${dataVolume}>
                <source src="${src}"/>
            </audio>
        </div>
    `)

    /**
     *
     * @param {object} _
     * @param {import('./_views').Link} _.audioFile
     * @param {number?} _.volumeOffset
     * @param {'auto' | 'metadata' | 'none'} _.preload
     */
    renderMP3Audio = async ({ audioFile, volumeOffset, preload = "metadata" }) => {
        if (!audioFile) return ""

        const mp3Exists = await this.utils.linkExists(audioFile)

        const dataVolume = volumeOffset ? `data-volume="${volumeOffset}"` : ""

        // Expects it to be an http link pointing to a valid resource
        if (!mp3Exists) return this.#renderMP3Audio({src: audioFile, preload, dataVolume})

        return this.#renderMP3Audio({
            src: window.app.vault.adapter.getResourcePath(audioFile.path),
            preload,
            dataVolume,
        })
    }

    #renderInternalEmbedAudio = ({ src, preload, dataVolume = "" }) => (`
        <div
            class="internal-embed media-embed audio-embed is-loaded"
            tabindex="-1"
            contenteditable="false"
        >
            <audio
                controls
                controlslist="nodownload"
                src="${src}"
                preload="${preload}"
                ${dataVolume}
            >
            </audio>
        </div>
    `)

    /**
     * Aim to replicate the way it is done by vanilla Obsidian
     * @param {object} _
     * @param {import('./_views').Link} _.audioFile
     * @param {number?} _.volumeOffset
     * @param {'auto' | 'metadata' | 'none'} _.preload
     */
    renderInternalEmbedAudio = async ({ audioFile, volumeOffset, preload = "metadata" }) => {
        if (!audioFile) return ""

        const mp3Exists = await this.utils.linkExists(audioFile)

        const dataVolume = volumeOffset ? `data-volume="${volumeOffset}"` : ""

        // Expects it to be an http link pointing to a valid resource
        if (!mp3Exists) return this.#renderInternalEmbedAudio({ src: audioFile, preload, dataVolume })

        return this.#renderInternalEmbedAudio({
            src: window.app.vault.adapter.getResourcePath(audioFile.path),
            preload,
            dataVolume,
        })
    }

    //#endregion

    /**
     *
     * @param {import('./_views').Link} _.filelink
     */
    renderVideo = async ({ filelink, preload = "metadata" }) => {
        if (!filelink) return ""

        const videoExists = await this.utils.linkExists(filelink)
        if (!videoExists) return ""

        // return `
        // <div class="internal-embed media-embed video-embed is-loaded">
        //     <video controls src="${window.app.vault.adapter.getResourcePath(filelink.path)}">
        //     </video>
        // </div>`;

        return `<video controls src="${window.app.vault.adapter.getResourcePath(filelink.path)}">
        </video>`;
    }
}

/**
 * Manages Shadow DOM in my views
 * 
 * @warning file-links inside the SDOM can't be interacted with...
 * That makes this whole thing a bit useless unfortunately :(
 */
export class Shikamaru {
    constructor(container) {
        // Create a Shadow DOM for the container
        this.shadowRootNode = container.attachShadow({ mode: 'open' });

        // Define styles and content within the Shadow DOM
        const paragraph = this.shadowRootNode.createEl("p", {
            attr: {
                part: "paragraph"
            }
        })
        paragraph.textContent= "This is a <p> with scoped styles"

        const style = this.shadowRootNode.createEl("style")
        style.textContent = `
p {
color: blue;
}
`
    }

    /**
     * Attach a shadowDOM to the container and move all of its children inside
     * @param {HTMLElement} container
     */
    static KagemaneNoJutsu(container) {
        const shadowRootNode = container.attachShadow({mode: 'open'})

        while(container.firstChild) {
            shadowRootNode.appendChild(container.firstChild)
        }

        return shadowRootNode
    }

    /**
     * @param {ViewManager} ViewManager
     */
    static ViewKagemaneNoJutsu(viewManager) {
        const shadownRootNode = this.KagemaneNoJutsu(viewManager.host)
        
        // Override the "root" getter in this specific instance of viewManager
        Object.defineProperty(viewManager, "root", {
            get: function () {
                return viewManager.host.shadowRoot;
            },
        });

        return shadownRootNode
    }
}

export class Stylist {
    constructor({app, container}) {
        this.app = app
        this.container = container
        this.style = container.createEl("style")
    }

    get rules() {
        return this.style.sheet.cssRules
    }

    setTableStyle() {
        this.style.textContent += `
table {
background-color: red;
}
`
    }

    setPStyle() {
        this.style.textContent += `
p,::part(paragraph)
{
background-color: red;
font-weight: 800;
}

/*
div
{
background-color: black;
}
*/
`
    }

    async setStyleContentFromFile(filepath, currentFilePath) {
        const cssFile = this.app.metadataCache.getFirstLinkpathDest(filepath, currentFilePath ?? '')
        if (!cssFile) return false

        const cssContents = await this.app.vault.read(cssFile)
        this.style.textContent = cssContents
        return true
    }

    static resolveArticleStyle(options) {
        if (!options) return ""

        const { align } = options

        let style = ""
        style += align ? `align-self: ${align};` : ""

        return style !== "" ? `style="${style}"` : ""
    }

    static setTableStyle(table) {
        table.parentNode.style.cssText = `
            overflow-x: scroll;
        `

        table.style.cssText = `
            table-layout: fixed;
            width: 100%;
        `
    }
}

/**
 * File that contains miscelaneous utility functions
 * They are used by most of the classes here and they usally need to be passed in their constructor via a `utils` property
 */

export const httpRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/

// @link https://urlregex.com/
export const uriRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

//#region HTML

/**
 *
 * @param {HTMLElement} element
 * @param {string} className
 */
export const getParentWithClass = (element, className) => {
    // Traverse up the DOM tree until the root (body or html) is reached
    while (element && element !== document.body && element !== document.documentElement) {
        element = element.parentElement;
        if (element?.classList.contains(className)) {
            return element;
        }
    }
    return null;
}

export const scrollToElement = (target) => {
    let element;

    // Check if the provided parameter is a string (selector)
    if (typeof target === 'string') {
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
}

//#endregion

//#region Javascript

// Clamp number between two values with the following line:
export const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

export const delay = async (time) =>
    new Promise((resolve) => setTimeout(resolve, time))

export const isObject = (o) => {
    return (
        o !== null &&
        typeof o === "object" &&
        Array.isArray(o) === false
    )
}

/**
 * Seeded RNG using Linear Congruential Generator
 * @param {number} seed
 */
const seededRNG = (seed) => {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

/**
 * It alters the array
 * @from https://stackoverflow.com/a/6274381
 * @param {Array} a
 * @param {number} seed
 */
export const shuffleArray = (a, seed) => {
    const rng = (typeof seed === 'number') ? seededRNG(seed) : Math.random;
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(rng() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

/**
 * @param {string} timecode - In the form 00:00:00 or 00:00
 * @returns {number} The timecode converted to seconds, can be NaN if it's not a valid timecode
*/
export const convertTimecodeToDuration = (timecode) => {
    const timeArray = timecode?.split(':');
    if (!timeArray || timeArray.length < 2 || timeArray.length > 3) { // It only supports 00:00 or 00:00:00
        return NaN;
    }

    let i = 0
    let total = 0
    if (timeArray.length === 3) {
        const hours = parseInt(timeArray[i++], 10)
        if (isNaN(hours)) return NaN
        total += hours * 3600
    }

    const minutes = parseInt(timeArray[i++], 10)
    if (isNaN(minutes)) return NaN
    total += minutes * 60

    const seconds = parseInt(timeArray[i], 10)
    if (isNaN(seconds)) return NaN

    return total + seconds
}

/**
 * @param {number} duration
 * @returns {number} The duration converted to a timecode of the format `00:00:00` or `00:00`
*/
export const convertDurationToTimecode = (duration) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    const hoursString = hours.toString().padStart(1, '0');
    const minutesString = minutes.toString().padStart(1, '0');
    const secondsString = seconds.toString().padStart(2, '0');

    return hours > 0 ? `${hoursString}:${minutesString}:${secondsString}` : `${minutesString}:${secondsString}`;
}

/**
 * @param {RegExp} regex
 * @returns {RegExp} a new regex based on the given one but with the global flag enabled
 */
export const globalizeRegex = (regex) => {
    let regexStr = regex.source // Get the string representation of the regex

    if (regexStr.startsWith('^')) {
        regexStr = regexStr.slice(1)
    }

    if (regexStr.endsWith('$')) {
        regexStr = regexStr.slice(0, -1)
    }
    return new RegExp(regexStr, 'g')
}

/* from: https://stackoverflow.com/a/75988895 */
export const debounce = (callback, wait = 300) => {
    let timeoutId = null;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { callback(...args); }, wait);
    };
}

/**
 * Implementation given as is by ChatGPT
 * It doesn't handle functions, circular reference or non enumerable properties
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj; // Return primitives and null as is
    }

    if (Array.isArray(obj)) {
        const newArray = [];
        for (let i = 0; i < obj.length; i++) {
            newArray[i] = deepClone(obj[i]);
        }
        return newArray; // Clone arrays
    }

    // At this point we're dealing with an object
    // We can duplicate it making sure we keep its prototype intact
    const newObj = Object.create(Object.getPrototypeOf(obj));
    for (const key in obj) {
        // We make sure to ignore properties from the prototype chain
        if (obj.hasOwnProperty(key)) {
            newObj[key] = deepClone(obj[key]);
        }
    }
    return newObj; // Clone objects
}

/**
 * An empty check written by ChatGPT
 */
export function isEmpty(value) {
    if (value == null) {
        // Check for null or undefined
        return true;
    } else if (Array.isArray(value)) {
        // Check for empty array
        return value.length === 0;
    } else if (typeof value === 'object') {
        // Check for empty object
        if (Object.prototype.toString.call(value) === '[object Object]') {
            return Object.keys(value).length === 0;
        }
        // Check for other types of objects
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                return false;
            }
        }
        return true; // If no enumerable properties found
    } else if (typeof value === 'string') {
        // Check for empty string
        return value.trim() === '';
    } else if (typeof value === 'number' && isNaN(value)) {
        // Check for NaN
        return true;
    }

    return false; // For other types, consider them non-empty
}
/**
 * A naïve deep equality check written by ChatGPT
 * Only handles scalar values, arrays and objects
 */
export const isEqual = (a, b) => {
    // Handle primitives and null
    if (a === b) {
        return true;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!isEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        // The two objects do not share the same prototype, they are not equal
        if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
            return false
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) {
            return false;
        }

        for (const key of keysA) {
            if (!keysB.includes(key) || !isEqual(a[key], b[key])) {
                return false;
            }
        }

        return true;
    }

    // If types are different, they are not equal
    return false;
}

//	#endregion

//#region Obsidian

export const getOS = (app) => {
    const { isMobile } = app

    // I would like to use `navigator.userAgentData.platform` since `navigator.platform` is deprecated but it doesn't work on mobile
    // TODO: see if I can use appVersion instead -> https://liamca.in/Obsidian/API+FAQ/OS/check+the+current+OS
    const { platform } = navigator

    if (platform.indexOf("Win") !== -1) return "Windows"
    // if (platform.indexOf("Mac") !== -1) return "MacOS";
    if (platform.indexOf("Linux") !== -1 && !isMobile) return "Linux"
    if (platform.indexOf("Linux") !== -1 && isMobile) return "Android"
    if (platform.indexOf("Mac") !== -1 && isMobile) return "iPadOS"

    return "Unknown OS"
}

/**
 * Check if a given value is a valid property value.
 * The function accept everything except:
 * - Empty object
 * - Empty array
 * - Array with only empty strings / null / undefined
 * - Empty string
 * - Null
 * - Undefined
 *
 * @param {any} value - The value to check
 * @returns {boolean} - True if the value is valid, false otherwise
 */
export const isValidPropertyValue = (value) => {
    if (
        value === undefined
        || value === null
        || (typeof value === "object" && Object.entries(value).length === 0)
        || (Array.isArray(value) && value.every(cell => {
            return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "")
        }))
        || (typeof value === "string" && value.trim() === "")
    ) {
        return false
    }

    return true
}

/**
 * @param {import('./view').Link} link
 */
export const linkExists = async (link) => {
    if (!isObject(link)) return false
    return await window.app.vault.adapter.exists(link.path)
}

/**
 * This function will transform a field containing an array and flatten it while calling JSON.parse() on any string it encounteers
 * @param {*} field
 * @returns {Array}
 */
export const normalizeArrayOfObjectField = (field) => {
    if (!field) return []

    // Single object in yaml frontmatter
    if (isObject(field)) return [deepClone(field)]

    try {
        // Single string as inline field
        if (!Array.isArray(field)) return [JSON.parse(field)]

        return field.reduce((a, c) => {
            if (Array.isArray(c)) {
                return [...a, ...normalizeArrayOfObjectField(c)]
            }

            if (isObject(c)) return [...a, deepClone(c)]

            return [...a, JSON.parse(c)]
        }, [])
    } catch (e) {
        console.error(e)
        return []
    }
}

/**
 * Prepend the path of orphans (uncreated) files with a base directory
 * @param {Array<import('./_views').Link|string>} links
 * @param {string} baseDir
 * @returns {Array<import('./_views').Link|string>}
 */
export const normalizeLinksPath = async (links, baseDir) => {
    return await Promise.all(
        links.map(async (l) => {
            // l is a string
            if (!l.path) {
                return { path: `${baseDir}/${l}.md` }
            }

            // l is an empty link
            if (!(await linkExists(l))) {
                return { ...l, path: `${baseDir}/${l.path}.md` }
            }

            return l
        })
    )
}

/**
 * @param {HTMLElement} tag
 */
export const removeTagChildDVSpan = (tag) => {
    const span = tag.querySelector("span")
    if (!span) return

    span.outerHTML = span.innerHTML
}

/**
 * Let me handle YYYY format too (luxon don't recognized this format as a single year -_-)
 * @param {object|number} value
 */
export const valueToDateTime = ({ value, dv }) => {
    if (typeof value === "number") {
        // that means its just a year
        return dv.luxon.DateTime.fromObject({ year: value })
    }
    return dv.date(value)
}

//#endregion


/**
 * This class is responsible of the view it is instancied in.
 * There must be only one ViewManager per view.
 * 
 * It does the following:
 *  - Lazy load the view until its visible in the viewport
 *  - Free most of the view memory usage at page/popover closing (it doesn't seem to have a significant impact if I judge by the JS VM instance in Memory panel)
 *  - Prevent the editing mechanism that occur in Live Preview when clicking inside the view if it sits within a callout
 */
export class ViewManager {
    /**
     * 
     * @param {object} _ 
     * @param {HTMLDivElement} _.container - The container to which the view will be appended
     * @param {string} _.name - The name of the view (must match with css class associated with it)
     */
    constructor({ disable = "", app, component, container, utils, logger, name } = {}) {
        this.app = app
        this.component = component
        this.container = container
        this.utils = utils
        this.logger = logger
        this.disableSet = new Set(disable.split(" ").map((v) => v.toLowerCase()))
        this.name = name

        this.tid = (new Date()).getTime();
        /** @type {HTMLDivElement} */
        this.host = container.createEl("div", {
            cls: this.#computeClassName(),
            attr: {
                id: this.#computeId(),
                style: 'position:relative;-webkit-user-select:none!important'
            }
        })
        this.managedToHideEditButton = this.#hideEditButton()

        this.observer = new IntersectionObserver(this.handleViewIntersection.bind(this))

        this.leaf = null

        this.#embedObserverWorkaround()
        this.#resolveCurrentLeaf()

        /**
         * Here are the three ways this view can be unloaded
         */

        // 1. When the component containing this view is unloaded
        this.component?.register(() => {
            this.logger?.log(this.tid, `This view is unloaded the normal way (1)`)
            this.#cleanView()
        })

        // 2. When another script explictly send this `view-unload` event to the container tag
        this.container.addEventListener("view-unload", this.#cleanView.bind(this))

        // 3. When the leaf which contains this view is removed from the DOM
        if (this.leaf) {
            this.#monitorHealthCheck()
        }
    }

    /**
     * Susceptible to be overriden by Shikamaru's ViewKagemaneNoJutsu
     */
    get root() {
        return this.host
    }

    #cleanView() {
        if (!this.leaf) return
        this.host = null
        this.leaf = null
        this.observer?.disconnect()
        this.observer = null
        this.container?.removeEventListener("view-unload", this.#cleanView.bind(this))
        this.container?.empty()
        this.container = null

        clearInterval(this.healthcheckInterval)

        this.logger?.log(this.tid, "🪦")
    }

    /**
     * Even though the component unload registering should suffice most of the time,
     * It happens (in Canvas for example) that some codeblock are never considered unloaded.
     * This mechanism is the last resort to free these kind of stuborn views.
     */
    #monitorHealthCheck(timeBetweenEachHealthcheck = 2000) {
        this.healthcheckInterval = setInterval(() => {
            if (this.healthcheck()) {
                // this.logger?.log(this.tid, "👍")
                return
            }

            this.logger?.log(this.tid, "This view resources have been freed thanks to an healthcheck logic (3)")
            this.#cleanView()
        }, timeBetweenEachHealthcheck)
    }

    /**
     * Tell wether or not the rootNode still exists in the DOM
     * @returns {boolean}
     */
    healthcheck() {
        return !!this?.leaf?.parentNode
    }

    init() {
        this.observer.observe(this.container)
    }

    /**
     * The goal of this function is to retrieve the top DOM element that contains this view.
     * The said element must not be removed from the DOM except if the user decided so.
     * For example, a tab or a popover are perfect candidate because they always stays in the DOM as long as the user want them to stay.
     * It doesn't depend on Obsidian's shenanigans that I have no control over
     * 
     * Then once I've found the leaf, I can correctly setup a naïve garbage collector-like function for this view
     */
    #resolveCurrentLeaf() {
        let leaf = this.utils.getParentWithClass(this.host.parentNode, "workspace-leaf")
        if (leaf) {
            this.leaf = leaf
            return this.logger?.log("We've found a leaf, and it looks like this view is in a classic tab 🗨️")
        }

        leaf = this.utils.getParentWithClass(this.host.parentNode, "popover")
        if (leaf) {
            this.leaf = leaf
            return this.logger?.log("We've found a leaf, and it looks like this view is in a popover 🎈")
        }

        return this.logger?.log("That's weird 😕, we haven't found a leaf")
    }

    /**
     * This function mutates `this.container` if it happens that the view is inside an embed.
     * It does that because for unknown reason, `this.observer.observe(this.container)` doesn't work
     * if `this.container` is equal to `this.host` or `dv.container` and the view is directly inside an embed...
     * So as a workaround, `this.container` is set to an embed div parent.
     * This make the view slightly less optimized when rendered via an embed since the rendering happens as soon as the embed is visible
     * (even if the actual view is not actually visible on the screen) but it's still better than nothing
     */
    #embedObserverWorkaround() {
        if (this.#amiInEmbed() && !this.#amiInPopover()) {
            this.container = this.host.parentNode
                ?.parentNode
                ?.parentNode // No need to go up to the ".markdown-embed-content" one, it start to work with this one
        }
    }

    #amiInPopover() {
        if (!!this.utils.getParentWithClass(this.host.parentNode, "popover")) return true

        // Weird case: It happens when the view is burried in the popover file. It is in a strange dual state: Loaded but outside of the main DOM.
        if (!this.host
            ?.parentNode // container
            ?.parentNode // <div>
            ?.parentNode // undefined
        ) return true

        return false
    }

    /**
     * Not sure if it really works...
     */
    #amiDirectlyInPopover() {
        return this.host.parentNode
            ?.parentNode // <div class="markdown-preview-pusher">
            ?.parentNode // <div class="markdown-preview-sizer markdown-preview-section">
            ?.parentNode // <div class="markdown-preview-view markdown-rendered node-insert-event show-indentation-guide allow-fold-headings allow-fold-lists">
            ?.parentNode // <div class="markdown-embed-content">
            ?.parentNode // <div class="markdown-embed is-loaded">
            ?.parentNode // <div class="popover hover-popover">
            ?.classList.contains("popover")
    }

    #amiInCallout() {
        return !!this.utils.getParentWithClass(this.host.parentNode, "callout-content")
    }

    /**
     * It will only return true if the container closest parent is a callout
    */
    #amiDirectlyInCallout() {
        return this.host.parentNode?.parentNode?.classList.contains("callout-content")
    }

    #amiInEmbed() {
        return !!this.utils.getParentWithClass(this.host.parentNode, "markdown-embed-content")
    }

    /**
     * It will only return true if the container closest parent is an embed
     */
    #amiDirectlyInEmbed() {
        const embedContent = this.host.parentNode
            ?.parentNode // <div>
            ?.parentNode // <div class="markdown-preview-sizer markdown-preview-section">
            ?.parentNode // <div class="markdown-preview-view markdown-rendered node-insert-event show-indentation-guide allow-fold-headings allow-fold-lists">
            ?.parentNode // <div class="markdown-embed-content">

        return embedContent?.classList.contains("markdown-embed-content")
    }

    /**
     * Used to know where this view is located
     */
    whereami() {
        return {
            popover : this.#amiInPopover(),
            callout : this.#amiInCallout(),
            embed : this.#amiInEmbed(),
        }
    }

    whichDeviceAmi() {
        const syncPlugin = this.app.internalPlugins.getPluginById("sync")
        if (!syncPlugin) return ""

        return syncPlugin.instance.getDefaultDeviceName()
    }

    #computeId = () => {
        return this.name + this.tid
    }

    /** @param {Set<string>} set */
    #computeClassName = () => {
        let className = "custom-view " + this.name
        if (this.disableSet.has("border")) {
            className += " no-border"
        }

        return className
    }

    #hideEditButtonLogic = (editBlockNode) => {
        if (editBlockNode && editBlockNode.style) {
            editBlockNode.style.visibility = "hidden"
            return true
        }
        return false
    }

    /**
     * Hide the edit button so it doesn't trigger anymore in preview mode
     */
    #hideEditButton = () => {
        /*
        How is formatted a live preview callout?
        ...
        <div class="cm-embed-block cm-callout" ...>
            <div class="markdown-rendered ...">
                <div data-callout="..." class="callout ...">
                    <div class="callout-title">...</div>
                    <div class="callout-content">
                        <div class="block-language-dataviewjs ...">
                            ...
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ...

        So there are 3 intermediary parent tags between the dvjs tag and the code-mirror callout one
        The root node is just below the dvjs one
        */

        const container = this.host.parentNode
        if (this.#hideEditButtonLogic(container?.nextSibling)) return true

        // We haven't been loaded yet in the DOM, are we in a callout?
        const calloutContentNode = container?.parentNode
        const calloutNode = calloutContentNode?.parentNode

        // Not a callout, we are inside a long file and got lazyloaded by Obsidian
        if (!calloutNode) return false

        // Hide the `Edit this block` button on the top right of the callout in live preview
        this.#hideEditButtonLogic(calloutNode?.nextSibling)

        calloutNode.onclick = (e) => {
            if (// we click on something that usually trigger the edit of callout in live preview, do nothing
                e.target === calloutContentNode
                || e.target === this.host
                || e.target === this.host.querySelector(".buttons")
                || e.target === this.host.querySelector(".grid")
                || e.target.tagName === "ARTICLE"
                || e.target.className === "file-link"
                || e.target.tagName === "INPUT"
                || e.target.className === "timecode" || e.target?.parentNode.className === "timecode"

                // We click on the player button
                || e.target.tagName === "path"
                || e.target.tagName === "svg"
            ) {
                e.stopPropagation()
            }
        }
        return true
    }

    handleViewIntersection(entries) {
        entries.map((entry) => {
            if (!entry.isIntersecting) return

            this.logger?.reset(performance.now(), true)
            this.observer.unobserve(entry.target);

            if (!this.managedToHideEditButton) {// try now that it has been loaded in the DOM
                this.#hideEditButtonLogic(this.host.parentNode?.nextSibling)
            }

            this.container.dispatchEvent(new CustomEvent('view-ready'))
        });
    }
}

/**
 * Class that contains miscelaneous utility functions regarding YouTube service
 */
export class YouTubeManager {
    constructor({ utils, logger }) {
        this.utils = utils
        this.logger = logger
    }

    static #youtubeUrlRegex = /((?:https?:)\/\/)?((?:www|m|music)\.)?((?:youtube(-nocookie)?\.com|youtu\.be))(\/(?:[\w?&=]+v=|embed\/|live\/|v\/|watch_videos[?&=\w]+video_ids=)?)([\w\-,]+)(\S+)?/

    static #tPartRegex = /[?&]t=(\d+)/

    /**
     * It extract the video id from a youtube url and its query parameters
     *
     * It supports these different types of YouTube urls:
     *
     * https://www.youtube.com/watch?v=dQw4w9WgXcQ - Classic/Desktop format
     * https://youtu.be/dQw4w9WgXcQ - Short mobile format
     * https://music.youtube.com/watch?v=oqy2N1jM2tU - YouTube Music format
     * https://www.youtube.com/watch_videos?video_ids=dQw4w9WgXcQ,y6120QOlsfU - Anonymous playlist format
     *
     * In the case of a playlist, it extract the ids after the `video_ids=`
     *
     * @param {string} url
     */
    static extractInfoFromYouTubeUrl(url) {
        const video = YouTubeManager.#youtubeUrlRegex.exec(url)

        if (!video) return null;

        const t = YouTubeManager.#tPartRegex.exec(video[5] + video[7])

        return {
            id: video[6],
            t: parseInt(t?.[1]),
        }
    }

    static buildYouTubeImgUrlFromId(videoId, resolution = "mqdefault") {
        // return `https://i.ytimg.com/vi/${videoId}/${resolution}.jpg`
        return `https://img.youtube.com/vi/${videoId}/${resolution}.jpg`
    }

    static buildYouTubeUrlFromId(videoId, format = "desktop") {
        if (videoId.contains(',')) {
            return `https://www.youtube.com/watch_videos?video_ids=${videoId}`
        }

        switch (format) {
            case "mobile":
            case "short":
                return `https://youtu.be/${videoId}`
            case "music":
                return `https://music.youtube.com/watch?v=${videoId}`
            default:
                return `https://www.youtube.com/watch?v=${videoId}`
        }
    }

    /**
     * In addition to the url itself, it uses a length property to add extra options to the generated playlist
     *
     * @param {import('./_views').UserFile[]} pages
     * @param {object} settings
     */
    generateAnonymousYouTubePlaylistUriFromPages(pages, {
        maxLengthAccepted = 720,
        maxTAccepted = 12,
        acceptsMusicOfUnknownDuration = true,
    } = {}) {
        /**
         * I would have like to add the ability to generate a dynamic YouTube Music playlist but it's not available...
         */
        const baseUrl = "https://www.youtube.com/watch_videos?video_ids="

        const aggregatedYoutubeUrls = pages.reduce((prev, cur) => {
            const { url, length, file } = cur;

            const video = YouTubeManager.extractInfoFromYouTubeUrl(url)

            if (!video?.id) return prev;

            if (!isNaN(video.t)) {
                if (video.t > maxTAccepted) {
                    this.logger?.warn(`The 't' argument is too deep inside the video of url: '${url}' to be added in the playlist`)
                    return prev
                }
            }

            const duration = typeof length === "number" ? length : this.utils.convertTimecodeToDuration(length)

            if (!acceptsMusicOfUnknownDuration && isNaN(duration)) {
                this.logger?.warn(`${file.name} has an unknown duration. It won't be added in the playlist`)
                return prev
            }

            if (!isNaN(duration) && duration > maxLengthAccepted) {
                this.logger?.warn(`${file.name} is too long to be added in the playlist`)
                return prev
            }

            const separator = prev !== "" ? ',' : ''

            return prev + separator + video.id
        }, "")

        return baseUrl + aggregatedYoutubeUrls
    }
}


/**
 * Binds a view to properties in the frontmatter. Thanks to Meta Bind's magic, the view will rerender if the watched properties change
 *
 * @depends on Meta Bind and JS-Engine
 * @warning The code is a mess, but it works for now. I did it in only by looking at the repo examples,
 * so I probably missed some obvious solutions that would make the code less verbose, idk
 * 
 * We create two ReactiveComponent. The one with `reactiveMetadata` refresh the second one when the frontmatter changes
 * It surely leaks some memory in the process but I don't see any other way
 * 
 * @param {*} env
 * @param {object} _
 * @param {Function} _.main
 * @param {Function} _.buildViewParams
 * @param {string[]} _.propertiesToWatch
 *
 * @todo Watch every properties if `propertiesToWatch` is empty
 */
export async function bindViewToProperties(env, {
    main,
    buildViewParams,
    propertiesToWatch,
    debounceWait = 50,
}) {
    // JS-Engine specific setup
    const { app, engine, component, container, context, obsidian } = env.globals

    const mb = engine.getPlugin('obsidian-meta-bind-plugin').api;

    const bindTargets = propertiesToWatch.map(property => mb.parseBindTarget(property, context.file.path));

    const module = await engine.importJs('_js/Krakor.mjs')
    const { debounce, isEqual, isValidPropertyValue, scrollToElement } = module

    function render(props) {
        // we force the unload of the view to remove the content created in the previous render
        container.dispatchEvent(new CustomEvent('view-unload'))

        main(env, props)

        // adjust the timeout if needed
        setTimeout(() => {
            scrollToElement(container)
        }, 0)
    }

    const previousTargettedFrontmatter = Object.fromEntries(propertiesToWatch.map(property => [property, context.metadata.frontmatter[property]]))
    let previousViewParams = buildViewParams({isValidPropertyValue}, previousTargettedFrontmatter)

    // we create a reactive component from the render function and the initial value will be the value of the frontmatter to begin with
    const reactive = engine.reactive(render, previousViewParams);

    const debouncedRefresh = debounce((data) => {
        const currentTargettedFrontmatter = propertiesToWatch.reduce((properties, property, i) => {
            properties[property] = data[i]
            return properties
        }, {})

        const newViewParams = buildViewParams({ isValidPropertyValue }, currentTargettedFrontmatter)

        const viewParamsHaventChanged = isEqual(previousViewParams, newViewParams)
        if (viewParamsHaventChanged) return; //no-op

        previousViewParams = newViewParams

        // it has been confirmed that the new frontmatter should be used for the next render
        reactive.refresh(newViewParams)
    }, debounceWait)

    const reactives = mb.reactiveMetadata(bindTargets, component, (...targets) => {
        debouncedRefresh(targets)
    })

    return reactive;
}


/**
 * The boilerplate needed at the beginning of a view
 * @param {object} _
 * @param {string} _.viewName
 * @param {Function} _.render
 */
export const setupView = async ({
    app, component, container, module,
    viewName, disable, render, debug,
}) => {
    const LOGGER_TYPE = "console"
    const DEBUG_LOG_FILE = "🙈/Log.md"

    const logger = new module.Logger({
        app,
        dry: !debug,
        output: LOGGER_TYPE,
        filepath: DEBUG_LOG_FILE,
    })

    const {getParentWithClass} = module

    const vm = new module.ViewManager({
        utils: {getParentWithClass},
        app, component, container, logger,
        name: viewName,
        disable,
    })

    const onReady = async () => {
        debug && performance.mark(`${viewName}-start`);
        // If the container is still present in the DOM
        if (vm.container) {
            vm.container.removeEventListener("view-ready", onReady)
            await render.call(null, {vm, logger})
        }
        if (debug) {
            performance.mark(`${viewName}-end`);
            const code_perf = performance.measure(viewName, `${viewName}-start`, `${viewName}-end`);
            console.info(`View took ${code_perf.duration}ms to run (performance.measure)`)
        }
    }
    vm.container.addEventListener("view-ready", onReady)

    vm.init()
}
