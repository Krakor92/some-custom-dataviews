/**
 * @file Build a grid of file from your vault with thumbnail
 * @depends on JS-Engine and DataviewJS
 * @author Krakor <krakor.faivre@gmail.com>
 * @link https://github.com/Krakor92/some-custom-dataviews/tree/master/_views/gallery
 *
 * To mimic the behavior of dvjs automatic css insertion, you MUST pass a`path` property inside the`env` object equal to this current file path.
 * It is then interpreted by this view to find the css file in the same folder
*/

//#region Settings

/** The first value is the name of your field, the second value is its type: right now only 'date' and 'link' are available */
const USER_FIELDS = new Map()
    .set('added', 'date')
    .set('release', 'date')
    .set('from', 'link')
    .set('in', 'link')
    .set('artist', 'link')
    .set('is', 'link')
    .set('links', 'link')

// These are special fields that have special effects in this view. You can rename them to match your own fields if you wish
const TITLE_FIELD = "title"
const THUMBNAIL_FIELD = "thumbnail"
const ORPHANS_FIELD = "orphans"

// The 'from' dataview query used to query the music markdown files
const DEFAULT_FROM = '-"_templates"'

const DEFAULT_FILE_DIRECTORY = 'DB'
const DEFAULT_THUMBNAIL_DIRECTORY = "_assets/🖼/Thumbnails"

// The path where the main module is
const MODULE_PATH = "_js/Krakor.mjs"

// You can add any disable values here to globally disable them in every view
const GLOBAL_DISABLE = ""

// How many pages do you want to render at first and each time you reach the end of the grid
const NUMBER_OF_FILE_BATCH_PER_PAGE = 20

// Replace it with a number if you desire your mix to be predictable with a given set of tracks
const RANDOM_SEED = null

/**
 * Since we query files using dv api, the "natural" order in which files are indexed and thus retrieved vary upon devices.
 * Hence, if we want a uniform order across all synced devices when using the random seed, we must do an additional sort to begin with
 *
 * Set to false if you don't care about the above
 */
const UNIFORM_ORDER_WITH_RANDOM_SEED_ON_ALL_DEVICES = true

/** @type {'auto' | 'top' | 'center' | 'bottom'} */
const ARTICLE_ALIGN = 'center'

/**
 * Trim the surplus and replace it with `[…]`.
 * This constant was added to reduce the probability of having an abnormaly tall card compared to its siblings
 * which might disturb the virtualisation mechanism described below.
 *
 * Set it to `0` if you don't want any trimming.
 */
const MAX_FILENAME_LENGTH = 64

/**
 * Note the following:
 * - This layout require the article align variable specified above to be equal to 'center'
 * - The computing involved in order to make the Masonry layout work add some lag to the rendering phase compared to a naive grid implementation
 * - It messes with the card order so it's no problem if you're using a random sort order
 *   otherwise, you might want to disable masonry for your view using the `disable: "masonry"` property
 * - Sometimes it might fail to format correctly on article appending
 */
const MASONRY_LAYOUT = true

/**
 * This feature is super experimental and works on the following assumptions:
 * - The interface size and the grid's width must stay constant throughout the rendering of this view
 * - You're waiting for every images to load completely before scrolling too deep in the view
 * - You avoid scrolling past this view using hotkeys like `Ctrl+PgUp`/`Ctrl+PgDn`
 *
 * Also note that the virtualizatin of a batch, or in simpler terms, the removal of a batch of articles from the DOM
 * is really likely to trigger a reflow of the current visible article which might be misleading when using the Masonry layout
 */
const VIRTUALIZED_LAYOUT = true

/**
 * The number of pages necessary to trigger the virtualisation
 * If we render less than this number of articles,
 * it's not necessary to trigger it because the DOM shouldn't be too large
 */
const PAGE_THRESHOLD_TO_START_VIRTUALIZATION = NUMBER_OF_FILE_BATCH_PER_PAGE * 3


//#endregion

