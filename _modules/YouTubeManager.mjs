/**
 * Class that contains miscelaneous utility functions regarding YouTube service
 */
export class YouTubeManager {
    constructor({ utils, logger }) {
        this.utils = utils
        this.logger = logger
    }

    static #youtubeUrlRegex = /((?:https?:)\/\/)?((?:www|m|music)\.)?((?:youtube(-nocookie)?\.com|youtu\.be))(\/(?:[\w?&=]+v=|embed\/|live\/|v\/|watch_videos[?&=\w]+video_ids=)?)([\w\-,]+)(\S+)?/

    static #tPartRegex = /[?&]t=(\d+)/

    /**
     * It extract the video id from a youtube url and its query parameters
     *
     * It supports these different types of YouTube urls:
     *
     * https://www.youtube.com/watch?v=dQw4w9WgXcQ - Classic/Desktop format
     * https://youtu.be/dQw4w9WgXcQ - Short mobile format
     * https://music.youtube.com/watch?v=oqy2N1jM2tU - YouTube Music format
     * https://www.youtube.com/watch_videos?video_ids=dQw4w9WgXcQ,y6120QOlsfU - Anonymous playlist format
     *
     * In the case of a playlist, it extract the ids after the `video_ids=`
     *
     * @param {string} url
     */
    static extractInfoFromYouTubeUrl(url) {
        const video = YouTubeManager.#youtubeUrlRegex.exec(url)

        if (!video) return null;

        const t = YouTubeManager.#tPartRegex.exec(video[5] + video[7])

        return {
            id: video[6],
            t: parseInt(t?.[1]),
        }
    }

    static buildYouTubeImgUrlFromId(videoId, resolution = "mqdefault") {
        // return `https://i.ytimg.com/vi/${videoId}/${resolution}.jpg`
        return `https://img.youtube.com/vi/${videoId}/${resolution}.jpg`
    }

    static buildYouTubeUrlFromId(videoId, format = "desktop") {
        if (videoId.contains(',')) {
            return `https://www.youtube.com/watch_videos?video_ids=${videoId}`
        }

        switch (format) {
            case "mobile":
            case "short":
                return `https://youtu.be/${videoId}`
            case "music":
                return `https://music.youtube.com/watch?v=${videoId}`
            default:
                return `https://www.youtube.com/watch?v=${videoId}`
        }
    }

    /**
     * In addition to the url itself, it uses a length property to add extra options to the generated playlist
     *
     * @param {import('../_views').UserFile[]} pages
     * @param {object} settings
     */
    generateAnonymousYouTubePlaylistUriFromPages(pages, {
        maxLengthAccepted = 720,
        maxTAccepted = 12,
        acceptsMusicOfUnknownDuration = true,
    } = {}) {
        /**
         * I would have like to add the ability to generate a dynamic YouTube Music playlist but it's not available...
         */
        const baseUrl = "https://www.youtube.com/watch_videos?video_ids="

        const aggregatedYoutubeUrls = pages.reduce((prev, cur) => {
            const { url, length, file } = cur;

            const video = YouTubeManager.extractInfoFromYouTubeUrl(url)

            if (!video?.id) return prev;

            if (!isNaN(video.t)) {
                if (video.t > maxTAccepted) {
                    this.logger?.warn(`The 't' argument is too deep inside the video of url: '${url}' to be added in the playlist`)
                    return prev
                }
            }

            const duration = typeof length === "number" ? length : this.utils.convertTimecodeToDuration(length)

            if (!acceptsMusicOfUnknownDuration && isNaN(duration)) {
                this.logger?.warn(`${file.name} has an unknown duration. It won't be added in the playlist`)
                return prev
            }

            if (!isNaN(duration) && duration > maxLengthAccepted) {
                this.logger?.warn(`${file.name} is too long to be added in the playlist`)
                return prev
            }

            const separator = prev !== "" ? ',' : ''

            return prev + separator + video.id
        }, "")

        return baseUrl + aggregatedYoutubeUrls
    }
}
