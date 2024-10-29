<script lang="ts">

import { App, Component } from "obsidian";

import CustomView from "@/components/CustomView.svelte";
import GridCollection from "@/components/GridCollection.svelte";

import {
  extractInfoFromYouTubeUrl,
  buildYouTubeImgUrlFromId,
  buildYouTubeUrlFromId,
} from '@/managers/YouTubeManagerTs';
import { type HTMLPayload } from '@/managers/CollectionManagerTs';

import { type Track } from "@/models/Track";

import { type AsyncBlueprint } from "@/modules/Factory";

import {
  Renderer,
  renderExternalUrlAnchor,
  renderImageFromUrl,
  renderInternalFileAnchor,
  renderTimecode,
  renderTimeline,
  type AlignStrategy,
  type AudioPreloadingStrategy,
} from '@/ui/RendererTs';


const {
  app,
  component,
  container,
  tracks,

  disableSet,
}: {
  app: App,
  component: Component,
  container: HTMLElement,

  tracks: Track[],
  disableSet: Set<string>,
} = $props()

const ᚱ = new Renderer(app)

const SETTINGS = {
  FORCE_CLASSIC_YOUTUBE_URL: true,
  DISPLAY_SERVICE_ICONS: false,
  AUDIO_DEFAULT_PRELOAD: 'metadata' as AudioPreloadingStrategy,
  ARTICLE_ALIGN: 'center' as AlignStrategy,
  MAX_FILENAME_LENGTH: 64,
}

const resolveArticleStyle = ({ align }: { align?: string }) => {
  let style = ""
  style += align ? `align-self: ${align};` : ""

  return style !== "" ? `style="${style}"` : ""
}

const buildExtraChildrenHTML = (track: Track) => {
  const extra: Record<string, string> = {}

  extra[".file-link"] = renderInternalFileAnchor({
    path: track.filepath ?? "",
    name: track.title,
    lengthLimit: SETTINGS.MAX_FILENAME_LENGTH
  })

  return extra
}

const pageBlueprint: AsyncBlueprint<Track, HTMLPayload> = async (track) => {
  let fileTag = ""
    , thumbTag = ""
    , imgTag = ""
    , soundTag = ""
    , trackTag = ""
    , timecodeTag = ""

  if (!disableSet.has("filelink")) {
    fileTag = `<span class="file-link"></span>`
  }

  const ytVideo = extractInfoFromYouTubeUrl(track.url)

  if (!disableSet.has("thumbnail")) {
    if (!track.thumbnail) {
      if (ytVideo) {
        imgTag = renderImageFromUrl(buildYouTubeImgUrlFromId(ytVideo.id))
      } else {
        imgTag = renderImageFromUrl(track.url, { tryToInfer: true })
      }
    } else {
      imgTag = ᚱ.renderImage(track.thumbnail)
    }
  }

  if (track.url) {
    let url = (SETTINGS.FORCE_CLASSIC_YOUTUBE_URL && ytVideo) ? buildYouTubeUrlFromId(ytVideo.id) : track.url

    if (ytVideo?.t) {
      url += `&t=${ytVideo.t}`
    }

    imgTag = renderExternalUrlAnchor({
      url,
      children: imgTag,
    })
  }

  if (track.duration && !disableSet.has("timecode")) {
    timecodeTag = renderTimecode(track.duration)
  }



  /*
  MP3 player bugs on Android unfortunately 😩 (at least on my personal android phone which runs on Android 13)
  Some music might load and play entirely without any issue
  while other have an incorrect duration in the timestamp and freeze at some point when played

  This strange behaviour simply make the audio file players on Android unreliable thus unusable (since you can't predict it)
  So i prefer disabling it completely rather than having a buggy feature
  Remove the `os !== "Android"` if you want to try it on yours
  */
  if (track.audio && !disableSet.has("audioplayer")) {
    soundTag = await ᚱ.renderMP3Audio({
      audioFile: track.audio,
      volumeOffset: track.volumeOffset,
      preload: SETTINGS.AUDIO_DEFAULT_PRELOAD,
    })
    trackTag = renderTimeline()
  }

  thumbTag = `<div class="thumb-stack">
    ${imgTag}
    ${soundTag}
    ${soundTag ? trackTag : ""}
    ${timecodeTag}
  </div>`

  const articleStyle = resolveArticleStyle({
    align: SETTINGS.ARTICLE_ALIGN,
  })

  const article = `\
<article class="item" ${articleStyle}>
  ${thumbTag ?? ""}
  ${fileTag}
</article>`

  return {
    html: article,
    extra: buildExtraChildrenHTML(track),
  }
}

</script>


<CustomView
  name="jukebox" {container}
>
  <GridCollection {app} {component} {container}
    {disableSet}
    result={tracks}
    cellBlueprint={pageBlueprint}
  />
</CustomView>
