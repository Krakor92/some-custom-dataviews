class Utils {
    /**
     * Class that contains miscelaneous functions
     * It is used by most of the classes here and an instance of it need to be passed in their constructor
     */
    Utils = class {
        constructor({app}) {
            this.app = app
        }

        httpRegex =
            /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/


        //#region HTML

        /**
         * 
         * @param {HTMLElement} element 
         * @param {string} className 
         */
        getParentWithClass(element, className) {
            // Traverse up the DOM tree until the root (body or html) is reached
            while (element && element !== document.body && element !== document.documentElement) {
                element = element.parentElement;
                if (element?.classList.contains(className)) {
                    return element;
                }
            }
            return null;
        }

        //#endregion

        //#region Javascript
        // Clamp number between two values with the following line:
        clamp = (num, min, max) => Math.min(Math.max(num, min), max)

        delay = async (time) =>
            new Promise((resolve) => setTimeout(resolve, time))

        isObject(o) {
            return (
                o !== null &&
                typeof o === "object" &&
                Array.isArray(o) === false
            )
        }

        /**
         * Implementation given as is by ChatGPT
         * It doesn't handle functions, circular reference or non enumerable properties
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj; // Return primitives and null as is
            }

            if (Array.isArray(obj)) {
                const newArray = [];
                for (let i = 0; i < obj.length; i++) {
                    newArray[i] = this.deepClone(obj[i]);
                }
                return newArray; // Clone arrays
            }

            if (typeof obj === 'object') {
                const newObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        newObj[key] = this.deepClone(obj[key]);
                    }
                }
                return newObj; // Clone objects
            }
        }

        /**
         * Seeded RNG using Linear Congruential Generator
         * @param {number} seed
         */
        seededRNG(seed) {
            return () => {
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                return seed / 4294967296;
            };
        }

        /**
         * It alters the array
         * @from https://stackoverflow.com/a/6274381
         * @param {Array} a
         * @param {number} seed
         */
        shuffleArray(a, seed) {
            const rng = (typeof seed === 'number') ? this.seededRNG(seed) : Math.random;
            let j, x, i;
            for (i = a.length - 1; i > 0; i--) {
                j = Math.floor(rng() * (i + 1));
                x = a[i];
                a[i] = a[j];
                a[j] = x;
            }
        }

        /**
         * @param {string} timecode 
         * @returns {number} The timecode converted to seconds
        */
        convertTimecodeToDuration = (timecode) => {
            const timeArray = timecode?.split(':');
            if (!timeArray || timeArray.length < 2 || timeArray.length > 3) { // It only supports 00:00 or 00:00:00
                return NaN;
            }

            let i = 0
            let total = 0
            if (timeArray.length === 3) {
                const hours = parseInt(timeArray[i++], 10)
                if (isNaN(hours)) return NaN
                total += hours * 3600
            }

            const minutes = parseInt(timeArray[i++], 10)
            if (isNaN(minutes)) return NaN
            total += minutes * 60

            const seconds = parseInt(timeArray[i], 10)
            if (isNaN(seconds)) return NaN

            return total + seconds
        }
        //	#endregion

        //#region Obsidian
        getOS() {
            const { isMobile } = this.app

            // I would like to use `navigator.userAgentData.platform` since `navigator.platform` is deprecated but it doesn't work on mobile
            // TODO: see if I can use appVersion instead -> https://liamca.in/Obsidian/API+FAQ/OS/check+the+current+OS
            const { platform } = navigator

            if (platform.indexOf("Win") !== -1) return "Windows"
            // if (platform.indexOf("Mac") !== -1) return "MacOS";
            if (platform.indexOf("Linux") !== -1 && !isMobile) return "Linux"
            if (platform.indexOf("Linux") !== -1 && isMobile) return "Android"
            if (platform.indexOf("Mac") !== -1 && isMobile) return "iPadOS"

            return "Unknown OS"
        }

        /**
         * @param {HTMLElement} tag
         */
        removeTagChildDVSpan(tag) {
            const span = tag.querySelector("span")
            if (!span) return

            span.outerHTML = span.innerHTML
        }

        /**
         * @param {import('./view').Link} link
         */
        async linkExists(link) {
            if (!this.isObject(link)) return false
            return await window.app.vault.adapter.exists(link.path)
        }

        /**
         * This function will transform a field containing an array and flatten it while calling JSON.parse() on any string it encounteers
         * @param {*} field
         */
        normalizeArrayOfObjectField(field) {
            if (!field) return []

            // Single object in yaml frontmatter
            if (this.isObject(field)) return [this.deepClone(field)]

            try {
                // Single string as inline field
                if (!Array.isArray(field)) return [JSON.parse(field)]

                return field.reduce((a, c) => {
                    if (Array.isArray(c)) {
                        return [...a, ...this.normalizeArrayOfObjectField(c)]
                    }

                    if (this.isObject(c)) return [...a, this.deepClone(c)]

                    return [...a, JSON.parse(c)]
                }, [])
            } catch (e) {
                console.error(e)
                return []
            }
        }

        /**
         * Prepend the path of orphans (uncreated) files with a base directory
         * @param {Array<import('../_views').Link|string>} links
         * @param {string} baseDir
         */
        normalizeLinksPath = async (links, baseDir) => {
            return await Promise.all(
                links.map(async (l) => {
                    // l is a string
                    if (!l.path) {
                        return { path: `${baseDir}/${l}.md` }
                    }

                    // l is an empty link
                    if (!(await this.linkExists(l))) {
                        return { ...l, path: `${baseDir}/${l.path}.md` }
                    }

                    return l
                })
            )
        }

        /**
         * Let me handle YYYY format too (luxon don't recognized this format as a single year -_-)
         * @param {object|number} value
         */
        valueToDateTime({ value, dv }) {
            if (typeof value === "number") {
                // that means its just a year
                return dv.luxon.DateTime.fromObject({ year: value })
            }
            return dv.date(value)
        }

        /* from: https://stackoverflow.com/a/75988895 */
        debounce(callback, wait = 300) {
            let timeoutId = null;
            return (...args) => {
                window.clearTimeout(timeoutId);
                timeoutId = setTimeout(() => { callback(...args); }, wait);
            };
        }

        //#endregion
    }
}