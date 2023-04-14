
# Obsidian Jukebox

A custom view built with [Obsidian-Dataview](https://github.com/blacksmithgu/obsidian-dataview) to show markdown musics files from your vault within a customisable grid view

![](https://user-images.githubusercontent.com/24924824/232079357-dc71dc66-14d1-476e-b8f4-549618b60df0.png)

## 🎼 Features

In this readme, when I mention `music file`, I'm talking about a markdown file with custom (manually defined) metadata.

Here are the overarching principles of how this view works:

- You can filter your music files according to their metadata (url, artist, media, genre, instruments, mp3 file, custom tags, ...).
- The filters are **static**, you can't switch them without re-rendering the view
- You can tap a card to open the youtube video (or any other streaming service) associated with it.
	- On *Desktop*, it will open it in your default browser (or in a Surfing tab if you have the plugin installed)
	- On *Mobile*, it will open in the application if you have it installed (or open it in your default browser)
- Files with a mp3 tag get rendered with a minimal player (simple play/pause button and a timeline)
- Almost all visual elements can be disabled at the global level or per code block (check `disable` property)
- Since its a dvjs view and not a plugin, there aren't any settings page but there is a `Settings` region at the beginning of the `view.js`. Each option is capitalized and contains a comment above that explains what they do. You can change their value if needed (note: it will affect every occurence of this view obviously)



## 🚩 Warning / Known caveats

This custom view both supports mp3 (also every other audio files supported by Obsidian) and url links inside your markdown music file but there are some caveats to have in mind:

- The **mp3** user experience on **Android** is not reliable 😞:
	- Some (if not most) mp3 don't load at all (i've opened an [issue on Obsidian Forums](https://forum.obsidian.md/t/bug-audio-files-fail-to-load-randomly-on-android/49684) about it):
		- Those either play until the end but don't trigger the autoplay
		- Or stop playing before the end
		- Edit: thanks to this : https://github.com/Majed6/android-audio-fixer, I've managed to decrease the likeliness of mp3 files having problem, but it still happens randomly...
	- If you set an .mp4 as the source of the audio, besides sharing the same problem as above, you also can't lock your phone / switch app or the music will pause
	- Audios aren't recognized by the phone's system (you can't pause them with your headset for example)

- **Timelines** are mostly a gimmick:
	- What I mean is that they're useful to know at a glance the progress of the music, but the timecode does not update and it can be difficult to change its position, especially on mobile

- The url links support has been built with **Youtube links** in mind:
	- You can still add any other web links to your markdown music file (soundcloud, dailymotion, ...) but you will not benefit from the youtube auto playlist feature while doing so.

- If you are listening to mp3 files and modifiying your vault at the same time then you'll want to remove the **auto refresh of Dataview** or else it will reset the music everytime dv refreshes

-  If you have scrolled far enough inside a page and a lot of musics have been rendered (> 200) and you decide to switch to another tab, then you may experience a screen freeze for few seconds when switching back to this tab (This phenomenon was only really experienced on my Android phone)

## 🎯 Motivations

The three main reasons why i've started building this are:

- **I can't trust any music service** to store indefinitly all the music i listen (especially Youtube)
	Why? Because it can decide for any specific reason (copyright claim most of the time) to delete any music i've added to one of my playlist without warning

- I want musics **to populate "playlists" on the fly** (based on custom metadata) without me having to manually insert them inside (while still having the ability to do so).
	imho the traditional playlist system main flaw is exactly that: It doesn't take into account that the human brain connects musics together in a variety of ways and not just by artist, genre or album.

- I want to put all the music I listen to **on a unified platform accessible on all my devices**.
	It's not my top reason but i find it very cool to have soundcloud and other external service musics next to my regular youtube links

N.B.
If you do not recognize yourself in neither of these statements, then I am happy for you: Traditional music services answer your needs and that's great. You don't need to read any further. Have a good day!


## 📜 Story

I'm a huge anime and video game music enjoyer. Unfortunatly, traditional music services don't have the best catalog when it comes to this. So until now, i've been managing my music inside Youtube since it has the biggest number of music available overall.

It worked great for a long time. Some music used to get striked once in a while but it wasn't a big deal. Then one day, Youtube decided that the striked/unavailable videos should be hidden immediatly for the end user, that way, they couldn't have a clue (except if they remembered their playlist by heart) what the video was. For me it was the straw that broke the camel's back: I had to find a solution.

Around the same time, i've discovered Notion and the PKM world in general. For several months, I've built and progressively upgraded a music database system on Notion. It was definitly not the best tool for the job but I was really satisfied with it. Unfortunatly at some point, it became a burden to use and manage because of Notion's online-only strategy... The whole database was sluggish and difficult to populate but I forced myself to keep using it nonetheless.

Then I've heard about Obsidian. The local / non-proprietary aspect of the app charmed me but i wasn't sure it could fix my problem. But that was before I learned about the plugin ecosystem (Dataview in particular) and at that point i was convinced it could answer my very specific needs.

But i didn't know where to start because imo, a plugin would be too overkill for what i needed to have (and i'm way too lazy to learn how to make one). As i thought my journey with Obsidian was over, I've stumbled accross this fantastic [repository](https://github.com/702573N/Obsidian-Tasks-Calendar) and it opened my eyes: I just needed to use dataview's view with some custom css.


## 🎧 Usage

### 🏗️ Setup

**Plugins required**

- `Dataview` with javascript codeblock support enabled
- `CustomJs` (it is very lightweight)


**Plugins highly recommanded (but not required)**

- Metadata Menu
>You'll be able to click on the icon for each music to instantly access their metadata instead of going in the file. Fantastic to quickly jump to an artist or a media link (especially on mobile)

- Templater
>You could set a default music template on file created inside the default score directory after clicking on the `+` button

- Surfing (*Desktop only*)
> Very helpful because it will open the music link directly inside Obsidian. Combined with YT Premium it transform your vault into a real music player

- Force Note View Mode
> Simple but very convenient to automatically switch to reading mode. That way you don't have to scroll the yaml frontmatter if it is too big


> [!NOTE] You won't find a tutorial on how to configure these optional plugins below
> This section is just here to give some insights

---

#### Dataview

So to use this dataviewjs view, you need to get the `view.js` and `view.css` files and put them in a common folder where they are the only ones called that. You can't change their names because `dv.view` looks for these 2 files specifically in the path you specify.

My advice is to have a common folder where you put all your `.js` files. (Personally I have one at the root which I have called `_js`)
And in this folder, we create a subfolder with a distinct name relatively clear on the content of what the js generates (here I called it `jukebox`)

So I have an architecture that looks like this:

```
🗃️ My vault
┣━ 📂 _js
┃  ┗━ 📂 jukebox
┃     ┣━ 📄 view.js
┃     ┗━ 📄 view.css
┃
... (rest of my vault)
```


#### CustomJS

In addition to this folder containing the two files, you need to copy the `query.js` at the root of this repository and place it in a folder in your vault (I recommend the same `_js` folder).

Then you'll have to go into the CustomJs plugin settings to designate the `query.js` file as compatible.


So in the end, my complete architecture looks like this:
```
🗃️ My vault
┣━ 📂 _js
┃  ┣━ 📂 jukebox
┃  ┃  ┣━ 📄 view.js
┃  ┃  ┗━ 📄 view.css
┃  ┗━ 📄 query.js
┃
... (rest of my vault)
```


> [!WARNING] If you had CustomJs already installed, read the following
> *The following issues are very unlikely to happen but still*
> 
> If you already have a js file used with CustomJs and that it appeared it already define the class `CustomJs` inside then you have two options:
> 
> - 1st option (The merge one) 👉 Instead of putting the query.js inside your vault, only copy the `Query = class` part and put it inside your already existing file defining the class CustomJs
> 
> Then if it appears (it's even less likely) that you already defined the Query class inside your file, then you'll need to modify the name of the one you've copied and set the `DEFAULT_QUERY_CLASS` inside `view.js` according to the name you gave it
> 
>
> - 2nd option (The lazy one) 👉 Simply rename the `DataviewJS` class to something that you've not defined in any of your custom js files then change the `DEFAULT_CUSTOMJS_CLASS`  value to the name you've set

	
#### Global Settings

You'll probably want to tweak the default settings inside the `view.js` to fully configure the view, but apart from that, you're all setup !

### The one-liner

If you correctly followed every steps described in the above section, you should be able to write the following codeblock inside one of your markdown file

~~~
```dataviewjs
await dv.view("_js/jukebox")
```
~~~

this codeblock is gonna render a grid of all the files marked as music inside your vault. i.e. every markdown files containing the tag `#🎼`. It's the default behavior but you can change it (see [here](https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox#global))


#### Metadata

As stated earlier, each music file can have a variety of metadata. Right now, there are certain metadata that are handled specially by this view, others that you can define with a specific type and the rest that are considered as strings.

> [!NOTE] If you have doubt on how to define your metadata, read the following...
> 
>You can define your metadata either in the yaml frontmatter or as dataview inline fields in your file. This means that both `field: value` (inside frontmatter) and `field:: value` are perfectly valid and understood in the context of this view
>
>Though considering links aren't correctly handled when set in the frontmatter, i'd suggest to define them as inline fields
>I also define my url key as inline field because the url isn't clickable when set in the frontmatter
>For the rest, I define everything inside the frontmatter

##### Special Metadata

There are currently 6 fields that have a special meaning inside this view:

|   Name    |                                                       Description                                                        |Example|
|:---------:|:------------------------------------------------------------------------------------------------------------------------:|:----------------------------------------------------------------------------------------------:|
|   title   | It serves as an alias. If set, it will replace the default name of the file in the grid (used by default for `orphans`)  |"Shorter name"|
| thumbnail |The music image. Can be three different values: a string, an url (embedded or not) or a filelink (embedded or not)|https://example.com/my-image.jpg OR `![](https://example.com/my-image.jpg)` OR `![[my-image.jpg]]`|
|    mp3    |                               It can be any audio file recognized by Obsidian (even video)                               |`![[my-audio.mp3]]`|
|    url    |                      The url to the music. It can be anything but youtube links have extra supports                      |https://youtu.be/dQw4w9WgXcQ|
|  length   | The length of the music. It is displayed at the bottom right just like on Youtube. (Only 00:00 or 00:00:00 is supported) |                                            01:30:04                                            |
|  volume   |The volume offset to apply to the audio file when playing it|-0.1|

*Note that all these fields name can be modified in the global options of the view.js. To do so, check the const variables ending with `_FIELD`*

Actually there is also the `voice` property that has a special meaning right now but I planned to remove it soon...

##### Custom Metadata

Besides these 6 fields, you can obviously use your own. By default they'll be treated as strings fields but if you wish to, you can specify to the view what their types is.

Right now, there is only two custom types available: `link` and `date`. To tell the view that one of your field is a link or date, you must go to the global options of the `view.js` just above the variables mentionned above. You'll see a variable named `CUSTOM_FIELDS` with several call to the `.set()` method below.
To specify your own field, simply duplicate one line below and change the first string with the name of your field and the second string with its type


### View options / settings

#### Global

I'm not going to develop here because each const variable's name and their comments inside `view.js` are enough to understand what they do and how to modify them.

To look for them inside `view.js`, simply search for `//#region Settings`. The variables in this region are easily recognizable because they are all capitalized


#### Local

The `dv.view()` function accept another argument after the path to the folder containing the sources.

This second argument is an object passed to the view that let you customize what it does.
Here is the syntax:

````
```dataviewjs
await dv.view("_js/jukebox", {
	option1: "value1",
	option2: "value2"
})
```
````

And here is the list of all the properties supported by this view:

| Main option | Sub options   | Type             | Default                                        |Description| Exemple                | Status                           |
| ----------- | ------------- | ---------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------- |
| **filter**  | manual        | string           | ""                                             |Defines precisely the musics you want to add without relying on tags (the parameter to enter is the name of the field in the current file that lists the musics)|"scores"| ✅                               |
|             | from          | string           | `#🎼 AND -"_templates"`                        |To define a specific dvjs query instead of using the default one|  | ✅                               |
|             | tags          |string / string[]|"" |To filter on tags|"#song"|✅|
|             |in| string           |""|To filter on the `in` property. Only one at a time for now | "[[Arcane (2021)]]"    |✅|
|             |artist| string           | ""                                             |To filter on the `artist` property. Only one at a time for now|"[[Joe Hisaishi]]"|✅|
|             | voice         | object           | {yes: true, chorus: true, few: true, no; true} |  |                        | ✅                               |
|             | mp3Only       |boolean| false                                          |To get only the music with a non-null `mp3` field|                        | ✅                               |
|             | release       |[Date Object](https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox#date-object)| {}                                             |To define a time period (either before, after, or an interval)| {before: "2022-12-31"} |✅|
|             |current| string           | ""                                             |It expects the name of a field containing a link to the current file you're in. (More info in the text below this array). You can also pass the special `"backlinks"` string to filter on every music files that contains a link to the current file|  |✅|
|             | star          | boolean          | false                                          |To retrieve only musics that have been `Starred` by the user |                        |✅|
| **sort**    | shuffle       | boolean          | false                                          |To have a random sorting of the music|  | ✅                               |
|             | recentlyAdded | boolean          |                                                |Move up to the first place the musics we have recently added (True) or the musics we have added at the very beginning (False)|                        |                                  |
|             | manual        | string           | ""                                             |To do a simple manual sort (works the same way as its namesake in **filter**)| "scores"               | ✅                               |
| **disable** |               | string           |                                                |To remove almost all visible features if you don't like them. You must separate the values with space. See the table below for more information on the possible values.| "autoplay addscore"    | ✅                               |

In my opinion, the most important filter is the `current` one. To give you a clearer example of how to use it: Let's say you have a file named "Hans Zimmer.md".
Apart from that, you have a bunch of music.md files with the following property: `artist: [[Hans Zimmer]]`.
Now you want to query all of these file inside your file "Hans Zimmer.md". You might want to do the following:

~~~
// In file "Hans Zimmer.md"

```dataviewjs
await dv.view("_js/jukebox", {
	filter: {
		artist: "[[Hans Zimmer]]",
	}
})
```
~~~

and it would work but there is actually a better way to do it using `current`:

~~~
// In file "Hans Zimmer.md"

```dataviewjs
await dv.view("_js/jukebox", {
	filter: {
		current: "artist",
	}
})
```
~~~

It means the following: "Filter on every music.md files that contains a field named `artist` which contains a link to the current file"


##### Advanced use case for filter and sort

Instead of passing an object to `filter` or `sort` properties, you can actually pass a javascript function and do the whole filtering/sorting yourself.

- The function passed to `filter` takes a `qs` property as its single parameter. This variable is an instance of the query service defined in the query.js file. You'll need to call `qs.from` or specify some pages to filter on with `qs.pages()` first to use the query service correctly. You can take a look inside query.js to see every methods that are already implemented and call them accordingly to your needs
- The function passed to `sort` takes `a` file a and file `b`. You must return an integer at the end of your function just like with a regular sort function in js to determine the ordering 


##### Date Object

| Properties | Value        | Done |
| ---------- | ------------ | ---- |
| before     | "YYYY-MM-DD" | ✅   |
| after      | "YYYY-MM-DD" | ✅   |


##### Disable values

| String accepté dans disable | Description                                                                                                              | Status |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| autoplay                    | The end of an mp3 will not launch the next one in the grid                                                               | ✅     |
| audioPlayer                 | Don't show audio player for files with audio field                                                                       | ✅     |
| urlIcon                     | Remove the service icon that appears on the top right of the card                                                        | ✅     |
| thumbnail                   | Removes the images                                                                                                       | ✅     |
| fileLink                    | Removes file links                                                                                                       | ✅     |
| addScore                    | Removes the cell at the end that let you add new music<br>*NEW*: It removes the + icon button inside the top row buttons | ✅     |
| buttons                     | Removes the top button line                                                                                              | ✅     |
| timecode                    | Removes the bottom right timecode in the thumbnail                                                                       | ✅     |
| border                      | Removes the borders around each cell in the grid                                                                         | ✅     |
| query                       | Don't query pages at all (useful to show orphans only)                                                                   | ✅     |
| orphans                     | Doesn't show orphans                                                                                                     | ✅     |

*Note: The values aren't sensitive to casse*

### Some Examples

In the examples below:
- `in` and `artist` are both `link` fields
- `release` is a `date` field
- `label` and `instruments` aren't specified as custom fields so they're considered by the view as `string` ones
- `voice` is a special field right now but I intend to remove it in future commits (or at least change its internal implementation so it become a default custom field like `in` or `release`)

~~~
// Arcane emotional OSTs with vocals + disable the buttons and tile to add score, file names and borders

```dataviewjs
await dv.view("_js/jukebox",
{
	filter: {
		from: '#🎼 AND -"_templates"',
		in: "[[Arcane (2021)]]"
		label: 'emotional',
		voice: {yes: true}
	},
	disable: "addScore filelink border"
})
```
~~~

---

~~~
// OSTs from Professor Layton's games

```dataviewjs
await dv.view("_js/jukebox",
{
	filter: {
		in: "Professor Layton"
	}
})
```
~~~

_I've specified above that `in` was a `link` field so that means that value should be wrapped with `[[]]` right?_

Well i've decided that when ommited, the value act as a regex.

So in this example, it will retrieve every musics with a `in` field that contains a `link` (or a string) that contains "Professor Layton" in its name

---

~~~
// Musics with saxophones + shuffle the order

```dataviewjs
await dv.view("_js/jukebox", {
	filter: {instruments: "🎷"},
	sort: {shuffle: true}
})
```
~~~

---

~~~
// Sting's songs released in the 80s + sort by firstly released

```dataviewjs
await dv.view("_js/jukebox", {
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
})
```
~~~


### 🐥 Orphans

In fact, I lied to you when I said there were only 6 fields specifically managed by this view. There is a 7th one called `orphans`. Basically, it allows you to define a complete music file but using a property instead of a file.

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

are identical **in the context of this view**. However, for the sake of durability/future-proofing, I recommend that you write them in the "frontmatter" format.

You can add any fields you want in the orphan definition, but there is one important thing to keep in mind: Orphans are only accessible in the file in which they are defined. (This may change in the future)


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

Note that the indentation on the left must be made of spaces (your yaml won't be recognized if you use tabs there)


## 🔮 Future

### Datacore

I will eventually port this view to be compatible with Datacore when it is released, but it will highly depend on how mature the early versions are and what features it unlocks if I decide to switch to its new React API.

As for the performance improvement promised by the [readme](https://github.com/blacksmithgu/datacore#datacore), I doubt it will have any significative impact on this view, given how fast it already runs, even when querying thousands of files.


## 🙏 Acknowledgements

This dvjs view was made possible thanks to these different ressources:

### Logic

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview)
	- I don't need to explain why. Without it i wouldn't even have used Obsidian in the first place so...
- [702573N's Obsidian-Tasks-Calendar](https://github.com/702573N/Obsidian-Tasks-Calendar)
	- It greatly helped me understand how to format my view.js and view.css
- [CustomJs](https://github.com/saml-dev/obsidian-custom-js)
	- Fantastic plugin that let me isolate the dvjs query logic in its own file for easier use later on


### Styling

- [Kepano's minimal card](https://github.com/kepano/obsidian-minimal/blob/master/Minimal.css#L1647-L1889)

- [Dataview table as cards](https://obsidian-snippets.pages.dev/snippets/dataview-table-as-cards/)
	- It isn't used in the final product but it helped me understand better the HTML DOM constructed by dataview's custom functions
