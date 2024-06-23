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

// The first value is the name of your field, the second value is its type: right now only 'date' and 'link' are available
const USER_FIELDS = new Map()
USER_FIELDS.set('added', 'date')
USER_FIELDS.set('release', 'date')
USER_FIELDS.set('from', 'link')
USER_FIELDS.set('in', 'link')
USER_FIELDS.set('artist', 'link')
USER_FIELDS.set('is', 'link')
USER_FIELDS.set('links', 'link')

// These are special fields that have special effects in this view. You can rename them to match your own fields if you wish
const TITLE_FIELD = "title"
const THUMBNAIL_FIELD = "thumbnail"
const ORPHANS_FIELD = "orphans"

// The 'from' dataview query used to query the music markdown files
const DEFAULT_FROM = '-"_templates"'

const DEFAULT_FILE_DIRECTORY = 'DB'
const DEFAULT_THUMBNAIL_DIRECTORY = "_assets/🖼/Thumbnails"

// How many pages do you want to render at first and each time you reach the end of the grid
const NB_FILE_BATCH_PER_PAGE = 20

/** @type {'auto' | 'top' | 'center' | 'bottom'} */
const ARTICLE_ALIGN = 'center'

/**
 * Note the following:
 * - This layout require the article align variable specified above to be equal to 'center'
 * - The computing involved in order to make the Masonry layout work add some lag to the rendering phase
 * - It messes with the card order. It's perfect if you have a random sort order but otherwise, you might want to disable masonry for your view
 */
const MASONRY_LAYOUT = true

//#endregion

export async function main(env, {
    filter,
    sort,
    disable = "",
    debug = false,
    clear = false,
} = {}) {

// #region JS Engine setup
const { app, engine, component, container, context, obsidian } = env.globals
// We retrieve the dv api object
const dv = engine.getPlugin('dataview')?.api

// You can add any disable values here to globally disable them in every view
const GLOBAL_DISABLE = ""

disable = GLOBAL_DISABLE + ' ' + disable

// The path where the main module is
const MODULE_PATH = "_js/Krakor.mjs"

const module = await engine.importJs(MODULE_PATH)

await module.setupView({
    app, engine, context, component, container, module,
    viewName: 'gallery',
    render: renderView,
    disable,
    debug,
})

// It's an empty string when used inside a canvas card
const currentFilePath = context.file?.path ?? ''
// #endregion

async function renderView({ vm, logger, utils }) {


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
    utils,
    directory: DEFAULT_FILE_DIRECTORY,
    thumbnailDirectory: DEFAULT_THUMBNAIL_DIRECTORY,
})

const orphanPages = vm.disableSet.has("orphans")
    ? []
    : orphanage.raise(dv.page(currentFilePath)?.[ORPHANS_FIELD])


//#region Query the pages based on filters

const pageManager = new module.PageManager({
    dv, logger, utils,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
})

const qs = new module.Query({ dv })

let queriedPages = []

if (!vm.disableSet.has("query")) {
    queriedPages = await pageManager.buildAndRunFileQuery({ filter, qs })
    logger.log({ queriedPages })
}

const pages = [...queriedPages, ...orphanPages]

//#endregion

await pageManager.sortPages({ pages, sort })


const Renderer = new module.Renderer({ utils, icons })

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

const gridManager = module.CollectionManager.makeGridManager({
    obsidian,
    container,
    component,
    currentFilePath,
    logger, icons, utils,
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

await gridManager.buildChildrenHTML({
    pages, pageToChild: async (p) => {
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

        const article = `<article class="internal-link" ${articleStyle}>
${thumbTag ?? ""}
${fileTag}
</article>
`

        return {
            html: article,
            extra: buildExtraChildrenHTML(p),
        }
    }
})

gridManager.buildParent()
await gridManager.insertNewChunk()

vm.root.appendChild(gridManager.parent);
//#endregion

//#region Masonry layout
if (MASONRY_LAYOUT && !vm.disableSet.has('masonry')) {
    const masonryManager = new module.Masonry(gridManager.parent)

    const resizeObserver = new ResizeObserver(() => {
        masonryManager.resizeAllGridItems()
    });

    resizeObserver.observe(masonryManager.grid)
}
//#endregion

gridManager.initInfiniteLoading()

logger.viewPerf()
}}
