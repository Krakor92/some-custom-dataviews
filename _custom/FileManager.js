class FileManager {
    /**
     * Class used to create files and automatically insert metadata
     * based on the filters present in the view where the file creation is triggered
     */
    FileManager = class {
        /**
         * @param {object} _
         * @param {string?} _.directoryWhereToAddFile
         * @param {Array<Function>} _.logicOnAddFile
         */
        constructor({dv, app, utils, properties, userFields, directoryWhereToAddFile, logicOnAddFile = []}) {
            this.dv = dv,
            this.app = app
            this.utils = utils
            this.directoryWhereToAddFile = directoryWhereToAddFile
            this.properties = properties
            this.userFields = userFields
            this.logicOnAddFile = logicOnAddFile
        }

        /**
         * from there : https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/CreateNoteModal.ts
         * Handles creating the new note
         * A new markdown file will be created at the given file path {input}
         * @param {string} input
         * @param {"current-pane"|"new-pane"|"new-tab"} mode - current-pane / new-pane / new-tab
         * @returns {TFile}
         */
        createNewNote = async (input, mode = "new-tab") => {
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
        #waitUntilFileMetadataAreLoaded = async (pathToFile) => {
            let dvFile = null
            while (!dvFile) {
                await this.utils.delay(20); // very important to wait a little to not overload the cpu
                console.log("Metadata in the newly created file hasn't been loaded yet")
                dvFile = this.dv.page(pathToFile)
                if (!dvFile) continue; // the file isn't even referenced by dataview api yet
                if (Object.keys(dvFile).length === 1) { // metadata hasn't been loaded yet in the page, so we continue
                    dvFile = null
                }
            }
        }

        handleAddFile = async ({directoryWhereToAddFile, properties, userFields} = {}) => {
            const computed = {
                directoryWhereToAddFile: directoryWhereToAddFile ?? this.directoryWhereToAddFile,
                properties: properties ?? this.properties,
                userFields: userFields ?? this.userFields,
            }

            const newFilePath = `${computed.directoryWhereToAddFile}/Untitled`
            const newFile = await this.createNewNote(newFilePath)

            const mmenuPlugin = this.dv.app.plugins.plugins["metadata-menu"]?.api
            if (!mmenuPlugin) {
                return console.warn("You don't have metadata-menu enabled so you can't benefit from the smart tag completion")
            }

            await this.#waitUntilFileMetadataAreLoaded(newFilePath)

            // If I don't wait long enough to apply auto-complete, it's sent into oblivion by some mystical magic I can't control.
            await this.utils.delay(2500)

            console.log("At last, we can start the autocomplete")

            const fieldsPayload = []

            for (const fn of this.logicOnAddFile) {
                await fn(this, fieldsPayload)
            }

            const current = this.dv.current()

            if (computed.properties?.current) {
                fieldsPayload.push({
                    name: computed.properties.current,
                    payload: { value: `[[${current.file.name}]]` }
                })
                delete computed.properties.current
            }

            for (const field in computed.properties) {
                console.log(`${field}: ${computed.properties[field]}`)
                if (computed.userFields.get(field) === "date") continue;
                fieldsPayload.push({
                    name: field,
                    payload: {
                        value: Array.isArray(computed.properties[field])
                            ? `[${computed.properties[field].join(", ")}]`
                            : computed.properties[field]
                    }
                })
            }

            await mmenuPlugin.postValues(newFile.path, fieldsPayload)
        }
    }
}