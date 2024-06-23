/**
 * @file Render a grid of music from your vault. Files can have an audio embedded, an url or both
 * @depends on JS-Engine and DataviewJS
 * @author Krakor <krakor.faivre@gmail.com>
 * @link https://github.com/Krakor92/some-custom-dataviews/tree/master/_views/jukebox
 *
 * To mimic the behavior of dvjs automatic css insertion, you MUST pass a `path` property inside the `env` object equal to this current file path.
 * It is then interpreted by this view to find the css file in the same folder
 */

//#region Settings

// The path where the main module is
const MODULE_PATH = "_js/Krakor.mjs"

/** The first value is the name of your field, the second value is its type: right now only 'date' and 'link' are available */
const USER_FIELDS = new Map()
    .set('added', 'date')
    .set('release', 'date')
    .set('links', 'link')
    .set('from', 'link')
    .set('in', 'link')
    .set('artist', 'link')


/**
 * It is useful when trying to infer the file type in which an orphan is defined.
 * It's very naïve and only supports #tag and path for now.
 */
const ORPHANS_INFERRANCE_RULES = {
    artist: ['#🎙', 'DB/👥'],
    in: ['DB/📺'],
}

// These are special fields that have special effects in this view. You can rename them to match your own fields if you wish
const TITLE_FIELD = "title"
const THUMBNAIL_FIELD = "thumbnail"
const AUDIO_FILE_FIELD = "audio"
const URL_FIELD = "url"
const LENGTH_FIELD = "length"
const VOLUME_FIELD = "volume"
const ORPHANS_FIELD = "orphans"

// The 'from' dataview query used to query the music markdown files
const DEFAULT_FROM = '#🎼 AND -"_templates"'

// Where to create the file when we press the + tile/button
const DEFAULT_SCORE_DIRECTORY = "DB/🎼"

// Only used by the orphan system
const DEFAULT_THUMBNAIL_DIRECTORY = "_assets/🖼/Thumbnails"

/**
 * If not empty, each strings in this array will be considered a potential source of orphans.
 * They must be valid [dataview sources](https://blacksmithgu.github.io/obsidian-dataview/reference/sources)
 *
 * Keep in mind that each string added, means one more call to `dv.pages`, which can be a rather costly operation
 *
 * @type {Array<string>}
 */
const DEFAULT_ORPHAN_SOURCES = []

// You can add any disable values here to globally disable them in every view
const GLOBAL_DISABLE = ""

/**
 * How many pages do you want to render at first and each time you reach the bottom of the grid
 *
 * This value have big impact on the performance of this view.
 * It's also crucial to the smooth operation of the grid virtualisation.
 *
 * Try to not set it too high nor too low.
 */
const NUMBER_OF_SCORES_PER_BATCH = 16

// It only works in the context of the page, if you have another page opened with another audio file playing
// then it won't stop it if you play one in the current page
const ENABLE_SIMULTANEOUS_AUDIO_PLAYING = false

// If false, then the end of the last loaded music will start the first one in the grid
const STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC = true

/**
 * more info here: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#preload
 *  @type {'auto'|'metadata'|'none'}
*/
const AUDIO_DEFAULT_PRELOAD = 'metadata'

// Between 0 (silent) and 1 (loudest)
const DEFAULT_VOLUME = 0.4

// Replace it with a number if you desire your mix to be predictable with a given set of tracks
const RANDOM_SEED = null

/**
 * Since we query files using dv api, the "natural" order in which files are indexed and thus retrieved vary upon devices.
 * Hence, if we want a uniform order across all synced devices when using the random seed, we must do an additional sort to begin with
 *
 * Set to false if you don't care about the above
 */
const UNIFORM_ORDER_WITH_RANDOM_SEED_ON_ALL_DEVICES = true

// Until how many seconds in youtube url (?t=) should we consider the music to not be elegible to playlist
const MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST = 12

// Music longer than that won't be included when generating a playlist
const MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST = "12:00"

const ACCEPTS_MUSIC_OF_UNKNOWN_DURATION_AS_PART_OF_PLAYLIST = true

// If true, YouTube Music urls will be played in YouTube directly
const FORCE_CLASSIC_YOUTUBE_URL = true

// If true, displays a logo icon on the top right depending on the platform the url is on
const DISPLAY_SERVICE_ICONS = false

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
const PAGE_THRESHOLD_TO_START_VIRTUALIZATION = NUMBER_OF_SCORES_PER_BATCH * 3

//#endregion

