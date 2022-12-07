// @ts-check
let startTime = performance.now()
let perfTime = null;

const logPerf = (label) => {
	perfTime = performance.now()
	console.info(`${label} took ${(perfTime - startTime).toPrecision(3)} milliseconds`)
	startTime = perfTime
}

console.log("=----------------------=")

const {
	filter,
	sort,
	disable = "",

	// voir ce post https://stackoverflow.com/a/18939803 pour avoir un système de debug robuste
	debug = false
	/*disableFilters*/
} = input || { };

//#region Constants

const DEFAULT_SCORE_DIRECTORY = "/DB/🎼"
const SCORE_PER_PAGE_BATCH = 20
const enableSimultaneousMp3Playing = false

const disableSet = new Set(disable.split(' ').map(v => v.toLowerCase()))
const tid = (new Date()).getTime();
const rootNode = dv.el("div", "", {
	cls: "jukebox",
	attr: {
		id: "jukebox" + tid,
		style: 'position:relative;-webkit-user-select:none!important'
	}
});

//#region Icons
// ------------------------
// - Company/Service icons
// ------------------------
const youtubeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1-.5-3.4-.5-5s.2-3.9.5-5c.2-.7.7-1.2 1.4-1.4C5.6 5.2 9.7 5 12 5s6.4.2 8.1.6c.7.2 1.2.7 1.4 1.4.3 1.1.5 3.4.5 5s-.2 3.9-.5 5c-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6 0 0 0 0 0 0z"></path><polygon points="10 15 15 12 10 9"></polygon></svg>'

// from: https://www.svgrepo.com/svg/89412/soundcloud-logo
const soundcloudIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" 
width="24" height="24" viewBox="0 0 317.531 317.531" stroke-width="4" stroke="#ff5400" fill="#ff5400" style="enable-background:new 0 0 317.531 317.531;" xml:space="preserve">
	<g>
		<path d="M270.275,141.93c-3.134,0-6.223,0.302-9.246,0.903c-3.289-15.779-11.423-30.182-23.436-41.249
			c-14.363-13.231-33.037-20.518-52.582-20.518c-9.533,0-19.263,1.818-28.139,5.256c-3.862,1.497-5.78,5.841-4.284,9.703
			c1.496,3.863,5.838,5.781,9.703,4.284c7.165-2.776,15.022-4.244,22.72-4.244c32.701,0,59.532,24.553,62.411,57.112
			c0.211,2.386,1.548,4.527,3.6,5.763c2.052,1.236,4.571,1.419,6.778,0.49c3.948-1.66,8.146-2.501,12.476-2.501
			c17.786,0,32.256,14.475,32.256,32.267c0,17.792-14.473,32.268-32.263,32.268c-1.002,0-106.599-0.048-110.086-0.061
			c-3.841-0.084-7.154,2.778-7.591,6.659c-0.464,4.116,2.497,7.829,6.613,8.292c0.958,0.108,109.962,0.109,111.064,0.109
			c26.061,0,47.263-21.205,47.263-47.268C317.531,163.134,296.332,141.93,270.275,141.93z"/>
		<path d="M7.5,153.918c-4.142,0-7.5,3.358-7.5,7.5v60.039c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-60.039
			C15,157.276,11.642,153.918,7.5,153.918z"/>
		<path d="M45.917,142.037c-4.142,0-7.5,3.358-7.5,7.5v71.07c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-71.07
			C53.417,145.395,50.059,142.037,45.917,142.037z"/>
		<path d="M85.264,110.21c-4.142,0-7.5,3.358-7.5,7.5v111c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5v-111
			C92.764,113.568,89.406,110.21,85.264,110.21z"/>
		<path d="M125.551,111.481c-4.142,0-7.5,3.358-7.5,7.5v109.826c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5V118.981
			C133.051,114.839,129.693,111.481,125.551,111.481z"/>
	</g>
