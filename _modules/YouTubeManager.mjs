/**
 * Class that contains miscelaneous utility functions regarding YouTube service
 */
export class YouTubeManager {
    constructor({ utils, logger }) {
        this.utils = utils
        this.logger = logger
    }

    /**
     * This function supports these different types of YouTube urls:
     * 
     * https://www.youtube.com/watch?v=dQw4w9WgXcQ - Classic format  
     * https://youtu.be/dQw4w9WgXcQ - Short mobile format  
     * https://music.youtube.com/watch?v=oqy2N1jM2tU - YouTube Music format  
     * https://www.youtube.com/watch_videos?video_ids=dQw4w9WgXcQ,y6120QOlsfU - Playlist format  
     * 
     * In the case of a playlist, it extract everything after the `video_ids=`
     * 
     * @param {string} url 
     */
    extractIdFromYouTubeUrl(url) {
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
    
            if (!url || !url.includes("youtu")) return prev;
    
            let id = url.indexOf("watch_videos")
            if (id !== -1) {
                return prev + ',' + url.substring(id + 23)
            }
    
            id = url.indexOf("?t=")
            if (id !== -1) {
                const t = url.substring(id + 3)
                if (parseInt(t) > maxTAccepted) {
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
    
            const sep = prev !== "" ? ',' : ''
    
            return prev + sep + url.substring(17, 28)
        }, "")
    
        return baseUrl + aggregatedYoutubeUrls
    } 
}
