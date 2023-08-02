class Renderer {
    /**
     * Class for rendering things in Obsidian.
     * To be used with DataviewJS and CustomJS plugins
     * @author Krakor <krakor.faivre@gmail.com>
     */
    Renderer = class {
        constructor({utils, icons}) {
            this.utils = utils
            this.icons = icons
        }

        imgBaseAttributes = `referrerpolicy="no-referrer"`

        /**
         * @param {string} display
         * @returns The style used by some gallery thumbnail
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

        #resolveVaultThumbnailStyle(thumb) {
            let display = thumb.display

            if (display === undefined) return null

            const firstPipeId = display.indexOf("|")
            if (firstPipeId !== -1) {
                // Instead of having display be "0.2|400", it's going to be "0.2" only
                display = display.substring(0, firstPipeId)
            }

            return this.#resolveThumbnailStyle(display)
        }

        #resolveThumbnailUrlFrom3rdParty(url) {
            if (url.includes("youtu.be")) {
                const startOfId = url.indexOf("youtu.be/") + 9
                const id = url.substring(startOfId, startOfId + 11)
                return `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" ${this.imgBaseAttributes}>`
            }

            if (url.includes("www.youtube.com")) {
                const startOfId = url.indexOf("?v=") + 3
                const id = url.substring(startOfId, startOfId + 11)
                return `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" ${this.imgBaseAttributes}>`
            }

            if (url.includes("dailymotion")) {
                const startOfId = url.lastIndexOf('/') + 1
                const id = url.substring(startOfId)
                return `<img src="https://www.dailymotion.com/thumbnail/video/${id}" ${this.imgBaseAttributes}>`
            }

            return null
        }

        /**
         * 
         * @param {string} url 
         */
        renderThumbnailFromUrl = (url) => {
            if (!url) return ""

            const resolvedUrl = this.#resolveThumbnailUrlFrom3rdParty(url)
            if (resolvedUrl) return resolvedUrl

            let style = null;
            if (url[0] === '!') {
                style = this.#resolveUrlThumbnailStyle(url)

                const startOfUrl = url.lastIndexOf('(') + 1
                url = url.substring(startOfUrl, url.length - 1)
            }

            return `<img src="${url}" ${this.imgBaseAttributes} ${style ?? ""}>`
        }

        /**
         * @param {import('../view').Link} thumb
         */
        renderThumbnailFromVault(thumb) {
            if (!thumb) return ""

            const style = this.#resolveVaultThumbnailStyle(thumb)

            return `<img src="${window.app.vault.adapter.getResourcePath(
                thumb.path
            )}" ${this.imgBaseAttributes} ${style ?? ""}>`
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

        /**
         * 
         * @param {object} _
         * @param {import('../view').Link} _.audioFile
         * @param {number?} _.volumeOffset
         * @param {'auto' | 'metadata' | 'none'} _.preload
         */
        renderMP3Audio = async ({ audioFile, volumeOffset, preload = "metadata" }) => {
            if (!audioFile) return ""

            const mp3Exists = await this.utils.linkExists(audioFile)
            if (!mp3Exists) return ""

            const dataVolume = volumeOffset ? `data-volume="${volumeOffset}"` : ""

            return `
            <div class="audio-player">
                <button class="player-button">
                    ${this.icons.playIcon}
                </button>
                <audio preload="${preload}" ${dataVolume}>
                    <source src="${window.app.vault.adapter.getResourcePath(audioFile.path)}"/>
                </audio>
            </div>`;
        }

        /**
         * 
         * @param {import('../view').Link} _.filelink
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
}