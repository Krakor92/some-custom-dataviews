/**
 * @file Render a grid of music from your vault. Files can have an audio embedded, an url or both
 * This file simply uses the `main` function from the `view.js`
 * It is then wrapped with some of Meta Bind's magic to enable dynamic filtering in a single codeblock
 * 
 * @warning The code is a mess, but it works for now. I did it in only by looking at the repo examples,
 * so I probably missed some obvious solutions that would make the code less verbose, idk
 * 
 * @depends on Meta Bind, JS-Engine, DataviewJS and CustomJS
 * @author Krakor <krakor.faivre@gmail.com>
 * @link https://github.com/Krakor92/some-custom-dataviews/tree/js-engine/_views/jukebox/use.js
 */

export async function main(env, {
    viewPath,
    propertiesToWatch = ['artist', 'sort', 'media'],
}) {
// JS-Engine specific setup
const { engine, component, container, context, obsidian } = env.globals

const mb = engine.getPlugin('obsidian-meta-bind-plugin').api;

// a component for lifecycle management of the fields created in our render function
const comp = new obsidian.Component(component);

const bindTargets = propertiesToWatch.map(property => mb.parseBindTarget(property, context.file.path));

let previousFrontmatter = context.metadata.frontmatter

const path = viewPath
const { main } = await engine.importJs(path)

await forceLoadCustomJS()
const utils = new customJS["Krakor"].Utils({ app })


function render(props) {
    console.log({props})
    // first we unload the component to unload the content from the previous rerender
    comp.unload();
    // then we load the component again for this rerender.
    comp.load();
    // then we empty the element we render to remove content created in the previous rerender
    container.empty();

    main({ ...env, path }, buildViewParams(props))

    // // next we create the empty mountable
    // const mountable = mb.createViewFieldMountable(context.file.path)

    // // and finally we render it via a MarkdownRenderChild
    // mb.wrapInMDRC(mountable, container, comp);
}

// we create a reactive component from the render function and the initial value will be the value of the frontmatter to begin with
const reactive = engine.reactive(render, previousFrontmatter);

const debouncedRefresh = utils.debounce((data) => {
    const targetedFrontmatter = propertiesToWatch.reduce((acc, property, i) => {
        acc[property] = data[i]
        return acc
    }, {})

    const currentFrontmatter = { ...previousFrontmatter, ...targetedFrontmatter }

    if (JSON.stringify(previousFrontmatter) === JSON.stringify(currentFrontmatter)) return; //no-op

    previousFrontmatter = { ...currentFrontmatter }

    reactive.refresh(targetedFrontmatter)
})

mb.reactiveMetadata(bindTargets, component, (...targets) => {
    debouncedRefresh(targets)
})

return reactive;
}

const buildViewParams = ({ sort, artist, media }) => {
    const filter = {}

    if (artist && artist.length !== 0) { filter.artist = artist }
    if (media) { filter.in = media }

    return {
        filter,
        sort: sort ?? "random",
    }
}

/*
// How it was done before Meta Bind 1.x

const path = '_js/_views/jukebox/view.js'
const { main } = await engine.importJs(path)

await forceLoadCustomJS()

const utils = new customJS[DEFAULT_CUSTOMJS_CLASS].Utils({app})

const buildParams = ({sort, artist, media}) => {
	const filter = {}
	
	if (artist && artist.length !== 0) {filter.artist = artist}
	if (media) {filter.in = media}

	return {
		sort: sort ?? "random",
		filter,
		//disable: "filelink",
	}
}

const reactive = engine.reactive(main, {...this, path}, buildParams(context.metadata.frontmatter))

let previousFrontmatter = context.metadata.frontmatter

const debouncedProcessing = utils.debounce((file, data, cache) => {
	if (file.path === context.file.path
		&& JSON.stringify(cache.frontmatter) !== JSON.stringify(previousFrontmatter)) {
		previousFrontmatter = {...cache.frontmatter}
		reactive.refresh({...this, path}, {...buildParams(cache.frontmatter), clear: true, debug: true})
	}
}, 0)

// subscribe to events and call refresh with new arguments, which causes the render function to be rerun with these arguments, replacing the existing content
const unloadCb = engine.app.metadataCache.on('changed', async (file, data, cache) => {
	debouncedProcessing(file, data, cache)
});

// register the subscription to be unloaded when the code block is unloaded
component.registerEvent(unloadCb);

return reactive;
*/