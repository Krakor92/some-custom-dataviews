class Logger {
    /**
     * Class that contains functions used to measure performance and log things in file
     */
    Logger = class {
        /**
         * @param {object} _ 
         * @param {'console' | 'file' | 'both'} _.output
         * TODO: Fails silently if output is set to 'file' or 'both' yet the filepath isn't specified
         */
        constructor({app, output = 'console', filepath = '', dry = false} = {}) {
            this.inceptionTime = performance.now()
            this.startTime = this.inceptionTime
            this.perfTime = null
            this.app = app
            this.dry = dry
        }

        log(...vargs) {
            if (this.dry) return

            console.log.apply(this, vargs)
        }

        /**
         * Hacky but it's for debug purposes
         * @param {number} duration
         * @returns {string} The duration expressed as a string
         */
        #buildDurationLog = (duration) => {
            if (duration >= 1000) {
                return `${(duration / 1000.0).toPrecision(3)} seconds`
            }
            return `${duration.toPrecision(3)} milliseconds`
        }

        /**
         * Log how many time occured since the last time to this function
         * or since inception time if this function was called for the first time
         * @param {*} label 
         */
        logPerf = (label) => {
            if (this.dry) return

            this.perfTime = performance.now()
            console.info(
                `${label} took ${this.#buildDurationLog(
                    this.perfTime - this.startTime
                )}`
            )
            this.startTime = this.perfTime
        }

        /**
         * Call this method at the end of your view to measure its total computing time
         */
        viewPerf = () => {
            if (this.dry) return

            console.info(
                `View took ${this.#buildDurationLog(
                    performance.now() - this.inceptionTime
                )} to run`
            )
        }

        reset = (number = performance.now(), complete = false) => {
            if (complete) this.inceptionTime = number
            this.startTime = number
        }

        /**
         * Only works on Markdown file
         * It creates the note if it doesn't exist
         * @param {string} path - The function automatically adds '.md' at the end if it isn't already there
         * @param {string} text - The text to append at the end of the note
         */
        appendTextToNote = async (path, text) => {
            if (this.dry) return

            if (!path.endsWith('.md')) {
                path += '.md'
            }

            let file = this.app.metadataCache.getFirstLinkpathDest(path, "")
            if (!file) {
                return await this.app.vault.create(path, text)
            }

            this.app.vault.process(file, (data) => {
                if (!data.endsWith('\n')) data += '\n'
                if (!text.endsWith('\n')) text += '\n'
                return data + text
            })
        }

        clearNote = async (path) => {
            if (this.dry) return

            if (!path.endsWith('.md')) {
                path += '.md'
            }

            let file = this.app.metadataCache.getFirstLinkpathDest(path, "")
            if (!file) return

            this.app.vault.process(file, (data) => {
                return ''
            })
        }
    }
}