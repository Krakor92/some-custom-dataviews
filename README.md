
# Some custom dataviews

Here you'll find dvjs views I've written to leverage Dataview's power to suit my specific needs

Each folder contains a dvjs view (view.js / view.css) and a readme to explain how to use them.
The exception being the `_custom` folder which contains bunch of js scripts needed by these views to work

All these views must be used with the [dv.view()](https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/#dvviewpath-input) method inside regular .md notes in your Obsidian app. They also have a hard dependencies on [CustomJS](https://github.com/saml-dev/obsidian-custom-js) plugin, which let me split my logic into isolated modules so to speak for cleaner / more maintainable code

Except if stated otherwise in them README, these views should works on every device type 

The `Krakor.js` file at the root is used by all my views. It simply aggregates the content of every files in the `_custom` folder so you just have to copy one file in your vault instead of the whole folder