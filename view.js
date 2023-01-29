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

const DEFAULT_FROM = '#🎼 AND -"_templates"'

// Where to create the file when we press the + tile/button
const DEFAULT_SCORE_DIRECTORY = "DB/🎼"

// Only used by the orphan system
const DEFAULT_THUMBNAIL_DIRECTORY = "_assets/🖼/Thumbnails"

const NB_SCORE_BATCH_PER_PAGE = 20
const ENABLE_SIMULTANEOUS_MP3_PLAYING = false
const STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC = true

// Between 0 (silent) and 1 (loudest)
const DEFAULT_VOLUME = 0.4

// Until how many seconds in youtube url (?t=) should we consider the music to not be elegible to playlist
const MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST = 12
const HIDE_ICONS = true

//#endregion

//#region Initialize view's root node

/** @type {Set<string>} */
const disableSet = new Set(disable.split(' ').map(v => v.toLowerCase()))
const tid = (new Date()).getTime();

/** @type {HTMLDivElement} */
const rootNode = dv.el("div", "", {
	cls: "jukebox",
	attr: {
		id: "jukebox" + tid,
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

//#region Icons
// ------------------------
// - Company/Service icons
// ------------------------
// const youtubeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1-.5-3.4-.5-5s.2-3.9.5-5c.2-.7.7-1.2 1.4-1.4C5.6 5.2 9.7 5 12 5s6.4.2 8.1.6c.7.2 1.2.7 1.4 1.4.3 1.1.5 3.4.5 5s-.2 3.9-.5 5c-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6 0 0 0 0 0 0z"></path><polygon points="10 15 15 12 10 9"></polygon></svg>'
const youtubeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa0000${HIDE_ICONS ? "00" : ""}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c-2.3 0-6.4-.2-8.1-.6-.7-.2-1.2-.7-1.4-1.4-.3-1.1-.5-3.4-.5-5s.2-3.9.5-5c.2-.7.7-1.2 1.4-1.4C5.6 5.2 9.7 5 12 5s6.4.2 8.1.6c.7.2 1.2.7 1.4 1.4.3 1.1.5 3.4.5 5s-.2 3.9-.5 5c-.2.7-.7 1.2-1.4 1.4-1.7.4-5.8.6-8.1.6 0 0 0 0 0 0z"></path><polygon points="10 15 15 12 10 9"></polygon></svg>`

// from: https://www.svgrepo.com/svg/89412/soundcloud-logo
const soundcloudIcon = `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 317.531 317.531" stroke-width="4" stroke="#ff5400${HIDE_ICONS ? "00" : ""}" fill="#ff5400${HIDE_ICONS ? "00" : ""}" style="enable-background:new 0 0 317.531 317.531;" xml:space="preserve"><g><path d="M270.275,141.93c-3.134,0-6.223,0.302-9.246,0.903c-3.289-15.779-11.423-30.182-23.436-41.249c-14.363-13.231-33.037-20.518-52.582-20.518c-9.533,0-19.263,1.818-28.139,5.256c-3.862,1.497-5.78,5.841-4.284,9.703c1.496,3.863,5.838,5.781,9.703,4.284c7.165-2.776,15.022-4.244,22.72-4.244c32.701,0,59.532,24.553,62.411,57.112c0.211,2.386,1.548,4.527,3.6,5.763c2.052,1.236,4.571,1.419,6.778,0.49c3.948-1.66,8.146-2.501,12.476-2.501c17.786,0,32.256,14.475,32.256,32.267c0,17.792-14.473,32.268-32.263,32.268c-1.002,0-106.599-0.048-110.086-0.061c-3.841-0.084-7.154,2.778-7.591,6.659c-0.464,4.116,2.497,7.829,6.613,8.292c0.958,0.108,109.962,0.109,111.064,0.109c26.061,0,47.263-21.205,47.263-47.268C317.531,163.134,296.332,141.93,270.275,141.93z"/><path d="M7.5,153.918c-4.142,0-7.5,3.358-7.5,7.5v60.039c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-60.039C15,157.276,11.642,153.918,7.5,153.918z"/><path d="M45.917,142.037c-4.142,0-7.5,3.358-7.5,7.5v71.07c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5v-71.07C53.417,145.395,50.059,142.037,45.917,142.037z"/><path d="M85.264,110.21c-4.142,0-7.5,3.358-7.5,7.5v111c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5v-111C92.764,113.568,89.406,110.21,85.264,110.21z"/><path d="M125.551,111.481c-4.142,0-7.5,3.358-7.5,7.5v109.826c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5V118.981C133.051,114.839,129.693,111.481,125.551,111.481z"/></g></svg>`

const dailymotionIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
  <g fill="none" fill-rule="evenodd">
    <path fill="#232323${HIDE_ICONS ? "00" : ""}" d="M310.744275,457.219014 C290.104691,478.116711 264.241017,488.566555 233.154248,488.566555 C202.576055,488.566555 177.222946,478.372629 157.091937,457.983783 C136.961923,437.594936 126.896916,411.344856 126.896916,379.232547 C126.896916,348.648779 137.216708,323.289934 157.856292,303.15601 C178.496872,283.022086 203.84998,272.955622 233.918604,272.955622 C254.303403,272.955622 272.777313,277.669703 289.340336,287.099855 C305.903358,296.530008 318.771001,309.400623 327.94426,325.7117 C337.117519,342.021782 341.703651,359.8614 341.703651,379.232547 C341.703651,410.324169 331.383859,436.320322 310.744275,457.219014 Z M334.823458,27.524694 L334.823458,204.907162 C316.98651,187.067543 298.004024,174.196928 277.874011,166.296313 C257.743001,158.395697 235.192529,154.445389 210.220603,154.445389 C169.95958,154.445389 133.777109,164.384391 101.670205,184.264388 C69.5633006,204.142393 44.5923698,231.284703 26.7554219,265.691317 C8.91847395,300.097932 0,338.199931 0,379.99632 C0,422.8124 8.7910814,461.424245 26.3732442,495.829864 C43.955407,530.236478 68.9263379,557.378788 101.288027,577.257789 C133.649717,597.137786 170.724931,607.076788 212.513669,607.076788 C273.159491,607.076788 315.457799,587.197787 339.41158,547.439785 L340.939296,547.439785 L340.939296,601.809047 L461.720374,601.809047 L461.720374,0 L334.823458,27.524694 Z" transform="translate(248 202)"/>
  </g>
</svg>`
// #0061d1
// #324b73

// - https://lucide.dev/icon/package-open?search=package-open
const dropboxIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0061fe${HIDE_ICONS ? "00" : ""}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"></path><path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"></path><line x1="12" y1="22" x2="12" y2="13"></line><path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"></path></svg>`

// #0061fe

// from: https://www.flaticon.com/free-icon/spotify_1946539
const spotifyIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 512 512" stroke="#1ed760${HIDE_ICONS ? "00" : ""}" fill="#1ed760${HIDE_ICONS ? "00" : ""}" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><path d="M436.8,75.2C390.5,28.8,326.4,0,255.6,0C114.5,0,0,114.5,0,255.6c0,70.8,28.8,134.8,75.2,181.1c46.3,46.5,110.4,75.2,181.1,75.2C397.5,512,512,397.5,512,256.4C512,185.6,483.2,121.5,436.8,75.2z M256,475.1c-120.8,0-219.1-98.3-219.1-219.1S135.2,36.9,256,36.9S475.1,135.2,475.1,256S376.8,475.1,256,475.1z"/><path d="M406.5,195.9c-81.3-48.3-210-52.8-287.4-29.3c-8.5,2.6-14.6,10.4-14.6,19.6c0,11.3,9.2,20.5,20.5,20.5l6.1-0.9l-0.1,0c67.4-20.5,183.9-16.6,254.6,25.3c3,1.8,6.6,2.9,10.5,2.9c11.3,0,20.5-9.2,20.5-20.5C416.6,206.1,412.6,199.5,406.5,195.9L406.5,195.9L406.5,195.9z"/><path d="M351.9,334.1c-57.8-35.3-129.3-43.5-212.8-24.4c-6.1,1.4-10.6,6.9-10.6,13.3c0,7.5,6.1,13.7,13.7,13.7l3.1-0.4l-0.1,0c76.3-17.4,141-10.3,192.5,21.1c2,1.3,4.5,2,7.2,2c7.5,0,13.7-6.1,13.7-13.7C358.5,340.9,355.9,336.6,351.9,334.1L351.9,334.1z"/><path d="M377.7,269.8c-67.6-41.6-166.5-53.3-246.1-29.1c-7.1,2.2-12.1,8.7-12.1,16.3c0,9.4,7.6,17.1,17.1,17.1l5.1-0.8l-0.1,0c69.7-21.2,159.4-10.7,218.3,25.5c2.5,1.6,5.6,2.5,8.9,2.5c6.1,0,11.5-3.2,14.5-8.1l0-0.1c1.6-2.5,2.5-5.6,2.5-8.9C385.9,278.2,382.6,272.8,377.7,269.8L377.7,269.8L377.7,269.8z"/></g></svg>`

// manually edited this one: https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Deezer_logo.svg/2560px-Deezer_logo.svg.png
const deezerIcon = `<svg version="1.1" id="Calque_1" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="22" height="22" viewBox="0 0 198.4 129.7" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;fill:#40AB5D${HIDE_ICONS ? "00" : ""};}.st1{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8192_1_);}.st2{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8199_1_);}.st3{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8206_1_);}.st4{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8213_1_);}.st5{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8220_1_);}.st6{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8227_1_);}.st7{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8234_1_);}.st8{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8241_1_);}.st9{fill-rule:evenodd;clip-rule:evenodd;fill:url(#rect8248_1_);}</style><g id="g8252" transform="translate(0,25.2)"><rect id="rect8185" x="155.5" y="-25.1" class="st0" width="42.9" height="25.1"/><linearGradient id="rect8192_1_" gradientUnits="userSpaceOnUse" x1="-111.7225" y1="241.8037" x2="-111.9427" y2="255.8256" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"><stop offset="0" style="stop-color:#358C7B${HIDE_ICONS ? "00" : ""}"/><stop offset="0.5256" style="stop-color:#33A65E${HIDE_ICONS ? "00" : ""}"/></linearGradient><rect id="rect8192" x="155.5" y="9.7" class="st1" width="42.9" height="25.1"/><linearGradient id="rect8199_1_" gradientUnits="userSpaceOnUse" x1="-123.8913" y1="223.6279" x2="-99.7725" y2="235.9171" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"><stop offset="0" style="stop-color:#222B90${HIDE_ICONS ? "00" : ""}"/><stop offset="1" style="stop-color:#367B99${HIDE_ICONS ? "00" : ""}"/></linearGradient><rect id="rect8199" x="155.5" y="44.5" class="st2" width="42.9" height="25.1"/><linearGradient id="rect8206_1_" gradientUnits="userSpaceOnUse" x1="-208.4319" y1="210.7725" x2="-185.0319" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"><stop offset="0" style="stop-color:#FF9900${HIDE_ICONS ? "00" : ""}"/><stop offset="1" style="stop-color:#FF8000${HIDE_ICONS ? "00" : ""}"/></linearGradient><rect id="rect8206" x="0" y="79.3" class="st3" width="42.9" height="25.1"/> <linearGradient id="rect8213_1_" gradientUnits="userSpaceOnUse" x1="-180.1319" y1="210.7725" x2="-156.7319" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#FF8000${HIDE_ICONS ? "00" : ""}"/> <stop offset="1" style="stop-color:#CC1953${HIDE_ICONS ? "00" : ""}"/> </linearGradient> <rect id="rect8213" x="51.8" y="79.3" class="st4" width="42.9" height="25.1"/> <linearGradient id="rect8220_1_" gradientUnits="userSpaceOnUse" x1="-151.8319" y1="210.7725" x2="-128.4319" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#CC1953${HIDE_ICONS ? "00" : ""}"/> <stop offset="1" style="stop-color:#241284${HIDE_ICONS ? "00" : ""}"/> </linearGradient> <rect id="rect8220" x="103.7" y="79.3" class="st5" width="42.9" height="25.1"/> <linearGradient id="rect8227_1_" gradientUnits="userSpaceOnUse" x1="-123.5596" y1="210.7725" x2="-100.1596" y2="210.7725" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#222B90${HIDE_ICONS ? "00" : ""}"/> <stop offset="1" style="stop-color:#3559A6${HIDE_ICONS ? "00" : ""}"/> </linearGradient> <rect id="rect8227" x="155.5" y="79.3" class="st6" width="42.9" height="25.1"/> <linearGradient id="rect8234_1_" gradientUnits="userSpaceOnUse" x1="-152.7555" y1="226.0811" x2="-127.5083" y2="233.4639" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="0" style="stop-color:#CC1953${HIDE_ICONS ? "00" : ""}"/> <stop offset="1" style="stop-color:#241284${HIDE_ICONS ? "00" : ""}"/> </linearGradient> <rect id="rect8234" x="103.7" y="44.5" class="st7" width="42.9" height="25.1"/> <linearGradient id="rect8241_1_" gradientUnits="userSpaceOnUse" x1="-180.9648" y1="234.3341" x2="-155.899" y2="225.2108" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="2.669841e-03" style="stop-color:#FFCC00${HIDE_ICONS ? "00" : ""}"/> <stop offset="0.9999" style="stop-color:#CE1938${HIDE_ICONS ? "00" : ""}"/> </linearGradient> <rect id="rect8241" x="51.8" y="44.5" class="st8" width="42.9" height="25.1"/> <linearGradient id="rect8248_1_" gradientUnits="userSpaceOnUse" x1="-178.1651" y1="257.7539" x2="-158.6987" y2="239.791" gradientTransform="matrix(1.8318 0 0 -1.8318 381.8134 477.9528)"> <stop offset="2.669841e-03" style="stop-color:#FFD100${HIDE_ICONS ? "00" : ""}"/> <stop offset="1" style="stop-color:#FD5A22${HIDE_ICONS ? "00" : ""}"/> </linearGradient> <rect id="rect8248" x="51.8" y="9.7" class="st9" width="42.9" height="25.1"/> </g> </svg>`

// ----------------
// - Other icons
// ----------------
const linkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${HIDE_ICONS ? "transparent" : "currentColor"}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`

const mediaIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"></path><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"></path><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"></path></svg>`

const playIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
</svg>`

const pauseIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
</svg>`

const filePlusIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`

const filterIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>';

// Taken from Alexandru Dinu Sortable plugin
const sortIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M49.792 33.125l-5.892 5.892L33.333 28.45V83.333H25V28.45L14.438 39.017L8.542 33.125L29.167 12.5l20.625 20.625zm41.667 33.75L70.833 87.5l-20.625 -20.625l5.892 -5.892l10.571 10.567L66.667 16.667h8.333v54.883l10.567 -10.567l5.892 5.892z"></path></svg>'

const saveIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>'

const listMusicIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15V6"></path><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path><path d="M12 12H3"></path><path d="M16 6H3"></path><path d="M12 18H3"></path></svg>'

const micOffIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path><path d="M5 10v2a7 7 0 0 0 12 5"></path><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path><path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`

const mic2Icon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12"></path><circle cx="17" cy="7" r="5"></circle></svg>`

const venetianMaskIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"></path><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"></path><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"></path></svg>`
//#endregion

//#region Utils
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

const httpRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/

/**
 * @param {string} timecode 
 * @returns {number} The timecode converted to seconds
*/
const convertTimecodeToDuration = (timecode) => {
	const timeArray = timecode.split(':');
	if (timeArray.length < 2 || timeArray.length > 3) { // It only supports 00:00 or 00:00:00
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
	if (isNaN(thumbnailY)) return null // Si le display n'est pas un chiffre, on renvoit null

	return `style="object-position: 50% ${clamp(thumbnailY, 0, 1) * 100}%"`
}

const _resolveUrlThumbnailStyle = (str) => {
	const startOfDisplayId = str.indexOf("[")
	const endOfDisplayId = str.indexOf("]")

	// Il n'y a soit pas de [], soit il est y est mais est vide
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
	// Embed de la miniature dans le document
	if (url[0] === '!') {
		style = _resolveUrlThumbnailStyle(url)

		const startOfUrl = url.lastIndexOf('(') + 1
		url = url.substring(startOfUrl, url.length - 1)
	}

	return `<img src="${url}" referrerpolicy="no-referrer" ${style ?? ""}>`
}

/**
 * 
 * @param {object} _
 * @param {import('../view').Link} _.audioFile
 * @param {number?} _.volumeOffset
 */
const renderMP3Audio = async ({ audioFile, volumeOffset }) => {
	if (!audioFile) return ""

	const mp3Exists = await linkExists(audioFile)
	if (!mp3Exists) return ""

	const dataVolume = volumeOffset ? `data-volume="${volumeOffset}"` : ""

	return `
	<div class="audio-player">
		<button class="player-button">
			${playIcon}
		</button>
		<audio ${dataVolume}>
			<source src="${window.app.vault.adapter.getResourcePath(audioFile.path)}"/>
		</audio>
	</div>`;
}

/**
 * @param {import('../view').Link} thumb
 */
const renderThumbnailFromVault = (thumb) => {
	if (!thumb) return ""

	let style = _resolveVaultThumbnailStyle(thumb);

	console.log("thumb.path", thumb.path)

	return `<img src="${window.app.vault.adapter.getResourcePath(thumb.path)}" ${style ?? ""}>`
}

/**
 * Returns a string of the form: `data-service="${service}">${serviceIcon}`
 * Right now the data-service isn't used
 * @param {string} url 
 */
const _resolveAnchorServicePartFromUrl = (url) => {
	if (url.includes("youtu")) return `data-service="youtube">${youtubeIcon}`
	if (url.includes("soundcloud")) return `data-service="soundcloud">${soundcloudIcon}`
	if (url.includes("dailymotion")) return `data-service="dailymotion">${dailymotionIcon}`
	if (url.includes("dropbox")) return `data-service="dropbox">${dropboxIcon}`
	if (url.includes("spotify")) return `data-service="spotify">${spotifyIcon}`
	if (url.includes("deezer")) return `data-service="deezer">${deezerIcon}`

	return `data-service="unknown">${linkIcon}`
}

const renderExternalUrlAnchor = (url) => `<a href="${url}" class="external-link" rel="noopener target="_blank" ${_resolveAnchorServicePartFromUrl(url)}</a>`

/**
 * @param {object} file 
 * @param {string} file.path 
 * @param {string} file.name 
 */
const renderInternalFileAnchor = ({ path, name } = {}) => {
	return `<a class="internal-link" target="_blank" rel="noopener" aria-label-position="top" aria-label="${path}" data-href="${path}" href="${path}">${name}</a>`
}

const renderMediaTag = (media) => {
	return `<a class="internal-link" target="_blank" rel="noopener" aria-label-position="top" aria-label="${media.path}" data-href="${media.path}" href="${media.path}">${mediaIcon}</a>`
}

const renderTimelineTrack = () => {
	return `<input type="range" class="timeline" max="100" value="0">`
}

const renderTimecode = (length) => {
	return `<div class="timecode"><span>${length}</span></div>`
}

//#endregion

//#region Manage and build orphans

/**
 * @param {object} _
 * @param {import('../view').ScoreFile} _.ScoreFile
 * @param {string[]} _.orphans
 * @returns {import('../view').ScoreFile[]}
 */
const buildOrphans = (scoreFile) => {
	if (!scoreFile || !scoreFile.orphans) return []

	let orphans = null

	try {
		if (Array.isArray(orphans)) {
			orphans = JSON.parse(`[${scoreFile.orphans.join(',')}]`)
		} else {
			orphans = JSON.parse(`[${scoreFile.orphans}]`)
		}
	} catch (error) {
		console.error(error)
		return []
	}

	console.log({ orphans })

	// Needed to disguise orphans as real ScoreFile (mock Link to TFile)
	for (const o of orphans) {
		// If thumbnail includes a '/', that means it's an url
		if (o.thumbnail && !o.thumbnail.includes("/")) {
			o.thumbnail = {
				path: `${DEFAULT_THUMBNAIL_DIRECTORY}/${o.thumbnail.replace(/\[|\]/g, '')}`
			}
		}

		o.file = {
			name: o.title,
			path: `${DEFAULT_SCORE_DIRECTORY}/${o.title}.md`
		}
	}

	return orphans
}

const orphanPages = disableSet.has("orphans") ? [] : buildOrphans(dv.current())

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

scoreQueryFilterFunctionsMap.set('mp3Only', async (qs) => {
	console.log(`%cFilter on mp3Only 🔊`, 'color: #7f6df2; font-size: 13px')
	qs.withExistingField("mp3")
	await qs.asyncFilter(async (page) => await linkExists(page.mp3))
})

scoreQueryFilterFunctionsMap.set('current', (qs, value) => {
	console.log(`%cFilter on current ↩️ (${value})`, 'color: #7f6df2; font-size: 13px')
	const currentPath = dv.current().file.path;
	qs.withLinkFieldOfPath({ field: value, path: currentPath })
})

scoreQueryFilterFunctionsMap.set('in', (qs, value) => {
	const inLink = dv.parse(value);
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
		qs.withLinkFieldOfPath({ field: "in", path: value })
	}
})

scoreQueryFilterFunctionsMap.set('tags', (qs, value) => {
	console.log("%cFilter on tags 🏷️", 'color: #7f6df2; font-size: 14px')

	if (Array.isArray(value)) {
		value.forEach(t => {
			qs.withFieldOfValue({ name: "tags_", value: t })
		})
	}
	else {
		console.log(`%c=> ${value}`, 'color: #7f6df2')

		qs.withFieldOfValue({ name: "tags_", value })
	}
})

/**
 * Pour l'instant, {{voice}} ne peut être qu'un objet de type
 * {yes: true, chorus: true, few: false, no: true}
 */
scoreQueryFilterFunctionsMap.set('voice', (qs, value) => {
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

	let defaultValue = Object.values(value).some(v => !v);

	let voiceFilters = {
		yes: defaultValue,
		chorus: defaultValue,
		few: defaultValue,
		no: defaultValue,
		...value
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
})

/**
 * Needed to profit of Dataview implementation of backlinks
 * @warning This function mutate the filter argument
 * @param {string} from 
 * @param {object} filter 
 * @returns 
 */
const _updateFromStringBasedOnSpecialFilters = (from, filter) => {
	if (!filter) return from

	console.log({ from, filter })
	if (filter.current === "backlinks") {
		// console.log(`dv.current().file.path: ${dv.current().file.path}`)
		delete filter.current
		return from += ` AND [[${dv.current().file.path}]]`
	}

	return from
}

/**
 * Build and query the score pages from your vault based on some filters
 * @param {object} [filter]
 * @returns {import('../view').ScoreFile[]}
 */
const buildAndRunScoreQuery = async (filter) => {
	await forceLoadCustomJS();
	const { CustomJs } = customJS
	const QueryService = new CustomJs.Query(dv)

	let fromQuery = filter?.from ?? DEFAULT_FROM
	fromQuery = _updateFromStringBasedOnSpecialFilters(fromQuery, filter)

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

const queriedPages = await buildAndRunScoreQuery(filter)
const numberOfPagesFetched = queriedPages.length

console.log({ queriedPages })

const pages = [...queriedPages, ...orphanPages]

//#endregion

//#region Sort pages options

/**
 * Adds the DEFAULT_SCORE_DIRECTORY to the path of orphans (uncreated) files
 * @param {Array<import('../view').Link|string>} links 
 */
const _normalizeLinksPath = async (links) => {
	return await Promise.all(links.map(async l => {

		// l is a string
		if (!l.path) {
			return { path: `${DEFAULT_SCORE_DIRECTORY}/${l}.md` }
		}

		// l is an empty link
		console.log({ l })

		if (! await linkExists(l)) {
			return { ...l, path: `${DEFAULT_SCORE_DIRECTORY}/${l.path}.md` }
		}

		return l
	}))
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

await sortPages({ pages, sort })
logPerf("Dataview js query: sorting")
//#endregion

//#region Build buttons but don't apply events yet

const clickPlaylistButton = (pages) => {
	const baseUrl = "https://www.youtube.com/watch_videos?video_ids="
	const aggregatedYoutubeUrls = pages.reduce((prev, cur) => {
		/** @type{string} */
		const url = cur.url;
		if (!url.includes("youtu")) return prev;

		let id = url.indexOf("watch_videos")
		if (id !== -1) {
			return prev + ',' + url.substring(id + 23)
		}

		id = url.indexOf("?t=")
		if (id !== -1) {
			const t = url.substring(id + 3)
			if (parseInt(t) > MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST) {
				console.warn(`The 't' argument is too deep inside the video of url: '${url}' to be added in the playlist`)
				return prev
			}
		}

		const sep = prev !== "" ? ',' : ''

		return prev + sep + url.substring(17, 28)
	}, "")

	// Only open in default browser
	// document.location = `https://www.youtube.com/watch_videos?video_ids=` + "qAzebXdaAKk,AxI0wTQLMLI"

	// Does open in Obsidian browser (usin Surfing plugin)
	window.open(baseUrl + aggregatedYoutubeUrls)
}

const setButtonEvents = (pages) => {
	rootNode.querySelectorAll('button').forEach(btn => btn.addEventListener('click', ((e) => {
		if (btn.className == "playlist") {
			clickPlaylistButton(pages)
		}
		else if (btn.className == "add-file") {
			handleAddScoreButtonClick({ filters: filter, os })
		}

		e.preventDefault()
		btn.blur()
	})));
}

const buildButtons = () => {
	const addFileButton = `<button class='add-file'>${filePlusIcon(20)}</button>`

	return `<button class='playlist'>
		${listMusicIcon}
	</button>
	${disableSet.has("addscore") ? "" : addFileButton}
	`
}

const buttons = buildButtons()

rootNode.appendChild(dv.el("div", buttons, { cls: "buttons", attr: {} }))

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
		let soundTag = ""
		let trackTag = ""
		let timecodeTag = ""
		let urlTag = ""
		let mediaTag = ""

		if (!disableSet.has("filelink")) {
			if (p.title) {
				fileTag = `<span class="file-link">
				${renderInternalFileAnchor({ path: p.file.path, name: p.title })}
				</span>`
			} else {
				fileTag = `<span class="file-link">
				${renderInternalFileAnchor(p.file)}
				</span>`
			}
		}

		if (!disableSet.has("thumbnail")) {
			if (!p.thumbnail) {
				imgTag = renderThumbnailFromUrl(p.url)
			} else if (typeof p.thumbnail === "string") {
				// Thumbnail is an url (for non youtube music)
				imgTag = renderThumbnailFromUrl(p.thumbnail)
			} else {
				imgTag = renderThumbnailFromVault(p.thumbnail)
			}
		}

		if (p.url && !disableSet.has("urlicon")) {
			urlTag = `<span class="url-link">
				${renderExternalUrlAnchor(p.url)}
			</span>`
		}

		if (p.length && !disableSet.has("timecode")) {
			timecodeTag = renderTimecode(p.length)
		}

		/*
		MP3 player bugs on Android unfortunately 😩 (at least on my personal android phone which runs on Android 13)
		Some music might load and play entirely without any issue
		while other have an incorrect duration in the timestamp and freeze at some point when played
	
		This strange behaviour simply make the mp3 players on Android unreliable thus unusable (since you can't predict it)
		So i prefer disabling it completely rather than having a buggy feature
		Remove the `os !== "Android"` if you want to try it on yours
		*/
		// if (os !== "Android" && !disableSet.has("audioplayer") && p.mp3) {
		if (p.mp3 && !disableSet.has("audioplayer")) {
			soundTag = await renderMP3Audio({ audioFile: p.mp3, volumeOffset: p.volume })
			trackTag = renderTimelineTrack()
		}

		thumbTag = `<div class="thumb-stack">
			${imgTag}
			${soundTag}
			${soundTag ? trackTag : ""}
			${timecodeTag}
		</div>`

		const article = `<article>
		${thumbTag ?? ""}
		${fileTag}
		${urlTag ?? ""}
		${mediaTag ?? ""}
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
	return dv.el("div", gridArticles.slice(0, NB_SCORE_BATCH_PER_PAGE).join(""), { cls: "grid" })
}

/** @type {HTMLDivElement} */
const grid = buildGridDOM(DISABLE_LAZY_RENDERING)

logPerf(`Converting the string array to DOM object`)

rootNode.appendChild(grid);
// logPerf("Appending the first built grid to the DOM")
//#endregion

setButtonEvents(pages)

//#region Functions to handle the add class button
/**
 * from there : https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/CreateNoteModal.ts
 * Handles creating the new note
 * A new markdown file will be created at the given file path (`input`)
 * @param {string} input 
 * @param {string} mode - current-pane / new-pane / new-tab
 * @returns {TFile}
 */
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
		return file;
	} catch (error) {
		alert(error.toString());
	}
}

/**
 * Didn't find a better way for now to wait until the metadata are loaded inside a newly created file
 * @param {string} pathToFile 
 */
const waitUntilFileMetadataAreLoaded = async (pathToFile) => {
	let dvFile = null
	while (!dvFile) {
		await delay(20); // very important to wait a little to not overload the cpu
		console.log("Metadata in the newly created file hasn't been loaded yet")
		dvFile = dv.page(pathToFile)
		if (!dvFile) continue; // the file isn't even referenced by dataview api yet
		if (Object.keys(dvFile).length === 1) { // metadata hasn't been loaded yet in the page, so we continue
			dvFile = null
		}
	}
}

/**
 * 
 * @param {object} _
 * @param {object[]} _.filters
 * @param {string} _.os
 */
async function handleAddScoreButtonClick({ filters, os }) {
	const newFilePath = `${DEFAULT_SCORE_DIRECTORY}/Untitled`
	const newFile = await createNewNote(newFilePath)

	const mmenuPlugin = dv.app.plugins.plugins["metadata-menu"]?.api
	if (!mmenuPlugin) {
		return console.warn("You don't have metadata-menu enabled so you can't benefit from the smart tag completion")
	}

	await waitUntilFileMetadataAreLoaded(newFilePath)

	// If I don't wait long enough to apply auto-complete, it's sent into oblivion by some mystical magic I can't control.
	await delay(2500)

	const textInClipboard = await navigator.clipboard.readText();
	if (httpRegex.test(textInClipboard)) { //text in clipboard is an "http(s)://anything.any" url
		mmenuPlugin.replaceValues(newFile.path, "url", textInClipboard)
	}

	const current = dv.current()
	const etags = current.file.etags
	if (etags.length !== 0) {
		mmenuPlugin.replaceValues(newFile.path, "media", etags[0].slice(1))
	}

	if (filters?.current) { mmenuPlugin.replaceValues(newFile.path, filters.current, `[[${current.file.name}]]`) }
	if (filters?.tags) { mmenuPlugin.replaceValues(newFile.path, "tags_", filters.tags) }
}
//#endregion

//#region Infinite scroll custom implementation
function handleLastScoreIntersection(entries) {
	entries.map((entry) => {
		if (entry.isIntersecting) {
			startTime = performance.now();

			scoreObserver.unobserve(entries[0].target);
			grid.querySelector("span").insertAdjacentHTML('beforeend', gridArticles.slice(
				nbPageBatchesFetched * NB_SCORE_BATCH_PER_PAGE,
				(nbPageBatchesFetched + 1) * NB_SCORE_BATCH_PER_PAGE).join(""));
			nbPageBatchesFetched++

			logPerf("Appended new scores at the end of the grid")

			manageMp3Scores();

			if (nbPageBatchesFetched * NB_SCORE_BATCH_PER_PAGE < numberOfPagesFetched) {
				console.log(`Batch to load next: ${nbPageBatchesFetched * NB_SCORE_BATCH_PER_PAGE}`)
				lastScore = grid.querySelector('article:last-of-type')
				scoreObserver.observe(lastScore)
			} else {
				console.log(`Finish to load: ${nbPageBatchesFetched * NB_SCORE_BATCH_PER_PAGE}`)
				if (disableSet.has("addscore")) return;

				const addScoreCellDOM = dv.el("article", filePlusIcon(24), { cls: "add-file" })
				grid.querySelector("span").appendChild(addScoreCellDOM);

				addScoreCellDOM.onclick = handleAddScoreButtonClick.bind(this, { filters: filter, os })
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

//#region MP3 audio player (custom button, timeline, autoplay)

/**
 * @param {HTMLInputElement} timeline
 * @param {HTMLAudioElement} audio
 */
const changeTimelinePosition = (timeline, audio) => {
	const percentagePosition = (100 * audio.currentTime) / audio.duration;
	timeline.style.backgroundSize = `${percentagePosition}% 100%`;
	timeline.value = percentagePosition;
}

/**
 * @param {HTMLInputElement} timeline
 * @param {HTMLAudioElement} audio
 */
const changeSeek = (timeline, audio) => {
	const time = (timeline.value * audio.duration) / 100;
	audio.currentTime = time;
}

/**
 * @param {object} _
 * @param {number} _.index
 * @param {HTMLAudioElement[]} _.audios
 * @param {HTMLButtonElement[]} _.playButtons
 */
const playAudio = ({ index, audios, playButtons }) => {
	if (!ENABLE_SIMULTANEOUS_MP3_PLAYING && currentMP3Playing !== -1) {
		pauseAudio({ audio: audios[currentMP3Playing], playButton: playButtons[currentMP3Playing] })
	}

	// Handle volume
	let dataVolume = audios[index].dataset.volume;
	dataVolume = parseFloat(dataVolume)
	if (!isNaN(dataVolume)) {
		audios[index].volume = clamp(DEFAULT_VOLUME + dataVolume, 0.1, 1)
	} else {
		audios[index].volume = clamp(DEFAULT_VOLUME, 0.1, 1)
	}

	currentMP3Playing = index;
	audios[index].play()
	playButtons[index].innerHTML = pauseIcon;
}

/**
 * 
 * @param {object} _ 
 * @param {HTMLButtonElement} _.playButton 
 * @param {HTMLAudioElement} _.audio 
 */
const pauseAudio = ({ playButton, audio }) => {
	currentMP3Playing = -1;
	audio.pause();
	playButton.innerHTML = playIcon;
}

/**
 * @param {object} _
 * @param {number} _.index
 * @param {HTMLAudioElement[]} _.audios
 * @param {HTMLButtonElement[]} _.playButtons 
 */
const handlePlayButtonClick = ({ index, audios, playButtons }) => {
	if (audios[index].paused) {
		playAudio({ playButtons, audios, index })
	} else {
		pauseAudio({ playButton: playButtons[index], audio: audios[index] })
	}
}

let currentMP3Playing = -1;
let numberOfAudiosLoaded = -1;

manageMp3Scores()

/**
 * This function should be called every time new scores are added at the end of the grid (because of scroll)
 * or if the grid of score is re-arranged because of new filters ?
 * It:
 * - Binds the update of the audio to the progress of the timeline
 * - Handle what happened when you click on the custom button
 * - Make possible to drag the timeline to change the audio timecode
 * - Supports automatic playback of the next found mp3 (which is already loaded in the grid of course)
 */
function manageMp3Scores() {
	startTime = performance.now();

	/** @type {HTMLAudioElement[]} */
	const audios = grid.querySelectorAll(`audio`)

	/** @type {HTMLButtonElement[]} */
	const playButtons = grid.querySelectorAll('.audio-player button')

	/** @type {HTMLInputElement[]} */
	const trackTimelines = grid.querySelectorAll('input.timeline')

	if (numberOfAudiosLoaded === audios.length) return;
	numberOfAudiosLoaded = audios.length


	// Must never happen
	if (audios.length !== playButtons.length) {
		console.error("The number of play buttons doesn't match the number of audios")
	}


	for (let i = 0; i < audios.length; i++) {
		audios[i].onloadedmetadata = checkLoadedMp3Status.bind(this, audios[i])

		// audios[i].onplay = reloadMp3IfCorrupt.bind(this, audios[i])

		audios[i].ontimeupdate = changeTimelinePosition.bind(this, trackTimelines[i], audios[i])

		playButtons[i].onclick = handlePlayButtonClick.bind(this, { index: i, audios, playButtons })

		trackTimelines[i].onchange = changeSeek.bind(this, trackTimelines[i], audios[i])

		audios[i].onended = () => {
			playButtons[i].innerHTML = playIcon
			trackTimelines[i].value = 0
			trackTimelines[i].style.backgroundSize = "0% 100%"

			if (disableSet.has("autoplay")
				|| audios.length === 1
				|| (STOP_AUTOPLAY_WHEN_REACHING_LAST_MUSIC && i + 1 === audios.length)) {
				return;
			}

			let j = 0
			if (i + 1 != audios.length) j = i + 1

			// To skip "corrupt" audio on Android
			while (audios[j].classList.contains("corrupt")) {
				j++;
				if (j === audios.length) j = 0
			}

			// Tricky situation: It means there are multiple audio files in the view but only one loaded correctly 
			if (audios[j] === audios[i]) return;

			playButtons[j].innerHTML = pauseIcon;
			audios[j].play()
		};
	}

	logPerf("Reloading all the mp3 management")
}

/**
 * @description Since Android audios are corrupt for no reasons, this function only flag the ones that failed to load to:
 *  - Skip them on autoplay
 *  - Visually mark them so that the user know they didn't load correctly
 * Edit: Big twist as of today (2023-01-04). Even mp3 with correct loading time may not play completely. I've experienced this with Elegia today, i was flabbergasted...
 *       So it truly is unreliable on Android after all 😥. I still keep this function though because i'm sure it's still better than nothing
 * @param {HTMLAudioElement} audio
 */
function checkLoadedMp3Status(audio) {
	const timecodeTag = audio.parentNode.parentNode.querySelector(".timecode")
	if (!timecodeTag) return;

	if (getOS() !== "Android") return;

	const timecodeDuration = convertTimecodeToDuration(timecodeTag.querySelector("span").innerText)

	if (Math.abs(timecodeDuration - audio.duration) <= 1) {
		timecodeTag.style.backgroundColor = "#060D"
		return true;
	}

	if (audio.classList.contains("corrupt")) {
		timecodeTag.style.backgroundColor = "#600D"
		return
	}

	// Modifying the src property after is has been loaded doesn't do anything (https://stackoverflow.com/a/68797896)
	audio.classList.add("corrupt")
	timecodeTag.style.backgroundColor = "#F808"

	return false;
}

/**
 * @description I don't know why but most of the time, audios fail to load on Android for no specific reasons
 * I tried to:
 *  - Remove the <source> and replace it with a new one but it doesn't load it
 *  - Set the src of the audio tag to the one of the source to override it but that doesn't work either
 * 
 * I guess it can't be patched like that 😕, so i should report this bug on obsidian forum
 * Edit: Here is the link to the issue i've created : https://forum.obsidian.md/t/bug-audio-files-fail-to-load-randomly-on-android/49684
 * Edit 2: Hahaha nobody cares (as expected 😅)
 * @param {HTMLAudioElement} audio
 */
function reloadMp3IfCorrupt(audio) {

	if (!audio.classList.contains("corrupt")) return;

	audio.pause()

	audio.src = audio.querySelector("source").src
}
//#endregion

console.info(`View took ${buildDurationLog(performance.now() - inceptionTime)} to run`)