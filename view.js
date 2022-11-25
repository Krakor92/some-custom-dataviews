/*

Pour la pagination faudra que je regarde comment fait le fileClass view du plugin Metadata menu

*/

const {
	from,
	tags,
	linkedProperty,
	disableAudioPlayer,
	shuffle,
	/*disableFilters*/
} = input || {};


const youtubeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1-.5-3.4-.5-5s.2-3.9.5-5c.2-.7.7-1.2 1.4-1.4C5.6 5.2 9.7 5 12 5s6.4.2 8.1.6c.7.2 1.2.7 1.4 1.4.3 1.1.5 3.4.5 5s-.2 3.9-.5 5c-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6 0 0 0 0 0 0z"></path><polygon points="10 15 15 12 10 9"></polygon></svg>'
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


const linkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`

const tid = (new Date()).getTime();
const rootNode = dv.el("div", "", { cls: "jukebox", attr: { id: "jukebox" + tid, style: 'position:relative;-webkit-user-select:none!important' } });

// - Utils functions
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

const renderThumbnailFromUrl = (url) => {
	if (!url) return null

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

	return `<img src="${url}" referrerpolicy="no-referrer">`
}

const renderMP3Audio = (mp3File) => {
	if (!mp3File) return null

	return `<audio controls src="${window.app.vault.adapter.getResourcePath(mp3File.path)}">`
}

const renderThumbnailFromVault = (thumb) => {
	if (!thumb) return null

	return `<img src="${window.app.vault.adapter.getResourcePath(thumb.path)}">`
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

// - Build the query
await forceLoadCustomJS();
const { CustomJs } = customJS
const QueryService = new CustomJs.Query(dv)

const fromQuery = from ?? '#🎼 AND -"_templates"'

const qs = QueryService
	.from(fromQuery);

if (linkedProperty) {
	const currentPath = dv.current().file.path;
	qs.withLinkFieldOfPath({ field: linkedProperty, path: currentPath })
}

if (tags) {
	if (Array.isArray(tags)) {
		tags.forEach(t => {
			qs.withFieldOfValue({ name: "tags_", value: t })
		})
	}
	else {
		qs.withFieldOfValue({ name: "tags_", value: tags })
	}
}

const pages = qs
	.query()

if (!!shuffle) {
	shuffleArray(pages)
} else {
	pages.sort((a, b) => a.file.name.localeCompare(b.file.name))
}


// - Build the grid of score
const os = getOS();
let gridContent = ""
pages.forEach(p => {

	let fileTag = `<span class="file-link">
	<a class="internal-link" target="_blank" rel="noopener" aria-label-position="top" aria-label="${p.file.path}" data-href="${p.file.path}" href="${p.file.path}">${p.file.name}</a>
	</span>`
	let thumbTag = ""
	let urlTag = ""
	let soundTag = ""

	if (!p.thumbnail) {
		thumbTag = renderThumbnailFromUrl(p.url)
	} else if (typeof p.thumbnail === "string") {
		// Thumbnail is an url (for non youtube music)
		thumbTag = renderThumbnailFromUrl(p.thumbnail)
	} else {
		thumbTag = renderThumbnailFromVault(p.thumbnail)
	}

	if (p.url) {
		let aTag = ""
		if (p.url.includes("youtu")) {
			aTag = `<a href="${p.url}" rel="noopener target="_blank" data-service="youtube">${youtubeIcon}</a>`
		} else if (p.url.includes("dailymotion")) {
			aTag = `<a href="${p.url}" rel="noopener target="_blank" data-service="dailymotion">${dailymotionIcon}</a>`
		} else if (p.url.includes("dropbox")) {
			aTag = `<a href="${p.url}" rel="noopener target="_blank" data-service="dropbox">${dropboxIcon}</a>`
		} else if (p.url.includes("soundcloud")) {
			aTag = `<a href="${p.url}" rel="noopener target="_blank" data-service="soundcloud">${soundcloudIcon}</a>`
		} else {
			aTag = `<a href="${p.url}" rel="noopener target="_blank" data-service="unknown">${linkIcon}</a>`
		}

		urlTag = `<span class="url-link">
			${aTag}
		</span>`
	}

	// MP3 player bug on Android unfortunatelly :/
	if (os !== "Android" && !disableAudioPlayer && p.mp3) {
		soundTag = `<span class="file-link">
			${renderMP3Audio(p.mp3)}
		</span>`
	}

	gridContent += `<article>
	${thumbTag ?? ""}
	${fileTag}
	${urlTag ?? ""}
	${soundTag}
	</article>
	`
})

rootNode.querySelector("span").appendChild(dv.el("div", gridContent, { cls: "grid" }));


// dv.table(["Thumb", "Music", "MP3", "🏷️"],
// 	pages
// 		.map(p => {
// 			return [
// 				p.thumbnail || renderThumbnailFromUrl(p.url),
// 				p.file.link,
// 				renderMP3Audio(p.mp3) || p.url,
// 				p.tags_,
// 			]
// 		})
// );
