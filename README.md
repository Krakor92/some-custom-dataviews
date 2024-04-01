
# Some custom dataviews

Here you'll find js views I've written to leverage Dataview's power (its `API`) to suit some of my specific needs.

Originally, they were used inside `dataviewjs` codeblocks but with the arrival of JS Engine and its reactive component system, I've modified them to use `js-engine` codeblocks instead

> [!NOTE]
> Except if stated otherwise, these views should work on all types of devices. I've personally tested them on Android, iPadOS, Linux and Windows


## Hierarchy

Here is an explanation of the top level folders/files:

- `_custom/` contains bunch of js scripts used by these views internally

- `_views/` contains the collection of views. Each folder inside this folder contains two files (`view.js` / `view.css`) and a readme to explain how to use them.

- `Krakor.js` is used by all my views. It simply aggregates the content of every files in the `_custom` folder so you just have to copy one file in your vault instead of the whole folder.

- `Krakor.css` contains shared styles for all my views. Like any other Obsidian css snippet, you need to place it in the `.obsidian/snippets` folder in your vault and activate it in your settings. It is not necessary for these views to work, but it corrects certain appearance problems common to all of them.


## Dependencies

All this view are dependant of the following plugins:

- [`JS Engine`](https://github.com/mProjectsCode/obsidian-js-engine-plugin) - for its neat codeblocks, which can be reactive when needed

- [`Dataview`](https://github.com/blacksmithgu/obsidian-dataview) - for its API

- [`CustomJs`](https://github.com/saml-dev/obsidian-custom-js) - because it allows me to divide my logic into isolated modules, so to speak, to get cleaner code that's easier to maintain.

*Why not use JS Engine import system or even the Modules plugin to achieve this?*

When I started building these views, `CustomJs` was the only plugin capable of doing this.
Since then, some brilliant new plugins have come along that provide a better workflow for people who want to split their js into more manageable chunks (like Modules). I evaluated the trade-off for switching to a new plugin and came to my own conclusion: It's not worth it in this context.

CustomJs is very lightweight (it doesn't take long to initialise when the vault starts) + it allows me to share a single js file that works with all my views. It would take too much time (for not that many benefits) to switch to modules or even use the JS Engine import system, so I prefer to stick with CustomJs.
