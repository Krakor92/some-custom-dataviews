/**
 * It's build on top of the Query class which is itself built on top of DataviewAPI
 * 
 * *What's the difference between both?*
 * 
 * The Query class is an agnostic service that enhance the default capability of dataview querying by adding new "primitives" to it.
 * 
 * This class on the other hand leverage the functions provided by the Query class to use them at a higher level of abstraction in the shape of a simple filter/sort object
 * Also it doesn't store the state of the query unlike the Query object
 */
export class PageManager {
    /**
     * @param {object} _
     * @param {DataviewAPI} _.dv
     * @param {Logger} _.logger
     * @param {Utils} _.utils
     * @param {Orphanage} _.orphanage
     * @param {Map<string, Function>} _.customFields - Example: <"mp3", (qs) => ...>
     * @param {Map<string, string>} _.userFields - Example: '<"artist", "link">'
     * @param {number?} _.seed - Used for the shuffle when sorting
     */
    constructor({
        // Dependencies
        dv, logger, utils, orphanage,

        currentFilePath,
        customFields,
        userFields,
        defaultFrom = '-"_templates"',
        seed = null,
    }) {
        this.dv = dv
        this.logger = logger
        this.utils = utils
        this.orphanage = orphanage

        if (!dv) {
            console.error(
                "dv instance is needed to initialize PageManager!"
            )
        }

        if (!utils) {
            console.error(
                "An Utils instance is needed to initialize PageManager!"
            )
        }

        this.currentFilePath = currentFilePath
        this.defaultFrom = defaultFrom
        this.seed = seed

        this.queryFilterFunctionsMap = this.#buildQueryFilterFunctionMap()
        this.customFields = customFields ?? new Map()
        this.customFields.forEach((value, key) =>
            this.queryFilterFunctionsMap.set(key, value)
        )

        this.queryDefaultFilterFunctionsMap = this.#buildDefaultQueryFilterFunctionMap()
        this.userFields = userFields ?? new Map()

        // Draft for special sort functions just like filters above
        this.querySortFunctionsMap = new Map()
        this.querySortFunctionsMap.set("manual", async (pages, field) => {
            const rawSortingPages = this.dv.page(this.currentFilePath)[field]
            if (!rawSortingPages) {
                console.warn(
                    `${value} property could not be found in your file`
                )
                return pages
            }

            const sortingPages = await this.utils.normalizeLinksPath(
                rawSortingPages,
                this.orphanage.directory,
            )

            /* https://stackoverflow.com/a/44063445 + https://gomakethings.com/how-to-get-the-index-of-an-object-in-an-array-with-vanilla-js/ */
            return pages.sort((a, b) => {
                return (
                    sortingPages.findIndex(
                        (spage) => spage.path === a.file.path
                    ) -
                    sortingPages.findIndex(
                        (spage) => spage.path === b.file.path
                    )
                )
            })
        })

        this.queryDefaultSortFunctionsMap = new Map()
        this.queryDefaultSortFunctionsMap.set("date", (pages, field, value) => {
            return pages.sort((a, b) => {
                const aDate = this.utils.valueToDateTime({
                    value: a[field],
                    dv: this.dv,
                })
                const bDate = this.utils.valueToDateTime({
                    value: b[field],
                    dv: this.dv,
                })
                if (!aDate || !bDate) return 0

                return value === "desc" ? bDate - aDate : aDate - bDate
            })
        })
    }

    /**
     * @returns {Map<string, Function>}
     */
    #buildQueryFilterFunctionMap = () => {
        const queryFilterFunctionsMap = new Map()

        queryFilterFunctionsMap.set("manual", async (qs, value) => {
            const links = this.dv.page(this.currentFilePath)[value]
            if (!links) {
                return console.warn(
                    "You must set an inline field inside your file containing pages links for the manual filter to work"
                )
            }
            await qs.setLinks(links)
        })

        queryFilterFunctionsMap.set("current", (qs, value) => {
            const currentPath = this.dv.page(this.currentFilePath).file.path
            qs.withLinkFieldOfPath({ field: value, path: currentPath })
        })

        queryFilterFunctionsMap.set("tags", (qs, value) => {
            qs.withTags(value)
        })

        queryFilterFunctionsMap.set('bookmarks', (qs, value) => {
            qs.inBookmarkGroup(value)
        })

