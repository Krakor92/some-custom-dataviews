/**
 * @file Render a grid of music from your vault. Files can have an mp3 embedded, an url or both
 * @depends on DataviewJS
 * @author Krakor <krakor.faivre@gmail.com>
 * @link https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox
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

// You can add any disable values here to globally disable them in every view
const GLOBAL_DISABLE = ""

await forceLoadCustomJS()
const utils = new customJS[DEFAULT_CUSTOMJS_CLASS].Utils({app: dv.app})
const logger = new customJS[DEFAULT_CUSTOMJS_CLASS].Logger({app: dv.app, dry: !debug})

const vm = new customJS[DEFAULT_CUSTOMJS_CLASS].ViewManager({
    dv, logger, utils,
    name: 'jukebox',
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
const AUDIO_FILE_FIELD = "mp3"
const URL_FIELD = "url"
const LENGTH_FIELD = "length"
const VOLUME_FIELD = "volume"

// The 'from' dataview query used to query the music markdown files
const DEFAULT_FROM = '#🎼 AND -"_templates"'

// Where to create the file when we press the + tile/button
const DEFAULT_SCORE_DIRECTORY = "DB/🎼"

// Only used by the orphan system
const DEFAULT_THUMBNAIL_DIRECTORY = "_assets/🖼/Thumbnails"

// How many pages do you want to render at first and each time you reach the end of the grid
const NUMBER_OF_SCORES_PER_BATCH = 20

// It only works in the context of the page, if you have another page opened with another mp3 playing
// then it won't stop it if you play one in the current page
const ENABLE_SIMULTANEOUS_MP3_PLAYING = false

// If false, then the end of the last loaded music will start the first one in the grid
const STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC = true

/** @type {'auto'|'metadata'|'none'} */
const AUDIO_DEFAULT_PRELOAD = 'metadata'

// Between 0 (silent) and 1 (loudest)
const DEFAULT_VOLUME = 0.4

// Until how many seconds in youtube url (?t=) should we consider the music to not be elegible to playlist
const MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST = 12

// Music longer than that won't be included when generating a playlist
const MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST = "12:00"

// If true, hides the top right link icon (it is still clickable)
const HIDE_ICONS = false

// If true, it doesn't display any icon and the whole image become the link
const THUMBNAIL_IS_URL_LINK = true

/** @type {'auto', 'top', 'center', 'bottom'} */
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

