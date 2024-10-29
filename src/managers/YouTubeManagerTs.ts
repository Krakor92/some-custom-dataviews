import type { Track } from "@/models/Track";

interface YouTubeInfo {
  id: string;
  t?: number;
}

const YOUTUBE_URL_REGEX =
  /((?:https?:)\/\/)?((?:www|m|music)\.)?((?:youtube(-nocookie)?\.com|youtu\.be))(\/(?:[\w?&=]+v=|embed\/|live\/|v\/|watch_videos[?&=\w]+video_ids=)?)([\w\-,]+)(\S+)?/;

const T_PART_REGEX = /[?&]t=(\d+)/;

/**
 * It extract the video id from a youtube url and its query parameters
 *
 * It supports these different types of YouTube urls:
 *
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ - **Classic/Desktop** format
 * - https://youtu.be/dQw4w9WgXcQ - **Short mobile** format
 * - https://music.youtube.com/watch?v=oqy2N1jM2tU - **YouTube Music** format
 * - https://www.youtube.com/watch_videos?video_ids=dQw4w9WgXcQ,y6120QOlsfU - **Anonymous playlist** format
 *
 * In the case of a playlist, it extract the ids after the `video_ids=`
 */
export const extractInfoFromYouTubeUrl = (url: string): YouTubeInfo | null => {
  const video = YOUTUBE_URL_REGEX.exec(url);

  if (!video) return null;

  const t = T_PART_REGEX.exec(video[5] + video[7]);

  return {
    id: video[6],
    t: Number(t?.[1]),
  };
};

export const buildYouTubeImgUrlFromId = (
  videoId: string,
  resolution = "mqdefault"
): string => {
  // return `https://i.ytimg.com/vi/${videoId}/${resolution}.jpg`
  return `https://img.youtube.com/vi/${videoId}/${resolution}.jpg`;
};

export const buildYouTubeUrlFromId = (
  videoId: string,
  format = "desktop"
): string => {
  if (videoId.contains(",")) {
    return `https://www.youtube.com/watch_videos?video_ids=${videoId}`;
  }

  switch (format) {
    case "mobile":
    case "short":
      return `https://youtu.be/${videoId}`;
    case "music":
      return `https://music.youtube.com/watch?v=${videoId}`;
    default:
      return `https://www.youtube.com/watch?v=${videoId}`;
  }
};

/**
 * In addition to the url itself, it uses a length property to add extra options to the generated playlist
 */
export const generateAnonymousYouTubePlaylistUriFromTracks = (
  tracks: Track[],
  {
    maxLengthAccepted = 720,
    maxTAccepted = 12,
    acceptsMusicOfUnknownDuration = true,
  } = {}
): string => {
  /**
   * I would have like to add the ability to generate a dynamic YouTube Music playlist but it's not available...
   */
  const baseUrl = "https://www.youtube.com/watch_videos?video_ids=";

  const aggregatedYoutubeUrls = tracks.reduce((prev, cur) => {
    const { url, duration, title } = cur;

    const video = extractInfoFromYouTubeUrl(url);

    if (!video?.id) return prev;

    if (video.t && !isNaN(video.t)) {
      if (video.t > maxTAccepted) {
        console.warn(
          `The 't' argument is too deep inside the video of url: '${url}' to be added in the playlist`
        );
        return prev;
      }
    }

    if (!acceptsMusicOfUnknownDuration && (!duration || isNaN(duration))) {
      console.warn(
        `${title} has an unknown duration. It won't be added in the playlist`
      );
      return prev;
    }

    if (duration && !isNaN(duration) && duration > maxLengthAccepted) {
      console.warn(`${title} is too long to be added in the playlist`);
      return prev;
    }

    const separator = prev !== "" ? "," : "";

    return prev + separator + video.id;
  }, "");

  return baseUrl + aggregatedYoutubeUrls;
};