        return queryFilterFunctionsMap
    }

    /**
     * @returns {Map<string, Function>}
     */
    #buildDefaultQueryFilterFunctionMap = () => {
        const queryDefaultFilterFunctionsMap = new Map()

        queryDefaultFilterFunctionsMap.set("date", (qs, field, value) => {
            this.logger?.log({ value })

            if (!this.utils.isObject(value)) {
                return qs.withDateFieldOfTime({ name: field, value })
            }

            if (value.before)
                qs.withDateFieldOfTime({
                    name: field,
                    value: value.before,
                    compare: "lt",
                })
            if (value.after)
                qs.withDateFieldOfTime({
                    name: field,
                    value: value.after,
                    compare: "gt",
                })
        })

        /**
         * @param {string} field 
         * @param {string} value 
         */
        const linkFilterFunction = (qs, field, value) => {
            const inLink = this.dv.parse(value) // transform [[value]] into a link
            this.logger?.log({ inLink })

            if (this.utils.isObject(inLink)) {
                const page = this.dv.page(inLink.path)
                if (!page) {
                    qs.withLinkFieldOfPath({
                        field,
                        path: inLink.path,
                        acceptStringField: true,
                    })
                } else {
                    qs.withLinkFieldOfPath({
                        field,
                        path: page.file.path,
                        acceptStringField: false,
                    })
                }
            } else {
                qs.withLinkFieldOfPathRegex({
                    field,
                    path: value,
                    acceptStringField: true,
                })
            }
        }

        queryDefaultFilterFunctionsMap.set("link", (qs, field, value) => {
            if (Array.isArray(value)) {
                const temporaryQueryService = new qs.constructor({ dv: this.dv, logger: this.logger })

                const results = value.map((v) => {
                    temporaryQueryService.from(qs._source)
                    linkFilterFunction(temporaryQueryService, field, v)
                    return [...temporaryQueryService._pages]
                })

                const resolvedPages = qs.constructor.innerJoinPages(qs._pages, qs.constructor.joinPages(...results))
                qs.setPages(resolvedPages)
            } else {
                linkFilterFunction(qs, field, value)
            }
        })

        return queryDefaultFilterFunctionsMap
    }

    /**
     * Needed to profit of Dataview's implementation of backlinks
     * @warning This function mutate the filter argument
     * @param {string} from
     * @param {object} filter
     */
    #updateFromStringBasedOnSpecialFilters = (from, filter) => {
        if (filter?.current === "backlinks") {
            delete filter.current
            return (from += ` AND [[${this.dv.page(this.currentFilePath).file.path}]]`)
        }

        return from
    }

    /**
     * @param {object} _
     * @param {string} _.filter - 
     * @param {Query} _.qs
     */
    #runStringFilterQuery = ({filter, qs}) => {
        switch (filter) {
            case "backlinks":
                qs.from(`${this.defaultFrom} AND [[${this.dv.page(this.currentFilePath).file.path}]]`)
                break;
            default:
                break;
        }
    }

    /**
     * @param {object} _
     * @param {string[]} _.filter
     * @param {Query} _.qs
     */
    #runArrayFilterQuery = async ({filter, qs}) => {
        // TODO: Add support for array of link representation
        // await qs.setLinksFromString(filter)
    }

    /**
     * @param {object} _
     * @param {object} _.filter
     * @param {Query} _.qs
     */
    #runObjectFilterQuery = async ({filter, qs}) => {
        let fromQuery = filter?.from ?? this.defaultFrom
        fromQuery = this.#updateFromStringBasedOnSpecialFilters(
            fromQuery,
            filter
        )

        qs.from(fromQuery)

        for (const prop in filter) {
            this.logger?.log(`filter.${prop} =`, filter[prop])

            if (prop === "from") continue

            // The property has a special meaning. It's either a default property (manual, tags, ...) or a custom one (mp3Only, voice, ...)
            let propFilterFunc = this.queryFilterFunctionsMap.get(prop)
            if (propFilterFunc) {
                // The queryService and the value (note that the value isn't necessarly used by the func)
                await propFilterFunc(qs, filter[prop])
                continue
            }

            // The property is in the userFields so it has a special meaning (example: link, date, ...)
            propFilterFunc = this.queryDefaultFilterFunctionsMap.get(this.userFields.get(prop))
            this.logger?.log({ propType: this.userFields.get(prop), prop, value: filter[prop], propFilterFunc })
            if (propFilterFunc) {
                // The queryService, the field name and the value
                await propFilterFunc(qs, prop, filter[prop])
                continue
            }

            // Default filter
            if (Array.isArray(filter[prop])) {
                filter[prop].forEach((value) => {
                    qs.withFieldOfValue({ name: prop, value })
                })
            } else if (this.utils.isObject(filter[prop])) {
                if (filter[prop].not) {
                    qs.withoutFieldOfValue({
                        name: prop,
                        value: filter[prop].not,
                    })
                }
            } else {
                qs.withFieldOfValue({
                    name: prop,
                    value: filter[prop],
                })
            }
        }
    }

    /**
     * Build and query the pages from your vault based on some filters
     *
     * @param {object} _
     * @param {*} [_.filter]
     * @param {Query} _.qs
     * @returns {import('../_views').UserFile[]}
     */
    buildAndRunFileQuery = async ({ filter, qs }) => {
        if (typeof filter === "function") {
            await filter(qs)
        } else if (typeof filter === "string") {
            this.#runStringFilterQuery({filter, qs})
        } else if (Array.isArray(filter)) {
            this.#runArrayFilterQuery({filter, qs})
        } else {
            await this.#runObjectFilterQuery({filter, qs})
        }

        this.logger?.logPerf("Dataview js query: filtering")

        return qs.query()
    }

    #specialStringSort = (value, pages) => {
        switch (value) {
            case "shuffle":
            case "random":
                this.utils.shuffleArray(pages)
                return true

            case "filter":
            case "none":
                return true

            default:
                console.warn(`The '${value}' sort value isn't recognized by this view`);
                return false
        }
    }

    /**
     * @param {object} _
     * @param {object} _.sort
     * @param {import('../_views').ScoreFile[]} _.pages
     */
    #sortPages = async ({ sort, pages }) => {
        if (typeof sort === "function") {
            return pages.sort(sort)
        }

        if (typeof sort === "string") {
            return this.#specialStringSort(sort, pages)
        }

        if (sort?.manual) {
            const rawSortingPages = this.dv.page(this.currentFilePath)[sort.manual]
            if (!rawSortingPages) {
                console.warn(`${sort.manual} property could not be found in your file`)
                return pages
            }

            const sortingPages = await this.utils.normalizeLinksPath(rawSortingPages, this.orphanage.directory)

            /* https://stackoverflow.com/a/44063445 + https://gomakethings.com/how-to-get-the-index-of-an-object-in-an-array-with-vanilla-js/ */
            return pages.sort((a, b) => {
                return sortingPages.findIndex((spage) => spage.path === a.file.path)
                    - sortingPages.findIndex((spage) => spage.path === b.file.path)
            });
        }

        if (sort?.recentlyAdded === true) {
            return pages.sort((a, b) => b.file.ctime - a.file.ctime)
        }
        if (sort?.recentlyAdded === false) {
            return pages.sort((a, b) => a.file.ctime - b.file.ctime)
        }

        if (sort?.hasOwnProperty("recentlyReleased")) {
            return pages.sort((a, b) => {
                const aReleased = this.utils.valueToDateTime({
                    value: a.release,
                    dv: this.dv,
                })
                const bReleased = this.utils.valueToDateTime({
                    value: b.release,
                    dv: this.dv,
                })
                if (!aReleased || !bReleased) return 0

                return sort.recentlyReleased
                    ? bReleased - aReleased
                    : aReleased - bReleased
            })
        }

        if (sort?.shuffle) {
            if (typeof sort.shuffle === "boolean") {
                return this.utils.shuffleArray(pages, this.seed);
            } else if (typeof sort.shuffle === "number") {
                return this.utils.shuffleArray(pages, sort.shuffle);
            }
        }

        // - Alphabetical order by default
        return pages.sort((a, b) => a.file.name.localeCompare(b.file.name))
    }

    sortPages = async ({ sort, pages }) => {
        const result = await this.#sortPages({ sort, pages })
        this.logger?.logPerf("Dataview js query: sorting")
        return result
    }
}