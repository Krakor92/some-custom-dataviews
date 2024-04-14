/* I've build that based on dataview logs i've done. It doesn't mean much, but for my personal use it helped me a lot */

export interface Link {
    display?: string
    embed: boolean
    path: string
    subpath?: string
    type: string
}

export interface TFile {
    aliases: Proxy
    cday: DateTime
    ctime: DateTime
    etags: Proxy
    ext: string
    folder: string
    frontmatter: object
    inlinks: Proxy
    link: Link
    lists: Proxy
    mday: DateTime
    mtime: DateTime
    name: string
    outlinks: Proxy
    path: string
    size: number
    starred: boolean
    tags: Proxy
    tasks: Proxy
}

/**
 * The optional properties are the ones I'm likely to use
 * for compatibility with these views
 */
export interface UserFile {
    file: TFile

    artist?: Link | Array<Link>
    audio?: Link | string
    bpm?: number
    genre?: string | Array<string>
    in?: Link | Array<Link>
    instruments?: string | Array<string>
    length?: string
    media?: string
    mode?: string
    mp3?: Link
    release?: DateTime
    tags_?: string | Array<string>
    thumbnail?: Link | string
    type?: string
    url?: string
    voice?: string
}

/**
 * Button present in the top bar
 */
export interface ViewButton {
    icon: string
    event(): any
}

type FileToStringFunction = (file: TFile) => string;

export interface CollectionManager {
    get parent(): HTMLElement // The DomElement that directly contains the collection as its children
    everyElementsHaveBeenInsertedInTheDOM(): boolean

    buildParent(): void
    buildChildrenHTML({page: TFIle, pageToChild: FileToStringFunction}): void

    initInfiniteLoading(): void
    async insertNewChunk(): void
}