export async function main(env, {
    filter,
    sort,
    disable = "",
    debug = false,
} = {}) {

// #region JS Engine setup
const { app, engine, component, container, context, obsidian } = env.globals
// We retrieve the dv api object
const dv = engine.getPlugin('dataview')?.api

if (Array.isArray(disable)) disable = disable.join(' ')
disable = GLOBAL_DISABLE + ' ' + disable

const module = await engine.importJs(MODULE_PATH)

await module.setupView({
    app, component, container, module,
    viewName: 'gallery',
    render: renderView,
    disable,
    debug,
})

 /**
 * It's an empty string when used inside a canvas card
 * @type {string}
 */
const currentFilePath = context.file?.path ?? ''

// #endregion

async function renderView({ vm, logger }) {

/** We extract all the utils functions that we'll need later on */
const {
    buildInvertedMap,
    clamp,
    closestTo,
    convertDurationToTimecode,
    convertTimecodeToDuration,
    createFragmentFromString,
    debounce,
    delay,
    getOS,
    isEmpty,
    isObject,
    linkExists,
    normalizeArrayOfObjectField,
    normalizeLinksPath,
    shuffleArray,
    uriRegex,
    valueToDateTime,
} = module


//#region Css insertion

// Must be equal to this file path
const scriptPath = env.path

// Extract the scriptPath without its extension
const scriptPathNoExt = scriptPath.replace(/(?:\.[\w-]+)$/, "");

// If it didn't find scriptPath, we assume, this view doesn't need have any css
if (scriptPathNoExt) {
    const Stylist = new module.Stylist({ app, container: vm.root })
    await Stylist.setStyleContentFromFile(`${scriptPathNoExt}.css`, currentFilePath)
}

//#endregion

const icons = new module.IconManager()

const orphanage = new module.Orphanage({
    utils: { normalizeArrayOfObjectField },
    directory: DEFAULT_FILE_DIRECTORY,
    thumbnailDirectory: DEFAULT_THUMBNAIL_DIRECTORY,
})

const orphanPages = vm.disableSet.has("orphans")
    ? []
    : orphanage.raise({
        data: dv.page(currentFilePath)?.[ORPHANS_FIELD],
        context: {
            currentFilePath,
            disguiseAs: filter?.current,
        }
    })

logger.log({ orphanPages })

//#region Query the pages based on filters

const pageManager = new module.PageManager({
    utils: { normalizeLinksPath, valueToDateTime, isEmpty, isObject, shuffleArray, buildInvertedMap },
    dv, logger, orphanage, currentFilePath,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
    seed: RANDOM_SEED,
})

logger?.logPerf("Everything before querying pages")


const qs = new module.Query({ utils: { isObject }, dv, logger })

let pages = []
if (!vm.disableSet.has("query")) {
    pages = await pageManager.buildAndRunFileQuery({ filter, qs, initialSubset: orphanPages })
    logger.log({ queriedPages: pages })
} else {
    pages = orphanPages
}

if (!pages.length) {
    logger?.warn("No pages queried...")
    return
}


//#endregion

const extraSortOptions = {
    standardizeOrder: UNIFORM_ORDER_WITH_RANDOM_SEED_ON_ALL_DEVICES
}

await pageManager.sortPages({ pages, sort, options: extraSortOptions })

const Renderer = new module.Renderer({
    utils: { clamp, uriRegex, isObject, linkExists },
    icons,
})

/**
 * @param {object} _
 * @param {object} _.options
 */
function resolveArticleStyle({ options }) {
    if (!options) return ""

    const { align } = options

    let style = ""
    style += align ? `align-self: ${align};` : ""

    return style !== "" ? `style="${style}"` : ""
}

const buildExtraChildrenHTML = (p) => {
    const extra = {}

    if (p[TITLE_FIELD]) {
        extra[".file-link"] = Renderer.renderInternalFileAnchor({
            path: p.file.path,
            name: p[TITLE_FIELD],
            lengthLimit: MAX_FILENAME_LENGTH
        })
    } else {
        extra[".file-link"] = Renderer.renderInternalFileAnchor({...p.file, lengthLimit: MAX_FILENAME_LENGTH})
    }

    return extra
}

const pageToChild = async (p) => {
    let fileTag = ""
      , thumbTag = ""
      , imgTag = ""

    if (!vm.disableSet.has("filelink")) {
        fileTag = `<span class="file-link"></span>`
    }

    if (!vm.disableSet.has("thumbnail")) {
        if (!p[THUMBNAIL_FIELD]) {
            imgTag = ""
        } else if (typeof p[THUMBNAIL_FIELD] === "string") {
            // Thumbnail is an url (for non youtube music)
            imgTag = Renderer.renderImageFromUrl(p[THUMBNAIL_FIELD])
        } else {
            imgTag = Renderer.renderImageFromVault(p[THUMBNAIL_FIELD])
        }
    }
    thumbTag = `<div class="thumb-stack">
${Renderer.renderInternalFileAnchor({ path: p.file.path, name: imgTag, ariaLabel: false, mdmIcon: false })}
</div>`

    const articleStyle = resolveArticleStyle({
        page: p, options: {
            align: ARTICLE_ALIGN,
        }
    })

    const article = `\
<article class="item internal-link" ${articleStyle}>
    ${thumbTag ?? ""}
    ${fileTag}
</article>`

    return {
        html: article,
        extra: buildExtraChildrenHTML(p),
    }
}

const gridManager = module.CollectionManager.makeGridManager({
    obsidian,
    container,
    component,
    currentFilePath,
    pages,
    pageToChild,
    logger, icons,
    numberOfElementsPerBatch: NUMBER_OF_FILE_BATCH_PER_PAGE,
    disableSet: vm.disableSet,
})

gridManager.buildParent()
vm.root.appendChild(gridManager.parent);

if (VIRTUALIZED_LAYOUT &&
    !vm.disableSet.has('virtualisation')
    && pages.length >= PAGE_THRESHOLD_TO_START_VIRTUALIZATION
    && vm.inWhichFiletypeAmi() !== 'canvas') {

    const virtualizedGridManager = new module.VirtualizedGrid({
        root: vm.content,
        manager: gridManager,
        utils: { isEmpty, closestTo, createFragmentFromString, debounce },
        logger,
    })
}

await gridManager.bakeNextHTMLBatch()
await gridManager.insertNewChunk(),

logger?.logPerf("Baking and inserting first cells in the DOM")

//#endregion

//#region Masonry layout
if (MASONRY_LAYOUT && !vm.disableSet.has('masonry')) {

    const masonryManager = new module.Masonry(gridManager.parent)

    const gridResizeObserver = new ResizeObserver(() => {
        masonryManager.resizeAllGridItems()
    });

    gridResizeObserver.observe(masonryManager.grid)

    if (!app.isMobile) {
        const gridMutationObserver = new MutationObserver((mutationRecord) => {
            for (const mutation of mutationRecord) {
                if (mutation.type !== 'childList') return

                const addedNodes = mutation.addedNodes;
                if (!addedNodes.length) return

                masonryManager.resizeAllGridItems()
            }
        });
        gridMutationObserver.observe(masonryManager.grid, {
            childList: true,
        });
    }
}
//#endregion

await gridManager.bakeNextHTMLBatch(),
gridManager.setupInfiniteLoading()

logger.viewPerf()
}}
