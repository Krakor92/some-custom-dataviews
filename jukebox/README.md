
# Obsidian Jukebox

A custom view built with [Obsidian-Dataview](https://github.com/blacksmithgu/obsidian-dataview) to show markdown musics files from your vault within a customisable grid view

![](https://user-images.githubusercontent.com/24924824/232079357-dc71dc66-14d1-476e-b8f4-549618b60df0.png)

## 🎼 What to expect from this view

> [!IMPORTANT]
> Each time I mention `music file`, I'm talking about a local markdown file with custom (manually defined) metadata.

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

- Since its a dvjs view and not a plugin, there aren't any settings page but there is a `Settings` region at the beginning of the `view.js`. Each option is capitalized and contains a comment above that explains what they do. You can change their value if needed (note: it will affect every occurrence of this view obviously)

- The initial setup to make this view work can be a bit daunting, especially if you're not familiar at all with the Obsidian ecosystem or javascript syntax but I've tried my best to explain every step with enough amount of details so that anyone could follow


## 🚩 Some known caveats

> [!CAUTION]
> Despite all the points raised above, there are a number of warnings to bear in mind. Here they are listed in descending order of inconvenience (in my opinion):

- This view and Dataview's **Automatic View Refreshing** aren't really compatible 😕. For example, if you are listening to audio files while modifying your vault, it will reset the music every time dv refreshes... There are no workaround around that unfortunately. That's one of the few things I really hope Datacore will fix

- The **audio player** user experience on *Android* is not reliable 😞:
	- Some (if not most) audio files don't load at all (i've opened an [issue on Obsidian Forums](https://forum.obsidian.md/t/bug-audio-files-fail-to-load-randomly-on-android/49684) about it):
		- Those either play until the end but don't trigger the autoplay
		- Or stop playing before the end
		- Edit: thanks to this : https://github.com/Majed6/android-audio-fixer, I've managed to decrease the likeliness of audio files having problem, but it still happens randomly...
	- If you set a video as the source of the audio, besides sharing the same problem as above, you also can't lock your phone / switch app or the music will pause
	- Audios aren't recognized by the phone's system (you can't pause them with your headset for example)

- The url links support has been built with **YouTube links** in mind:
	- You can still add any other web links to your markdown music file (soundcloud, dailymotion, ...) but you will not benefit from the YouTube auto playlist feature while doing so

- **Timelines** are mostly a gimmick:
	- What I mean is that they're useful to know at a glance the progress of the music, but the time code does not update and it can be difficult to change its position, especially on mobile

- If you have scrolled far enough inside a page and a lot of musics have been rendered (> 200) and you decide to **switch to another tab**, then you may experience a screen freeze for few seconds when switching back to this tab (This phenomenon was only really experienced on my Android phone)

> [!TIP]
> Using [stack tabs](https://help.obsidian.md/User+interface/Tabs#Stack+tab+groups) can help as it keeps the view in memory


- [It's an already known phenomenon](https://forum.obsidian.md/t/audio-stops-while-scrolling/7966) but **scrolling too far deep** in the file where this view sit (or up depending on where the codeblock is positioned) will pause the music if it's played by an audio player inside a card. It's because of Obsidian's infinite scrolling strategy. Basically, the output of this view is removed from the DOM when you've scrolled too far from it

- Compared to traditional plugins, this view **can't tell you if it can be updated** + it's not as convenient to update unfortunately


## 🎯 Motivations

The three main reasons why I've started building this are:

- **I can't trust any music service** to store indefinitly all the music i listen (especially YouTube)
	Why? Because it can decide for any specific reason (copyright claim most of the time) to delete any music I've added to one of my playlist without warning

- I want musics **to populate "playlists" on the fly** (based on custom metadata) without me having to manually insert them inside (while still having the ability to do so).
	IMHO the traditional playlist system main flaw is exactly that: It doesn't take into account that the human brain connects musics together in a variety of ways and not just by artist, genre or album.

- I want to put all the music I listen to **on a unified platform accessible on all my devices**.
	It's not my top reason but i find it very cool to have soundcloud and other external service musics next to my regular youtube links

*N.B.*
If you do not recognize yourself in neither of these statements, then I am happy for you: Traditional music services answer your needs and that's great. You don't need to read any further. Have a good day!


## 📜 Story

I'm a huge anime and video game music enjoyer. Unfortunately, traditional music services don't have the best catalog when it comes to this. So until now, i've been managing my music inside YouTube since it has the biggest number of music available overall.

It worked great for a long time. Some music used to get striked once in a while but it wasn't a big deal. Then one day, YouTube decided that the striked/unavailable videos should be hidden immediately from the end user. That way, they wouldn't have a clue (unless they remembered their playlist by heart) what the video was. For me it was the straw that broke the camel's back: I HAD to find a solution.

Around the same time, i've discovered Notion and the PKM world in general. For several months, I've built and progressively upgraded a music database system on Notion. It was definitly not the best tool for the job but I was really satisfied with it. Unfortunately at some point, it became a burden to use and manage because of Notion's online-only strategy... The whole database was sluggish and difficult to populate but I forced myself to keep using it nonetheless.

Then I've heard about Obsidian. The local / non-proprietary aspect of the app charmed me but i wasn't sure it could fix my problem. But that was before I learned about the plugin ecosystem (Dataview in particular) and at that point i was convinced it could answer my very specific needs.

But i didn't know where to start because imo, a plugin would be too overkill for what i needed to have (and i'm way too lazy to learn how to make one). As i thought my journey with Obsidian was over, I've stumbled accross this fantastic [repository](https://github.com/702573N/Obsidian-Tasks-Calendar) and it opened my eyes: I just needed to use dataview's view with some custom css.


## 🎧 How to use it

### 🏗️ Setup

**Plugins required**

- `Dataview` with javascript codeblock support enabled
- `CustomJs` (it is very lightweight)


**Plugins highly recommanded (but not required)**

- Metadata Menu
> To put a music icon next to each music link to instantly access their metadata instead of going in the file. Fantastic to quickly jump to an artist or a media link (especially on mobile)

- Templater
> To set a default music template on file created inside the default score directory after clicking on the `+` button

- Surfing (*Desktop only*)
> Very helpful because it will open the music link directly inside Obsidian. Unfortunately it doesn't supports web extension yet (so no ad-blocker...). However if you have a premium subscription to the platform from which your url links come from (YT Premium in my case), this can turn your vault into a music player

- Force Note View Mode
> Simple but very convenient to automatically switch to reading mode. That way you don't have to scroll the yaml frontmatter if it is too big


> [!NOTE]
> You won't find a tutorial on how to configure these optional plugins below.
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

In addition to this folder containing the two files, you need to copy the `Krakor.js` at the root of this repository and place it in a folder in your vault (I recommend the same `_js` folder).

Then you'll have to go into the CustomJs plugin settings to designate the `Krakor.js` file as compatible.


So in the end, my complete architecture looks like this:
```
🗃️ My vault
┣━ 📂 _js
┃  ┣━ 📂 jukebox
┃  ┃  ┣━ 📄 view.js
┃  ┃  ┗━ 📄 view.css
┃  ┗━ 📄 Krakor.js
┃
... (rest of my vault)
```

#### Global Settings

You'll probably want to tweak the default settings inside the `view.js` to fully configure the view, but apart from that, you're all setup !

### ✍️ The one-liner

If you correctly followed every steps described in the above section, you should be able to write the following codeblock inside one of your markdown file

~~~
```dataviewjs
await dv.view("_js/jukebox")
```
~~~

this codeblock is gonna render a grid of all the files marked as music inside your vault. i.e. every markdown files containing the tag `#🎼`. It's the default behavior but you can change it (see [here](https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox#global))


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
>Now that this problem no longer exists, I encourage everyone to put everything in the frontmatter and, if necessary, use [Meta Bind](https://github.com/mProjectsCode/obsidian-meta-bind-plugin) to interact with the property inside the body of the file.

#### Special Metadata

There are currently 6 fields that have a special meaning inside this view:

|     Name      |                                                       Description                                                        |                                              Example                                               |
|:-------------:|:------------------------------------------------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------------------------:|
|   **title**   | It serves as an alias. If set, it will replace the default name of the file in the grid (used by default for `orphans`)  |                                           "Shorter name"                                           |
| **thumbnail** |    The music image. Can be three different values: a string, an url (embedded or not) or a filelink (embedded or not)    | https://example.com/my-image.jpg OR `![](https://example.com/my-image.jpg)` OR `![[my-image.jpg]]` |
|    **audio**	    |           It can be any audio file recognized by Obsidian (even video) or an url pointing to a valid resource            |                       `![[my-audio.mp3]]` OR `https://example.com/audio.mp4`                       |
|    **url**    |                      The url to the music. It can be anything but youtube links have extra supports. *Warning*: the url shouldn't point to a file directly. If that's the case, use **audio** instead                      |                                    https://youtu.be/dQw4w9WgXcQ                                    |
|  **length**   | The length of the music. It is displayed at the bottom right just like on YouTube. (Only 00:00 or 00:00:00 is supported) |                                              01:30:04                                              |
|  **volume**   |                               The volume offset to apply to the audio file when playing it                               |                                                -0.1                                                |


> [!TIP]
> All these fields name can be modified in the global options of the `view.js`. To do so, check the const variables ending with `_FIELD`


Here are **some precisions** and special effects to keep in mind while using some of these metadata:

##### Url

- If you have a file with a *youtube* or *dailymotion* link as its `url` then you'll have a thumbnail appearing by default in the jukebox when querying this file
	- Other services aren't supported because there isn't a standardized way to retrieve their thumbnail from a video url (if you find one feel free to open an issue regarding that)

- `https://www.youtube.com/watch_videos?video_ids=id1,id2,...` urls are correctly recognized by this view. However, you won't have the default thumbnail behavior specified above if you use it

##### Thumbnail

- To have a more compact feel on mobile (regarding squared album covers), I've set a max height for thumbnail images. Its value is set in the `view.css` at the top, the variable is named `--jukebox-cards-image-height`. You can adjust its value if you don't like this behavior.
	- By default the image will be centered in its container but you change that by prefixing a value between 0 and 1 to adjust the position (0.5 is the default).

![thumbnail cropping example](https://user-images.githubusercontent.com/24924824/236331752-16b97ea7-91d9-4d57-b64c-bd8acec02b76.png)

If you are embedding your image in your `thumbnail` property like so: `thumbnail:: ![400](...)` then this view will interpret the 400 inside the square brackets as a 1 in this context so the image will be positioned at the bottom. To bypass this annoyance, you could add a `0.5` on the left like so: `thumbnail:: ![0.5|400](...)`: You'll keep the 400px size for your embed and the thumbnail will be centered accordingly

Note: The exact same method and workaround can be used for the wikilinks syntax (`thumbnail:: ![[my-image.jpg|0.5|400]]`) 

- The file:/// URI scheme is recognized by this view, this means that you can set an image from outside your vault as a thumbnail since Obsidian accept it.
	- Both file:///link/to/thumbnail.jpg and `[alt](file:///link/to/thumbnail.jpg)` are valid


#### User Metadata

Besides these 6 fields, you can obviously use your own. By default they'll be treated as strings fields but if you wish to, you can specify to the view what their types is.

Right now, there is only two custom types available: `link` and `date`.

> [!TIP]
> To tell the view that one of your field is a link or date, you must go to the global options of the `view.js`. You'll see a variable named `USER_FIELDS` with several call to the `.set()` method below.
> 
> To specify your own field, simply duplicate one line and change the first string with the name of your field and the second string with its type


### 🔘 Buttons

There is a top bar at the top right of this view that contains some buttons. Here they are:

#### The (YouTube) playlist button

When clicked on, it will create an anonymous playlist on youtube with the first 50 youtube links rendered in your grid. The number limitation is set by YouTube unfortunately...

There are two global constants that you can change to increase or decrease the threshold of music you will accept in your generated playlist. The first one is `MAX_T_ACCEPTED_TO_BE_PART_OF_PLAYLIST` and the second is `MAX_LENGTH_ACCEPTED_TO_BE_PART_OF_PLAYLIST`. For more explanation, look inside `view.js`


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

To look for them inside `view.js`, simply search for `//#region Settings`. The variables in this region are easily recognizable because they are all capitalized


#### Local

The `dv.view()` function accept another argument after the path to the folder containing the sources.

This second argument is an object that let you customize what the view does.
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

| Main option | Sub options   | Type                                                                                             | Default                 | Description                                                                                                                                                                                                                                          | Example                | Status |
| ----------- | ------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| **filter**  | manual        | string                                                                                           | ""                      | Defines precisely the musics you want to add without relying on tags (the parameter to enter is the name of the field in the current file that lists the musics)                                                                                     | "scores"               | ✅     |
|             | from          | string                                                                                           | `#🎼 AND -"_templates"` | To define a specific dvjs query instead of using the default one                                                                                                                                                                                     |                        | ✅     |
|             | tags          | string / string[]                                                                                | ""                      | To filter on tags                                                                                                                                                                                                                                    | "#song"                | ✅     |
|             | in            | string                                                                                           | ""                      | To filter on the `in` property. Only one at a time for now                                                                                                                                                                                           | "[[Arcane (2021)]]"    | ✅     |
|             | artist        | string                                                                                           | ""                      | To filter on the `artist` property. Only one at a time for now                                                                                                                                                                                       | "[[Joe Hisaishi]]"     | ✅     |
|             | audioOnly      | boolean                                                                                          | false                   | To retrieve only music files with a non-null `audio` field. If a file has its `audio` property set to a non existing local link, this option will skip it                                                                                              |                        | ✅     |
|             | release       | [Date Object](https://github.com/Krakor92/some-custom-dataviews/tree/master/jukebox#date-object) | {}                      | To define a time period (either before, after, or an interval)                                                                                                                                                                                       | {before: "2022-12-31"} | ✅     |
|             | current       | string                                                                                           | ""                      | It expects the name of a field containing a link to the current file you're in. (More info in the text below this array). You can also pass the special `"backlinks"` string to filter on every music files that contains a link to the current file |                        | ✅     |
|             | star          | boolean                                                                                          | false                   | *Legacy*: To retrieve only musics that have been `Starred` by the user                                                                                                                                                                               |                        | ❌     |
|             | bookmarks     | string                                                                                           | ""                      | To filter on musics inside a bookmark folder. It doesn't search recursively in nested folder. **Warning**: You can't filter on a folder with a `/` in its name                                                                                       |                        | ✅     |
| **sort**    | shuffle       | boolean                                                                                          | false                   | To have a random sorting of the music                                                                                                                                                                                                                |                        | ✅     |
|             | recentlyAdded | boolean                                                                                          |                         | Move up to the first place the musics we have recently added (True) or the musics we have added at the very beginning (False)                                                                                                                        |                        |        |
|             | manual        | string                                                                                           | ""                      | To do a simple manual sort (works the same way as its namesake in **filter**)                                                                                                                                                                        | "scores"               | ✅     |
| **disable** |               | string                                                                                           |                         | To remove almost all visible features if you don't like them. You must separate the values with space. See the table below for more information on the possible values.                                                                              | "autoplay addscore"    | ✅     |

In my opinion, the most important filter is the `current` one. To give you a clearer example of its use: Let's say you have a file named "Hans Zimmer.md".
Apart from that, you have a bunch of music.md files with the following property: `artist: "[[Hans Zimmer]]"`.
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

The pros of this method compared to the previous notation is that if at some point you decide to rename your artist file, it won't break the view

##### The `not` filter property  

Let's say you have a `voice` property that is a string. It can be any equal to any of the following: yes, no or chorus

Now you want to query only music files with 'chorus' or 'no' as their `voice` property. Here is how you can do it:

~~~
```dataviewjs
await dv.view("_js/jukebox", {
	filter: {
		voice: {not: "yes"},
	}
})
```
~~~

**Limitation**: The `not` property only works for `string` property right now

##### Pass string to filter or sort

For ease of use, you can also pass a string as the `filter` and `sort` property instead of an object or a function:

| Main option | String    | Meaning                                                                                             |
| ----------- | --------- | --------------------------------------------------------------------------------------------------- |
| **filter**  | backlinks | Same as `{current: "backlinks"}`                                                                    |
| **sort**    | shuffle   | Same as `{shuffle: true}`                                                                           |
|             | random    | //                                                                                                  |
|             | filter    | Do nothing (keep the sort of the `filter` instead of doing the default ascending sort on file name) |
|             | none      | //                                                                                                  |


##### Advanced use case for filter and sort

Instead of passing an object to `filter` or `sort` properties, you can actually pass a javascript function and do the whole filtering/sorting yourself.

- The function passed to `filter` takes a `qs` property as its single parameter. This variable is an instance of the `Query`  class defined in the `Krakor.js` file. You'll need to call `qs.from` or specify some pages to filter on with `qs.pages()` first to use the query service correctly. You can take a look inside `Krakor.js` to see every methods that are already implemented and call them accordingly to your needs

- The function passed to `sort` takes a file `a` and a file `b`. You must return an integer at the end of your function just like with a regular sort function in js to determine the ordering 



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

### 👀 Some Examples

In the examples below:
- `in` and `artist` are both `link` fields
- `release` is a `date` field
- `label`, `instruments` and `voice` aren't specified as user fields so they're considered by the view as `string` ones

~~~
// Arcane emotional OSTs with vocals + disable the buttons and tile to add score, file names and borders

```dataviewjs
await dv.view("_js/jukebox",
{
	filter: {
		from: '#🎼 AND -"_templates"',
		in: "[[Arcane (2021)]]",
		label: 'emotional',
		voice: 'true',
	},
	disable: "addScore timecode",
})
```
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/ae458c22-360e-4b8d-932b-586ad8cef9ac)

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

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/766605ad-ac8c-4035-8d20-996f3892d9a6)

_You've specified above that `in` was a `link` field so that means that value should be wrapped with `[[]]` right?_

Yes but i've decided that when ommited, the value act as a regex.

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

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/fc90fe8b-2890-4a48-b982-31f31dd4087c)

---

~~~
// Inside "Vinland Saga.md"
// Every OST in the order specified in a property with minimal display

```dataviewjs
await dv.view("_js/jukebox", {
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
	disable: "buttons addscore"
})
```
~~~

![](https://github.com/Krakor92/some-custom-dataviews/assets/24924824/95c1fd2a-b77f-4141-a38e-5c9b3cf52358)

Note 1: I know there should be a lot more music from Sting in this time span but these are just the one I've put in my vault for now ^^'

Note 2: Albeit `Every Breath You Take` is a song by `The Police`, I've added Sting to the artist property so that it comes up when searching for his songs.

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

You can add any fields you want in the orphan definition, but there is one important thing to keep in mind: **Orphans are only accessible in the file in which they are defined** (This may change in the future)


Also, if you prefer the yaml block style in the frontmatter (which I do), you can use the following instead of the json based syntax shown above:

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


## 🔮 Future

### Datacore

I will eventually port this view to be compatible with [Datacore](https://github.com/blacksmithgu/datacore) when it is released, but it will highly depend on how mature the early versions are and what features it unlocks if I decide to switch to its new React API.

As for the performance improvement promised by the [readme](https://github.com/blacksmithgu/datacore#datacore), I doubt it will have any significant impact on this view, given how fast it already runs, even when querying thousands of files.


> **Update: 2024-04**
> It's been a while and Datacore isn't out yet. Even when it is, I don't think I'll make the switch as Js-Engine meets most of my needs at the moment.


### Better settings / Utility plugin

Right now, the settings are directly written inside the source code of the view. I know it's far from ideal so I've been thinking about building a plugin with the sole responsibility of managing views settings. It would solve two problems:

- You would easily upgrade the view by replacing the old view.js with the updated one without losing your settings
- It would let you set the settings directly from Obsidian's ui (just like a regular plugin) so any view could provide a form of validation on their settings


> **Update: 2024-04**
> I don't have the time to work on this, but it would be awesome if someone could implement it.


## 🙏 Acknowledgements

This dvjs view was made possible thanks to these different resources:

### Logic

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview)
	- I don't need to explain why. Without it i wouldn't even have used Obsidian in the first place

- [702573N's Obsidian-Tasks-Calendar](https://github.com/702573N/Obsidian-Tasks-Calendar)
	- It greatly helped me understand how to format my view.js and view.css

- [CustomJs](https://github.com/saml-dev/obsidian-custom-js)
	- Fantastic plugin that let me isolate logic used by all my views in its own file for easier use later on


### Styling



- [Kepano's minimal card snippet](https://forum.obsidian.md/t/snippet-so-you-can-use-dataview-cards-from-minimal-theme-in-any-theme/56866)
	- Most of the css I have is directly inspired by Kepano’s minimal card snippet

- [vikramsoni's Masonry layout implementation](https://codepen.io/vikramsoni/pen/gOvOKNz)

- [Dataview table as cards](https://obsidian-snippets.pages.dev/snippets/dataview-table-as-cards/)
	- It isn't used in the final product but it helped me understand better the HTML DOM constructed by dataview's custom functions
