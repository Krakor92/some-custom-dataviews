import type { App } from "obsidian";
import { YouTubeManager } from "@/managers";
import type { Link } from "@/types/api";
import { playIcon } from "@/ui/Icons";
import {
  clamp,
  convertDurationToTimecode,
  linkExists,
  fileExistsAtPath,
  uriRegex,
} from "@/utils";

// #region Image

export type AlignStrategy = "auto" | "top" | "center" | "bottom";

const IMG_BASE_ATTRIBUTES = `referrerpolicy="no-referrer"`;

const resolveThumbnailStyle = (display: string): string => {
  const thumbnailY = parseFloat(display);
  if (isNaN(thumbnailY)) return "";

  return `style="object-position: 50% ${clamp(thumbnailY, 0, 1) * 100}%"`;
};

const resolveUrlThumbnailStyle = (str: string): string => {
  const startOfDisplayId = str.indexOf("[");
  const endOfDisplayId = str.indexOf("]");

  // Either there is no [], or there is but its empty
  if (startOfDisplayId === -1 || endOfDisplayId - startOfDisplayId === 1)
    return "";

  let display = str.substring(startOfDisplayId + 1, endOfDisplayId);
  const firstPipeId = str.indexOf("|", startOfDisplayId);
  if (firstPipeId !== -1) {
    // Instead of having display be "0.2|400", it's going to be "0.2" only
    display = str.substring(startOfDisplayId + 1, firstPipeId);
  }

  return resolveThumbnailStyle(display);
};

const resolveVaultImageStyle = (thumb: Link): string => {
  let display = thumb.display;

  if (display == null) return "";

  const firstPipeId = display.indexOf("|");
  if (firstPipeId !== -1) {
    // Instead of having display be "0.2|400", it's going to be "0.2" only
    display = display.substring(0, firstPipeId);
  }

  return resolveThumbnailStyle(display);
};

const computeImageTagFrom3rdPartyUrl = (url: string): string => {
  const ytVideo = YouTubeManager.extractInfoFromYouTubeUrl(url);
  if (ytVideo) {
    return `<img src="${YouTubeManager.buildYouTubeImgUrlFromId(
      ytVideo.id
    )}" ${IMG_BASE_ATTRIBUTES}>`;
  }

  if (url.includes("dailymotion")) {
    const startOfId = url.lastIndexOf("/") + 1;
    const id = url.substring(startOfId);
    return `<img src="https://www.dailymotion.com/thumbnail/video/${id}" ${IMG_BASE_ATTRIBUTES}>`;
  }

  return "";
};

export const renderImageFromUrl = (
  url: string,
  { tryToInfer = false } = {}
): string => {
  if (!url) return "";

  if (tryToInfer) {
    const resolvedUrl = computeImageTagFrom3rdPartyUrl(url);
    if (resolvedUrl) return resolvedUrl;
  }

  let style = null;
  if (url.startsWith("!")) {
    style = resolveUrlThumbnailStyle(url);

    const startOfUrl = url.lastIndexOf("(") + 1;
    url = url.substring(startOfUrl, url.length - 1);
  }

  return `<img src="${url}" ${IMG_BASE_ATTRIBUTES} ${style ?? ""}>`;
};

// #endregion

export const renderTimecode = (length: string | number): string => {
  if (typeof length === "number") {
    length = convertDurationToTimecode(length);
  }
  return `<div class="timecode"><span>${length}</span></div>`;
};

export const renderTimeline = () => {
  return `<input type="range" class="timeline" max="100" value="0">`;
};

/**
 * Returns a string of the form: `data-service="${service}"`
 */
const computeAnchorServicePartFromUrl = (url: string): string => {
  if (url.includes("youtu")) return `data-service="youtube"`;
  if (url.includes("soundcloud")) return `data-service="soundcloud"`;
  if (url.includes("dailymotion")) return `data-service="dailymotion"`;
  if (url.includes("dropbox")) return `data-service="dropbox"`;
  if (url.includes("spotify")) return `data-service="spotify"`;
  if (url.includes("deezer")) return `data-service="deezer"`;

  return "";
};

/**
 *
 * @param {object} _
 * @param {string} _.url
 */
export const renderExternalUrlAnchor = ({
  url,
  children = "",
}: {
  url: string;
  children?: string;
}): string => {
  const attributes = `\
href="${url}" \
draggable="false" \
class="external-link" \
rel="noopener" \
target="_blank" \
${computeAnchorServicePartFromUrl(url)}`;
  return `<a ${attributes}>${children}</a>`;
};

// #region Audio

export type AudioPreloadingStrategy = "metadata" | "auto" | "none";

const renderInternalEmbedAudio = ({
  src,
  preload,
  dataVolume = "",
}: {
  src: string;
  preload: AudioPreloadingStrategy;
  dataVolume?: string;
}): string => `
<div\
  class="internal-embed media-embed audio-embed is-loaded"\
  tabindex="-1"\
  contenteditable="false"\
>\
  <audio\
    controls\
    controlslist="nodownload"\
    src="${src}"\
    preload="${preload}"\
    ${dataVolume}\
  >\
  </audio>\
</div>`;

