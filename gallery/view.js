/**
 * @file Build a grid of file from your vault with thumbnail
 * @depends on DataviewJS
 * @author Krakor <krakor.faivre@gmail.com>
 */

//#region Debug
let inceptionTime = performance.now()
let startTime = performance.now()
let perfTime = null;

// Hacky but it's for debug purposes
const buildDurationLog = (duration) => {
	if (duration >= 1000) {
		return `${(duration / 1000.0).toPrecision(3)} seconds`
	}
	return `${(duration).toPrecision(3)} milliseconds`
}

const logPerf = (label) => {
	perfTime = performance.now()
	console.info(`${label} took ${buildDurationLog(perfTime - startTime)}`)
	startTime = perfTime
}

console.log("=----------------------=")
//#endregion

const {
	filter,
	sort,
	disable = "",

	// voir ce post https://stackoverflow.com/a/18939803 pour avoir un système de debug robuste
	debug = false
	//@ts-ignore
} = input || {};

//#region Settings

// For demonstration purpose only
const DISABLE_LAZY_RENDERING = false

const TITLE_FIELD = "title"
const THUMBNAIL_FIELD = "thumbnail"

const DEFAULT_FROM = '-"_templates"'


const NB_FILE_BATCH_PER_PAGE = 20

// CustomJS related
const DEFAULT_CUSTOMJS_CLASS = "DataviewJS"	
const DEFAULT_CUSTOMJS_SUBCLASS = "Query"

//#endregion

//#region Initialize view's root node

/** @type {Set<string>} */
const disableSet = new Set(disable.split(' ').map(v => v.toLowerCase()))
const tid = (new Date()).getTime();

/** @type {HTMLDivElement} */
const rootNode = dv.el("div", "", {
	cls: "gallery",
	attr: {
		id: "gallery" + tid,
		style: 'position:relative;-webkit-user-select:none!important'
	}
});

// Hide the edit button so it doesn't trigger anymore in preview mode
const rootParentNode = rootNode.parentNode
const editBlockNode = rootParentNode?.nextSibling
if (editBlockNode && editBlockNode.style) {
	editBlockNode.style.visibility = "hidden"
}

//#endregion

//#region Utils
const httpRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/

//	#region Javascript
// Clamp number between two values with the following line:
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);


const delay = async (time) => new Promise((resolve) => setTimeout(resolve, time));

function isObject(o) {
	return o !== null && typeof o === 'object' && Array.isArray(o) === false;
}

/**
 * from https://stackoverflow.com/a/6274381
 * It alters the array
 * @param {Array} a.
 */
function shuffleArray(a) {
	let j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
}
//	#endregion

//	#region Obsidian
const getOS = () => {
	const { isMobile } = this.app
	const { platform } = navigator

	if (platform.indexOf("Win") !== -1) return "Windows";
	// if (platform.indexOf("Mac") !== -1) return "MacOS";
	if (platform.indexOf("Linux") !== -1 && !isMobile) return "Linux";
	if (platform.indexOf("Linux") !== -1 && isMobile) return "Android";
	if (platform.indexOf("Mac") !== -1 && isMobile) return "iPadOS";

	return "Unknown OS";
}

/**
 * @param {HTMLElement} tag 
 */
function removeTagChildDVSpan(tag) {
	const span = tag.querySelector("span")
	if (!span) return;

	span.outerHTML = span.innerHTML
}

/**
 * @param {import('../view').Link} link
 */
const linkExists = async (link) => {
	return await window.app.vault.adapter.exists(link?.path)
}

//	#endregion
//#endregion

//#region Rendering functions

const _resolveThumbnailStyle = (display) => {
	const thumbnailY = parseFloat(display)
	if (isNaN(thumbnailY)) return null

	return `style="object-position: 50% ${clamp(thumbnailY, 0, 1) * 100}%"`
}

