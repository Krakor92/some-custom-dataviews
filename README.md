
# Some custom dataviews

Here you'll find js views I've written to harness Dataview's power to meet some of my specific needs.

Originally, they were used inside `dataviewjs` code blocks (hence the name of this repo) but with the arrival of JS Engine and its reactive component system, I've modified them to use `js-engine` code blocks instead.

> [!NOTE]
> Except if stated otherwise, these views should work on all types of devices. I've personally tested them on Android, iPadOS, Linux and Windows


## Hierarchy

Here is an explanation of the top level folders/files:

- `_modules/` contains bunch of js scripts used by these views internally

- `_views/` contains my collection of views. Each folder inside this folder contains the following files
	- `README.md` to explain how to use the view
	- `view.js` to run the view
	- `view.css` to style the view
	- `view.md` that contains some test cases

- `Krakor.mjs` is used by all my views. It simply aggregates the content of every files from the `_modules` folder so you just have to copy one file in your vault instead of the whole folder.

- `Krakor.css` contains shared styles for all my views. Like any other Obsidian css snippet, you need to place it in the `.obsidian/snippets` folder in your vault and activate it in your settings. It is not necessary for these views to work, but it corrects certain appearance problems common to all of them.

## Views

- 🎧 [`Jukebox`](/_views/jukebox)
- 📁 [`Gallery`](/_views/gallery)

## Dependencies

All this views depend on the following plugins:

- [`JS Engine`](https://github.com/mProjectsCode/obsidian-js-engine-plugin) - for its neat code blocks, which can be reactive when needed + because it allows me to divide my logic into isolated modules, so to speak, to get cleaner code that's easier to maintain

- [`Dataview`](https://github.com/blacksmithgu/obsidian-dataview) - for its API
