import type { App } from "obsidian";
import type { Link } from "@/types/api";
import { isObject, deepClone } from "@/utils/miscellaneous";

/**
 * Check if a given value is a valid property value.
 * The function accept everything except:
 * - Empty object
 * - Empty array
 * - Array with only empty strings / null / undefined
 * - Empty string
 * - Null
 * - Undefined
 *
 * @returns true if the value is valid, false otherwise
 */
export const isValidPropertyValue = (value: unknown): boolean => {
  if (
    value == null ||
    (typeof value === "object" && Object.entries(value).length === 0) ||
    (Array.isArray(value) &&
      value.every((cell) => {
        return cell == null || (typeof cell === "string" && cell.trim() === "");
      })) ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return false;
  }

  return true;
};

export const fileExistsAtPath = async ({
  app,
  path,
}: {
  app: App;
  path: string;
}): Promise<boolean> => {
  return await app.vault.adapter.exists(path);
};

export const linkExists = async ({
  app,
  link,
}: {
  app: App;
  link: Link;
}): Promise<boolean> => {
  if (!isObject(link)) return false;
  return await fileExistsAtPath({ app, path: link.path });
};

/**
 * This function will transform a field containing an array and flatten it while calling JSON.parse() on any string it encounteers
 */
export const normalizeArrayOfObjectField = (field: unknown): unknown[] => {
  if (!field) return [];

  // Single object in yaml frontmatter
  if (isObject(field)) return [deepClone(field)];

  try {
    // Single string as inline field
    if (typeof field === "string") return [JSON.parse(field)];

    return field.reduce((a, c) => {
      if (Array.isArray(c)) {
        return [...a, ...normalizeArrayOfObjectField(c)];
      }

      if (isObject(c)) return [...a, deepClone(c)];

      return [...a, JSON.parse(c)];
    }, []);
  } catch (e) {
    console.error(e);
    return [];
  }
};

/**
 * Prepend the path of orphans (uncreated) files with a base directory
 * @param {Array<import('../_views').Link|string>} links
 * @param {string} baseDir
 * @returns {Promise<Array<import('../_views').Link|string>>}
 */
export const normalizeLinksPath = async (links, baseDir) => {
  return await Promise.all(
    links.map(async (l) => {
      // l is a string
      if (!l.path) {
        return { path: `${baseDir}/${l}.md` };
      }

      // l is an empty link
      if (!(await linkExists(l))) {
        return { ...l, path: `${baseDir}/${l.path}.md` };
      }

      return l;
    })
  );
};

export const removeTagChildDVSpan = (tag: HTMLElement): void => {
  const span = tag.querySelector("span");
  if (!span) return;

  span.outerHTML = span.innerHTML;
};

/**
 * Let me handle YYYY format too (luxon don't recognized this format as a single year -_-)
 * @param {object|number} value
 */
export const valueToDateTime = ({ value, dv }) => {
  if (typeof value === "number") {
    // that means its just a year
    return dv.luxon.DateTime.fromObject({ year: value });
  }
  return dv.date(value);
};

const WIKILINK_PATTERN = /!?\[\[(.*?)\]\]/g;

/**
 * @param {string} wikilink
 * @param {object} deps
 * @returns {TFile} with the cache too
 */
export const parse = (wikilink, { app, obsidian }) => {
  const cleaned = wikilink.replace(WIKILINK_PATTERN, "$1");
  const linkpath = obsidian.getLinkpath(cleaned);
  const file = app.metadataCache.getFirstLinkpathDest(linkpath, "");
  const cache = app.metadataCache.getFileCache(file);

  return { ...file, cache };
};
