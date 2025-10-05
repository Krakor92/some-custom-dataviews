import type { Blueprint } from "@/modules/Factory";
import { Factory } from "@/modules/Factory";

import type { DatacorePage, Link } from "@/types/api";
import type { BasesDataItem } from "@/bases";

import { convertTimecodeToDuration } from "@/utils";
import type { App, BasesEntry, BasesPropertyId, TFile } from "obsidian";

import { uriRegex } from "@/utils";

/**
 * Represents a music track. Most of the properties are optional.
 */
export interface Track {
  /**
   * The name of the track
   */
  title: string;

  /**
   * The artists that worked on the track
   */
  artists?: string[];

  /**
   * Duration of the track in seconds
   */
  duration?: number;

  /**
   * The URL to access the content of the item online.
   */
  url: string;

  /**
   * The URL to access the audio of the item or the path to a file that contains the audio.
   */
  audio?: string;

  /**
   * The path to the local file of the track relative to the vault root
   */
  filepath?: string;

  /**
   * The actual local markdown file of the track
   * Is optional because a track doesn't necessarly have a file associated to it
   */
  file?: TFile;

  /**
   * The direct URL to the thumbnail
   * @example
   * External `https://i.scdn.co/image/ab67616d0000b273e3f3b4b6f4f4b4f4b4f4b4f4`
   * Local: `app://7e66df2d361412512ae1f4174ad1b318b8eb/home/_assets/My_local_thumbnail.webp?1669583670227`
   */
  thumbnail?: string;

  media?: string;

  type?: string;

  mood?: string[];

  instrumental?: boolean;

  voice?: string;

  /**
   * Positive number to increase the volume and negative number to decrease it.
   */
  volumeOffset?: number;

  miscellaneous?: string[];
}

export type TrackBlueprint<T> = Blueprint<T, Track>;

export class TrackFactory<T> extends Factory<T, Track> { }

const getPropFromDatacorePage = (prop: string, data: DatacorePage): unknown =>
  data?.$frontmatter?.[prop]?.value ?? data?.$infields?.[prop]?.value;

// Define a different conversion function for another data format
const datacoreTrackBlueprint: TrackBlueprint<DatacorePage> = (data) => {
  const title =
    getPropFromDatacorePage("title", data)?.toString() ??
    data.$path.split("/").pop()!.split(".")[0];

  const duration = getPropFromDatacorePage("length", data)?.toString();
  let computedDuration = 0;
  if (duration) {
    computedDuration = convertTimecodeToDuration(duration);
  }

  let computedThumbnail = undefined;
  const thumbnail = getPropFromDatacorePage("thumbnail", data);
  if (thumbnail && typeof thumbnail === "object") {
    computedThumbnail = (thumbnail as Link).path;
  } else {
    computedThumbnail = thumbnail as string;
  }

  return {
    title,
    duration: computedDuration,
    url: getPropFromDatacorePage("url", data)?.toString() ?? "",
    thumbnail: computedThumbnail,
    filepath: data.$path,
  };
};
export const DatacoreTrackFactory = new TrackFactory<DatacorePage>(datacoreTrackBlueprint);

/*
const basesTrackBlueprint: TrackBlueprint<BasesDataItem> = (data) => {
  console.log({ data })
  const {
    url,
    length,
    artist,
    tags_,
    voice,
  } = data.properties || {}
  const duration = length ? convertTimecodeToDuration(length) : undefined

  return {
    title: data.name,
    duration,
    url: url.toString() ?? "",
    thumbnail: data.formulas?.image,
    // artists: artist,
    // mood: tags_,
    // voice,
  }
}
export const BasesTrackFactory = new TrackFactory<BasesDataItem>(basesTrackBlueprint);
*/

/**
 * @param ctx - The file properties to retrieve from the basesEntry
 */
const basesEntryTrackBlueprint: TrackBlueprint<BasesEntry> = (data, ctx: { app: App, fields: Record<string, BasesPropertyId> }) => {
  const rawTitle = data.getValue(ctx.fields.title);
  const title = rawTitle?.isTruthy() ? rawTitle.toString() : data.file.basename
  const url = data.getValue(ctx.fields.url)
  const thumbnail = data.getValue(ctx.fields.thumbnail)
  let thumbnailPath = thumbnail?.toString() ?? ''


  if (!uriRegex.test(thumbnailPath)) {
    const file = ctx.app.metadataCache.getFirstLinkpathDest(thumbnailPath, "");
    thumbnailPath = ctx.app.vault.adapter.getResourcePath(file?.path ?? '');
  }

  console.log({
    formulaThumbnail: thumbnail,
    thumbnailPath,
  })

  const computedDuration = convertTimecodeToDuration(data.getValue(ctx.fields.duration)?.toString() ?? '');

  const track: Track = {
    title,
    url: url?.toString() ?? "",
    thumbnail: thumbnailPath,
    filepath: data.file.path,
    file: data.file,
    duration: !isNaN(computedDuration) ? computedDuration : undefined,
  }
  return track
}
export const BasesEntryTrackFactory = new TrackFactory<BasesEntry>(basesEntryTrackBlueprint);
