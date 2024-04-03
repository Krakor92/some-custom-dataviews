class ViewManager {
    /**
     * This class is responsible of the view it is instancied in.
     * There must be only one ViewManager per view.
     * 
     * It does the following:
     *  - Lazy load the view until its visible in the viewport
     *  - Free most of the view memory usage at page/popover closing (it doesn't seem to have a significant impact if I judge by the JS VM instance in Memory panel)
     *  - Prevent the editing mechanism that occur in Live Preview when clicking inside the view if it sits within a callout
     */
    ViewManager = class {
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
                this.#cleanView()
            })

            // 2. When another script explictly send this `view-unload` event to the container tag
            const onUnload = () => {
                this.container.removeEventListener("view-unload", onUnload)
                this.#cleanView()
            }
            this.container.addEventListener("view-unload", onUnload)

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
            this.container?.empty()
            this.container = null
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

                 this.#cleanView()
                 clearInterval(this.healthcheckInterval)
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
         * Then once I've found the leaf, I can correctly setup a naive garbage collector-like function for this view
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
                if (entry.isIntersecting) {
                    this.logger?.reset(performance.now(), true)
                    this.observer.unobserve(entries[0].target);

                    if (!this.managedToHideEditButton) {// try now that it has been loaded in the DOM
                        this.#hideEditButtonLogic(this.host.parentNode?.nextSibling)
                    }

                    this.container.dispatchEvent(new CustomEvent('view-ready'))
                }
            });
        }
    }
}