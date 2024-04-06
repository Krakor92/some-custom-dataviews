/**
 * Extends the capability of dv utility (completely ignore DataArray implementation)
 * @depends on DataviewJS
 * 
 * It doesn't support OR query out of the box
 * 
 * If you want to do an OR, you must do two separated queries then merge their results with this:
 * const orPages = [...new Set(pages1.concat(pages2))]
 */
export class Query {
    constructor({dv, logger}) {
        this.dv = dv
        this.logger = logger
        this._pages = null
    }

    _warningMsg = "You forgot to call from or pages before calling this"
    _delimiter = "=-------------------------------="

    _isObject = (o) => o !== null && typeof o === 'object' && Array.isArray(o) === false


    /**
     * There is probably a better way (less space/time complexity) to do it but using a map was the easiest solution for me
     * @param  {...any} vargs 
     */
    innerJoinPages = (...vargs) => {
        const pagesEncounteredMap = new Map()

        for (const pages of vargs) {
            let values = pages

            if (Array.isArray(pages.values)) {
                // .values in this context is not the function of the Array prototype
                // but the property of the DataArrayImpl proxy target returned by a dataview function
                values = [...pages.values]
            }

            values.forEach(page => {
                const path = page.file.link.path

                if (!pagesEncounteredMap.has(path)) {
                    return pagesEncounteredMap.set(path, {
                        page,
                        count: 1
                    })
                }
                pagesEncounteredMap.set(path, {
                    page,
                    count: pagesEncounteredMap.get(path).count + 1
                })
            })
        }

        const result = []

        for (const [_, value] of pagesEncounteredMap) {
            if (value.count === vargs.length) {
                result.push({...value.page})
            }
        }

        return result
    }

    //distinct outer join
    joinPages = (...vargs) => {
        let joinedArray = []

        for (const pages of vargs) {
            if (Array.isArray(pages.values)) {
                // .values in this context is not the function of the Array prototype
                // but the property of the DataArrayImpl proxy target returned by a dataview function
                joinedArray = [...joinedArray, ...pages.values]
            }
            else {
                joinedArray = [...joinedArray, ...pages]
            }
        }

        const result = [];
        const set = new Set();
        for (const page of joinedArray) {
            if (!set.has(page.file.link.path)) {
                set.add(page.file.link.path);
                result.push({ ...page });
            }
        }
        return result
    }

    hello = () => {
        console.log("Hello")
        return this
    }

    from(source) {
        this._pages = this.dv.pages(source)
        return this
    }

    sort(fn) {
        this._pages = this._pages.sort(fn)
        return this
    }

    /**
     * @param {function} fn - It must return an array of pages
     */
    custom(fn) {
        this._pages = fn(this._pages)
        return this
    }

    /**
     * 
     * @param {string} value - A value of format `[[File]]` is expected
     */
    _convertStringToLink(value) {
        if (!value) return null
        const link = this.dv.parse(value);// transform [[value]] into a link

        return link
    }

    /**
     * @param {import("../view").Link} link
     */
    _convertLinkToTFile(link) {
        if (!link.path) return null
        return this.dv.page(link.path)
    }
    
    /**
     * TODO: same as setLinks but parse the links using dv.parse before
     * @param {string[] | string} links
     */
    // setLinksFromString(links) {
    // }

    /**
     * @param {import("../view").Link | import("../view").Link[]} links
     */
    setLinks(links) {
        if (!Array.isArray(links)) {
            this._pages = [this._convertLinkToTFile(links)]
            return
        }

        this._pages = links.reduce((a, c) => {
            const file = this._convertLinkToTFile(c)
            if (!file) return a

            return [...a, file]
        }, [])
        return this
    }

    setPages(pages) {
        this._pages = [...pages]
        return this
    }

    pages(pages) {
        return this.setPages(pages)
    }

    // Transfrom the proxy target to a regular array for easier manipulation later on
    query() {
        return [...this._pages]
    }

