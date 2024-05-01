/**
 * Class that contains functions used to measure performance and log things in file
 * TODO: Ease the writing of nested callout inside debug file
 */
export class Logger {
    /**
     * @param {object} _ 
     * @param {'console' | 'file' | 'both'} _.output
     * TODO: Fails silently if output is set to 'file' or 'both' yet the filepath isn't specified
     * TODO: Supports "level" property
     */
    constructor({app, output = 'console', filepath = '', level = "debug", dry = false} = {}) {
        this.inceptionTime = performance.now()
        this.startTime = this.inceptionTime
        this.perfTime = null
        this.app = app
        this.dry = dry
        this.level = level
        this.output = output
        this.filepath = filepath

        /** @private */
        this.methods = new Map()
        .set("console", {
            log: (...vargs) => console.log.apply(this, vargs),
            info: (...vargs) => console.info.apply(this, vargs),
            warn: (...vargs) => console.warn.apply(this, vargs),
            error: (...vargs) => console.error.apply(this, vargs),
            table: (...vargs) => console.table.apply(this, vargs),
            clear: () => console.clear(),
        })
        .set("file", {
            log: (...vargs) => this.#fileLoggingMethod("", ...vargs),
            info: (...vargs) => this.#fileLoggingMethod("info", ...vargs),
            warn: (...vargs) => this.#fileLoggingMethod("warning", ...vargs),
            error: (...vargs) => this.#fileLoggingMethod("error", ...vargs),
            table: (...vargs) => this.#fileLoggingMethod("", ...vargs),
            clear: () => this.clearNote(this.filepath),
        })
    }

    #fileLoggingMethod(calloutType, ...vargs) {
        if (calloutType) {
            this.appendCalloutHeadToNote({
                path: this.filepath,
                text: vargs[0],
                type: calloutType.toUpperCase(),
                mode: '+',
            })
        }

        for (let i = 0; i < vargs.length; i++) {
            if (i === 0 && calloutType) continue

            this.appendToNote(this.filepath, vargs[i])
        }
    }

    #method(method, ...vargs) {
        if (this.dry) return

        if (this.output !== 'file') {
            this.methods.get("console")[method](...vargs)
        }

        if (this.output !== 'console') {
            this.methods.get("file")[method](...vargs)
        }
    }
    log(...vargs) { this.#method("log", ...vargs) }
    info(...vargs) { this.#method("info", ...vargs) }
    warn(...vargs) { this.#method("warn", ...vargs) }
    error(...vargs) { this.#method("error", ...vargs) }
    table(...vargs) { this.#method("table", ...vargs) }
    clear() { this.#method("clear") }


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
     * Log how many time occured since the last time this function was called
     * or since inception time if this function was called for the first time
     * @param {string} label 
     */
    logPerf = (label) => {
        if (this.dry) return

        this.perfTime = performance.now()
        this.info(
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

        this.info(
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
     * @param {string} text 
     * @param {number} calloutLevel 
     * @returns {string}
     */
    #handleCalloutLevel(text, calloutLevel) {
        if (calloutLevel < 1) {
            return text
        }

        const prefix = '>'.repeat(calloutLevel)
        const lines = text.split('\n')

        const prefixedLines = lines.map(line => prefix + ' ' + line)

        return prefixedLines.join('\n')
    }

    /**
     * Given as-is by GPT-4o
     */
    #markdownTable(data) {
        if (typeof data !== 'object' || data === null) {
            return '';
        }

        const rows = [];
        const headers = new Set();

        function formatValue(value) {
            if (Array.isArray(value)) {
                return `Array(${value.length})`;
            } else if (typeof value === 'function') {
                const funcString = value.toString();
                const params = funcString.slice(funcString.indexOf('('), funcString.indexOf(')') + 1);
                return `${params} => {...}`;
            } else if (typeof value === 'object' && value !== null) {
                return value; // Return object to be further processed
            }
            return value;
        }

        function processItem(key, value, parentKey = '') {
            const item = { '(index)': parentKey ? `${parentKey}.${key}` : key };
            const formattedValue = formatValue(value);

            if (typeof formattedValue === 'object' && formattedValue !== null) {
                Object.keys(formattedValue).forEach(subKey => {
                    item[subKey] = formatValue(formattedValue[subKey]);
                    headers.add(subKey);
                });
            } else {
                item['(value)'] = formattedValue;
                headers.add('(value)');
            }

            headers.add('(index)');
            rows.push(item);
        }

        Object.keys(data).forEach(key => {
            processItem(key, data[key]);
        });

        const headerList = ['(index)', ...Array.from(headers).filter(header => header !== '(index)')];
        let markdown = `\n| ${headerList.join(' | ')} |\n`;
        markdown += `| ${headerList.map(() => '---').join(' | ')} |\n`;

        rows.forEach(row => {
            const rowData = headerList.map(header => row[header] !== undefined ? row[header] : '');
            markdown += `| ${rowData.join(' | ')} |\n`;
        });

        return markdown;
    }

    /**
     * Only works on Markdown file
     * It creates the note if it doesn't exist though the folders in the path must exists
     * TODO: Create the folders in the path if they don't exist
     * @param {string} path - The function automatically adds '.md' at the end if it isn't already there
     * @param {*} text - The text to append at the end of the note
     */
    appendToNote = async (path, text, calloutLevel = 0) => {
        if (this.dry || !path || !text) return

        if (!path.endsWith('.md')) {
            path += '.md'
        }

        if (typeof text === 'object') {
            text = this.#markdownTable(text)
        } else if (typeof text !== 'string') {
            text = text.toString()
        }
        text = this.#handleCalloutLevel(text, calloutLevel)

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

    /**
     * 
     * @param {object} _ 
     * @param {string} _.path
     * @param {string} _.text
     * @param {string} _.type
     * @param {'' | '+' | '-'} _.mode 
     * @param {boolean} _.solo - Wether or not it should append a newline below the callout
     * @returns 
     */
    appendCalloutHeadToNote = async ({path, text, type, mode, solo = true, level = 0}) => {
        if (!type) return

        const calloutHead = `[!${type.toUpperCase()}]${mode}`

        text = this.#handleCalloutLevel(`${calloutHead} ${text}`, level + 1)
        text += solo ? '\n\n' : ''

        await this.appendToNote(path, text, level)
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