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

/** The first value is the name of your field, the second value is its type: right now only 'date' and 'link' are available */
const USER_FIELDS = new Map()
    .set('added', 'date')
    .set('release', 'date')
    .set('from', 'link')
    .set('in', 'link')
    .set('artist', 'link')

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

// How many pages do you want to render at first and each time you reach the end of the grid
const NUMBER_OF_SCORES_PER_BATCH = 20

// It only works in the context of the page, if you have another page opened with another audio file playing
// then it won't stop it if you play one in the current page
const ENABLE_SIMULTANEOUS_AUDIO_PLAYING = false

// If false, then the end of the last loaded music will start the first one in the grid
const STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC = true

/** @type {'auto'|'metadata'|'none'} */
const AUDIO_DEFAULT_PRELOAD = 'metadata'

// Between 0 (silent) and 1 (loudest)
const DEFAULT_VOLUME = 0.4

// Replace it with a number if you desire your mix to be predictable with a given set of tracks
const RANDOM_SEED = null

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
 * Note the following:
 * - This layout require the article align variable specified above to be equal to 'center'
 * - The computing involved in order to make the Masonry layout work add some lag to the rendering phase compared to a naive grid implementation
 * - It messes with the card order so it's no problem if you're using a random sort order
 *   otherwise, you might want to disable masonry for your view using the `disable: "masonry"` property
 * - Sometimes it might fail to format correctly on article appending
 */
const MASONRY_LAYOUT = true

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

// You can add any disable values here to globally disable them in every view
const GLOBAL_DISABLE = ""

disable = GLOBAL_DISABLE + ' ' + disable

// The path where the main module is
const MODULE_PATH = "_js/Krakor.mjs"

const module = await engine.importJs(MODULE_PATH)

await module.setupView({
    app, component, container, module,
    viewName: 'jukebox',
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

const fileManager = new module.FileManager({
    dv, utils, app, currentFilePath,
    directoryWhereToAddFile: DEFAULT_SCORE_DIRECTORY,
    properties: filter,
    userFields: USER_FIELDS,
    logicOnAddFile: [
        async (fileManager, fieldsPayload) => {
            const textInClipboard = await navigator.clipboard.readText();

            if (utils.uriRegex.test(textInClipboard)) { //text in clipboard is an "http(s)://anything.any" url
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
    enableSimultaneousPlaying: ENABLE_SIMULTANEOUS_AUDIO_PLAYING,
    autoplay: !vm.disableSet.has("autoplay"),
    stopAutoplayWhenReachingLastMusic: STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC,
    defaultVolume: DEFAULT_VOLUME,
    logger, utils, icons,
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

    const youTubeManager = new module.YouTubeManager({ utils, logger })

    /**
     * Button responsible of launching an anonymous YouTube playlist.
     */
    buttonBar.addButton({
        name: 'playlist',
        icon: icons.listMusicIcon,
        event: () => {
            let maxLengthAccepted = utils.convertTimecodeToDuration(MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST)
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
        if (!utils.isObject(page[AUDIO_FILE_FIELD])) {
            // That means it's a http link (or at least it should be one) so we consider it's valid
            return true
        }

        // If it's a link then we accept it only if it exists inside the vault
        return await utils.linkExists(page[AUDIO_FILE_FIELD])
    })
})

const qs = new module.Query({ dv })

const orphanage = new module.Orphanage({
    utils,
    directory: DEFAULT_SCORE_DIRECTORY,
    thumbnailDirectory: DEFAULT_THUMBNAIL_DIRECTORY,
})

const orphanPages = vm.disableSet.has("orphans")
    ? []
    : orphanage.raise(dv.page(currentFilePath)?.[ORPHANS_FIELD])

const pageManager = new module.PageManager({
    dv, logger, utils, orphanage, currentFilePath,
    customFields,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
    seed: RANDOM_SEED,
})

logger?.logPerf("Everything before querying pages")


let queriedPages = []
if (!vm.disableSet.has("query")) {
    queriedPages = await pageManager.buildAndRunFileQuery({filter, qs})
    logger.log({ queriedPages })
}

const pages = [...queriedPages, ...orphanPages]

if (!pages.length) {
    logger?.warn("No pages queried...")
    return
}

//#endregion

await pageManager.sortPages({ pages, sort })

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
        length = utils.convertDurationToTimecode(length)
    }
    return `<div class="timecode"><span>${length}</span></div>`
}

const Renderer = new module.Renderer({utils, icons})

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
        extra[".file-link"] = Renderer.renderInternalFileAnchor({ path: p.file.path, name: p[TITLE_FIELD] })
    } else {
        extra[".file-link"] = Renderer.renderInternalFileAnchor(p.file)
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
        if (!module.Utils.isValidPropertyValue(p[THUMBNAIL_FIELD])) {
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

    const article = `<article ${articleStyle}>
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


const gridManager = module.CollectionManager.makeGridManager({
    obsidian,
    container,
    component,
    currentFilePath,
    pages,
    pageToChild,
    logger, icons, utils,
    numberOfElementsPerBatch: NUMBER_OF_SCORES_PER_BATCH,
    disableSet: vm.disableSet,
    extraLogicOnNewChunk: [
        (gm) => {
            audioManager.manageMp3Scores(gm)
        },
        (gm) => {
            if (!gm.everyElementsHaveBeenInsertedInTheDOM()) return

            gm.logger?.log(`Grid has finished rendering and has now ${gm.totalNumberOfChildrenInsertedInTheDOM} elements in the DOM`)
            if (gm.disableSet.has("addscore") || gm.disableSet.has("addscorecell")) return;

            const addScoreCellDOM = gm.container.createEl("article", { cls: "add-file" })
            addScoreCellDOM.innerHTML = gm.icons.filePlusIcon(24)
            gm.parent.appendChild(addScoreCellDOM);

            addScoreCellDOM.onclick = fileManager.handleAddFile.bind(fileManager)
        }
    ],
})

gridManager.buildParent()

await gridManager.bakeNextHTMLBatch()
await gridManager.insertNewChunk(),


logger?.logPerf("Baking and inserting first cells in the DOM")

vm.root.appendChild(gridManager.parent);
//#endregion

//#region Masonry layout
if (MASONRY_LAYOUT && !vm.disableSet.has('masonry')) {

    const masonryManager = new module.Masonry(gridManager.parent)

    const resizeObserver = new ResizeObserver(() => {
        masonryManager.resizeAllGridItems()
    });

    /**
     * Since I don't unobserve anywhere, it could give memory leaks...
     * According to this SO post: https://stackoverflow.com/questions/67581868/should-i-call-resizeobserver-unobserve-for-removed-elements
     * The garbage collector should disconnect it once the grid has been removed from the DOM
     * But when does it get removed by Obsidian ¯\_(ツ)_/¯
     */
    resizeObserver.observe(masonryManager.grid)
}
//#endregion

// Prepare for next batch
await gridManager.bakeNextHTMLBatch(),
gridManager.initInfiniteLoading()

logger.viewPerf()
}}


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
export const buildViewParams = (module, params = {}) => {
    const filter = {}
    let sort = {}

    // Handle filters
    for (const prop in params) {
        if (IGNORED_PROPS.some(p => p === prop)) continue

        if (prop === "sort") continue

        const propType = USER_FIELDS.get(prop)

        console.log({
            prop,
            value: params[prop],
            type: propType
        })

        if (!prop || !module.Utils.isValidPropertyValue(params[prop])) {
            continue
        }

        filter[prop] = params[prop]
    }

    sort = params.sort

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
