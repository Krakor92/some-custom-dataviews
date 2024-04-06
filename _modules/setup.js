/**
 * The boilerplate needed at the beginning of a view
 * @param {object} _
 * @param {string} _.viewName
 * @param {Function} _.render
 */
export const setupView = async ({
    app, component, container, module,
    viewName, disable, render, debug,
}) => {
    const LOGGER_TYPE = "console"
    const DEBUG_LOG_FILE = "🙈/Log.md"

    const utils = new module.Utils({ app })
    const logger = new module.Logger({
        app,
        dry: !debug,
        output: LOGGER_TYPE,
        filepath: DEBUG_LOG_FILE,
    })

    const vm = new module.ViewManager({
        app, component, container, logger, utils,
        name: viewName,
        disable,
    })

    const onReady = async () => {
        vm.container.removeEventListener("view-ready", onReady)

        debug && performance.mark(`${viewName}-start`);
        await render.call(null, {vm, logger, utils})
        if (debug) {
            performance.mark(`${viewName}-end`);
            const code_perf = performance.measure(viewName, `${viewName}-start`, `${viewName}-end`);
            console.info(`View took ${code_perf.duration}ms to run (performance.measure)`)
        }
    }
    vm.container.addEventListener("view-ready", onReady)

    vm.init()
}