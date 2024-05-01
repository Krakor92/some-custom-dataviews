/**
 * File that contains miscelaneous utility functions
 * They are used by most of the classes here and they usally need to be passed in their constructor via a `utils` property
 */

export const httpRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/

// @link https://urlregex.com/
export const uriRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

//#region HTML

/**
 * Used by the function below
 */
const dummyDiv = document.createElement('div');

/**
 * Create a document fragment from an HTML string.
 * @param {string} strHTML - The HTML string to create the document fragment from.
 * @returns {DocumentFragment} The document fragment containing the parsed HTML.
 */
export const createFragmentFromString = (strHTML) => {
    const fragment = document.createDocumentFragment();

    /**
     * This div is needed for the actual HTML string to be parsed
     */
    dummyDiv.innerHTML = strHTML;

    while (dummyDiv.firstChild) {
        fragment.appendChild(dummyDiv.firstChild);
    }

    return fragment;
};

/**
 *
 * @param {HTMLElement} element
 * @param {string} className
 */
export const getParentWithClass = (element, className) => {
    // Traverse up the DOM tree until the root (body or html) is reached
    while (element && element !== document.body && element !== document.documentElement) {
        element = element.parentElement;
        if (element?.classList.contains(className)) {
            return element;
        }
    }
    return null;
}

export const scrollToElement = (target) => {
    let element;

    // Check if the provided parameter is a string (selector)
    if (typeof target === 'string') {
        // If it's a string, use document.querySelector() to get the element
        element = document.querySelector(target);

        // Check if the selector returned a valid element
        if (!element) {
            console.error("Element not found for selector:", target);
            return;
        }
    } else if (target instanceof Element) {
        // If it's already a DOM element, use it directly
        element = target;
    } else {
        // Invalid parameter
        console.error("Invalid element or selector provided.");
        return;
    }

    // Scroll the element into view
    element.scrollIntoView({ behavior: "smooth", block: "start" });
}

//#endregion

//#region Javascript

/**
 * @param {Map<any, string|number>} map
 */
export const buildInvertedMap = (map) => {
    const invertedMap = new Map();
    for (const [key, value] of map) {
        if (invertedMap.has(value)) {
            invertedMap.get(value).push(key);
        } else {
            invertedMap.set(value, [key]);
        }
    }
    return invertedMap
}

// Clamp number between two values with the following line:
export const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

export const closestTo = (low, high, value) => {
    const diffToLow = Math.abs(value - low);
    const diffToHigh = Math.abs(value - high);

    if (diffToLow < diffToHigh) {
        return low;
    } else if (diffToHigh < diffToLow) {
        return high;
    } else {
        return value; // When the value is equidistant to both low and high
    }
}

export const delay = async (time) =>
    new Promise((resolve) => setTimeout(resolve, time))

export const isObject = (o) => {
    return (
        o !== null &&
        typeof o === "object" &&
        Array.isArray(o) === false
    )
}

/**
 * Seeded RNG using Linear Congruential Generator
 * @param {number} seed
 */
const seededRNG = (seed) => {
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
export const shuffleArray = (a, seed) => {
    const rng = (typeof seed === 'number') ? seededRNG(seed) : Math.random;
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(rng() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

/**
 * @param {string} timecode - In the form 00:00:00 or 00:00
 * @returns {number} The timecode converted to seconds, can be NaN if it's not a valid timecode
*/
export const convertTimecodeToDuration = (timecode) => {
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

/**
 * @param {number} duration
 * @returns {number} The duration converted to a timecode of the format `00:00:00` or `00:00`
*/
export const convertDurationToTimecode = (duration) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    const hoursString = hours.toString().padStart(1, '0');
    const minutesString = minutes.toString().padStart(1, '0');
    const secondsString = seconds.toString().padStart(2, '0');

    return hours > 0 ? `${hoursString}:${minutesString}:${secondsString}` : `${minutesString}:${secondsString}`;
}

/**
 * @param {RegExp} regex
 * @returns {RegExp} a new regex based on the given one but with the global flag enabled
 */
export const globalizeRegex = (regex) => {
    let regexStr = regex.source // Get the string representation of the regex

    if (regexStr.startsWith('^')) {
        regexStr = regexStr.slice(1)
    }

    if (regexStr.endsWith('$')) {
        regexStr = regexStr.slice(0, -1)
    }
    return new RegExp(regexStr, 'g')
}

/* from: https://stackoverflow.com/a/75988895 */
export const debounce = (callback, wait = 300) => {
    let timeoutId = null;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { callback(...args); }, wait);
    };
}

/**
 * Implementation given as is by ChatGPT
 * It doesn't handle functions, circular reference or non enumerable properties
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj; // Return primitives and null as is
    }

    if (Array.isArray(obj)) {
        const newArray = [];
        for (let i = 0; i < obj.length; i++) {
            newArray[i] = deepClone(obj[i]);
        }
        return newArray; // Clone arrays
    }

    // At this point we're dealing with an object
    // We can duplicate it making sure we keep its prototype intact
    const newObj = Object.create(Object.getPrototypeOf(obj));
    for (const key in obj) {
        // We make sure to ignore properties from the prototype chain
        if (obj.hasOwnProperty(key)) {
            newObj[key] = deepClone(obj[key]);
        }
    }
    return newObj; // Clone objects
}

/**
 * An empty check written by ChatGPT
 */
export function isEmpty(value) {
    if (value == null) {
        // Check for null or undefined
        return true;
    } else if (Array.isArray(value)) {
        // Check for empty array
        return value.length === 0;
    } else if (typeof value === 'object') {
        // Check for empty object
        if (Object.prototype.toString.call(value) === '[object Object]') {
            return Object.keys(value).length === 0;
        }
        // Check for other types of objects
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                return false;
            }
        }
        return true; // If no enumerable properties found
    } else if (typeof value === 'string') {
        // Check for empty string
        return value.trim() === '';
    } else if (typeof value === 'number' && isNaN(value)) {
        // Check for NaN
        return true;
    }

    return false; // For other types, consider them non-empty
}
/**
 * A naïve deep equality check written by ChatGPT
 * Only handles scalar values, arrays and objects
 */
