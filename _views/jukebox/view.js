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

// If true, it doesn't display any icon and the whole image become the link
const THUMBNAIL_IS_URL_LINK = true

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
    await Stylist.setStyleContentFromFile(`${scriptPathNoExt}.css`, context.file.path)
}

//#endregion


const fileManager = new module.FileManager({
    dv, utils, app,
    currentFilePath: context.file.path,
    directoryWhereToAddFile: DEFAULT_SCORE_DIRECTORY,
    properties: filter,
    userFields: USER_FIELDS,
    logicOnAddFile: [
        async (fileManager, fieldsPayload) => {
            const textInClipboard = await navigator.clipboard.readText();

            if (utils.httpRegex.test(textInClipboard)) { //text in clipboard is an "http(s)://anything.any" url
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

    buttonBar.addButton({
        name: 'playlist',
        icon: icons.listMusicIcon,
        event: () => {
            const maxLengthAccepted = utils.convertTimecodeToDuration(MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST)
            const baseUrl = "https://www.youtube.com/watch_videos?video_ids="
            const aggregatedYoutubeUrls = pages.reduce((prev, cur) => {
                const { url, length, file } = cur;

                if (!url || !url.includes("youtu")) return prev;

                let id = url.indexOf("watch_videos")
                if (id !== -1) {
                    return prev + ',' + url.substring(id + 23)
                }

                id = url.indexOf("?t=")
                if (id !== -1) {
                    const t = url.substring(id + 3)
                    if (parseInt(t) > MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST) {
                        logger?.warn(`The 't' argument is too deep inside the video of url: '${url}' to be added in the playlist`)
                        return prev
                    }
                }

                if (utils.convertTimecodeToDuration(length) > maxLengthAccepted) {
                    logger?.warn(`${file.name} is too long to be added in the playlist`)
                    return prev
                }

                const sep = prev !== "" ? ',' : ''

                return prev + sep + url.substring(17, 28)
            }, "")

            // Only open in default browser
            // document.location = `https://www.youtube.com/watch_videos?video_ids=` + "qAzebXdaAKk,AxI0wTQLMLI"

            // Does open in Obsidian browser (using Surfing plugin)
            window.open(baseUrl + aggregatedYoutubeUrls)
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
    : orphanage.raise(dv.page(context.file.path)[ORPHANS_FIELD])

const pageManager = new module.PageManager({
    dv, logger, utils, orphanage,
    currentFilePath: context.file.path,
    customFields,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
    seed: RANDOM_SEED,
})

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
const renderTimecode = (length, trim = true) => {
    if (typeof length === "number") {
        length = utils.convertDurationToTimecode(length)
    }
    return `<div class="timecode"><span>${trim ? length.replace(/^[0:]+/, '') : length}</span></div>`
}

/**
 * Returns a string of the form: `data-service="${service}">${serviceIcon}`
 * Right now the data-service isn't used
 * @param {string} url 
 */
const _resolveAnchorServicePartFromUrl = (url) => {
    if (url.includes("youtu")) return `data-service="youtube">${icons.youtubeIcon}`
    if (url.includes("soundcloud")) return `data-service="soundcloud">${icons.soundcloudIcon}`
    if (url.includes("dailymotion")) return `data-service="dailymotion">${icons.dailymotionIcon}`
    if (url.includes("dropbox")) return `data-service="dropbox">${icons.dropboxIcon}`
    if (url.includes("spotify")) return `data-service="spotify">${icons.spotifyIcon}`
    // The icon doesn't hide when HIDE_ICONS is set to true...
    // if (url.includes("deezer")) return `data-service="deezer">${deezerIcon}`

    return `data-service="unknown">${icons.linkIcon}`
}

/**
 * 
 * @param {object} _ 
 * @param {string} _.url 
 */
const renderExternalUrlAnchor = ({ url, children = "", noIcon = false }) => {
    const base = `<a href="${url}" draggable="false" class="external-link"`
    return noIcon ?
        `${base}>${children}</a>` :
        `${base}${_resolveAnchorServicePartFromUrl(url)}${children}</a>`;
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

const gridManager = module.CollectionManager.makeGridManager({
    obsidian,
    container,
    component,
    currentFilePath: context.file.path,
    logger, icons, utils,
    numberOfElementsPerBatch: NUMBER_OF_SCORES_PER_BATCH,
    disableSet: vm.disableSet,
    extraLogicOnNewChunk: [
        (gm) => {
            audioManager.manageMp3Scores(gm)
        },
        (gm) => {
            if (!gm.everyElementsHaveBeenInsertedInTheDOM()) return

            gm.logger?.log(`Finish to load: ${gm.batchesFetchedCount * gm.numberOfElementsPerBatch}`)
            if (gm.disableSet.has("addscore") || gm.disableSet.has("addscorecell")) return;

            const addScoreCellDOM = gm.container.createEl("article", { cls: "add-file" })
            addScoreCellDOM.innerHTML = gm.icons.filePlusIcon(24)
            gm.parent.appendChild(addScoreCellDOM);

            addScoreCellDOM.onclick = fileManager.handleAddFile.bind(fileManager)
        }
    ],
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
    let soundTag = ""
    let trackTag = ""
    let timecodeTag = ""
    let urlTag = ""
    let mediaTag = ""

    if (!vm.disableSet.has("filelink")) {
        fileTag = `<span class="file-link"></span>`
    }

    if (!vm.disableSet.has("thumbnail")) {
        if (!p[THUMBNAIL_FIELD]) {
            imgTag = Renderer.renderThumbnailFromUrl(p[URL_FIELD])
        } else if (typeof p[THUMBNAIL_FIELD] === "string") {
            // Thumbnail is an url (for non youtube music)
            imgTag = Renderer.renderThumbnailFromUrl(p[THUMBNAIL_FIELD])
        } else {
            imgTag = Renderer.renderThumbnailFromVault(p[THUMBNAIL_FIELD])
        }
    }

    if (p[URL_FIELD]) {
        if (THUMBNAIL_IS_URL_LINK) {
            imgTag = renderExternalUrlAnchor({
                url: p[URL_FIELD],
                children: imgTag,
                noIcon: true,
            })
        } else if (!vm.disableSet.has("urlicon")) {
            urlTag = `<span class="url-link">
                ${renderExternalUrlAnchor({ url: p[URL_FIELD] })}
            </span>`
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
        ${mediaTag ?? ""}
    </article>`

    return {
        html: article,
        extra: buildExtraChildrenHTML(p),
    }
}})

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

    /**
     * Since I don't unobserve anywhere, it could give memory leaks...
     * According to this SO post: https://stackoverflow.com/questions/67581868/should-i-call-resizeobserver-unobserve-for-removed-elements
     * The garbage collector should disconnect it once the grid has been removed from the DOM
     * But when does it get removed by Obsidian ¯\_(ツ)_/¯
     */
    resizeObserver.observe(masonryManager.grid)
}
//#endregion

gridManager.initInfiniteLoading()

logger.viewPerf()
}}

/**
 * Check if a given value is a valid property value.
 * The function accept everything except:
 * - Empty object
 * - Empty array
 * - Array with only empty strings
 * - Empty string
 * - Null
 * - Undefined
 * 
 * @param {any} value - The value to check
 * @returns {boolean} - True if the value is valid, false otherwise
 */
const isValidPropertyValue = (value) => {
    if (
        value === undefined
        || value === null
        || (typeof value === "object" && Object.entries(value).length === 0)
        || (Array.isArray(value) && value.every(cell => typeof cell === "string" && cell.trim() === ""))
        || (typeof value === "string" && value.trim() === "")
    ) {
        return false
    }

    return true
}

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
export const buildViewParams = (params = {}) => {
    const filter = {}

    for (const prop in params) {
        if (IGNORED_PROPS.some(p => p === prop)) continue

        // const propType = USER_FIELDS.get(prop)

        console.log({
            prop,
            value: params[prop],
            // type: propType
        })

        if (!prop || !isValidPropertyValue(params[prop])) {
            continue
        }

        filter[prop] = params[prop]
    }

    console.log({filter})

    return {
        filter,
        // sort: sort ?? "random",
        // debug: true,
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
