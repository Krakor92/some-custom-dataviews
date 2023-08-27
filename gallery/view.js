/**
 * @file Build a grid of file from your vault with thumbnail
 * @depends on DataviewJS
 * @author Krakor <krakor.faivre@gmail.com>
 * @link https://github.com/Krakor92/some-custom-dataviews/tree/master/gallery
 */

const {
    filter,
    sort,
    disable = "",

    // voir ce post https://stackoverflow.com/a/18939803 pour avoir un système de debug robuste
    debug = false,
    //@ts-ignore
} = input || {};

// CustomJS related - look at the readme for more info
const DEFAULT_CUSTOMJS_CLASS = "Krakor"

const GLOBAL_DISABLE = ""

await forceLoadCustomJS()
const utils = new customJS[DEFAULT_CUSTOMJS_CLASS].Utils({app: dv.app})
const logger = new customJS[DEFAULT_CUSTOMJS_CLASS].Logger({app: dv.app, dry: !debug})

// You can add any disable values here to globally disable them in every view

const vm = new customJS[DEFAULT_CUSTOMJS_CLASS].ViewManager({
    dv,logger, utils,
    name: 'gallery',
    disable: GLOBAL_DISABLE + " " + disable,
})

const onReady = async () => {
    await renderView()
    vm.container.removeEventListener("dvjs-ready", onReady)
}
vm.container.addEventListener("dvjs-ready", onReady)

vm.init()


async function renderView() {

//#region Settings

// The first value is the name of your field, the second value is its type: right now only 'date' and 'link' are available
const USER_FIELDS = new Map()
USER_FIELDS.set('added', 'date')
USER_FIELDS.set('release', 'date')
USER_FIELDS.set('from', 'link')
USER_FIELDS.set('in', 'link')
USER_FIELDS.set('artist', 'link')

// These are special fields that have special effects in this view. You can rename them to match your own fields if you wish
const TITLE_FIELD = "title"
const THUMBNAIL_FIELD = "thumbnail"

// The 'from' dataview query used to query the music markdown files
const DEFAULT_FROM = '-"_templates"'

const DEFAULT_FILE_DIRECTORY = 'DB'
const DEFAULT_THUMBNAIL_DIRECTORY = "_assets/🖼/Thumbnails"

// How many pages do you want to render at first and each time you reach the end of the grid
const NB_FILE_BATCH_PER_PAGE = 20

/** @type {'auto', 'top', 'center', 'bottom'} */
const ARTICLE_ALIGN = 'center'

/**
 * Note the following:
 * - This layout require the article align variable specified above to be equal to 'center'
 * - The computing involved in order to make the Masonry layout work add some lag to the rendering phase
 * - It messes with the card order. It's perfect if you have a random sort order but otherwise, you might want to disable masonry for your view
 */
const MASONRY_LAYOUT = true

//#endregion


const fileManager = new customJS[DEFAULT_CUSTOMJS_CLASS].FileManager({
    dv, utils,
    app: dv.app,
    directoryWhereToAddFile: DEFAULT_FILE_DIRECTORY,
    properties: filter,
    userFields: USER_FIELDS,
})


const icons = new customJS[DEFAULT_CUSTOMJS_CLASS].IconManager()

const orphanage = new customJS[DEFAULT_CUSTOMJS_CLASS].Orphanage({
    utils,
    directory: DEFAULT_FILE_DIRECTORY,
    thumbnailDirectory: DEFAULT_THUMBNAIL_DIRECTORY,
})

const orphanPages = vm.disableSet.has("orphans") ? [] : orphanage.raise(dv.current().orphans)

//#endregion

//#region Query the pages based on filters

const pageManager =  new customJS[DEFAULT_CUSTOMJS_CLASS].PageManager({
    dv, logger, utils,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
})

const qs = new customJS[DEFAULT_CUSTOMJS_CLASS].Query({dv})

let queriedPages = []

if (!vm.disableSet.has("query")) {
    queriedPages = await pageManager.buildAndRunFileQuery({filter, qs})
    logger.log({ queriedPages })
}

const pages = [...queriedPages, ...orphanPages]

//#endregion

await pageManager.sortPages({ pages, sort })


const Renderer = new customJS[DEFAULT_CUSTOMJS_CLASS].Renderer({utils, icons})

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

const gridManager = customJS[DEFAULT_CUSTOMJS_CLASS].CollectionManager.makeGridManager({
    dv, logger, icons, utils,
    numberOfElementsPerBatch: NB_FILE_BATCH_PER_PAGE,
    disableSet: vm.disableSet,
})

const buildExtraChildrenHTML = (p) => {
    const extra = {}

    if (p[TITLE_FIELD]) {
        extra[".file-link"] = Renderer.renderInternalFileAnchor({ path: p.file.path, name: p[TITLE_FIELD] })
    } else {
        extra[".file-link"] = Renderer.renderInternalFileAnchor(p.file)
    }

    return extra
}

await gridManager.buildChildrenHTML({pages, pageToChild: async (p) => {
    let fileTag = ""
    let thumbTag = ""
    let imgTag = ""

    if (!vm.disableSet.has("filelink")) {
        fileTag = `<span class="file-link"></span>`
    }

    if (!vm.disableSet.has("thumbnail")) {
        if (!p[THUMBNAIL_FIELD]) {
            imgTag = ""
        } else if (typeof p[THUMBNAIL_FIELD] === "string") {
            // Thumbnail is an url (for non youtube music)
            imgTag = Renderer.renderThumbnailFromUrl(p[THUMBNAIL_FIELD])
        } else {
            imgTag = Renderer.renderThumbnailFromVault(p[THUMBNAIL_FIELD])
        }
    }
    thumbTag = `<div class="thumb-stack">
        ${Renderer.renderInternalFileAnchor({path: p.file.path, name: imgTag, ariaLabel: false, mdmIcon: false})}
    </div>`

    const articleStyle = resolveArticleStyle({
        page: p, options: {
            align: ARTICLE_ALIGN,
        }
    })

    const article = `<article class="internal-link" ${articleStyle}>
        ${thumbTag ?? ""}
        ${fileTag}
    </article>
    `

    return {
        html: article,
        extra: buildExtraChildrenHTML(p),
    }
}})

gridManager.buildParent()
await gridManager.insertNewChunk()

vm.rootNode.appendChild(gridManager.getParent());
//#endregion

//#region Masonry layout
if (MASONRY_LAYOUT && !vm.disableSet.has('masonry')) {
    const masonryManager = new customJS[DEFAULT_CUSTOMJS_CLASS].Masonry(gridManager.getParent())

    const resizeObserver = new ResizeObserver(() => {
        masonryManager.resizeAllGridItems()
    });

    resizeObserver.observe(masonryManager.grid)
}
//#endregion

gridManager.initInfiniteLoading()

logger.viewPerf()
}
