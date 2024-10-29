import type { Blueprint } from "@/modules/Factory";
import { Factory } from "@/modules/Factory";
import type { DatacorePage, Link } from "@/types/api";
import { convertTimecodeToDuration } from "@/utils";

/**
 * Represents a music track. Most of the properties are optional.
 */
export interface Track {
  title: string;
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
   * The path to the local file of the track
   */
  filepath?: string;

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

export class TrackFactory<T> extends Factory<T, Track> {}

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

export const DatacoreTrackFactory = new TrackFactory<DatacorePage>(
  datacoreTrackBlueprint
);
