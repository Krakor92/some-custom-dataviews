class Stylist {
    Stylist = class {

        constructor({app, container}) {
            this.app = app
            this.container = container
            this.style = container.createEl("style")
        }

        get rules() {
            return this.style.sheet.cssRules
        }

        setTableStyle() {
            this.style.textContent += `
table {
    background-color: red;
}
`
        }

        setPStyle() {
            this.style.textContent += `
p,::part(paragraph)
{
    background-color: red;
    font-weight: 800;
}

/*
div
{
    background-color: black;
}
*/
`
        }

        async setStyleContentFromFile(filepath, currentFilePath) {
            const cssFile = this.app.metadataCache.getFirstLinkpathDest(filepath, currentFilePath)
            if (!cssFile) return false

            const cssContents = await this.app.vault.read(cssFile)
            this.style.textContent = cssContents
            return true
        }

        static resolveArticleStyle(options) {
            if (!options) return ""

            const { align } = options

            let style = ""
            style += align ? `align-self: ${align};` : ""

            return style !== "" ? `style="${style}"` : ""
        }

        static setTableStyle(table) {
            table.parentNode.style.cssText = `
                overflow-x: scroll;
            `

            table.style.cssText = `
                table-layout: fixed;
                width: 100%;
            `
        }
    }
}