export async function main(env, {
    filter,
    sort,
    source: orphanSources = [],
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
    viewName: 'jukebox',
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

const fileManager = new module.FileManager({
    utils: { delay },
    dv, app, currentFilePath,
    directoryWhereToAddFile: DEFAULT_SCORE_DIRECTORY,
    properties: filter,
    userFields: USER_FIELDS,
    logicOnAddFile: [
        async (fileManager, fieldsPayload) => {
            const textInClipboard = await navigator.clipboard.readText();

            if (uriRegex.test(textInClipboard)) { //text in clipboard is an "http(s)://anything.any" url
                fieldsPayload.push({
                    name: URL_FIELD,
                    payload: { value: textInClipboard }
                })
            }
        }
    ],

})


const icons = new module.IconManager()

const audioManager = new module.AudioManager({
    utils: { clamp, convertTimecodeToDuration, getOS },
    app, logger, icons,
    enableSimultaneousPlaying: ENABLE_SIMULTANEOUS_AUDIO_PLAYING,
    autoplay: !vm.disableSet.has("autoplay"),
    stopAutoplayWhenReachingLastMusic: STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC,
    defaultVolume: DEFAULT_VOLUME,
})

//#region Buttons handling
if (!vm.disableSet.has("buttons")) {
    const buttonBar = new module.ButtonBar()

    if (debug) {
        buttonBar.addButton({
            name: 'mp3-debug-info',
            icon: 'info',
            event: async () => {
                await logger?.log(`currentAudioPlaying: ${audioManager.currentAudioPlaying}`)
            }
        })
    }

    if (debug) {
        buttonBar.addButton({
            name: 'clear-debug-file',
            icon: icons.eraserIcon(22),
            event: async () => {
                await logger?.clear()
            }
        })
    }

    const youTubeManager = new module.YouTubeManager({ utils: { convertTimecodeToDuration }, logger })

    /**
     * Button responsible of launching an anonymous YouTube playlist.
     */
    buttonBar.addButton({
        name: 'playlist',
        icon: icons.listMusicIcon,
        event: () => {
            let maxLengthAccepted = convertTimecodeToDuration(MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST)
            if (isNaN(maxLengthAccepted)) {
                // Every length is accepted
                maxLengthAccepted = Number.MAX_SAFE_INTEGER
            }

            const playlistUri = youTubeManager?.generateAnonymousYouTubePlaylistUriFromPages(pages, {
                maxLengthAccepted,
                maxTAccepted: MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST,
                acceptsMusicOfUnknownDuration: ACCEPTS_MUSIC_OF_UNKNOWN_DURATION_AS_PART_OF_PLAYLIST,
            })

            // Does open in Obsidian browser (using Surfing plugin)
            window.open(playlistUri)
        }
    })

    if (!vm.disableSet.has("addscore")) {
        buttonBar.addButton({
            name: 'add-file',
            icon: icons.filePlusIcon(20),
            event: fileManager.handleAddFile.bind(fileManager)
        })
    }

    const htmlButtons = buttonBar.buildHTMLButtons()

    /** @type {HTMLDivElement} */
    const buttons = vm.root.createEl("div", { cls: "buttons" })
    buttons.insertAdjacentHTML('beforeend', htmlButtons)
    buttonBar.setEvents(vm.root.querySelectorAll('.buttons button'))
}
//#endregion

//#region Query the pages based on filters

const customFields = new Map()

customFields.set('audioOnly', async (qs) => {
    logger.log(`%cFilter on audioOnly 🔊`, 'color: #7f6df2; font-size: 13px')
    qs.withExistingField(AUDIO_FILE_FIELD)
    await qs.asyncFilter(async (page) => {
        if (!isObject(page[AUDIO_FILE_FIELD])) {
            // That means it's a http link (or at least it should be one) so we consider it's valid
            return true
        }

        // If it's a link then we accept it only if it exists inside the vault
        return await linkExists(page[AUDIO_FILE_FIELD])
    })
})

logger?.logPerf("View setup")

const orphanage = new module.Orphanage({
    utils: { normalizeArrayOfObjectField },
    directory: DEFAULT_SCORE_DIRECTORY,
    thumbnailDirectory: DEFAULT_THUMBNAIL_DIRECTORY,
})

/**
 * Dirty implementation because I'm too lazy to write a proper one for now
 *
 * @param {object} _
 * @param {object} _.inferredRules
 * @param {object} _.page
 * @returns {string}
 */
const tryToInferFileType = ({inferredRules, page}) => {
    for (const field in inferredRules) {
        const rules = inferredRules[field]
        for (const rule of rules) {
            if (typeof rule !== 'string') continue;
            if (rule[0] === "#") {
                const tag = rule.slice(1)
                if (tag === page.tags || page.tags?.includes(tag)) return field
                continue;
            }
            if (page.file.folder === rule) return field
        }
    }
    return null
}

/**
 * @returns {import('../index').TFile[]}
 */
const computeOrphans = () => {
    let orphanPages = []

    if (!vm.disableSet.has("sourceorphans") && (orphanSources || !isEmpty(DEFAULT_ORPHAN_SOURCES))) {
        const orphanSourcesSet = [...new Set([...orphanSources, ...DEFAULT_ORPHAN_SOURCES])]

        let queriedOrphans = []

        for (const source of orphanSourcesSet) {
            // if (source[0] === '[') {
            //     // naïve way of telling it is a filelink
            //     const orphansFromSource = dv.page(source)?.[ORPHANS_FIELD]
            //     if (orphansFromSource) {
            //         queriedOrphans = [...queriedOrphans, ...orphansFromSource]
            //     }
            // } else {
            // We expect it is a valid dataview source
            const orphansFromSource = [...dv.pages(source).values].reduce((acc, cur) => {
                if (Array.isArray(cur[ORPHANS_FIELD])) {
                    const fileInferredType = tryToInferFileType({
                        inferredRules: ORPHANS_INFERRANCE_RULES,
                        page: cur,
                    })

                    const currentOrphans = orphanage.raise({
                        data: cur[ORPHANS_FIELD],
                        context: {
                            fromFileOfPath: cur.file.path,
                            disguiseAs: fileInferredType ?? "links",
                        }
                    })
                    return [...acc, ...currentOrphans]
                }
                return acc;
            }, [])
            queriedOrphans = [...queriedOrphans, ...orphansFromSource]
            // }
        }

        logger.log({ queriedOrphans })

        orphanPages = [...orphanPages, ...queriedOrphans]

        logger?.logPerf("Searching for orphans in sources")
    }

    if (!vm.disableSet.has("fileorphans")) {
        const currentFileOrphans = orphanage.raise({
            data: dv.page(currentFilePath)?.[ORPHANS_FIELD],
            context: {
                fromFileOfPath: currentFilePath,
                disguiseAs: filter?.current,
            }
        })

        logger.log({ currentFileOrphans })

        orphanPages = [...orphanPages, ...currentFileOrphans]

        logger?.logPerf("Handling current file orphans")
    }

    if (!vm.disableSet.has("inferredorphans")) {
        const computeInferredOrphans = ({field, value}) => {
            if (typeof value !== 'string') return []

            const inLink = dv.parse(value) // transform [[value]] into a link
            if (!isObject(inLink)) return []

            const page = dv.page(inLink.path)
            if (!page) return []

            return orphanage.raise({
                data: page[ORPHANS_FIELD],
                context: {
                    fromFileOfPath: page.file.path,
                    disguiseAs: field,
                }
            })
        }

        for (const field in filter) {
            if (USER_FIELDS.get(field) !== "link") continue

            let inferredOrphans = []

            if (Array.isArray(filter[field])) {
                inferredOrphans = filter[field].reduce((acc, cur) => {
                    return [...acc, ...computeInferredOrphans({ field, value: cur })]
                }, [])
            } else {
                inferredOrphans = computeInferredOrphans({ field, value: filter[field] })
            }

            logger.log({ inferredOrphans })

            orphanPages = [...orphanPages, ...inferredOrphans]

            logger?.logPerf("Handling inferred orphans")
        }
    }

    return orphanPages
}

const orphanPages = !vm.disableSet.has("orphans") 
    ? computeOrphans()
    : []

const pageManager = new module.PageManager({
    utils: { normalizeLinksPath, valueToDateTime, isEmpty, isObject, shuffleArray, buildInvertedMap },
    dv, logger, orphanage, currentFilePath,
    customFields,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
    seed: RANDOM_SEED,
})

const qs = new module.Query({ utils: { isObject }, dv, logger })

let pages = []
if (!vm.disableSet.has("query")) {
    pages = await pageManager.buildAndRunFileQuery({filter, qs, initialSubset: orphanPages})
    logger.log({ queriedPages: pages })
} else {
    pages = orphanPages
}

if (!pages.length) {
    logger?.warn("No pages queried...")
    return
}

//#endregion

/**
 * At this point, the pages have a random sort.
 * For example when trying the same query on 3 different devices, all on the same vault, the order will be different
 * It means that when relying on the seeded random number, the order in which the pages are displayed will be different on each device
 */
const extraSortOptions = {
    standardizeOrder: UNIFORM_ORDER_WITH_RANDOM_SEED_ON_ALL_DEVICES
}

await pageManager.sortPages({ pages, sort, options: extraSortOptions })

//#region Build the grid of score for the DOM
const renderTimelineTrack = () => {
    return `<input type="range" class="timeline" max="100" value="0">`
}

/**
 *
 * @param {string|number} length - if it is a number, it will be converted to timecode
 * @param {boolean} trim
 */
const renderTimecode = (length) => {
    if (typeof length === "number") {
        length = convertDurationToTimecode(length)
    }
    return `<div class="timecode"><span>${length}</span></div>`
}

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
      , soundTag = ""
      , trackTag = ""
      , timecodeTag = ""
      , urlTag = ""
      , serviceTag = ""

    if (!vm.disableSet.has("filelink")) {
        fileTag = `<span class="file-link"></span>`
    }

    const ytVideo = module.YouTubeManager?.extractInfoFromYouTubeUrl(p[URL_FIELD])

    if (!vm.disableSet.has("thumbnail")) {
        if (!module.isValidPropertyValue(p[THUMBNAIL_FIELD])) {
            if (ytVideo) {
                imgTag = Renderer.renderImageFromUrl(module.YouTubeManager?.buildYouTubeImgUrlFromId(ytVideo.id))
            } else {
                imgTag = Renderer.renderImageFromUrl(p[URL_FIELD], { tryToInfer: true })
            }
        } else {
            imgTag = Renderer.renderImage(p[THUMBNAIL_FIELD])
        }
    }

    if (p[URL_FIELD]) {
        let url = (FORCE_CLASSIC_YOUTUBE_URL && ytVideo) ? module.YouTubeManager?.buildYouTubeUrlFromId(ytVideo.id) : p[URL_FIELD]

        if (ytVideo?.t) {
            url += `&t=${ytVideo.t}`
        }

        imgTag = Renderer.renderExternalUrlAnchor({
            url,
            children: imgTag,
        })
    }

    if (DISPLAY_SERVICE_ICONS) {
        const serviceName = /data-service="([^"]*)"/.exec(imgTag)[1]

        if (serviceName) {
            serviceTag = icons[serviceName + "Icon"]
        }
    }

    if (p[LENGTH_FIELD] && !vm.disableSet.has("timecode")) {
        timecodeTag = renderTimecode(p[LENGTH_FIELD])
    }



    /*
    MP3 player bugs on Android unfortunately 😩 (at least on my personal android phone which runs on Android 13)
    Some music might load and play entirely without any issue
    while other have an incorrect duration in the timestamp and freeze at some point when played

    This strange behaviour simply make the audio file players on Android unreliable thus unusable (since you can't predict it)
    So i prefer disabling it completely rather than having a buggy feature
    Remove the `os !== "Android"` if you want to try it on yours
    */
    if (p[AUDIO_FILE_FIELD] && !vm.disableSet.has("audioplayer")) {
        soundTag = await Renderer.renderMP3Audio({
            audioFile: p[AUDIO_FILE_FIELD],
            volumeOffset: p[VOLUME_FIELD],
            preload: AUDIO_DEFAULT_PRELOAD,
        })
        trackTag = renderTimelineTrack()
    }

    thumbTag = `<div class="thumb-stack">
        ${imgTag}
        ${soundTag}
        ${soundTag ? trackTag : ""}
        ${timecodeTag}
    </div>`

    const articleStyle = resolveArticleStyle({
        options: {
            align: ARTICLE_ALIGN,
        },
    })

    const article = `\
<article class="item" ${articleStyle}>
    ${thumbTag ?? ""}
    ${fileTag}
    ${urlTag ?? ""}
    ${serviceTag}
</article>`

    return {
        html: article,
        extra: buildExtraChildrenHTML(p),
    }
}