const _resolveUrlThumbnailStyle = (str) => {
	const startOfDisplayId = str.indexOf("[")
	const endOfDisplayId = str.indexOf("]")

	// Either there is no [], or there is but its empty
	if (startOfDisplayId === -1 || (endOfDisplayId - startOfDisplayId) === 1) return null

	let display = str.substring(startOfDisplayId + 1, endOfDisplayId)
	const firstPipeId = str.indexOf("|", startOfDisplayId)
	if (firstPipeId !== -1) {
		// Instead of having display be "0.2|400", it's going to be "0.2" only
		display = str.substring(startOfDisplayId + 1, firstPipeId)
	}

	return _resolveThumbnailStyle(display)
}

const _resolveVaultThumbnailStyle = (thumb) => {

	let display = thumb.display

	if (display === undefined) return null

	const firstPipeId = display.indexOf("|")
	if (firstPipeId !== -1) {
		// Instead of having display be "0.2|400", it's going to be "0.2" only
		display = display.substring(0, firstPipeId)
	}

	return _resolveThumbnailStyle(display)
}

/**
 * 
 * @param {string} url 
 */
const renderThumbnailFromUrl = (url) => {
	if (!url) return ""

	//flemme de faire youtube.com pour l'instant
	if (url.includes("youtu.be")) {
		const startOfId = url.indexOf("youtu.be/") + 9
		const id = url.substring(startOfId, startOfId + 11)
		return `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" referrerpolicy="no-referrer">`
	}

	if (url.includes("dailymotion")) {
		const startOfId = url.lastIndexOf('/') + 1
		const id = url.substring(startOfId)
		return `<img src="https://www.dailymotion.com/thumbnail/video/${id}" referrerpolicy="no-referrer">`
	}

	let style = null;
	if (url[0] === '!') {
		style = _resolveUrlThumbnailStyle(url)

		const startOfUrl = url.lastIndexOf('(') + 1
		url = url.substring(startOfUrl, url.length - 1)
	}

	return `<img src="${url}" referrerpolicy="no-referrer" ${style ?? ""}>`
}

/**
 * @param {import('../view').Link} thumb
 */
const renderThumbnailFromVault = (thumb) => {
	if (!thumb) return ""

	console.log("render from vault")

	const style = _resolveVaultThumbnailStyle(thumb);
	console.log({thumb})
	console.log("window.app.vault.adapter.getResourcePath(thumb.path)")
	console.log(window.app.vault.adapter.getResourcePath(thumb.path))

	
	
	return `<img src="${window.app.vault.adapter.getResourcePath(thumb.path)}" ${style ?? ""}>`
}

/**
 * @param {object} file 
 * @param {string} file.path 
 * @param {string} file.name 
 */
const renderInternalFileAnchor = ({ path, name, mdmIcon = true } = {}) => {
	// return `<a class="internal-link" target="_blank" rel="noopener" aria-label-position="top" aria-label="${path}" data-href="${path}" href="${path}">${name}</a>`
	// look at https://github.com/mdelobelle/metadatamenu/issues/247 for explanation on mdmIcon
	return `<a class="internal-link ${mdmIcon ? "" : "metadata-menu-button-hidden"}" aria-label="${path}" data-href="${path}" href="${path}">${name}</a>`
}

//#endregion

//#region Query the pages based on filters

const scoreQueryFilterFunctionsMap = new Map()
scoreQueryFilterFunctionsMap.set('manual', async (qs) => {
	console.log(`%cFilter on manual`, 'color: #7f6df2; font-size: 13px')

	const links = dv.current()[filter.manual]
	if (!links) {
		return console.warn("You must set an inline field inside your file containing score links for the manual filter to work")
	}

	await qs.setLinks(links)
})

// scoreQueryFilterFunctionsMap.set('tags', (qs, value) => {
// 	console.log("%cFilter on tags 🏷️", 'color: #7f6df2; font-size: 14px')

// 	if (Array.isArray(value)) {
// 		value.forEach(t => {
// 			qs.withFieldOfValue({ name: "tags_", value: t })
// 		})
// 	}
// 	else {
// 		console.log(`%c=> ${value}`, 'color: #7f6df2')

// 		qs.withFieldOfValue({ name: "tags_", value })
// 	}
// })

