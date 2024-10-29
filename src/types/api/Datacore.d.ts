/**
 * All the content from this file was taken from the following repository: https://github.com/blacksmithgu/datacore
 */

import type { DateTime, Duration } from "luxon";

/** Shorthand for a mapping from keys to values. */
export type DataObject = Record<string, unknown>;

/** The raw values that a literal can take on. */
export type Literal =
  | boolean
  | number
  | string
  | DateTime
  | Duration
  | Link
  | Literal[]
  | DataObject
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  | Function
  | null;

/** from: https://github.com/blacksmithgu/datacore/blob/master/src/expression/link.ts */
export interface Link {
  /** The file path this link points to. */
  path: string;

  /** The display name associated with the link. */
  display?: string;

  /** The block ID or header this link points to within a file, if relevant. */
  subpath?: string;

  /** Is this link an embedded link (of form '![[hello]]')? */
  embed: boolean;

  /** The type of this link, which determines what 'subpath' refers to, if anything. */
  type: "file" | "header" | "block";
}

/** A span of contiguous lines. */
export interface LineSpan {
  /** The inclusive start line. */
  start: number;

  /** The exclusive end line. */
  end: number;
}

/** An entry in the frontmatter; includes the raw value, parsed value, and raw key (before lower-casing). */
export interface FrontmatterEntry {
  /** The actual string in frontmatter with exact casing. */
  key: string;

  /** The parsed value of the frontmatter entry (date, duration, etc.). */
  value: Literal;

  /** The raw value of the frontmatter entry before parsing; generally a string or number. */
  raw: string;
}

/** Full inline field metadata for an object. */
export interface InlineField {
  /** The actual key describing the inline field. */
  key: string;

  /** The raw value of the inline field. */
  raw: string;

  /** The parsed value. */
  value: Literal;

  /** Full position information for where the inline field is located in the document. */
  position: {
    /** The line number the inline field appears on. */
    line: number;
    /** The start column of the field. */
    start: number;
    /** The start column of the *value* for the field. Immediately after the '::'. */
    startValue: number;
    /** The end column of the field. */
    end: number;
  };

  /** If this inline field was defined via a wrapping ('[' or '(' or 'link'), then the wrapping that was used. */
  wrapping?: string;
}

/** from: https://github.com/blacksmithgu/datacore/blob/master/src/index/types/markdown.ts */
export interface DatacorePage {
  /** Frontmatter values in the file, if present. Maps lower case frontmatter key -> entry. */
  $frontmatter?: Record<string, FrontmatterEntry>;

  /** Map of all distinct inline fields in the document. Maps lower case key name -> full metadata. */
  $infields: Record<string, InlineField>;

  /** The path this file exists at. */
  $path: string;

  /** Obsidian-provided date this page was created. */
  $ctime: DateTime;

  /** Obsidian-provided date this page was modified. */
  $mtime: DateTime;

  /** The extension; for markdown files, almost always '.md'. */
  $extension: string;

  /** Obsidian-provided size of this page in bytes. */
  $size: number;

  /** The full extent of the file (start 0, end the number of lines in the file.) */
  $position: LineSpan;

  /** The exact tags in the file. */
  $tags: string[];

  /** All links in the file. */
  $links: Link[];

  /**
   * All child markdown sections of this markdown file. The initial section before any content is special and is
   * named with the title of the file.
   */
  $sections: MarkdownSection[];
}
