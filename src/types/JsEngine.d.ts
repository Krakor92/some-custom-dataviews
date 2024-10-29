/**
 * cf. https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/JsEngine.d.ts
 */

import type { App, CachedMetadata, Component, TFile } from "obsidian";
import type * as Obsidian from "obsidian";

export interface JsExecutionContext {
  /**
   * The file that the execution was triggered from.
   */
  file: TFile | undefined;
  /**
   * The metadata of the file that the execution was triggered from.
   */
  metadata: CachedMetadata | undefined;
  /**
   * Currently unused.
   */
  block: Block | undefined;
}

export interface Block {
  from: number;
  to: number;
}

export interface JsExecutionGlobals {
  /**
   * Reference to the obsidian [app](https://docs.obsidian.md/Reference/TypeScript+API/App) (obsidian API).
   */
  app: App;
  /**
   * Reference to Js Engine API.
   */
  engine: API;
  /**
   * Obsidian [component](https://docs.obsidian.md/Reference/TypeScript+API/Component) for lifecycle management.
   */
  component: Component;
  /**
   * The context provided. This can be undefined and extended by other properties.
   */
  context: (JsExecutionContext | undefined) & Record<string, unknown>;
  /**
   * The container element that the execution can render to. This can be undefined.
   */
  container: HTMLElement | undefined;
  /**
   * The entire obsidian module, e.g. a notice can be constructed like this: `new obsidian.Notice('Hello World')`.
   */
  obsidian: typeof Obsidian;
}
