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
    constructor({ disable = "", app, component, container, utils, logger, name, debug = false } = {}) {
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
            cls: this.#computeClassName(debug),
            attr: {
                id: this.#computeId(),
                style: 'position:relative;-webkit-user-select:none!important'
            }
        })

        //this.utils.getParentWithClass(this.host.parentNode, "view-content")

        this.managedToHideEditButton = this.#hideEditButton()

        this.observer = new IntersectionObserver(this.handleViewIntersection.bind(this))

        this.#embedObserverWorkaround()
        this.leaf = this.#resolveCurrentLeaf()
        this.content = this.#resolveCurrentContent()

        this.context = this.whereami()

        /**
         * Here are the three ways this view can be unloaded
         */

        // 1. When the component containing this view is unloaded
        this.component?.register(() => {
            this.logger?.log(this.tid, `This view is unloaded the normal way (1)`)
            this.#cleanView()
        })

        // 2. When another script explicitly send the `view-unload` event to the container tag
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
        if (this.disableSet.has("livepreview") && this.context.livepreview) return

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
            this.logger?.log("We've found a leaf, and it looks like this view is in a classic tab 🗨️")
            return leaf
        }

        leaf = this.utils.getParentWithClass(this.host.parentNode, "popover")
        if (leaf) {
            this.logger?.log("We've found a leaf, and it looks like this view is in a popover 🎈")
            return leaf
        }

        /**
         * We're probably inside a shadow DOM (like inside a Canvas card)
         */
        this.logger?.log("Weird, we haven't found a leaf 😕")
        return null
    }

    /**
     * The goal of this function is the opposite of `resolveCurrentLeaf`.
     * It's supposed to find the closest DOM element that encapsulate this view
     * to provide a complete virtualisation process no matter which file were in.
     */
    #resolveCurrentContent() {
        let content = this.utils.getParentWithClass(this.host.parentNode, "markdown-embed-content")
        if (content) {
            this.logger?.log("We're in a specific type of file")
            return content
        }

        content = this.utils.getParentWithClass(this.host.parentNode, "kanban-plugin")
        if (content) {
            this.logger?.log("We're in a Kanban card")
            if (content.firstChild?.classList?.contains("kanban-plugin__horizontal")) {
                content = this.utils.getParentWithClass(this.host.parentNode, "kanban-plugin__lane-items")
            }
            return content
        }

        content = this.utils.getParentWithClass(this.host.parentNode, "view-content")
        if (content) {
            this.logger?.log("We're in a classic file")
            return content
        }

        this.logger?.log("Weird, we haven't found a content node")
        return null
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

    #amiInLivePreview() {
        return this.host.closest("[contenteditable]") != null
    }

    /**
     * Used to know where this view is located and its context.
     * `this.host` must have been initialized before calling this method
     * 
     * @warning
     * These are all super naïve methods I've written looking at the devtools, so they might likely break in the future
     */
    whereami() {
        return {
            popover : this.#amiInPopover(),
            callout : this.#amiInCallout(),
            embed : this.#amiInEmbed(),
            livepreview : this.#amiInLivePreview(),
        }
    }

    whichDeviceAmi() {
        const syncPlugin = this.app.internalPlugins.getPluginById("sync")
        if (!syncPlugin) return ""

        return syncPlugin.instance.getDefaultDeviceName()
    }

    inWhichFiletypeAmi() {
        if (this.utils.getParentWithClass(this.host.parentNode, "canvas-node-content")) {
            return 'canvas'
        }
        if (this.utils.getParentWithClass(this.host.parentNode, "kanban-plugin")) {
            return 'kanban'
        }
        return 'normal'
    }

    #computeId = () => {
        return this.name + this.tid
    }

    /** @param {Set<string>} set */
    #computeClassName = (debug) => {
        let className = "custom-view " + this.name
        if (this.disableSet.has("border")) {
            className += " no-border"
        }
        if (debug) {
            className += " debug"
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