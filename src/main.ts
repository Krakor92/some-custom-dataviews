import type { App } from "obsidian";
import { Plugin, PluginSettingTab, Setting } from "obsidian";
import { main as jukebox } from "@/views/jukebox";
import { main as POC } from "@/views/proof-of-concept";
import { main as sandbox } from "@/views/sandbox";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: "default",
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  jukebox: any;
  sandbox: any;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async onload(): Promise<void> {
    await this.loadSettings();

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.jukebox = jukebox;
    this.sandbox = sandbox;
    this.POC = POC;

    console.log("Kviews is loaded");
  }

  onunload(): void {
    console.log("Kviews is unloaded");
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
