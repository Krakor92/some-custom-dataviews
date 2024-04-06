/**
 * Manages Shadow DOM in my views
 * 
 * @warning file-links inside the SDOM can't be interacted with...
 * That makes this whole thing a bit useless unfortunately :(
 */
export class Shikamaru {
    constructor(container) {
        // Create a Shadow DOM for the container
        this.shadowRootNode = container.attachShadow({ mode: 'open' });

        // Define styles and content within the Shadow DOM
        const paragraph = this.shadowRootNode.createEl("p", {
            attr: {
                part: "paragraph"
            }
        })
        paragraph.textContent= "This is a <p> with scoped styles"

        const style = this.shadowRootNode.createEl("style")
        style.textContent = `
p {
color: blue;
}
`
    }

    /**
     * Attach a shadowDOM to the container and move all of its children inside
     * @param {HTMLElement} container
     */
    static KagemaneNoJutsu(container) {
        const shadowRootNode = container.attachShadow({mode: 'open'})

        while(container.firstChild) {
            shadowRootNode.appendChild(container.firstChild)
        }

        return shadowRootNode
    }

    /**
     * @param {ViewManager} ViewManager
     */
    static ViewKagemaneNoJutsu(viewManager) {
        const shadownRootNode = this.KagemaneNoJutsu(viewManager.host)
        
        // Override the "root" getter in this specific instance of viewManager
        Object.defineProperty(viewManager, "root", {
            get: function () {
                return viewManager.host.shadowRoot;
            },
        });

        return shadownRootNode
    }
}