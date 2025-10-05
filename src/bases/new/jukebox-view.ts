import type {
  BasesPropertyId,
  BasesQueryResult,
  QueryController,
  ViewOption
} from 'obsidian';
import { BasesView, Events } from 'obsidian';
import { mount, unmount, tick } from 'svelte';

import Jukebox from '@/bases/new/Jukebox.svelte';
import GridVirtualizer from '@/components/GridVirtualizerDynamic.svelte';

import type { Track } from '@/models';
import { BasesEntryTrackFactory } from '@/models/Track'

export const JUKEBOX_VIEW_TYPE = 'jukebox-grid';

export const CONFIG_FIELDS = {
  CARDS_MIN_WIDTH: {
    key: 'cardMinWidth',
    displayName: 'Cards min width',
    default: '200px',
  },
  CARDS_BORDER_RADIUS: {
    key: 'cardBorderRadius',
    displayName: 'Cards border radius (px)',
    default: 6,
  },
  GRID_ROW_GAP: {
    key: 'gridRowGap',
    displayName: 'Row gap',
    default: '0.5rem',
  },
  GRID_COLUMN_GAP: {
    key: 'gridColumnGap',
    displayName: 'Column gap',
    default: '0.75rem',
  },
  THUMBNAIL_MAX_HEIGHT: {
    key: 'thumbMaxHeight',
    displayName: 'Thumbnail max height',
    default: '200px',
  },
}

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
  }

  onunload(): void {
    if (this.svelteComponent) {
      void unmount(this.svelteComponent);
    }
  }

  onDataUpdated(): void {
    if (!this.svelteComponent) {
      console.log("Svelte component hasn't been mounted yet")
      this.svelteComponent = mount(Jukebox, {
        target: this.scrollEl,
        props: {
          view: this,
        },
      });
      // this.svelteComponent = mount(GridVirtualizer, {
      //   target: this.scrollEl,
      // });
    }

    // We must wait for the component to mount before triggering the event
    tick().then(() => {
      this.events.trigger('data-updated');
    })
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
      dataToRender.push(BasesEntryTrackFactory.create(
        entry,
        {
          app: this.app,
          fields
        }
      ))
    }

    console.log(dataToRender)
    return dataToRender;
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: 'Appearance',
        type: 'group',
        items: [
          {
            ...CONFIG_FIELDS.CARDS_MIN_WIDTH,
            type: 'text',
          },
          {
            ...CONFIG_FIELDS.THUMBNAIL_MAX_HEIGHT,
            type: 'text',
          },
          {
            ...CONFIG_FIELDS.CARDS_BORDER_RADIUS,
            type: 'slider',
            min: 0,
            max: 20,
            step: 1,
          },
          {
            ...CONFIG_FIELDS.GRID_ROW_GAP,
            type: 'text'
          },
          {
            ...CONFIG_FIELDS.GRID_COLUMN_GAP,
            type: 'text'
          },
        ]
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
