import type { BasesQueryResult, QueryController, Value } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, DateValue, Events, NumberValue, StringValue } from 'obsidian';
import Jukebox from '@/bases/new/Jukebox.svelte';
import { mount, unmount } from 'svelte';
import type { Track } from '@/models';
import { BasesEntryTrackFactory } from '@/models/Track'

export const JUKEBOX_VIEW_TYPE = 'jukebox-grid';

export const SPECIAL_FIELDS = {
  TITLE: {
    key: "title",
    default: "note.title",
  },
  THUMBNAIL: {
    key: "thumbnail",
    default: "note.thumbnail",
  },
  AUDIO_FILE: {
    key: "audio-resource",
    default: "note.audio",
  },
  URL: {
    key: "url",
    default: "note.url",
  },
  DURATION: {
    key: "duration",
    default: "note.duration",
  },
  VOLUME: {
    key: "volume",
    default: "note.volume",
  },
  ORPHANS: {
    key: "orphans",
    default: "note.orphans",
  },
} as Record<string, { key: string, default: BasesPropertyId }>

export class JukeboxView extends BasesView {
  readonly type = JUKEBOX_VIEW_TYPE;
  readonly scrollEl: HTMLElement;
  readonly events: Events;
  svelteComponent: ReturnType<typeof Jukebox> | null = null;

  constructor(controller: QueryController, scrollEl: HTMLElement) {
    super(controller);
    this.scrollEl = scrollEl;
    this.events = new Events();
  }

  onload(): void {
    this.svelteComponent = mount(Jukebox, {
      target: this.scrollEl,
      props: {
        view: this,
      },
    });
  }

  onunload(): void {
    if (this.svelteComponent) {
      void unmount(this.svelteComponent);
    }
  }

  onDataUpdated(): void {
    this.events.trigger('data-updated');
  }

  processData(): Track[] {
    const dataToRender: Track[] = [];

    const queryResult: BasesQueryResult | null = this.data;
    if (!queryResult) return [];

    console.log(queryResult)

    const fields = {} as Record<string, BasesPropertyId>
    Object.values(SPECIAL_FIELDS).forEach(field => {
      fields[field.key] = this.config.getAsPropertyId(field.key) ?? field.default
    })

    console.log(fields)

    for (const entry of queryResult.data ?? []) {
      dataToRender.push(BasesEntryTrackFactory.create(entry, fields))
    }

    console.log(dataToRender)
    return dataToRender;
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: 'Cards min width',
        type: 'slider',
        key: 'cardMinWidth',
        min: 160,
        max: 640,
        step: 10,
        default: 200,
      },
      {
        displayName: 'Properties',
        type: 'group',
        items: [
          {
            displayName: '🔗 Url',
            type: 'property',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
            ...SPECIAL_FIELDS.URL,
          },

          {
            displayName: '🖼️ Thumbnail',
            type: 'property',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
            ...SPECIAL_FIELDS.THUMBNAIL,
          },
          {
            displayName: '🎵 Audio file/url',
            type: 'property',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
            ...SPECIAL_FIELDS.AUDIO_FILE,
          },
          {
            displayName: '⏱️ Duration metadata',
            type: 'property',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
            ...SPECIAL_FIELDS.DURATION,
          },
        ]
      },
    ];
  }
}