</svg>
`
const dailymotionIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
  <g fill="none" fill-rule="evenodd">
    <path fill="#232323" d="M310.744275,457.219014 C290.104691,478.116711 264.241017,488.566555 233.154248,488.566555 C202.576055,488.566555 177.222946,478.372629 157.091937,457.983783 C136.961923,437.594936 126.896916,411.344856 126.896916,379.232547 C126.896916,348.648779 137.216708,323.289934 157.856292,303.15601 C178.496872,283.022086 203.84998,272.955622 233.918604,272.955622 C254.303403,272.955622 272.777313,277.669703 289.340336,287.099855 C305.903358,296.530008 318.771001,309.400623 327.94426,325.7117 C337.117519,342.021782 341.703651,359.8614 341.703651,379.232547 C341.703651,410.324169 331.383859,436.320322 310.744275,457.219014 Z M334.823458,27.524694 L334.823458,204.907162 C316.98651,187.067543 298.004024,174.196928 277.874011,166.296313 C257.743001,158.395697 235.192529,154.445389 210.220603,154.445389 C169.95958,154.445389 133.777109,164.384391 101.670205,184.264388 C69.5633006,204.142393 44.5923698,231.284703 26.7554219,265.691317 C8.91847395,300.097932 0,338.199931 0,379.99632 C0,422.8124 8.7910814,461.424245 26.3732442,495.829864 C43.955407,530.236478 68.9263379,557.378788 101.288027,577.257789 C133.649717,597.137786 170.724931,607.076788 212.513669,607.076788 C273.159491,607.076788 315.457799,587.197787 339.41158,547.439785 L340.939296,547.439785 L340.939296,601.809047 L461.720374,601.809047 L461.720374,0 L334.823458,27.524694 Z" transform="translate(248 202)"/>
  </g>
</svg>`
// #0061d1
// #324b73

// - https://lucide.dev/icon/package-open?search=package-open
const dropboxIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0061fe" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"></path><path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"></path><line x1="12" y1="22" x2="12" y2="13"></line><path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"></path></svg>`

// #0061fe


// ----------------
// - Other icons
// ----------------
const linkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`

const mediaIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"></path><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"></path><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"></path></svg>`

const playIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
</svg>`

const pauseIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
</svg>`

const filePlusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`
//#endregion

//#region Utils functions
const delay = async (time) => new Promise((resolve) => setTimeout(resolve, time));


function isObject(o) {
	return o !== null && typeof o === 'object' && Array.isArray(o) === false;
}

/**
 * from https://stackoverflow.com/a/6274381
 * Shuffles array in place. (Modify it)
 * @param {Array} a items An array containing the items.
 */
function shuffleArray(a) {
	var j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
}

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

function removeTagChildDVSpan(tag) {
	const span = tag.querySelector("span")
	span.outerHTML = span.innerHTML
}

// /**
//  * from there : https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/CreateNoteModal.ts
//  * Handles creating the new note
//  * A new markdown file will be created at the given file path (`input`)
//  * @param {string} input 
//  * @param {string} mode - current-pane / new-pane / new-tab
//  */
const createNewNote = async (input, mode = "new-tab") => {
	const { vault } = this.app;
	const { adapter } = vault;
	const filePath = `${input}.md`;

	try {
		const fileExists = await adapter.exists(filePath);
		if (fileExists) {
			// If the file already exists, respond with error
			throw new Error(`${filePath} already exists`);
		}
		const file = await vault.create(filePath, '');
		// Create the file and open it in the active leaf
		let leaf = this.app.workspace.getLeaf(false);
		if (mode === "new-pane") {
			leaf = this.app.workspace.splitLeafOrActive();
		} else if (mode === "new-tab") {
			leaf = this.app.workspace.getLeaf(true);
		} else if (!leaf) {
			// default for active pane
			leaf = this.app.workspace.getLeaf(true);
		}
		await leaf.openFile(file);
		console.log({ file, leaf })
	} catch (error) {
		alert(error.toString());
	}
}
//#endregion

//#region Rendering functions
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

	// Embed de la miniature dans le document
	if (url[0] === '!') {
		const startOfUrl = url.lastIndexOf('(') + 1
		url = url.substring(startOfUrl, url.length - 1)
	}

	return `<img src="${url}" referrerpolicy="no-referrer">`
}

const renderMP3Audio = (mp3File) => {
	if (!mp3File) return ""

	return `
	<div class="audio-player">
		<button class="player-button">
			${playIcon}
		</button>
		<audio src="${window.app.vault.adapter.getResourcePath(mp3File.path)}"></audio>
	</div>`;
}

const renderThumbnailFromVault = (thumb) => {
	if (!thumb) return ""

	return `<img src="${window.app.vault.adapter.getResourcePath(thumb.path)}">`
}

const renderExternalUrlAnchor = (url) => {

	if (url.includes("youtu")) return `<a href="${url}" rel="noopener target="_blank" data-service="youtube">${youtubeIcon}</a>`
	if (url.includes("dailymotion")) return `<a href="${url}" rel="noopener target="_blank" data-service="dailymotion">${dailymotionIcon}</a>`
	if (url.includes("dropbox")) return `<a href="${url}" rel="noopener target="_blank" data-service="dropbox">${dropboxIcon}</a>`
	if (url.includes("soundcloud")) return `<a href="${url}" rel="noopener target="_blank" data-service="soundcloud">${soundcloudIcon}</a>`

	return `<a href="${url}" rel="noopener target="_blank" data-service="unknown">${linkIcon}</a>`
}