const renderMP3Audio = ({
  src,
  preload,
  dataVolume = "",
}: {
  src: string;
  preload: AudioPreloadingStrategy;
  dataVolume?: string;
}): string => `
<div class="audio-player">\
  <button class="player-button">\
    ${playIcon}\
  </button>\
  <audio preload="${preload}" ${dataVolume}>\
    <source src="${src}"/>\
  </audio>\
</div>`;

// #endregion

export const renderInternalFileAnchor = ({
  path,
  name,
  ariaLabel = true,
  mdmIcon = true,
  lengthLimit = 0,
}: {
  path: string;
  name: string;
  ariaLabel?: boolean;
  mdmIcon?: boolean;
  lengthLimit?: number;
}): string => {
  // look at https://github.com/mdelobelle/metadatamenu/issues/247 for explanation on mdmIcon

  let trimmedName;

  if (lengthLimit > 0 && name.length > lengthLimit) {
    trimmedName = name.substring(0, lengthLimit);
    trimmedName += "[…]";
  }

  return `<a
  class="internal-link ${mdmIcon ? "" : "metadata-menu-button-hidden"}"
  ${ariaLabel ? `aria-label="${path}"` : ""}
  data-href="${path}"
  href="${path}"
>
  ${trimmedName ?? name}
</a>`;
};

/**
 * Class that expose multiple way of rendering things within Obsidian
 * It only exists because it is simpler to share the app instance this way
 * rather than pass it every time to each function
 */
export class Renderer {
  constructor(private app: App) {}

  /**
   * Compute the HTML tag representation of an image
   * It accepts either internal link, absolute path or an url
   * @param img - In case of an array, only the first element will be rendered
   */
  renderImage = (img: Link | string | (Link | string)[]): string => {
    if (Array.isArray(img)) return this.renderImage(img[0]);

    if (typeof img === "string" && uriRegex.test(img)) {
      return renderImageFromUrl(img);
    }

    return this.renderImageFromVault(img);
  };

  /**
   * @param img - In case of an array, only the first element will be rendered
   */
  renderImageFromVault = (thumb: Link | string | (Link | string)[]): string => {
    if (!thumb) return "";

    if (Array.isArray(thumb)) {
      return this.renderImageFromVault(thumb[0]);
    }

    if (typeof thumb === "string") {
      return this.renderImageFromVaultPath(thumb);
    } else {
      return this.renderImageFromVaultLink(thumb);
    }
  };

  renderImageFromVaultLink = (link: Link): string => {
    if (!link) return "";

    const style = resolveVaultImageStyle(link);
    const src = this.app.vault.adapter.getResourcePath(link.path);

    return `<img src="${src}" ${IMG_BASE_ATTRIBUTES} ${style ?? ""}>`;
  };

  renderImageFromVaultPath = (path: string): string => {
    if (!path) return "";

    const src = this.app.vault.adapter.getResourcePath(path);

    return `<img src="${src}" ${IMG_BASE_ATTRIBUTES}>`;
  };

  /**
   * Aim to replicate the way it is done by vanilla Obsidian
   * @todo why is it there again?
   */
  renderInternalEmbedAudio = async ({
    audioFile,
    volumeOffset,
    preload = "metadata",
  }: {
    audioFile: Link | string;
    volumeOffset?: number;
    preload?: AudioPreloadingStrategy;
  }): Promise<string> => {
    if (!audioFile) return "";

    const dataVolume = volumeOffset ? `data-volume="${volumeOffset}"` : "";

    if (typeof audioFile === "string") {
      // Expects it to be an http link pointing to a valid resource
      return renderMP3Audio({ src: audioFile, preload, dataVolume });
    }

    const mp3Exists = await linkExists({ app: this.app, link: audioFile });
    if (!mp3Exists) return "";

    return renderInternalEmbedAudio({
      src: this.app.vault.adapter.getResourcePath(audioFile.path),
      preload,
      dataVolume,
    });
  };

  renderMP3Audio = async ({
    audioFile,
    volumeOffset,
    preload = "metadata",
  }: {
    audioFile: string;
    volumeOffset?: number;
    preload?: AudioPreloadingStrategy;
  }): Promise<string> => {
    if (!audioFile) return "";

    const dataVolume = volumeOffset ? `data-volume="${volumeOffset}"` : "";

    const mp3Exists = await fileExistsAtPath({
      app: this.app,
      path: audioFile,
    });
    if (!mp3Exists) {
      // Expects it to be an http link pointing to a valid resource
      return renderMP3Audio({ src: audioFile, preload, dataVolume });
    }

    return renderMP3Audio({
      src: this.app.vault.adapter.getResourcePath(audioFile),
      preload,
      dataVolume,
    });
  };

  renderVideo = async ({
    filelink,
    preload = "metadata",
  }: {
    filelink: Link;
    preload?: AudioPreloadingStrategy;
  }): Promise<string> => {
    if (!filelink) return "";

    const videoExists = await linkExists({ app: this.app, link: filelink });
    if (!videoExists) return "";

    // return `
    // <div class="internal-embed media-embed video-embed is-loaded">
    //     <video controls src="${window.app.vault.adapter.getResourcePath(filelink.path)}">
    //     </video>
    // </div>`;

    return `<video controls src="${this.app.vault.adapter.getResourcePath(
      filelink.path
    )}">
        </video>`;
  };
}
