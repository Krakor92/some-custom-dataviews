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
     * @param {import('../_views').Link | string | Array} img - In case of an array, only the first element will be rendered
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
     * @param {import('../_views').Link | string | Array} img - In case of an array, only the first element will be rendered
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
     * @param {import('../_views').Link} link
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
     * @param {import('../_views').Link} _.audioFile
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
     * @param {import('../_views').Link} _.audioFile
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
     * @param {import('../_views').Link} _.filelink
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