const renderInternalFileAnchor = (file) => {
	return `<a class="internal-link" target="_blank" rel="noopener" aria-label-position="top" aria-label="${file.path}" data-href="${file.path}" href="${file.path}">${file.name}</a>`
}

const renderMediaTag = (media) => {
	return `<a class="internal-link" target="_blank" rel="noopener" aria-label-position="top" aria-label="${media.path}" data-href="${media.path}" href="${media.path}">${mediaIcon}</a>`
}

const renderTimelineTrack = () => {
	return `<input type="range" class="timeline" max="100" value="0">`
}
//#endregion

logPerf("Declaration of variables and util functions")

//#region Construct the filters based on parameters
await forceLoadCustomJS();
const { CustomJs } = customJS
const QueryService = new CustomJs.Query(dv)

const fromQuery = filter?.from ?? '#🎼 AND -"_templates"'

const qs = QueryService
	.from(fromQuery);



if (filter?.mp3Only) {
	console.log(`%cFilter on mp3Only 🔊`, 'color: #7f6df2; font-size: 13px')

	qs.withExistingField("mp3")
}

if (filter?.current) {
	console.log(`%cFilter on current ↩️ (${filter.current})`, 'color: #7f6df2; font-size: 13px')

	const currentPath = dv.current().file.path;
	qs.withLinkFieldOfPath({ field: filter.current, path: currentPath })
}

if (filter?.in) {
	const inLink = dv.parse(filter.in);

	console.log({ inLink })

	if (isObject(inLink)) {
		const page = dv.page(inLink.path)
		console.log({ page })
		if (!page) {
			qs.withLinkFieldOfPath({ field: "in", path: inLink.path })
		} else {
			qs.withLinkFieldOfPath({ field: "in", path: page.file.path })
		}
	} else {
		qs.withLinkFieldOfPath({ field: "in", path: filter.in })
	}
}

if (filter?.tags) {
	console.log("%cFilter on tags 🏷️", 'color: #7f6df2; font-size: 14px')

	if (Array.isArray(filter.tags)) {
		filter.tags.forEach(t => {
			qs.withFieldOfValue({ name: "tags_", value: t })
		})
	}
	else {
		console.log(`%c=> ${filter.tags}`, 'color: #7f6df2')

		qs.withFieldOfValue({ name: "tags_", value: filter.tags })
	}
}

if (filter?.media) {
	// Right now it don't support OR query so you can't make a ['👺', '🎮'] for example
	if (!Array.isArray(filter.media)) {
		qs.withFieldOfValue({ name: "media", value: filter.media })
	}
}

/**
 * Pour l'instant, {{voice}} ne peut être qu'un objet de type
 * {yes: true, chorus: true, few: false, no: true}
 */
if (filter?.voice && isObject(filter.voice)) {
	/**
	 * CAS 1
	 * En gros si sur les valeurs données, il y a ne serait ce que un false, alors toutes les autres valeurs seront affiché
	 * Donc {yes: false} équivaut à {yes: false, chorus: true, few: true, no: true}
	 * 
	 * CAS 2
	 * Au contraire, s'il n'y a qu'un true, c'est l'inverse:
	 * {yes: true} équivaut à {yes: true, chorus: false, few: false, no: false}
	 * 
	 */

	let defaultValue = Object.values(filter.voice).some(v => !v);

	let voiceFilters = {
		yes: defaultValue,
		chorus: defaultValue,
		few: defaultValue,
		no: defaultValue,
		...filter.voice
	}



	if (defaultValue) {
		for (const [key, value] of Object.entries(voiceFilters)) {
			if (!value) {
				qs.withoutFieldOfValue({ name: "voice", value: key })
			}
		}
	} else {
		for (const [key, value] of Object.entries(voiceFilters)) {
			if (value) {
				qs.withFieldOfValue({ name: "voice", value: key })
			}
		}
	}
}
//#endregion

