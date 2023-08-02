class PageManager {
    /**
     * It's build on top of the Query class
     * 
     * What's the difference between both?
     * The Query class is an agnostic service that enhanced the default capability of dataview querying by adding new "primitive" to it.
     * 
     * This class on the other hand leverage these functions to use them at a higher level of abstraction in the shape of a simple filter/sort object
     * Also it doesn't store the state of the query unlike Query
     */
    PageManager = class {
        /**
         * @param {object} _
         * @param {DataviewInlineAPI} _.dv
         * @param {Logger} _.logger
         * @param {Utils} _.utils
         * @param {Orphanage} _.orphanage
         * @param {Map<string, Function>} _.customFields - Example: <"mp3", (qs) => ...>
         * @param {Map<string, string>} _.userFields - Example: '<"artist", "link">'
         */
        constructor({
            dv, logger, utils, orphanage,
            customFields,
            userFields,
            defaultFrom = '-"_templates"',
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

            this.customFields = customFields ?? new Map()
            this.userFields = userFields ?? new Map()
            this.defaultFrom = defaultFrom

            this.queryFilterFunctionsMap = new Map()
            this.queryFilterFunctionsMap.set("manual", async (qs, value) => {
                const links = this.dv.current()[value]
                if (!links) {
                    return console.warn(
                        "You must set an inline field inside your file containing pages links for the manual filter to work"
                    )
                }
                await qs.setLinks(links)
            })
            this.queryFilterFunctionsMap.set("current", (qs, value) => {
                const currentPath = this.dv.current().file.path
                qs.withLinkFieldOfPath({ field: value, path: currentPath })
            })
            this.queryFilterFunctionsMap.set("tags", (qs, value) => {
                qs.withTags(value)
            })
            this.queryFilterFunctionsMap.set('bookmarks', (qs, value) => {
                qs.inBookmarkGroup(value)
            })

            this.customFields.forEach((value, key) =>
                this.queryFilterFunctionsMap.set(key, value)
            )

            this.queryDefaultFilterFunctionsMap = new Map()
            this.queryDefaultFilterFunctionsMap.set("date", (qs, field, value) => {
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

            this.queryDefaultFilterFunctionsMap.set("link", (qs, field, value) => {
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
            })

            // Draft for special sort functions just like filters above
            this.querySortFunctionsMap = new Map()
            this.querySortFunctionsMap.set("manual", async (pages, field) => {
                // this.logger?.log(dv.current())
                const rawSortingPages = this.dv.current()[field]
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
         * Needed to profit of Dataview's implementation of backlinks
         * @warning This function mutate the filter argument
         * @param {string} from
         * @param {object} filter
         */
        #updateFromStringBasedOnSpecialFilters = (from, filter) => {
            if (!filter) return from

            this.logger?.log({ from, filter })
            if (filter.current === "backlinks") {
                delete filter.current
                return (from += ` AND [[${this.dv.current().file.path}]]`)
            }

            return from
        }

        /**
         * Build and query the pages from your vault based on some filters
         *
         * @param {object} _
         * @param {object} [_.filter]
         * @param {Query} _.qs
         * @returns {import('../view').UserFile[]}
         */
        buildAndRunFileQuery = async ({ filter, qs }) => {
            if (typeof filter === "function") {
                await filter(qs)
            } else {
                let fromQuery = filter?.from ?? this.defaultFrom
                fromQuery = this.#updateFromStringBasedOnSpecialFilters(
                    fromQuery,
                    filter
                )

                qs.from(fromQuery)

                for (const prop in filter) {
                    this.logger?.log(`filter.${prop} = ${filter[prop]}`)

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
                    this.logger?.log({ propFilterFunc })
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
                    } else {
                        qs.withFieldOfValue({
                            name: prop,
                            value: filter[prop],
                        })
                    }
                }
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
         * @param {import('../view').ScoreFile[]} _.pages
         */
        #sortPages = async ({ sort, pages }) => {
            if (typeof sort === "function") {
                return pages.sort(sort)
            }

            if (typeof sort === "string") {
                return this.#specialStringSort(sort, pages)
            }

            if (sort?.manual) {
                const rawSortingPages = this.dv.current()[sort.manual]
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

            if (sort?.recentlyReleased === true) {
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
                    return bReleased - aReleased
                })
            }
            if (sort?.recentlyReleased === false) {
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

                    return aReleased - bReleased
                })
            }

            if (sort?.shuffle) {
                return this.utils.shuffleArray(pages)
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
}