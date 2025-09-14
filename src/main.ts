import type { App, WorkspaceLeaf } from "obsidian";
import { Plugin, PluginSettingTab, Setting } from "obsidian";
import { main as jukebox } from "@/views/jukebox";
import { main as POC } from "@/views/proof-of-concept";
import { main as sandbox } from "@/views/sandbox";

import { MySettingTab } from "@/settings";
import { DEFAULT_SETTINGS } from "@/settings";
import {
  MY_PLUGIN_VIEW_TYPE,
  type MyPluginSettings
} from "@/types";
import { SvelteView } from "@/views";

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  jukebox: any;
  sandbox: any;

  // Initialization guard to prevent duplicate initialization
  private initializationComplete = false;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async onload(): Promise<void> {
    await this.loadSettings();

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new MySettingTab(this.app, this));

    this.jukebox = jukebox;
    this.sandbox = sandbox;
    this.POC = POC;

    this.addRibbonIcon('dice', 'Activate view', () => {
      return this.activateView(MY_PLUGIN_VIEW_TYPE);
    });

    // Defer expensive initialization until layout is ready
    this.app.workspace.onLayoutReady(() => {
      this.initializeAfterLayoutReady();
    });

    console.log("Kviews finished onload");
  }

  onunload(): void {
    // Reset initialization flag for potential reload
    this.initializationComplete = false;

    console.log("Kviews finished onunload");
  }

  // #region Helpers
  // Helper method to create or activate a view of specific type
  async activateView(viewType: string) {
    const { workspace } = this.app;

    // Use existing view if it exists
    let leaf = this.getLeafOfType(viewType);

    if (!leaf) {
      // Simple approach - create a new tab
      // This is more reliable for tab behavior
      leaf = workspace.getLeaf('tab');

      // Set the view state for this leaf
      await leaf.setViewState({
        type: viewType,
        active: true,
      });
    }

    // Make this leaf active and ensure it's visible
    workspace.setActiveLeaf(leaf, { focus: true });
    workspace.revealLeaf(leaf);

    return leaf;
  }

  private getLeafOfType(viewType: string): WorkspaceLeaf | null {
    const { workspace } = this.app;
    const test = workspace.getActiveViewOfType(SvelteView)
    const leaves = workspace.getLeavesOfType(viewType);
    debugger
    // Find the first leaf with an actually loaded view (not deferred)
    for (const leaf of leaves) {
      if (leaf.view && leaf.view.getViewType() === viewType) {
        return leaf;
      }
    }
    // If no loaded view found, return the first leaf (might be deferred)
    return leaves.length > 0 ? leaves[0] : null;
  }
  // #endregion

  // #region Lazy loading

  /**
   * Initialize expensive operations after layout is ready
   */
  private async initializeAfterLayoutReady(): Promise<void> {
    // Guard against multiple initialization calls
    if (this.initializationComplete) return;
    this.initializationComplete = true;

    try {
      // Register view types (now safe after layout ready)
      this.registerView(
        MY_PLUGIN_VIEW_TYPE,
        (leaf) => new SvelteView(leaf)
      );


      // if (this.settings?.enableBases) {
      //   try {
      //     const { registerBasesTaskList } = await import('./bases/registration');
      //     await registerBasesTaskList(this);
      //   } catch (e) {
      //     console.log('Registration failed:', e);
      //   }
      // }

      console.log('Kviews finished initializeAfterLayoutReady')

    } catch (error) {
      console.error('Error during post-layout initialization:', error);
    }
  }

  // #endregion

  // #region Settings

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // #endregion
}