const fileManager = new customJS[DEFAULT_CUSTOMJS_CLASS].FileManager({
    dv, utils,
    app: dv.app,
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


const icons = new customJS[DEFAULT_CUSTOMJS_CLASS].IconManager()

//#region Buttons handling
if (!vm.disableSet.has("buttons")) {
    const buttonBar = new customJS[DEFAULT_CUSTOMJS_CLASS].ButtonBar()

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
                        console.warn(`The 't' argument is too deep inside the video of url: '${url}' to be added in the playlist`)
                        return prev
                    }
                }

                if (utils.convertTimecodeToDuration(length) > maxLengthAccepted) {
                    console.warn(`${file.name} is too long to be added in the playlist`)
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

    vm.rootNode.appendChild(dv.el("div", htmlButtons, { cls: "buttons", attr: {} }))
    buttonBar.setEvents(vm.rootNode.querySelectorAll('.buttons button'))
}
//#endregion

//#region Query the pages based on filters

const customFields = new Map()

customFields.set('mp3Only', async (qs) => {
	logger.log(`%cFilter on mp3Only 🔊`, 'color: #7f6df2; font-size: 13px')
	qs.withExistingField(AUDIO_FILE_FIELD)
	await qs.asyncFilter(async (page) => await utils.linkExists(page[AUDIO_FILE_FIELD]))
})

const qs = new customJS[DEFAULT_CUSTOMJS_CLASS].Query({ dv })

const orphanage = new customJS[DEFAULT_CUSTOMJS_CLASS].Orphanage({
    utils,
    directory: DEFAULT_SCORE_DIRECTORY,
    thumbnailDirectory: DEFAULT_THUMBNAIL_DIRECTORY,
})
const orphanPages = vm.disableSet.has("orphans") ? [] : orphanage.raise(dv.current().orphans)

const pageManager = new customJS[DEFAULT_CUSTOMJS_CLASS].PageManager({
    dv, logger, utils, orphanage,
    customFields,
    userFields: USER_FIELDS,
    defaultFrom: DEFAULT_FROM,
})

let queriedPages = []
if (!vm.disableSet.has("query")) {
	queriedPages = await pageManager.buildAndRunFileQuery({filter, qs})
	logger.log({ queriedPages })
}

const pages = [...queriedPages, ...orphanPages]

if (!pages.length) {
    console.warn("No pages queried...")
    return
}

//#endregion

await pageManager.sortPages({ pages, sort })

//#region Build the grid of score for the DOM
const renderTimelineTrack = () => {
	return `<input type="range" class="timeline" max="100" value="0">`
}

const renderTimecode = (length) => {
	return `<div class="timecode"><span>${length}</span></div>`
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
	const base = `<a href="${url}" class="external-link" rel="noopener target="_blank"`
	return noIcon ?
		`${base}>${children}</a>` :
		`${base}${_resolveAnchorServicePartFromUrl(url)}${children}</a>`;
}

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

const audioManager = new customJS[DEFAULT_CUSTOMJS_CLASS].AudioManager({
	enableSimultaneousPlaying: ENABLE_SIMULTANEOUS_MP3_PLAYING,
	autoplay: !vm.disableSet.has("autoplay"),
	stopAutoplayWhenReachingLastMusic: STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC,
	defaultVolume: DEFAULT_VOLUME,
	logger, utils, icons,
})

const gridManager = new customJS[DEFAULT_CUSTOMJS_CLASS].GridManager({
    dv, logger, icons, utils, fileManager,
	numberOfElementsPerBatch: NUMBER_OF_SCORES_PER_BATCH,
    disableSet: vm.disableSet,
    extraLogicOnNewChunk: [
        (gm) => {
            audioManager.manageMp3Scores(gm)
        },
        (gm) => {
            if (!gm.everyElementsHaveBeenInsertedInTheDOM()) return

            gm.logger.log(`Finish to load: ${gm.batchesFetchedCount * gm.numberOfElementsPerBatch}`)
            if (gm.disableSet.has("addscore") || gm.disableSet.has("addscorecell")) return;

            const addScoreCellDOM = gm.dv.el("article", gm.icons.filePlusIcon(24), { cls: "add-file" })
            gm.grid.appendChild(addScoreCellDOM);

            addScoreCellDOM.onclick = gm.fileManager.handleAddFile.bind(gm.fileManager)
        }
    ],
})

await gridManager.buildArticles({pages, pageToArticle: async (p) => {
    let fileTag = ""
    let thumbTag = ""
    let imgTag = ""
    let soundTag = ""
    let trackTag = ""
    let timecodeTag = ""
    let urlTag = ""
    let mediaTag = ""

    if (!vm.disableSet.has("filelink")) {
        if (p[TITLE_FIELD]) {
            fileTag = `<span class="file-link">
                ${Renderer.renderInternalFileAnchor({ path: p.file.path, name: p[TITLE_FIELD] })}
            </span>`
        } else {
            fileTag = `<span class="file-link">
                ${Renderer.renderInternalFileAnchor(p.file)}
            </span>`
        }
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

    if (THUMBNAIL_IS_URL_LINK) {
        imgTag = renderExternalUrlAnchor({
            url: p[URL_FIELD],
            children: imgTag,
            noIcon: true,
        })
    } else if (p[URL_FIELD] && !vm.disableSet.has("urlicon")) {
        urlTag = `<span class="url-link">
            ${renderExternalUrlAnchor({ url: p[URL_FIELD] })}
        </span>`
    }

    if (p[LENGTH_FIELD] && !vm.disableSet.has("timecode")) {
        timecodeTag = renderTimecode(p[LENGTH_FIELD])
    }

    /*
    MP3 player bugs on Android unfortunately 😩 (at least on my personal android phone which runs on Android 13)
    Some music might load and play entirely without any issue
    while other have an incorrect duration in the timestamp and freeze at some point when played

    This strange behaviour simply make the mp3 players on Android unreliable thus unusable (since you can't predict it)
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

    return article
}})

gridManager.buildGrid()
gridManager.insertNewChunkInGrid()

vm.rootNode.appendChild(gridManager.grid);
//#endregion

//#region Masonry layout
if (MASONRY_LAYOUT && !vm.disableSet.has('masonry')) {

	const vgrid = new customJS[DEFAULT_CUSTOMJS_CLASS].VGrid(gridManager.grid)

	const resizeObserver = new ResizeObserver(() => {
		vgrid.resizeAllGridItems()
	});

	/**
	 * Since I don't unobserve anywhere, it could give memory leaks...
	 * According to this SO post: https://stackoverflow.com/questions/67581868/should-i-call-resizeobserver-unobserve-for-removed-elements
	 * The garbage collector should disconnect it once the grid has been removed from the DOM
     * But when does it get removed by Obsidian ¯\_(ツ)_/¯
	 */
	resizeObserver.observe(vgrid.grid)
}
//#endregion

gridManager.initInfiniteLoading()

logger.viewPerf()
}