scoreQueryFilterFunctionsMap.set('release', (qs, value) => {
	console.log({ value })

	if (!isObject(value)) {
		return qs.withDateFieldOfTime({ name: "release", value })
	}

	if (value.before) qs.withDateFieldOfTime({ name: "release", value: value.before, compare: 'lt' })
	if (value.after) qs.withDateFieldOfTime({ name: "release", value: value.after, compare: 'gt' })
})

scoreQueryFilterFunctionsMap.set('star', (qs, value) => {
	console.log({ value })

	if (!!value) {
		return qs.withFileFieldOfValue({ name: "starred", value: true })
	}
	return qs.withFileFieldOfValue({ name: "starred", value: false })
})


/**
 * Build and query the score pages from your vault based on some filters
 * @param {object} [filter]
 * @returns {import('../view').ScoreFile[]}
 */
const buildAndRunFileQuery = async (filter) => {
	await forceLoadCustomJS();
	const CustomJs = customJS[DEFAULT_CUSTOMJS_CLASS]
	const QueryService = new CustomJs[DEFAULT_CUSTOMJS_SUBCLASS](dv)

	let fromQuery = filter?.from ?? DEFAULT_FROM

	const qs = QueryService
		.from(fromQuery);

	for (const prop in filter) {
		console.log(`filter.${prop} = ${filter[prop]}`)

		if (prop === "from") continue;

		const propFilterFunc = scoreQueryFilterFunctionsMap.get(prop)
		if (!propFilterFunc && !Array.isArray(filter[prop])) {
			// Default filter
			qs.withFieldOfValue({ name: prop, value: filter[prop] })
		} else {
			// The queryService and the value
			await propFilterFunc(qs, filter[prop])
		}
	}

	logPerf("Dataview js query: filtering")

	return qs.query()
}

let queriedPages = []
let numberOfPagesFetched = 0

if (!disableSet.has("query")) {
	queriedPages = await buildAndRunFileQuery(filter)
	numberOfPagesFetched = queriedPages.length

	console.log({ queriedPages })
}

// const pages = [...queriedPages]
const pages = queriedPages

//#endregion

//#region Sort pages options

/**
 * Let me handle YYYY format too (luxon don't recognized this format as a single year -_-)
 * @param {object|number} value
 */
function valueToDateTime(value) {
	if (typeof value === "number") { // that means its just a year
		return dv.luxon.DateTime.fromObject({ year: value })
	}
	return dv.date(value)
}

/**
 * @param {object} _ 
 * @param {object} _.sort
 * @param {import('../view').ScoreFile[]} _.pages
 */
const sortPages = async ({ sort, pages }) => {
	if (sort?.manual) {
		// console.log(dv.current())
		const rawSortingPages = dv.current()[sort.manual]
		if (!rawSortingPages) {
			console.warn(`${sort.manual} property could not be found in your file`)
			return pages
		}

		const sortingPages = await _normalizeLinksPath(rawSortingPages)

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
			const aReleased = valueToDateTime(a.release)
			const bReleased = valueToDateTime(b.release)
			if (!aReleased || !bReleased) return 0
			return bReleased - aReleased
		})
	}
	if (sort?.recentlyReleased === false) {
		return pages.sort((a, b) => {
			const aReleased = valueToDateTime(a.release)
			const bReleased = valueToDateTime(b.release)
			if (!aReleased || !bReleased) return 0

			return aReleased - bReleased
		})
	}

	if (sort?.shuffle) {
		return shuffleArray(pages)
	}

	// - Alphabetical order by default
	return pages.sort((a, b) => a.file.name.localeCompare(b.file.name))
}

await sortPages({ pages, sort })
logPerf("Dataview js query: sorting")
//#endregion

const os = getOS();
//#region Build the grid of score for the DOM

/**
 * Build the complete list of score that will eventually be rendered on the screen
 * (if you scroll all the way down)
 * @param {import('../view').ScoreFile[]} pages - dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface)
 * @returns {string[]} Each value of the array contains some HTML equivalent to a cell on the grid
 */
