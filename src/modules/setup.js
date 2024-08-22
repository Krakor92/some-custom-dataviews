import { ViewManager } from '@/managers'

import { Logger } from '@/modules/Logger'

/**
 * The boilerplate needed at the beginning of a view
 * @param {object} _
 * @param {string} _.viewName
 * @param {Function} _.render
 */
export const setupView = async ({
	app, component, container,
	viewName, disable, render, debug,
}) => {
	const LOGGER_TYPE = "console"
	const DEBUG_LOG_FILE = "🙈/Log.md"

	const logger = new Logger({
		app,
		dry: !debug,
		output: LOGGER_TYPE,
		filepath: DEBUG_LOG_FILE,
	})

	const vm = new ViewManager({
		app, component, container, logger,
		name: viewName,
		disable,
		debug,
	})

	const onReady = async () => {
		debug && performance.mark(`${viewName}-start`);
		// If the container is still present in the DOM
		if (vm.container) {
			vm.container.removeEventListener("view-ready", onReady)
			await render.call(null, { vm, logger })
		}
		if (debug) {
			performance.mark(`${viewName}-end`);
			const code_perf = performance.measure(viewName, `${viewName}-start`, `${viewName}-end`);
			console.info(`View took ${code_perf.duration}ms to run (performance.measure)`)
		}
	}
	vm.container.addEventListener("view-ready", onReady)

	vm.init()
}
