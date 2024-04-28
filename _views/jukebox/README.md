
# Obsidian Jukebox

A [JS Engine](https://github.com/mProjectsCode/obsidian-js-engine-plugin) view that displays a customisable grid of all your markdown musics files from your vault using [Dataview](https://github.com/blacksmithgu/obsidian-dataview)'s powerful API

![](https://user-images.githubusercontent.com/24924824/232079357-dc71dc66-14d1-476e-b8f4-549618b60df0.png)


## Table of Contents

- [Obsidian Jukebox](#obsidian-jukebox)
	- [Table of Contents](#table-of-contents)
	- [🎼 What to expect from this view](#-what-to-expect-from-this-view)
	- [🚩 Some known caveats](#-some-known-caveats)
		- [due to external factors](#due-to-external-factors)
		- [by design](#by-design)
	- [🎯 Motivations](#-motivations)
	- [📜 Story](#-story)
	- [🎧 How to use it](#-how-to-use-it)
		- [🏗️ Setup](#️-setup)
			- [🧩 Plugins](#-plugins)
			- [📍 Actual setup](#-actual-setup)
			- [Global Settings](#global-settings)
		- [✍️ The code block](#️-the-code-block)
		- [🗃️ Metadata](#️-metadata)
			- [Special Metadata](#special-metadata)
				- [🔗 Url](#-url)
				- [🖼️ Thumbnail](#️-thumbnail)
				- [🐥 Orphans](#-orphans)
			- [User Metadata](#user-metadata)
		- [🔘 Buttons](#-buttons)
			- [The (YouTube) playlist button](#the-youtube-playlist-button)
			- [The `+` button](#the--button)
				- [Automatic insertion of fields on file creation](#automatic-insertion-of-fields-on-file-creation)
			- [The last cell](#the-last-cell)
		- [⚙️ View options / settings](#️-view-options--settings)
			- [Global](#global)
			- [Local](#local)
				- [The `not` filter property](#the-not-filter-property)
				- [Pass string to filter / sort](#pass-string-to-filter--sort)
				- [Pass function to filter / sort (Advanced)](#pass-function-to-filter--sort-advanced)
				- [Date Object](#date-object)
				- [Disable values](#disable-values)
	- [👀 Some examples](#-some-examples)
	- [❓ Some questions you might ask](#-some-questions-you-might-ask)
	- [🔮 Future](#-future)
		- [Datacore](#datacore)
		- [Better settings / Utility plugin](#better-settings--utility-plugin)
	- [🙏 Acknowledgements](#-acknowledgements)
		- [Logic](#logic)
		- [Styling](#styling)

## 🎼 What to expect from this view

> When I mention `music file`, I'm talking about a local markdown file with custom properties.

Here are the overarching principles of how this view works:

- You can filter your music files according to their metadata (url, artist, media, genre, instruments, audio file, custom tags, ...)

- The filters are **static**, you can't switch them without re-rendering the view

- You can tap a card to open the YouTube video (or any url from another streaming service) associated with it.
	- On *Desktop*, it will open it in your default browser (or in a Surfing tab if you have the plugin installed)
	- On *Mobile*, it will open in the application if you have it installed (or open it in your default browser)

- Files with an `audio` property get rendered with a minimal player (simple play/pause button and a timeline). It can be either:
	- An internal link to an asset with audio from your vault
	- An url pointing to an online audio resource

- Any visual element can be disabled at the global level or per code block (check `disable` property)

- This view has been built with scaling in mind: Cards are rendered per batch of 20 by default.
	- To clarify, it's not the computation of the query that is lazy loaded but the rendering phase. This means it won't overload your CPU even if your query returns a thousand files

- Since its a js view and not a plugin, there aren't any settings page but there is a `// #region Settings` at the beginning of the `view.js`. Each option is capitalized and contains a comment above that explains what they do. You can change their value if needed (note: it will affect every occurrence of this view obviously)

- The initial setup to make this view work can be a bit daunting, especially if you're not familiar at all with the Obsidian ecosystem or javascript syntax but I've tried my best to explain every step with enough amount of details so that anyone could follow


## 🚩 Some known caveats

> [!CAUTION]
> Despite all the points raised above, there are a number of warnings to bear in mind. Here they are listed in descending order of inconvenience (in my opinion):

### Due to external factors

- The **audio player** user experience on *Android* is not reliable 😞:
	- Some (if not most) audio files don't load at all (i've opened an [issue on Obsidian Forums](https://forum.obsidian.md/t/bug-audio-files-fail-to-load-randomly-on-android/49684) about it):
		- Those either play until the end but don't trigger the autoplay
		- Or stop playing before the end
		- Edit: thanks to this : https://github.com/Majed6/android-audio-fixer, I've managed to decrease the likeliness of audio files having problem, but it still happens randomly...
	- If you set a video as the source of the audio, besides sharing the same problem as above, you also can't lock your phone / switch app or the music will pause
	- Audios aren't recognized by the phone's system (you can't pause them with your headset for example)


- On *desktop*, audio **pauses** when a new page is opened. I'm not sure what causes that but I guess it has to do with some kind of memory management on Obsidian side

> [!TIP]
> [Opening in a new window](https://help.obsidian.md/User+interface/Pop-out+windows) the page where this view runs can help.
> As it stands in a completely different window, I imagine it forces Obsidian to ignore it when optimizing ressources for the main workspace
>
> Though, note that pop-out windows tend to disrupt the masonry implementation of this view.

- This view isn't super resilient to **bad or inconsistent metadata**. If you have a property that doesn't have the same type everywhere, it might break this view when filtering on it.

- If you have scrolled far enough inside a page and a lot of musics have been rendered (> 200) and you decide to **switch to another tab**, then you may experience a screen freeze for few seconds when switching back to this tab (This phenomenon was only really experienced on my Android phone)

> [!TIP]
> Using [stack tabs](https://help.obsidian.md/User+interface/Tabs#Stack+tab+groups) can help as it keeps the view in memory


- [It's an already known phenomenon](https://forum.obsidian.md/t/audio-stops-while-scrolling/7966) but **scrolling too far deep** in the file where this view sit (or up depending on where the code block is positioned) will pause the music if it's played by an audio player inside a card. It's because of Obsidian's infinite scrolling strategy. Basically, the output of this view is removed from the DOM when you've scrolled too far from it

- When **reloading the app without saving**, this view might not render some parts of itself (up to nothing at all). For example, if enabled, Metadata Menu icons next filelinks might not render because this view renders its content inside the DOM a bit before MDM finishes its initialization

> [!TIP]
> In such a case, simply close and re-open the file, everything should work like intended


### By design

- The url links support has been built with **YouTube links** in mind:
	- You can still add any other web links to your markdown music file (soundcloud, dailymotion, ...) but you will not benefit from the YouTube auto playlist feature while doing so

- Compared to traditional plugins, this view **can't tell you if it can be updated** + it's not as convenient to update (you need to replace every files manually)

- **Timelines** are mostly a gimmick:
	- What I mean is that they're useful to know at a glance the progress of the music, but the timecode does not update and it can be difficult to change its position, especially on mobile


## 🎯 Motivations

The three main reasons why I've started building this are:

- **I can't trust any music service** to store indefinitly all the music i listen (especially YouTube)
	Why? Because it can decide for any specific reason (copyright claim most of the time) to delete any music I've added to one of my playlist without warning

- I want musics **to populate "playlists" on the fly** (based on custom metadata) without me having to manually insert them inside (while still having the ability to do so).
	IMHO the traditional playlist system main flaw is exactly that: It doesn't take into account that the human brain connects musics together in a variety of ways and not just by artist, genre or album.

- I want to put all the music I listen to **on a unified platform accessible on all my devices**.
	It's not my top reason but i find it very cool to have soundcloud and other external service musics next to my regular YouTube links

*N.B.*  
If you do not recognize yourself in neither of these statements, then I am happy for you: Traditional music services answer your needs and that's great. You don't need to read any further. Have a good day!


## 📜 Story

I'm a huge anime and video game music enjoyer. Unfortunately, traditional music services don't have the best catalog when it comes to this. So until now, i've been managing my music inside YouTube since it has the biggest number of music available overall.

It worked great for a long time. Some music used to get striked once in a while but it wasn't a big deal. Then one day, YouTube decided that the striked/unavailable videos should be hidden immediately from the end user. That way, they wouldn't have a clue (unless they remembered their playlist by heart) what the video was. For me it was the straw that broke the camel's back: I HAD to find a solution.

Around the same time, i've discovered Notion and the PKM world in general. For several months, I've built and progressively upgraded a music database system on Notion. It was definitly not the best tool for the job but I was really satisfied with it. Unfortunately at some point, it became a burden to use and manage because of Notion's online-only strategy... The whole database was sluggish and difficult to populate but I forced myself to keep using it nonetheless.

Then I've heard about Obsidian. The local / non-proprietary aspect of the app charmed me but i wasn't sure it could fix my problem. But that was before I learned about the plugin ecosystem (Dataview in particular) and at that point i was convinced it could answer my very specific needs.

But i didn't know where to start because imo, a plugin would be too overkill for what i needed to have (and i'm way too lazy to learn how to make one). As i thought my journey with Obsidian was over, I've stumbled accross this fantastic [repository](https://github.com/702573N/Obsidian-Tasks-Calendar) and it opened my eyes: I just needed to use dataview's view with some custom css.

Recently, with the arrival of JS Engine and the capabilities offered by Meta Bind when combined with it, I decided not to rely on Dataviewjs code blocks anymore (but I still need the plugin because of it's API / added data layer).


## 🎧 How to use it

### 🏗️ Setup

#### 🧩 Plugins

**Plugins required**

- [`JS Engine`](https://github.com/mProjectsCode/obsidian-js-engine-plugin)
- [`Dataview`](https://github.com/blacksmithgu/obsidian-dataview)

**Plugins recommended (but not required)**

- [Metadata Menu](https://github.com/mdelobelle/metadatamenu)
> To put a music icon next to each music link to instantly access their metadata instead of going in the file. Fantastic to quickly jump to an artist or a media link (especially on mobile)

- [Templater](https://github.com/SilentVoid13/Templater)
> To set a default music template on file created inside the default score directory after clicking on the `+` button

- [Surfing](https://github.com/PKM-er/Obsidian-Surfing) (*Desktop only*)
> Very helpful because it will open the music link directly inside Obsidian. Unfortunately it doesn't supports web extension yet (so no ad-blocker...). However if you have a premium subscription to the platform from which your url links come from, this can turn your vault into a simple music player

- [Force Note View Mode](https://github.com/bwydoogh/obsidian-force-view-mode-of-note)
> Simple but very convenient to automatically switch to reading mode on note opening. That way you don't have to scroll the yaml frontmatter if it is too big

- [Meta Bind](https://github.com/mProjectsCode/obsidian-meta-bind-plugin)

> [!NOTE]
> You won't find a tutorial on how to configure these optional plugins below. This section is just here to give some insights

#### 📍 Actual setup

To use this view, you need to get the `view.js` and `view.css` files and put them in a common folder where they are the only ones called that.

> [!TIP]
>You can change their name from `view` to anything you like but both files must share the same one (apart from their extension obviously).
>
>`jukebox.js` and `jukebox.css` is valid for example,  
> `main.js` and `styles.css` isn't.

My advice is to have a common folder where you put all your views files. (*Personally I have one at the following path `_js/_views`*)
In this folder, we create a subfolder with a distinct name relatively clear on the content of what the view generates (here I called it `jukebox`)

So I have an architecture that looks like this:

```
🗃️ My vault
┣━ 📂 _js
┃  ┗━ 📂 _views
┃     ┗━ 📂 jukebox
┃        ┣━ 📄 view.js
┃        ┗━ 📄 view.css
┃
... (rest of my vault)
```


In addition to this folder containing the two files, you need to copy the `Krakor.mjs` at the root of this repository and place it in a folder in your vault (I recommend the same `_js` folder).

If you've followed what I've suggest, you should end up with the following architecture:
```
🗃️ Vault
┣━ 📂 _js
┃  ┣━ 📂 _views
┃  ┃  ┗━ 📂 jukebox
┃  ┃     ┣━ 📄 view.js
┃  ┃     ┗━ 📄 view.css
┃  ┗━ 📄 Krakor.mjs
┃
... (rest of the vault)
```

> [!NOTE]
> If you wish to rename or move this file somewhere else, you can do so, except that you MUST change the `MODULE_PATH` variable at the top of the `view.js` file to match the new path/name.


#### Global Settings

You'll probably want to tweak the default settings located below the `//#region Settings`  inside the `view.js` to fully configure the view, but apart from that, you're all setup!


### ✍️ The code block

If you correctly followed every steps described above, you should be able to write the following codeblock inside one of your markdown file

~~~
```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path})
```
~~~

this codeblock is gonna render a grid of all the files marked as music inside your vault. i.e. every markdown files containing the tag `#🎼`. It's the default behavior but you can change it (see [here](https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox#global))

> It's a little more verbose than its Dataview counterpart, but the benefits far outweigh this inconvience in my opinion.

### 🗃️ Metadata

As stated earlier, each music file can have a variety of metadata. Right now, there are:

- **Special metadata** that are handled specially by this view
- **User metadata** that you can define with specific type
- The rest that are considered basic **strings**


> [!IMPORTANT]
> **If you have doubt on where to define each file's metadata, read the following:**
>
>You can define your metadata either in the *yaml frontmatter* or as *dataview inline fields* in your file. This means that both `field: value` (inside frontmatter) and `field:: value` are perfectly valid and understood in the context of this view
>
>Prior to Obsidian 1.4.x, it was necessary to use inline notation for file links, as they were not recognized by Obsidian when placed in the frontmatter.
>Now that this problem no longer exists, I encourage everyone to **put everything in the frontmatter** and, if necessary, use [Meta Bind](https://github.com/mProjectsCode/obsidian-meta-bind-plugin) to interact with the property inside the body of the file.
>  
>You'll see below, but `url` and `audio` might be the only properties that I still prefer written the inline way as Obsidian renders them

#### Special Metadata

There are currently 7 fields that have a special meaning inside this view:

|     Name      |                                                                                   Description                                                                                    |                                              Example                                               |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------: |
|   **title**   |                             It serves as an alias. If set, it will replace the default name of the file in the grid (used by default for `orphans`)                              |                                           "Shorter name"                                           |
| **thumbnail** |                                The music image. Can be three different values: a string, an url (embedded or not) or a filelink (embedded or not)                                | https://example.com/my-image.jpg OR `![](https://example.com/my-image.jpg)` OR `![[my-image.jpg]]` |
|   **audio**   |                                       It can be any audio file recognized by Obsidian (even video) or an url pointing to a valid resource                                        |                       `![[my-audio.mp3]]` OR `https://example.com/audio.mp4`                       |
|    **url**    | The url to the music. It can be anything but YouTube links have extra supports. *Warning*: the url shouldn't point to a file directly. If that's the case, use **audio** instead |                                    https://youtu.be/dQw4w9WgXcQ                                    |
|  **length**   |                             The length of the music. It is displayed at the bottom right just like on YouTube. (Only 00:00 or 00:00:00 is supported)                             |                                              01:30:04                                              |
|  **volume**   |                                                          The volume offset to apply to the audio file when playing it.                                                           |                                                -0.1                                                |
|  **orphans**  |                                                                        Lets you define file level musics.                                                                        |                                         (more info below)                                          |


> [!TIP]
> All these fields name can be modified in the global options of the `view.js`. To do so, check the const variables ending with `_FIELD`


Here are **some precisions** and special effects to keep in mind while using some of these metadata:

##### 🔗 Url

- If you have a file with a *YouTube* or *dailymotion* link as its `url` then you'll have a thumbnail appearing by default in the jukebox when querying this file
	- Other services aren't supported because there isn't a standardized way to retrieve their thumbnail from a video url (if you find one feel free to open an issue regarding that)

- `https://www.youtube.com/watch_videos?video_ids=id1,id2,...` urls are correctly recognized by this view. However, you won't have the default thumbnail behavior specified above if you use it

##### 🖼️ Thumbnail

- To have a more compact feel on mobile (regarding squared album covers), I've set a max height for thumbnail images. Its value is set in the `view.css` at the top, the variable is named `--jukebox-cards-image-height`. You can adjust its value if you don't like this behavior.
	- By default the image will be centered in its container but you change that by prefixing a value between 0 and 1 to adjust the position (0.5 is the default).

![thumbnail cropping example](https://user-images.githubusercontent.com/24924824/236331752-16b97ea7-91d9-4d57-b64c-bd8acec02b76.png)

If you are embedding your image in your `thumbnail` property like so: `thumbnail:: ![400](...)` then this view will interpret the 400 inside the square brackets as a 1 in this context so the image will be positioned at the bottom. To bypass this annoyance, you could add a `0.5` on the left like so: `thumbnail:: ![0.5|400](...)`: You'll keep the 400px size for your embed and the thumbnail will be centered accordingly

Note: The exact same method and workaround can be used for the wikilinks syntax (`thumbnail:: ![[my-image.jpg|0.5|400]]`)

The file:/// URI scheme is recognized by this view, this means that you can set an image from outside your vault as a thumbnail since Obsidian accept it.
	- Both `file:///link/to/thumbnail.jpg` and `[alt](file:///link/to/thumbnail.jpg)` are valid

##### 🐥 Orphans

This property allows you to define a complete music file but using a property instead of a file.

It support both frontmatter and inline implementation. Which means that both

~~~
---
orphans: [
	{
		title: "Requiem",
		url: "https://www.youtube.com/watch_videos?video_ids=QUB4u8VrdF4,yX-I_2WnURA",
		thumbnail: "https://ds.static.rtbf.be/article/image/1248x702/7/9/b/479f499df3bbc0deda265b92316d362f-1645025919.jpg"
	},
	{
		title: "Lacrimosa",
		url: "https://youtu.be/k1-TrAvp_xs"
	}
]
---

...
~~~

and

~~~
---
...
---

%%
orphans:: {"title": "Requiem", "url": "https://www.youtube.com/watch_videos?video_ids=QUB4u8VrdF4,yX-I_2WnURA", "thumbnail": "https://ds.static.rtbf.be/article/image/1248x702/7/9/b/479f499df3bbc0deda265b92316d362f-1645025919.jpg"}
orphans:: {"title": "Lacrimosa", "url": "https://youtu.be/k1-TrAvp_xs"}
%%
~~~

are identical **in the context of this view**. However, for the sake of durability/future-proofing, I recommend that you write them in the frontmatter format.

PS: If you prefer the yaml block style in the frontmatter, you can use the following instead of the json based syntax shown above

~~~
---
orphans:
  -
    title: "Requiem"
    url: "https://www.youtube.com/watch_videos?video_ids=QUB4u8VrdF4,yX-I_2WnURA"
    thumbnail: "https://ds.static.rtbf.be/article/image/1248x702/7/9/b/479f499df3bbc0deda265b92316d362f-1645025919.jpg"
  - 
    title: "Lacrimosa"
    url: "https://youtu.be/k1-TrAvp_xs"
---

...
~~~

> [!WARNING]
> The indentation on the left must be made of spaces (your yaml won't be recognized if you use tabs there)


***NEW***

This view now (*almost*) treats orphans like normal files. There are three contexts in which orphans can be found:

- File Orphans
- Source Orphans
- Inferred Orphans


**File orphans** are defined in the file where the code block is written and executed. Originally, this was the only way orphans were treated and made available.

    Disabling: You can specifically disable file orphans with the `fileOrphans` value.


**Source orphans** are introduced with the new `source` view parameter. This parameter must be an array of valid dataview sources. Note that it does not consolidate duplicates, so if the sources overlap, the files in question will appear multiple times in the view.

    Disabling: You can specifically disable source orphans with the `sourceOrphans` value.


**Inferred orphans** are automatically added when querying a specific file using a filter: `{prop: "[[File]]"}`. The property in question must be defined in the `USER_FIELDS` variable located at the top of `view.js`.

    Disabling: You can specifically disable inferred orphans with the `inferredOrphans` value.

> [!IMPORTANT]
> Previously, when a view was written in a specific file, all orphans defined in that file appeared in the results regardless of the query. This behavior has changed and cannot be reverted.
>
> For example, if you have a file aggregating all rock songs and want to add orphans to it, you must tag each orphan to match your specific query.
>
> While this might seem like a step backward, it is necessary for proper querying of source orphans.
>
> Since this view cannot easily reconcile orphans with their defining file when using the source parameter, you must be exhaustive and verbose when defining orphan metadata, treating it as if it were a real file.


#### User Metadata

Besides these 7 fields, you can also use your own. By default they'll be treated as strings fields but if you wish to, you can specify to the view what their types is.

Right now, there is only two custom types available: `link` and `date`.

> [!TIP]
> To tell the view that one of your field is a link or date, you must go to the global options of the `view.js`. You'll see a variable named `USER_FIELDS` with several call to the `.set()` method below.
>
> To specify your own field, simply duplicate one line and change the first string with the name of your field and the second string with its type


### 🔘 Buttons

There is a top bar at the top right of this view that contains some buttons. Here they are:

#### The (YouTube) playlist button

When clicked on, it will create an anonymous playlist on YouTube with the first 50 YouTube links rendered in your grid. The number limitation is set by YouTube unfortunately...

There are two global constants that you can change to increase or decrease the threshold of music you will accept in your generated playlist:
- `MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST`
- `MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST`

For more explanation, look inside `view.js` directly


> [!WARNING]
> From experience, I often have problems with this button.
>
> On mobile, it sometimes doesn't create the playlist on first press. In that case, I usually close the video, come back to this view and press the button again to make it work. It's a bit tedious, but I've gotten used to it.
>
> When I use it on desktop, it works but I have to go to the open tab once for YouTube to trigger its playlist behavior. As above, I can't solve this problem but it's not really a problem since it takes 3 seconds to work around it.

#### The `+` button

When clicked on, it will create a new `Untitled.md` file at the location specified in the const variable `DEFAULT_SCORE_DIRECTORY`.

If you already have a file named `Untitled.md` there, it will report an error and do nothing.


##### Automatic insertion of fields on file creation

> [!WARNING]
> Right now this feature don't work because Metadata Menu made some breaking changes with its API and I wasn't able to keep up. I'll try to stop relying on it and use Obsidian's internal API instead.


If you have the `Metadata-Menu` plugin installed, file creation using this button will try to automate some field insertion. It will only work with classic (string) and link fields. Date fields will be ignored.

So for example if you are inside the page of an artist and try to create a new music, then the `artist` field should have its value set to the artist page you clicked the button from.

It will append every non present fields at the end of the frontmatter

Note 1: For reasons I can't explain, I have to wait quite some time (like 3 seconds) before modifying the value of any fields inside a newly created file. You can change the name of your file during that time to wait for the automation to occur

Note 2: This feature won't work if you use the advanced filter option with a custom function


#### The last cell

Same as the + button but located at the end of the grid



### ⚙️ View options / settings

#### Global

I'm not going to develop here because each const variable's name and their comments inside `view.js` are enough to understand what they do and how to modify them.

To look for them inside `view.js`, simply search for `//#region Settings`, it should be right at the top of the file. The variables in this region are easily recognizable because they are all capitalized.

> [!IMPORTANT]
> It seems obvious, but still: As Obsidian only supports the edition of markdown files by default, you'll need to do theses changes inside another app


#### Local

Similar to how `dv.view()` function accept another argument after the path to the folder containing the source, the `main` function returned by `engine.importJS` does too.

This second argument is an object that let you customize what the view does.
Here is the syntax:

````
```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	option1: "value1",
	option2: "value2",
})
```
````

And here is the list of all the options supported by this view:

| Main option | Sub options   | Type                                                                                             | Default                 | Description                                                                                                                                                                                                                   | Example                | Status |
| ----------- | ------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| **filter**  | manual        | string                                                                                           | ""                      | Defines precisely the musics you want to add without relying on tags (the parameter to enter is the name of the field in the current file that lists the musics)                                                              | "scores"               | ✅      |
|             | from          | string                                                                                           | `#🎼 AND -"_templates"` | To define a specific dvjs query instead of using the default one                                                                                                                                                              |                        | ✅      |
|             | tags          | string / string[]                                                                                | ""                      | To filter on tags                                                                                                                                                                                                             | "#song"                | ✅      |
|             | in            | string                                                                                           | ""                      | To filter on the `in` property. Only one at a time for now                                                                                                                                                                    | "[[Arcane (2021)]]"    | ✅      |
|             | artist        | string                                                                                           | ""                      | To filter on the `artist` property. Only one at a time for now                                                                                                                                                                | "[[Joe Hisaishi]]"     | ✅      |
|             | audioOnly     | boolean                                                                                          | false                   | To retrieve only music files with a non-null `audio` field. If a file has its `audio` property set to a non existing local link, this option will skip it                                                                     |                        | ✅      |
|             | release       | [Date Object](https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox#date-object) | {}                      | To define a time period (either before, after, or an interval)                                                                                                                                                                | {before: "2022-12-31"} | ✅      |
|             | current       | string                                                                                           | ""                      | It expects the name of a field containing a link to the current file you're in. (More info below). You can also pass the special `"backlinks"` string to filter on every music files that contains a link to the current file |                        | ✅      |
|             | star          | boolean                                                                                          | false                   | *Legacy*: To retrieve only musics that have been `Starred` by the user                                                                                                                                                        |                        | ❌      |
|             | bookmarks     | string                                                                                           | ""                      | To filter on musics inside a bookmark folder. It doesn't search recursively in nested folder. **Warning**: You can't filter on a folder with a `/` in its name                                                                |                        | ✅      |
| **sort**    | shuffle       | boolean / number                                                                                 | false                   | To have a random sorting of the music. If you give it a number, it will treat it as a seed and randomisation will always return the musics in the same order (as long as the queried subset remains the same)                 |                        | ✅      |
|             | recentlyAdded | boolean                                                                                          |                         | Move up to the first place the musics we have recently added (True) or the musics we have added at the very beginning (False)                                                                                                 |                        |        |
|             | manual        | string                                                                                           | ""                      | To do a simple manual sort (works the same way as its namesake in **filter**)                                                                                                                                                 | "scores"               | ✅      |
| **disable** |               | string                                                                                           |                         | To remove almost all visible features if you don't like them. You must separate the values with space. See the table below for more information on the possible values.                                                       | "autoplay addscore"    | ✅      |
##### The `current` filter

In my opinion, one of the most useful filter is the `current` one. To give you a clearer example of its use: Let's say you have a file named "Hans Zimmer.md".
Apart from that, you have a bunch of music files with the following property: `artist: "[[Hans Zimmer]]"`.
Now you want to query all of these files inside "Hans Zimmer.md". You might want to do the following:

~~~
// In file "Hans Zimmer.md"

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	filter: {
		artist: "[[Hans Zimmer]]",
	}
})
```
~~~

and it would work but there is actually a better way to do it using `current`:

~~~
// In file "Hans Zimmer.md"

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	filter: {
		current: "artist",
	}
})
```
~~~

It means the following: "Filter on every music files that contains a field named `artist` which contains a link to the current file"

It has several benefits compared to the first one:

- It's less error-prone
- It won't break the view if you decide to rename the file in which it is located
- `orphans` defined in the file will inherit the current property you are filtering on and will appear like the other queried items. Note that this feature does not apply in the context of source querying


##### The `not` filter property

Let's say you have a `voice` property that is a string. It can be any equal to any of the following: yes, no or chorus

Now you want to query only music files with 'chorus' or 'no' as their `voice` property. Here is how you can do it:

~~~
```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	filter: {
		voice: {not: "yes"},
	}
})
```
~~~

**Limitation**: The `not` property only works for `string` property right now

##### Pass a string to filter / sort

For ease of use, you can also pass a string as the `filter` and `sort` property instead of an object or a function:

| Main option | String    | Meaning                                                                                             |
| ----------- | --------- | --------------------------------------------------------------------------------------------------- |
| **filter**  | backlinks | Same as `{current: "backlinks"}`                                                                    |
| **sort**    | shuffle   | Same as `{shuffle: true}`                                                                           |
|             | random    | //                                                                                                  |
|             | filter    | Do nothing (keep the sort of the `filter` instead of doing the default ascending sort on file name) |
|             | none      | //                                                                                                  |

##### Pass a function to filter / sort (Advanced)

Instead of passing an object to `filter` or `sort` properties, you can actually pass a javascript function and do the whole filtering/sorting yourself.

- The function passed to `filter` takes a `qs` property as its single parameter. This variable is an instance of the `Query`  class defined in the `Krakor.mjs` file. You'll need to call `qs.from` or specify some pages to filter on with `qs.pages()` first to use the query service correctly. You can take a look at the class to see every methods that are already implemented and call them accordingly to your needs

- The function passed to `sort` takes a file `a` and a file `b`. You must return an integer at the end of your function just like with a regular sort function in js to determine the ordering

Example:

~~~
```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	// goated musics only
	filter: (qs) => {
		const from = '"DB/🎼"'

		const nothingButTheBest = qs.from(from)
		  .withTags("#🐐")
		  ._pages

		const noVoiceOnly = qs.from(from)
		  .withoutFieldOfValue({
			  name: 'voice',
			  value: 'yes'
		  })
		  ._pages

		qs.setPages(qs.constructor.innerJoinPages(nothingButTheBest, noVoiceOnly))
	},
})
```
~~~

##### Date Object

| Properties | Value        |
| ---------- | ------------ |
| before     | "YYYY-MM-DD" |
| after      | "YYYY-MM-DD" |


##### Disable values

| Values                      | Description                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| autoplay                    | The end of an mp3 will not launch the next one in the grid                                                   |
| audioPlayer                 | Don't show audio player for files with a valid `audio` field                                                           |
| urlIcon                     | Remove the service icon that appears on the top right of the card                                            |
| thumbnail                   | Removes the images                                                                                           |
| fileLink                    | Removes file links                                                                                           |
| addScore                    | Removes both the cell at the end that let you add new music and the + icon button inside the top row buttons |
| addScoreCell                | Removes only the cell at the end that let you add new music                                                  |
| buttons                     | Removes the top button line                                                                                  |
| timecode                    | Removes the bottom right timecode in the thumbnail                                                           |
| border                      | Removes the borders around each cell in the grid                                                             |
| query                       | Don't query pages at all (useful to show orphans only)                                                       |
| orphans                     | Doesn't show orphans                                                                                         |
| masonry                     | You'll have a default grid layout (with vertical empty space between your cards)                               |

> [!NOTE]
> The values aren't sensitive to casse

## 👀 Some examples

In the examples below:
- `in` and `artist` are both `link` fields
- `release` is a `date` field
- `label`, `instruments` and `voice` aren't specified as user fields so they're considered by the view as `string` ones

~~~
// Arcane emotional OSTs with vocals + disable the buttons and tile to add score, file names and borders

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path},
{
	filter: {
		from: '#🎼 AND -"_templates"',
		in: "[[Arcane (2021)]]",
		label: 'emotional',
		voice: 'yes',
	},
	disable: "addScore timecode",
})
```
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/ae458c22-360e-4b8d-932b-586ad8cef9ac)

---

~~~
// OSTs from Professor Layton's games

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path},
{
	filter: {
		in: 'Professor Layton'
	},
})
```
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/766605ad-ac8c-4035-8d20-996f3892d9a6)

_You've specified above that `in` was a `link` field so that means that value should be wrapped with `[[]]` right?_

Yes but i've decided that when ommited, the value act as a regex.

So in this example, it will retrieve every musics with a `in` field that contains a `link` (or a string) that contains "Professor Layton" in its name

---

~~~
// Musics with saxophones + shuffle the order

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	filter: {instruments: "🎷"},
	sort: {shuffle: true}
})
```
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/fc90fe8b-2890-4a48-b982-31f31dd4087c)

---

~~~
// Inside "Vinland Saga.md"
// Every OST in the order specified in a property with minimal display

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	filter: {current: "in"},
	sort: {manual: "ost"},
	disable: "addScore timecode filelink border masonry",
})
```

%%
ost:: [[Small Village]]
ost:: [[Utopia]]
ost:: [[Normanni]]
ost:: [[Savage Wind]]
ost:: [[Tide]]
ost:: [[Still Blade]]
ost:: [[Battleground]]
ost:: [[Flashpoint]]
ost:: [[Awaken]]
ost:: [[Dead End]]
ost:: [[Somewhere Else]]
ost:: [[The Real Warrior Ahead of the Road]]
ost:: [[End of the Prologue]]
%%
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/edd05cbf-2ed6-419a-9db4-bda3df4232f4)

Note that I've disabled the masonry layout because it messes a bit (or a lot depending of the height differences between your thumbnails) with the order of the sort

---

~~~
// Sting's songs released in the 80s + sort by firstly released

```js-engine
const path = `_js/_views/jukebox/view.js`
const { main } = await engine.importJs(path)

main({...this, path}, {
	filter: {
		artist: "[[Sting]]",
		release: {
			after: "1979-12-31",
			before: "1990-01-01",
		}
	},
	sort: {
		recentlyReleased: false
	},
	disable: "buttons addscore"
})
```
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/95c1fd2a-b77f-4141-a38e-5c9b3cf52358)

Note 1: I know there should be a lot more music from Sting in this time span but these are just the one I've put in my vault for now ^^'

Note 2: Albeit `Every Breath You Take` is a song by `The Police`, I've added Sting to the artist property so that it comes up when searching for his songs.


## ❓ Some questions you might ask

***Why didn't you build a plugin instead?***

Great question!

As I said, it all started when I discovered the Obsidian-task-calendar view and was amazed. Although I didn't think I could create a plugin at the time, I knew it was possible to use it as inspiration to create my own view.

However, I think that at some point it would probably have been better for me to go down the plugin route.

Though at the moment, I'm a bit torn about doing this.
On the one hand, I know it would allow the BRAT plugin to work transparently with this view and increase the likelihood of someone using it, but it would mean rewriting most of it...
On the other hand, it would add yet another plugin to the vault and I personally prefer to have as few plugins as possible because the more you have, the more it tends to slow down the opening of your vault. Also we're talking about a simple view that displays a grid in your vault, I find it overkill to build a plugin for that

Inside me, I'm hoping that someone build a kind of store / BRAT-like but for js views.


***Why isn't it reactive like a dataview(js) code block?***

Dataview has a feature called `Automatic View Refresh` in its settings. The default value is 2500ms. It's this setting that permit each code blocks to keep up to date with your vault data. In addition, each time you modify and save a file, it triggers a certain dataview event, which may result in a new rendering of each open view.

Js-Engine doesn't have any of that because it is unopinionated. It do have reactive capabilities but they aren't enabled by default. I could theoretically make it reactive to any changes in your vault but the performance would be abysmal.

Why is this? Well, every time one of your files is saved by Obsidian, each open view would need to redo their query (which is usually the longest part to compute compared to the rest) and re-render everything if the result has changed. It's very inefficient but I have no choice (afaik) because the event (`dataview:metadata-change` in this case) sent by Dataview to tell me that a change has occurred doesn't contain much information apart from which file has been impacted. I don't have access to the diff and certainly don't want to track it for each view.


***Why doesn't it support playing YouTube links directly in the view?***

Unfortunately, this is far from trivial. We can't retrieve a YouTube stream easily from a url. At the moment, the only plugin I know of that manages to do this is [Media Extended](https://github.com/pkm-er/media-extended).

I don't intend to try and implement that here, it's well outside the scope of this view.



***How can I contribute?***

The way I've written this view doesn't really take external contribution under consideration. It's really not as straightforward as with a proper plugin. Right now, I'd say the best thing is to open an issue and suggest improvements.



## 🔮 Future

### Datacore

I will eventually port this view to be compatible with [Datacore](https://github.com/blacksmithgu/datacore) (at least it's querying API) when it is released, but it will highly depend on how mature the early versions are and what features it unlocks if I decide to switch to its new React API.

As for the performance improvement promised by the [readme](https://github.com/blacksmithgu/datacore#datacore), it will definitely not be as significant on this view, given how fast it already runs, even when querying thousands of files.

### Better settings / Utility plugin

Right now, the settings are directly written inside the source code of the view. I know it's far from ideal so I've been thinking about building a plugin with the sole responsibility of managing views settings. It would solve two problems:

- You would easily upgrade the view by replacing the old `view.js` with the updated one without losing your settings
- It would let you set the settings directly from Obsidian's ui (just like a regular plugin) so any view could provide a form of validation on their settings

> On reflection, a good alternative would be to have a separate yaml file containing just the global settings. But that would mean that this view would have to track versions of this file and I'm not sure I want to do that either.

## 🙏 Acknowledgements

This view was made possible thanks to these different resources:

### Logic

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview)
- [JS Engine](https://github.com/mProjectsCode/obsidian-js-engine-plugin)
- [702573N's Obsidian-Tasks-Calendar](https://github.com/702573N/Obsidian-Tasks-Calendar)
	- It helped me figure out how to format my js and css at the beginning

### Styling

- [Kepano's minimal card snippet](https://forum.obsidian.md/t/snippet-so-you-can-use-dataview-cards-from-minimal-theme-in-any-theme/56866)
	- Most of the css I have is directly inspired by Kepano’s minimal card snippet

- [vikramsoni's Masonry layout implementation](https://codepen.io/vikramsoni/pen/gOvOKNz)