logPerf("Dataview js query: filtering")


const pages = qs.query()
console.log({pages})

const numberOfPagesFetched = pages.length

//#region Sort pages options
const sortPages = ({sort, pages}) => {
	if (sort?.manual) {
		console.log(dv.current())
		const sortingPages = dv.current()[sort.manual]
		if (!sortingPages) return
		
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
		return pages.sort((a, b) => {
			return a.file.ctime - b.file.ctime
		})
	}

	if (sort?.shuffle) {
		return shuffleArray(pages)
	}

	// - Alphabetical order by default
	return pages.sort((a, b) => a.file.name.localeCompare(b.file.name))
}

sortPages({pages, sort})
//#endregion

logPerf("Dataview js query: sorting")


//#region Build the grid of score for the DOM
const os = getOS();

/**
 * Build the complete list of score that will eventually be rendered on the screen
 * (if you scroll all the way down)
 * @param {any[]} pages - dataview pages (https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface)
 * @returns {string[]} Each value of the array contains some HTML equivalent to a cell on the grid
 */
const buildGridArticles = (pages) => {
	const gridArticles = []

	pages.forEach(p => {
		let fileTag = `<span class="file-link">
			${renderInternalFileAnchor(p.file)}
		</span>`
		let thumbTag = ""
		let imgTag = ""
		let soundTag = ""
		let trackTag = ""
		let urlTag = ""
		let mediaTag = ""
	
		if (!p.thumbnail) {
			imgTag = renderThumbnailFromUrl(p.url)
		} else if (typeof p.thumbnail === "string") {
			// Thumbnail is an url (for non youtube music)
			imgTag = renderThumbnailFromUrl(p.thumbnail)
		} else {
			imgTag = renderThumbnailFromVault(p.thumbnail)
		}
	
		if (p.url && !disableSet.has("urlicon")) {
			urlTag = `<span class="url-link">
				${renderExternalUrlAnchor(p.url)}
			</span>`
		}
	
		/*
		MP3 player bugs on Android unfortunately 😩 (at least on my personal android phone which runs on Android 13)
		Some music might load and play entirely without any issue
		while other have an incorrect duration in the timestamp and freeze at some point when played
	
		This strange behaviour simply make the mp3 players on Android unreliable thus unusable (since you can't predict it)
		So i prefer disabling it completely rather than having a buggy feature
		Remove the `os !== "Android"` if you want to try it on yours
		*/
		if (os !== "Android" && !disableSet.has("audioplayer") && p.mp3) {
			soundTag = renderMP3Audio(p.mp3)
			trackTag = renderTimelineTrack()
		}
	
		thumbTag = `<div class="thumb-stack">
			${imgTag}
			${soundTag}
			${soundTag ? trackTag : ""}
		</div>`

		const article = `<article>
		${thumbTag ?? ""}
		${fileTag}
		${urlTag ?? ""}
		${mediaTag ?? ""}
		</article>
		`
		gridArticles.push(article)
	})

	return gridArticles
}
const gridArticles = buildGridArticles(pages)

logPerf("Building the actual grid")

removeTagChildDVSpan(rootNode)

let nbPageBatchesFetched = 1

const grid = dv.el("div", gridArticles.slice(0, SCORE_PER_PAGE_BATCH).join(""), { cls: "grid" })

logPerf("Convert string gridContent to DOM object")

rootNode.appendChild(grid);
//#endregion

logPerf("Appending the first built grid to the DOM")