let addScoreCellHasBeenInserted = false

const gridManager = module.CollectionManager.makeGridManager({
    obsidian,
    container,
    component,
    currentFilePath,
    pages,
    pageToChild,
    logger, icons,
    numberOfElementsPerBatch: NUMBER_OF_SCORES_PER_BATCH,
    disableSet: vm.disableSet,
    extraLogicOnNewChunk: [
        (gm) => {
            audioManager.manageMp3Scores(gm)
        },
        (gm) => {
            if (!gm.everyElementsHaveBeenInsertedInTheDOM()
                || gm.disableSet.has("addscore")
                || gm.disableSet.has("addscorecell")
                || addScoreCellHasBeenInserted
            ) {
                return
            }

            const addScoreCellDOM = gm.container.createEl("article", { cls: "add-file" })
            addScoreCellDOM.innerHTML = gm.icons.filePlusIcon(24)
            gm.parent.appendChild(addScoreCellDOM)
            addScoreCellHasBeenInserted = true

            addScoreCellDOM.onclick = fileManager.handleAddFile.bind(fileManager)
        }
    ],
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
await gridManager.insertNewChunk()

logger?.logPerf("Baking and inserting first cells in the DOM")

//#endregion

//#region Masonry layout
if (MASONRY_LAYOUT && !vm.disableSet.has('masonry')) {

    const masonryManager = new module.Masonry(gridManager.parent)

    const gridResizeObserver = new ResizeObserver(() => {
        masonryManager.resizeAllGridItems()
    });

    /**
     * Since I don't unobserve anywhere, it could give memory leaks...
     * According to this SO post: https://stackoverflow.com/questions/67581868/should-i-call-resizeobserver-unobserve-for-removed-elements
     * The garbage collector should disconnect it once the grid has been removed from the DOM
     * But when does it get removed by Obsidian ¯\_(ツ)_/¯
     */
    gridResizeObserver.observe(masonryManager.grid)

    /**
     * This workaround is only there because sometimes, when the view sits in a full popout window,
     * the insertion of element alone won't trigger the resize observer above
     * for a reason I don't understand so we have to give it a hand.
     *
     * There is no need to add this overhead on mobile since extra windows aren't available
     */
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

// Prepare for next batch
await gridManager.bakeNextHTMLBatch(),
gridManager.setupInfiniteLoading()

logger.viewPerf()
}}

// #region Meta-Bind's extras

const IGNORED_PROPS = [
    'alias',
    'aliases',
    "cssclass",
    "cssclasses",
]

/**
 * @draft
 * Takes an object containing flattened parameters and returns them into an object passed to this view
 *
 * @returns {object}
 */
export const buildViewParams = (dependencies, params = {}) => {
    const filter = {}
    let sort = {}

    // Handles filters
    for (const prop in params) {
        if (IGNORED_PROPS.some(p => p === prop)) continue

        if (prop === "sort") continue

        const propType = USER_FIELDS.get(prop)

        console.log({
            prop,
            value: params[prop],
            type: propType
        })

        if (!prop || !dependencies?.isValidPropertyValue(params[prop])) {
            continue
        }

        filter[prop] = params[prop]
    }

    // Handles sort
    const seed = parseInt(params.sort, 10)
    if (!Number.isNaN(seed)) {
        sort = {
            shuffle: seed
        }
    } else {
        sort = params.sort
    }

    console.log({filter, sort})

    return {
        filter,
        sort,
        debug: true,
    }
}

/**
 * @draft
 * @todo make it dynamic, both regarding the rendering and the setup phase
 */
export const buildSettingsCallout = (engine) => {
    const markdownBuilder = engine.markdown.createBuilder();

    const callout = markdownBuilder.createCallout(
        "**Settings**",
        "NONE",
        "")

    callout.addText('🎙 Artist `INPUT[text(placeholder(Artist Name)):artist]` `INPUT[suggester(optionQuery(#🎙), useLinks(partial)):artist]`');
    callout.addText('`INPUT[inlineListSuggester(optionQuery(#🎙), useLinks(partial)):artist]`');

    callout.addText('***');

    callout.addText('🎭 In `INPUT[text(placeholder(Media Name)):in]` `INPUT[suggester(optionQuery("DB/📺"), useLinks(partial)):in]`');
    callout.addText('`INPUT[inlineListSuggester(optionQuery("DB/📺"), useLinks(partial)):in]`');

    callout.addText('***');

    callout.addText('🌀 Sort `INPUT[inlineSelect(defaultValue(""), option(random, 🎲 Random), option(recent, 📬 Recently added), option("", 🔤 Alphabetically)):sort]`');

    callout.addText('***');

    callout.addText('🏷 Tags `INPUT[inlineSelect(defaultValue(""), option(apaisante, 💆 Soothing), option(banger, 💃 Banger), option(calme, 🔉 Calm), option(douce, 🍯 Douce), option("", All)):tags_]`');

    callout.addText('***');

    callout.addText('🙊 No voice `INPUT[toggle:no-voice]`');

    return markdownBuilder;
}

// #endregion