const buildGridArticles = async (pages) => {
	const gridArticles = []

	for (const p of pages) {
		let fileTag = ""
		let thumbTag = ""
		let imgTag = ""

		if (!disableSet.has("filelink")) {
			if (p[TITLE_FIELD]) {
				fileTag = `<span class="file-link">
				${renderInternalFileAnchor({ path: p.file.path, name: p[TITLE_FIELD] })}
				</span>`
			} else {
				fileTag = `<span class="file-link">
				${renderInternalFileAnchor(p.file)}
				</span>`
			}
		}

		if (!disableSet.has("thumbnail")) {
			if (!p[THUMBNAIL_FIELD]) {
				imgTag = ""
			} else if (typeof p[THUMBNAIL_FIELD] === "string") {
				// Thumbnail is an url (for non youtube music)
				imgTag = renderThumbnailFromUrl(p[THUMBNAIL_FIELD])
			} else {
				imgTag = renderThumbnailFromVault(p[THUMBNAIL_FIELD])
			}
		}
		thumbTag = `<div class="thumb-stack">
			${renderInternalFileAnchor({path: p.file.path, name: imgTag, mdmIcon: false})}
		</div>`
			// ${imgTag}

		const article = `<article class="internal-link">
		${thumbTag ?? ""}
		${fileTag}
		</article>
		`
		gridArticles.push(article)
	}

	return gridArticles
}
const gridArticles = await buildGridArticles(pages)

logPerf("Building the string array of article")

removeTagChildDVSpan(rootNode)

let nbPageBatchesFetched = 1

const buildGridDOM = (disableLazyRendering = false) => {
	if (disableLazyRendering) {
		return dv.el("div", gridArticles.join(""), { cls: "grid" })
	}
	return dv.el("div", gridArticles.slice(0, NB_FILE_BATCH_PER_PAGE).join(""), { cls: "grid" })
}

/** @type {HTMLDivElement} */
const grid = buildGridDOM(DISABLE_LAZY_RENDERING)

logPerf(`Converting the string array to DOM object`)

rootNode.appendChild(grid);
// logPerf("Appending the first built grid to the DOM")
//#endregion

//#region Infinite scroll custom implementation
const _insertNewChunkInGrid = () => {
	const newChunk = gridArticles.slice(
		nbPageBatchesFetched * NB_FILE_BATCH_PER_PAGE,
		(nbPageBatchesFetched + 1) * NB_FILE_BATCH_PER_PAGE).join("")

	// Needed for metadata-menu to trigger and render extra buttons
	const newChunkDOM = dv.el("div", newChunk)

	const newChunkFragment = document.createDocumentFragment();
	newChunkDOM.querySelectorAll("article").forEach(article => {
		newChunkFragment.appendChild(article)
	})

	grid.querySelector("span").insertBefore(newChunkFragment, grid.querySelector("span").lastChild);
	nbPageBatchesFetched++
}

function handleLastScoreIntersection(entries) {
	entries.map((entry) => {
		if (entry.isIntersecting) {
			startTime = performance.now();

			scoreObserver.unobserve(entries[0].target);

			_insertNewChunkInGrid()

			logPerf("Appended new scores at the end of the grid")

			if (nbPageBatchesFetched * NB_FILE_BATCH_PER_PAGE < numberOfPagesFetched) {
				console.log(`Batch to load next: ${nbPageBatchesFetched * NB_FILE_BATCH_PER_PAGE}`)
				lastScore = grid.querySelector('article:last-of-type')
				scoreObserver.observe(lastScore)
			} else {
				console.log(`Finish to load: ${nbPageBatchesFetched * NB_FILE_BATCH_PER_PAGE}`)
			}

		}
	});
}
const scoreObserver = new IntersectionObserver(handleLastScoreIntersection);
let lastScore = grid.querySelector('article:last-of-type');
if (lastScore && !DISABLE_LAZY_RENDERING) {
	scoreObserver.observe(lastScore)
}
//#endregion


console.info(`View took ${buildDurationLog(performance.now() - inceptionTime)} to run`)