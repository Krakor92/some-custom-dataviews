class ButtonBar {
    ButtonBar = class {
        constructor({
            buttonsOrder = [],
            buttonsMap = new Map(),
            logger,
        } = {}) {
            this.logger = logger

            /** @type{string[]} */
            this.buttonsOrder = buttonsOrder

            /** @type {Map<string, import('../view').ViewButton>} */
            this.buttonsMap = buttonsMap
        }

        addButton({name, icon, event}) {
            this.buttonsMap.set(name, { icon, event })
            this.buttonsOrder.push(name)
        }

        buildHTMLButtons() {
            let html = ''

            for (const buttonId of this.buttonsOrder) {
                if (!buttonId) continue

                const button = this.buttonsMap.get(buttonId)
                if (!button) {
                    console.warn(`${buttonId} isn't a valid view button`)
                    continue
                }

                html += `<button class='${buttonId}'>
                    ${button.icon}
                </button>
                `
            }
            return html
        }

        /**
         * 
         * @param {HTMLButtonElement[]} buttons 
         */
        setEvents(buttons) {
            for (const btn of buttons) {
                btn.onclick = (async (e) => {
                    const button = this.buttonsMap.get(btn.className)
                    await button?.event()

                    e.stopPropagation() // used for preventing callout default behavior in live preview
                    btn.blur()
                })
            }
        }
    }
}