    filter(cb) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        this._pages = this._pages.filter((p) => cb(p))
        return this
    }

    where(cb) {
        return this.filter(cb)
    }

    async asyncFilter(cb) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        /* from: https://stackoverflow.com/a/63932267 */
        const filterPromise = (values, fn) =>
            Promise.all(values.map(fn)).then((booleans) =>
                values.filter((_, i) => booleans[i])
            )

        this._pages = await filterPromise(
            this._pages,
            async (p) => await cb(p)
        )
    }

    /**
     * @param {string[] | string} tags
     */
    withTags(tags) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }
        if (!tags) return null

        if (Array.isArray(tags)) {
            tags.forEach((t) => this._withTag(t))
        } else {
            this._withTag(tags)
        }

        return this
    }

    /**
     * @param {string} tag
     */
    _withTag(tag) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        this._pages = this._pages.filter((p) => {
            return p.file.etags.includes(tag)
        })
    }

    withExistingField(name) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        this._pages = this._pages.filter((p) => {
            return !!p[name]
        })
        return this
    }

    //#region Date fields

    /**
     * Private function used inside with/outDateFieldOfValue
     * @warn Only works for YYYY-MM-DD right now (don't support THH:mm)
     * @private
     * @param {object} _
     * @param {string} _.name
     * @param {string} _.value
     * @param {'eq'|'lt'|'gt'} _.compare
     * @param {boolean} _.with_ if false, it means the function does a without
     */
    _dateFieldOfValue({ name, value, compare = "eq", with_ = true }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        const dateValue = this.dv.date(value)
        if (dateValue.toString() === "Invalid Date") {
            console.error(`${value} isn't a valid date fromat`)
            return this
        }

        this.logger?.log(
            `Before filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        this._pages = this._pages.filter((p) => {
            if (!p[name]) return !with_

            let pValue = null
            if (typeof p[name] === "number") {
                // that means its just a year
                pValue = this.dv.luxon.DateTime.fromObject({
                    year: p[name],
                })
            } else {
                pValue = this.dv.date(p[name])
            }

            if (!pValue || pValue.toString() === "Invalid Date") {
                console.warn(`${p[name]} isn't a valid date fromat`)
                return !with_
            }

            switch (compare) {
                case "eq":
                    return (pValue.ts === dateValue.ts) === with_
                case "lt":
                    return pValue < dateValue === with_
                case "gt":
                    return pValue > dateValue === with_
                default:
                    return !with_
            }
        })

        this.logger?.log(
            `After filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        return this
    }

    /**
     * Only works with scalar type (string, boolean, number)
     * To work with file use withLinkFieldOfPath function
     * @param {object} _
     * @param {string} _.name
     * @param {string} _.value - Must be in a valid date fromat
     * @param {string} _.compare
     * @param {boolean} _.acceptArray
     * - If true, then it will return false if {{value}} is find inside the array {{name}}.
     * - If false, it will return true as soon as an array is encountered
     */
    withDateFieldOfTime({ name, value, compare = "eq" }) {
        return this._dateFieldOfValue({
            name,
            value,
            compare,
            with_: true,
        })
    }

    //#endregion

    //#region Scalar fields and File fields

    /**
     * Only works for fields of scalar type (string, boolean, number) and array of scalar type
     * Private function used inside with/outFieldOfValue
     * @private
     * @param {object} _
     * @param {string} _.name
     * @param {string|boolean|number} _.value
     * @param {boolean} _.with_ if false, it means the function does a without
     * @param {boolean} _.fileField if true, it means the property belongs to the `file` field
     * @param {boolean} _.acceptArray
     * - If true, then it will return {{with_}} if {{value}} is find inside the array {{name}}.
     * - If false, it will return !{{with_}} as soon as an array is encountered
     */
    _fieldOfValue({
        name,
        value,
        with_ = true,
        fileField = false,
        acceptArray = true,
    }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return this
        }

        if (typeof value === "object") {
            console.error(`This function only accept scalar value`)
            return this
        }

        this.logger?.log(
            `Before filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        this._pages = this._pages.filter((p) => {
            const field = fileField ? p.file[name] : p[name]

            if (!field) return !with_

            if (Array.isArray(field)) {
                if (!acceptArray) return !with_

                return field.some((el) => {
                    return el === value
                })
            }

            // Like a number or anything
            if (typeof field !== "string") {
                return (field === value) === with_
            }

            // Alors en fait j'ai besoin de faire un XNOR et c'est comme ça que je m'y prend
            return (
                (field.toLocaleLowerCase() === value.toLocaleLowerCase()) === with_
            )
        })

        this.logger?.log(
            `After filtering on ${name} with value '${with_ ? "" : "-"
            }${value}', we have a total number of ${this._pages.length
            } pages`
        )
        return this
    }

    /**
     * Only works with scalar type (string, boolean, number)
     * To work with file use withLinkFieldOfPath function
     * @param {object} _
     * @param {string} _.name - For a given file, if the field of this name is not scalar, the file will be ignored.
     * @param {string|boolean|number} _.value
     * @param {boolean} _.acceptArray
     * - If true, then it will return true if {{value}} is find inside the array {{name}}.
     * - If false, it will return false as soon as an array is encountered
     */
    withFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            acceptArray,
            with_: true,
        })
    }

    withFileFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            fileField: true,
            acceptArray,
            with_: true,
        })
    }

    /**
     * Only works with scalar type (string, boolean, number)
     * To work with file use withLinkFieldOfPath function
     * @param {object} _
     * @param {string} _.name
     * @param {string} _.value
     * @param {boolean} _.acceptArray
     * - If true, then it will return false if {{value}} is find inside the array {{name}}.
     * - If false, it will return true as soon as an array is encountered
     */
    withoutFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            acceptArray,
            with_: false,
        })
    }

    withoutFileFieldOfValue({ name, value, acceptArray = true }) {
        return this._fieldOfValue({
            name,
            value,
            fileField: true,
            acceptArray,
            with_: false,
        })
    }

    //#endregion

    //#region Link fields

    withLinkField({field, value}) {
        const link = this._convertStringToLink(value)
        if (!this._isObject(link)) {
            console.warn(`File named ${value} couldn't be parsed by dv.page. Make sure to wrap the value with [[]]`)
            return this
        }

        const page = this.dv.page(link.path)
        if (!page) {
            return this.withLinkFieldOfPath({ field, path: link.path, acceptStringField: true })
        }

        return this.withLinkFieldOfPath({ field, path: page.file.path, acceptStringField: false })
    }

    /**
     *
     * @param {object} _
     * @param {string} _.field - Name of the field to query on
     * @param {string} _.path
     * @param {string} _.acceptStringField - If true, it fallbacks to comparing p[field] and path if p[field] isn't a link
     */
    withLinkFieldOfPath({ field, path, acceptStringField = false }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        if (typeof path !== "string") {
            console.error(
                `${path} must a be a single string. Call withLinkFieldOfAnyPath instead`
            )
            return null
        }

        this._pages = this._pages.filter((p) => {
            if (!p[field]) return false

            if (Array.isArray(p[field])) {
                return p[field].some((l) => {
                    if (typeof l !== "object") {
                        return acceptStringField ? l === path : false
                    }

                    return l?.path === path
                })
            }

            if (typeof p[field] !== "object") {
                return acceptStringField ? p[field] === path : false
            }

            return p[field].path === path
        })
        return this
    }

    /**
     *
     * @param {object} _
     * @param {string} _.field - Name of the field to query on
     * @param {string} _.path - A regex
     * @param {string} _.acceptStringField - If true, it fallbacks to comparing p[field] and path if p[field] isn't a link
     */
    withLinkFieldOfPathRegex({ field, path, acceptStringField = false }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        if (typeof path !== "string" && !path instanceof RegExp) {
            console.error(`${path} must be a regex`)
            return null
        }

        const regex = path instanceof RegExp ? path : new RegExp(path)
        if (!regex) {
            console.error(`${path} must be a valid regex`)
            return null
        }

        this._pages = this._pages.filter((p) => {
            if (!p[field]) return false

            if (Array.isArray(p[field])) {
                return p[field].some((l) => {
                    if (typeof l !== "object") {
                        return acceptStringField ? !!l.match(regex) : false
                    }

                    return !!l.path.match(regex)
                })
            }

            if (typeof p[field] !== "object") {
                return acceptStringField ? !!p[field].match(regex) : false
            }

            const match = p[field].path.match(regex)
            return !!match
        })
        return this
    }

    /**
     *
     * @param {object} _
     * @param {string} _.field - Name of the field to query on
     * @param {string[]} _.paths
     *
     * @param {boolean} _.and
     */
    withLinkFieldOfAnyPath({ field, paths }) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null
        }

        if (!Array.isArray(paths)) {
            console.error(
                `${paths} isn't an array. Call withLinkFieldOfPath instead`
            )
            return null
        }

        this._pages = this._pages.filter((p) => {
            if (!p[field]) return false

            if (Array.isArray(p[field])) {
                for (const path of paths) {
                    if (
                        p[field].some((l) => {
                            if (typeof l !== "object") return false

                            return l.path === path
                        })
                    ) {
                        return true
                    }
                }
                return false
            }

            return paths.some((path) => path === p.type.path)
        })
        return this
    }

    //#endregion

    //#region Bookmarks
    _getBookmarkGroupFilesFromItems(items) {
        return items?.reduce((acc, cur) => {
            if (cur.type === "file") return [...acc, cur]
            return acc
        }, [])
    }

    /**
     * 
     * @param {*} items 
     * @param {string[]} groupPath 
     */
    _getBookmarksGroupItemsFromPath(items, groupPath) {
        const groupTitle = groupPath.shift()

        if (!groupTitle) return items

        for (const item of items) {
            if (item.type === "group" && item.title === groupTitle) {
                return this._getBookmarksGroupItemsFromPath(item.items, groupPath)
            }
        }

        throw new Error(`The bookmark group named ${groupTitle} couldn't be find`)
    }

    /**
     * @param {string[]} _.groupPath
     */
    _getBookmarkGroupFilesFromPath(items, groupPath = []) {
        if (!groupPath || groupPath.length === 0) {
            return this._getBookmarkGroupFilesFromItems(items)
        }

        try {
            const nestedItems = this._getBookmarksGroupItemsFromPath(items, groupPath)
            return this._getBookmarkGroupFilesFromItems(nestedItems)
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * When calling this function, this._pages must be a standard array
     */
    _sortPagesByBookmarks(bookmarksFiles) {
        const pages = [...this._pages]

        /* https://stackoverflow.com/a/44063445 + https://gomakethings.com/how-to-get-the-index-of-an-object-in-an-array-with-vanilla-js/ */
        pages.sort((a, b) => {
            return bookmarksFiles.findIndex((spage) => spage.path === a.file.path)
            - bookmarksFiles.findIndex((spage) => spage.path === b.file.path)
        });

        this._pages = this.dv.array(pages)
        this.logger?.log(this._pages)
    }

    /**
     * Filter pages to correspond to links found in the bookmark group passed as parameter (global "Bookmarks" by default)
     * @param {object} _
     * @param {string[]} _.groupPath - It isn't an array of groups but the hierarchy that let me access to a nested group.
     * Since a bookmark group can have a '/' inside (any character actually), I can't rely on a classic group.split('/')
     * @param {boolean} _.in_ - inside or outside
     */
    _bookmarkGroup({ groupPath = [], in_ = true } = {}) {
        const bookmarksItems = this.dv.app.internalPlugins.plugins.bookmarks.instance.items

        const filteredBookmarksFiles = this._getBookmarkGroupFilesFromPath(bookmarksItems, groupPath)

        const convertBookmarksFilesArrayToSetOfPaths = (items) => {
            const set = new Set()
            items.forEach(item => {
                set.add(item.path)
            })
            return set
        }
        const setOfPaths = convertBookmarksFilesArrayToSetOfPaths(filteredBookmarksFiles)

        this._pages = this._pages.filter((p) => setOfPaths.has(p.file.path) === in_)

        return filteredBookmarksFiles
    }

    inBookmarkGroup(value) {
        const bookmarksFiles = this._bookmarkGroup({ groupPath: value?.split('/') })
        this._sortPagesByBookmarks(bookmarksFiles)
        return this;
    }

    notInBookmarkGroup(value) {
        return this._bookmarkGroup({ groupPath: value?.split('/'), in_: false })
    }
    //#endregion


    /**
     * For debug purposes only
     */
    printField(name) {
        if (!this._pages) {
            console.error(this._warningMsg)
            return null;
        }

        this._pages.forEach(p => {
            if (!p[name]) return

            if (Array.isArray(p[name])) {
                console.log("Array")
                console.log(p[name])
                return
            }

            if (typeof (p[name]) === 'object') {
                console.log("Object")
                console.log({ ...p[name] })
                return
            }

            console.log("Scalar")
            console.log({ name, "typeof": typeof (p[name]), value: p[name] })
            return
        })

        console.log(this._delimiter)

        return this;
    }
}