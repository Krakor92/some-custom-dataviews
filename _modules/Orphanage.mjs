/**
 * The sole responsability of this class is to take a string representation of a file and to mock it as a real TFile
 *
 * With simpler words, it is used to mimic a file (with its properties) using properties of another file
 */
export class Orphanage {
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
     * Used to disguise orphans as real ScoreFile (mock Link to TFile)
     * It also specializes each orphans based on the context in which they are defined
     * 
     * @param {object} _
     * @param {string[]} _.data
     * @param {object} _.context - The context in which the orphans should be raised. Contains the actual file in which they are defined and the filters they should apply to
     * @returns {import('../_views').ScoreFile[]}
     */
    raise({data, context}) {
        const orphans = this.utils.normalizeArrayOfObjectField(data)

        // Needed to disguise orphans as real ScoreFile (mock Link to TFile)
        for (const o of orphans) {
            // If thumbnail includes a '/', that means it's an url so we don't have to alter it
            if (o[this.thumbnailProp] && !o[this.thumbnailProp].includes("/")) {
                o[this.thumbnailProp] = {
                    path: `${this.thumbnailDirectory}/${o[this.thumbnailProp].replace(/\[|\]/g, '')}`
                }
            }

            if (context.disguiseAs) {
                o[context.disguiseAs] = {
                    path: context.fromFileOfPath
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