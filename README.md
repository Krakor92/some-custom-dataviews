
# Some custom dataviews

*Collection of JavaScript views combining the power of JS Engine and Dataview*

The views were originally used inside `dataviewjs` code blocks (hence the name of this repo) but with the arrival of JS Engine and its reactive component system, I've modified them to use `js-engine` code blocks instead.

> [!NOTE]
> Except if stated otherwise, these views should work on all types of devices. I've personally tested them on Android, iPadOS, Linux and Windows


## Hierarchy

Here is an explanation of the top level folders/files:

- `_modules/` contains bunch of javascript files used by these views internally

- `_views/` contains my collection of views. Each folder inside this folder contains the following files
	- `README.md` to explain how to use the view
	- `view.js` to run the view
	- `view.css` to style the view
	- `view.md` that contains some test cases

- [`Krakor.mjs`](/Krakor.mjs) is used by all my views. It simply aggregates the content of every files from the `_modules` folder so you just have to copy one file in your vault instead of the whole folder.

- [`Krakor.css`](/Krakor.css) contains shared styles for all my views. Like any other Obsidian css snippet, you need to place it in the `.obsidian/snippets` folder in your vault and activate it in your settings. It is not necessary for these views to work, but it corrects certain appearance problems common to all of them.

## Views

> [!IMPORTANT]
> Before trying any of these views, make sure you're using the latest version of Obsidian with the most recent installer version too.
>
> Just so you know, I'm not using the insider builds so if a view doesn't work for any reasons in these, I won't be able to fix it.

- 🎧 [`Jukebox`](/_views/jukebox)
- 📁 [`Gallery`](/_views/gallery)

## Dependencies

All these views depend on the following plugins:

- [`JS Engine`](https://github.com/mProjectsCode/obsidian-js-engine-plugin) - for its neat code blocks, which can be reactive when needed. It also has a solid import system, on par with the Modules plugin, and without the inconvenience of having to install yet another plugin just for this purpose.

- [`Dataview`](https://github.com/blacksmithgu/obsidian-dataview) - for its (still) unmatched file querying API.

