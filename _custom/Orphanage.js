class Orphanage {
    Orphanage = class {
        /**
         * @param {Utils} _.utils
        */
       constructor({
           utils,
           directory,
           thumbnailDirectory,
           thumbnailProp = "thumbnail",
        }) {
            this.utils = utils
            this.directory = directory
            this.thumbnailDirectory = thumbnailDirectory
            this.thumbnailProp = thumbnailProp
        }
        /**
         * @param {string[]} orphansData
         * @returns {import('../view').ScoreFile[]}
         */
        raise(orphansData) {
            const orphans = this.utils.normalizeArrayOfObjectField(orphansData)

            // Needed to disguise orphans as real ScoreFile (mock Link to TFile)
            for (const o of orphans) {
                // If thumbnail includes a '/', that means it's an url
                if (o[this.thumbnailProp] && !o[this.thumbnailProp].includes("/")) {
                    o[this.thumbnailProp] = {
                        path: `${this.thumbnailDirectory}/${o[this.thumbnailProp].replace(/\[|\]/g, '')}`
                    }
                }

                o.file = {
                    name: o.title,
                    path: `${this.directory}/${o.title}.md`
                }
            }

            return orphans
        }
    }
}