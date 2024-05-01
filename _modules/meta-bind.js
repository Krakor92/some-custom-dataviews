/**
 * Binds a view to properties in the frontmatter. Thanks to Meta Bind's magic, the view will rerender if the watched properties change
 *
 * @depends on Meta Bind and JS-Engine
 * @warning The code is a mess, but it works for now. I did it in only by looking at the repo examples,
 * so I probably missed some obvious solutions that would make the code less verbose, idk
 * 
 * We create two ReactiveComponent. The one with `reactiveMetadata` refresh the second one when the frontmatter changes
 * It surely leaks some memory in the process but I don't see any other way
 * 
 * @param {*} env
 * @param {object} _
 * @param {Function} _.main
 * @param {Function} _.buildViewParams
 * @param {string[]} _.propertiesToWatch
 *
 * @todo Watch every properties if `propertiesToWatch` is empty
 */
export async function bindViewToProperties(env, {
    main,
    buildViewParams,
    propertiesToWatch,
    debounceWait = 50,
}) {
    // JS-Engine specific setup
    const { app, engine, component, container, context, obsidian } = env.globals

    const mb = engine.getPlugin('obsidian-meta-bind-plugin').api;

    const bindTargets = propertiesToWatch.map(property => mb.parseBindTarget(property, context.file.path));

    const module = await engine.importJs('_js/Krakor.mjs')
    const { debounce, isEqual, isValidPropertyValue, scrollToElement } = module

    function render(props) {
        // we force the unload of the view to remove the content created in the previous render
        container.dispatchEvent(new CustomEvent('view-unload'))

        main(env, props)

        // adjust the timeout if needed
        setTimeout(() => {
            scrollToElement(container)
        }, 4.7)
    }

    const previousTargettedFrontmatter = Object.fromEntries(propertiesToWatch.map(property => [property, context.metadata.frontmatter[property]]))
    let previousViewParams = buildViewParams({isValidPropertyValue}, previousTargettedFrontmatter)

    // we create a reactive component from the render function and the initial value will be the value of the frontmatter to begin with
    const reactive = engine.reactive(render, previousViewParams);

    const debouncedRefresh = debounce((data) => {
        const currentTargettedFrontmatter = propertiesToWatch.reduce((properties, property, i) => {
            properties[property] = data[i]
            return properties
        }, {})

        const newViewParams = buildViewParams({ isValidPropertyValue }, currentTargettedFrontmatter)

        const viewParamsHaventChanged = isEqual(previousViewParams, newViewParams)
        if (viewParamsHaventChanged) return; //no-op

        previousViewParams = newViewParams

        // it has been confirmed that the new frontmatter should be used for the next render
        reactive.refresh(newViewParams)
    }, debounceWait)

    const reactives = mb.reactiveMetadata(bindTargets, component, (...targets) => {
        debouncedRefresh(targets)
    })

    return reactive;
}