//#region Infinite scroll custom implementation
function handleLastScoreIntersection(entries) {
	entries.map((entry) => {
		if (entry.isIntersecting) {
			startTime = performance.now();

			scoreObserver.unobserve(entries[0].target);
			grid.querySelector("span").insertAdjacentHTML('beforeend', gridArticles.slice(
				nbPageBatchesFetched * SCORE_PER_PAGE_BATCH,
				(nbPageBatchesFetched + 1) * SCORE_PER_PAGE_BATCH).join(""));
			nbPageBatchesFetched++

			logPerf("Appended new scores at the end of the grid")

			manageMp3Scores();

			if (nbPageBatchesFetched * SCORE_PER_PAGE_BATCH < numberOfPagesFetched) {
				console.log(`Batch to load next: ${nbPageBatchesFetched * SCORE_PER_PAGE_BATCH}`)
				lastScore = grid.querySelector('article:last-of-type')
				scoreObserver.observe(lastScore)
			} else {
				console.log(`Finish to load: ${nbPageBatchesFetched * SCORE_PER_PAGE_BATCH}`)
				if (disableSet.has("addscore")) return;

				const addScoreCellDOM = dv.el("article", filePlusIcon, { cls: "add-file" })
				grid.querySelector("span").appendChild(addScoreCellDOM);

				addScoreCellDOM.onclick = async () => {
					createNewNote(`${DEFAULT_SCORE_DIRECTORY}/Untitled`)
				}
			}

		}
	});
}
const scoreObserver = new IntersectionObserver(handleLastScoreIntersection);
let lastScore = grid.querySelector('article:last-of-type');
if (lastScore) {
	scoreObserver.observe(lastScore)
}
//#endregion

//#region MP3 audio player (custom button, timeline, autoplay)
const changeTimelinePosition = (timeline, audio) => {
	const percentagePosition = (100 * audio.currentTime) / audio.duration;
	timeline.style.backgroundSize = `${percentagePosition}% 100%`;
	timeline.value = percentagePosition;
}

const changeSeek = (timeline, audio) => {
	const time = (timeline.value * audio.duration) / 100;
	audio.currentTime = time;
}

const playAudio = ({ index, audios, playButtons }) => {
	if (!enableSimultaneousMp3Playing && currentMP3Playing !== -1) {
		pauseAudio({ audio: audios[currentMP3Playing], playButton: playButtons[currentMP3Playing] })
	}

	currentMP3Playing = index;
	audios[index].play()
	playButtons[index].innerHTML = pauseIcon;

}

const pauseAudio = ({ playButton, audio }) => {
	currentMP3Playing = -1;
	audio.pause();
	playButton.innerHTML = playIcon;
}

const handlePlayButtonClick = ({ index, audios, playButtons }) => {
	if (audios[index].paused) {
		playAudio({ playButtons, audios, index })
	} else {
		pauseAudio({ playButton: playButtons[index], audio: audios[index] })
	}
}

let audios = grid.querySelectorAll(`audio`)
let playButtons = grid.querySelectorAll('.audio-player button')
let trackTimelines = grid.querySelectorAll('input.timeline')

let currentMP3Playing = -1;
let numberOfAudiosLoaded = -1;

manageMp3Scores()

/**
 * This function should be called every time new scores are added at the end of the grid (because of scroll)
 * It:
 * - Binds the update of the audio to the progress of the timeline
 * - Handle what happened when you click on the custom button
 * - Make possible to drag the timeline to change the audio timecode
 * - Supports automatic playback of the next found mp3 (which is already loaded in the grid of course)
 */
function manageMp3Scores() {
	startTime = performance.now();

	// - Update these core variables with new scores (eventually)
	audios = grid.querySelectorAll(`audio`)
	playButtons = grid.querySelectorAll('.audio-player button')
	trackTimelines = grid.querySelectorAll('input.timeline')

	if (numberOfAudiosLoaded === audios.length) return;
	numberOfAudiosLoaded = audios.length


	// Must never happen
	if (audios.length !== playButtons.length) {
		console.warn("The number of play buttons doesn't match the number of audios")
	}


	for (let i = 0; i < audios.length; i++) {

		audios[i].ontimeupdate = changeTimelinePosition.bind(this, trackTimelines[i], audios[i])

		playButtons[i].onclick = handlePlayButtonClick.bind(this, { index: i, audios, playButtons })

		trackTimelines[i].onchange = changeSeek.bind(this, trackTimelines[i], audios[i])

		audios[i].onended = () => {
			playButtons[i].innerHTML = playIcon;
			if (disableSet.has("autoplay") || audios.length === 1) return;

			if (i + 1 === audios.length) {
				playButtons[0].innerHTML = pauseIcon;
				audios[0].play()
			} else {
				playButtons[i + 1].innerHTML = pauseIcon;
				audios[i + 1].play()
			}
		};
	}

	logPerf("Reloading all the mp3 management")
}
//#endregion
