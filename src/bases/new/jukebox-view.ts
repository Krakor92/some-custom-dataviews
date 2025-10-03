import type { BasesQueryResult, QueryController, Value } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, DateValue, Events, NumberValue, StringValue } from 'obsidian';
import Jukebox from '@/bases/new/Jukebox.svelte';
import { mount, unmount } from 'svelte';

export const JUKEBOX_GRID_VIEW_TYPE = 'jukebox-grid';

export type JukeboxViewType = typeof JUKEBOX_GRID_VIEW_TYPE;

export const THUMBNAIL_FIELD = 'thumbnail';
export const AUDIO_FIELD = 'audio';
export const LENGTH_FIELD = 'length';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessedData = {
  x: number | Date | string;
  y: number;
  label?: string;
  group?: string;
};

export class JukeboxView extends BasesView {
  readonly type: JukeboxViewType;
  readonly scrollEl: HTMLElement;
  readonly events: Events;
  svelteComponent: ReturnType<typeof Jukebox> | null = null;

  constructor(type: JukeboxViewType, controller: QueryController, scrollEl: HTMLElement) {
    super(controller);
    this.type = type;
    this.scrollEl = scrollEl;
    this.events = new Events();
  }

  onload(): void {
    if (this.type === JUKEBOX_GRID_VIEW_TYPE) {
      this.svelteComponent = mount(Jukebox, {
        target: this.scrollEl,
        props: {
          view: this,
        },
      });
    }
  }

  onunload(): void {
    if (this.svelteComponent) {
      void unmount(this.svelteComponent);
    }
  }

  onDataUpdated(): void {
    this.events.trigger('data-updated');
  }

  processData(): ProcessedData[] {
    const data: ProcessedData[] = [];

    const queryResult: BasesQueryResult | null = this.data;
    const xField = this.config.getAsPropertyId(X_FIELD);
    const yField = this.config.getAsPropertyId(Y_FIELD);
    const labelField = this.config.getAsPropertyId(LABEL_FIELD);

    if (!xField || !yField) {
      return data;
    }

    for (const group of queryResult?.groupedData ?? []) {
      for (const entry of group.entries) {
        try {
          const x = entry.getValue(xField);
          const y = entry.getValue(yField);
          const label = labelField ? entry.getValue(labelField) : null;

          const xValue = parseValueAsX(x);
          const yValue = parseValueAsNumber(y);
          const labelStr = label?.toString();

          if (xValue !== null && yValue !== null) {
            data.push({
              x: xValue,
              y: yValue,
              label: labelStr,
              group: group.key?.toString(),
            });
          }
        } catch (e) {
          console.warn('Error processing entry', entry, e);
        }
      }
    }

    return data;
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: 'Embedded height',
        type: 'slider',
        key: 'mapHeight',
        min: 200,
        max: 800,
        step: 20,
        default: 400,
      },
      {
        displayName: 'Properties',
        type: 'group',
        items: [
          {
            displayName: 'Thumbnail',
            type: 'property',
            key: 'thumbnail',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
          },
          {
            displayName: 'Audio file/url',
            type: 'property',
            key: 'audio',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
          },
          {
            displayName: 'Length metadata',
            type: 'property',
            key: 'length',
            filter: prop => !prop.startsWith('file.'),
            placeholder: 'Property',
          },
        ]
      },
    ];
  }
}