export const isEqual = (a, b) => {
    // Handle primitives and null
    if (a === b) {
        return true;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!isEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        // The two objects do not share the same prototype, they are not equal
        if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
            return false
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) {
            return false;
        }

        for (const key of keysA) {
            if (!keysB.includes(key) || !isEqual(a[key], b[key])) {
                return false;
            }
        }

        return true;
    }

    // If types are different, they are not equal
    return false;
}

//	#endregion

//#region Obsidian

export const getOS = (app) => {
    const { isMobile } = app

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
 * Check if a given value is a valid property value.
 * The function accept everything except:
 * - Empty object
 * - Empty array
 * - Array with only empty strings / null / undefined
 * - Empty string
 * - Null
 * - Undefined
 *
 * @param {any} value - The value to check
 * @returns {boolean} - True if the value is valid, false otherwise
 */
export const isValidPropertyValue = (value) => {
    if (
        value == null
        || (typeof value === "object" && Object.entries(value).length === 0)
        || (Array.isArray(value) && value.every(cell => {
            return cell == null || (typeof cell === "string" && cell.trim() === "")
        }))
        || (typeof value === "string" && value.trim() === "")
    ) {
        return false
    }

    return true
}

/**
 * @param {import('../_views').Link} link
 */
export const linkExists = async (link) => {
    if (!isObject(link)) return false
    return await window.app.vault.adapter.exists(link.path)
}

/**
 * This function will transform a field containing an array and flatten it while calling JSON.parse() on any string it encounteers
 * @param {*} field
 * @returns {Array}
 */
export const normalizeArrayOfObjectField = (field) => {
    if (!field) return []

    // Single object in yaml frontmatter
    if (isObject(field)) return [deepClone(field)]

    try {
        // Single string as inline field
        if (!Array.isArray(field)) return [JSON.parse(field)]

        return field.reduce((a, c) => {
            if (Array.isArray(c)) {
                return [...a, ...normalizeArrayOfObjectField(c)]
            }

            if (isObject(c)) return [...a, deepClone(c)]

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
 * @returns {Array<import('../_views').Link|string>}
 */
export const normalizeLinksPath = async (links, baseDir) => {
    return await Promise.all(
        links.map(async (l) => {
            // l is a string
            if (!l.path) {
                return { path: `${baseDir}/${l}.md` }
            }

            // l is an empty link
            if (!(await linkExists(l))) {
                return { ...l, path: `${baseDir}/${l.path}.md` }
            }

            return l
        })
    )
}

/**
 * @param {HTMLElement} tag
 */
export const removeTagChildDVSpan = (tag) => {
    const span = tag.querySelector("span")
    if (!span) return

    span.outerHTML = span.innerHTML
}

/**
 * Let me handle YYYY format too (luxon don't recognized this format as a single year -_-)
 * @param {object|number} value
 */
export const valueToDateTime = ({ value, dv }) => {
    if (typeof value === "number") {
        // that means its just a year
        return dv.luxon.DateTime.fromObject({ year: value })
    }
    return dv.date(value)
}

//#endregion
