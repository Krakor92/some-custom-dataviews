---
orphans:
  -
    title: "Never Gonna Give You Up"
    url: "https://youtu.be/dQw4w9WgXcQ"
    voice: yes
    release: 1987-07-27
    artist:
      - "Rick Astley"
    tags:
      - 🐐
      - meme
    tags_:
      - banger
      - feel good
    misc:
      - "[[Memes]]"
---

> Contains all the scenarios that are supposed to be managed by this view (now or in the future). I use it for debugging purposes and to make sure I don't introduce regression on new commits.


> [!NOTE]- All - Every music in the vault sorted alphabetically (vanilla/no settings)
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path})
> ```


- [-] 
> [!NOTE]- <`Array`>
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, [
> 	"[[Death by Glamour]]",
> 	"[[Undertale]]",
> 	"[[SAVE His Last Hopes and Dreams]]",
> 	"[[It's Raining Somewhere Else]]",
> ])
> ```


## Filter

### Special fields

- [-] 
> [!NOTE]- *filter*.<`Array`>
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: [
> 		"[[Death by Glamour]]",
> 		"[[Undertale]]",
> 		"[[SAVE His Last Hopes and Dreams]]",
> 		"[[It's Raining Somewhere Else]]",
> 	]
> })
> ```

- [x] 
> [!NOTE]- *filter*.`manual`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		manual: `manual`,
> 	}
> })
> ```
 
manual:: [[Falling Apart]] 

- [x] 
> [!NOTE]- *filter*.`from`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		from: `"DB/🎼"`,
> 	}
> })
> ```

- [x] 
> [!NOTE]- *filter*.`tags`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		tags: `#🐐`,
> 	}
> })
> ```


- [?] Can't test it inside this file
> [!NOTE]- *filter*.`current`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		current: "in"
> 	}
> })
> ```

- [?] Can't test it inside this file either
> [!NOTE]- *filter*.`backlinks`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: "backlinks"
> })
> ```


- [x] 
> [!NOTE]- *filter*.`bookmarks`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		bookmarks: "🎼/⭐"
> 	}
> })
> ```

- [x] 
> [!NOTE]- *filter*.`audioOnly`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		audioOnly: true,
> 	}
> })
> ```

### User fields
#### link

- [x] 
> [!NOTE]- *filter*.`artist`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		artist: `[[Joe Hisaishi]]`,
> 	}
> })
> ```


- [x] 
> [!NOTE]- *filter*.`in`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		in: `[[Arcane (2021)]]`,
> 	}
> })
> ```


- [x] 
> [!NOTE]- *filter*.`in` - Regex mode (string)
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		in: `Professor Layton`,
> 	}
> })
> ```

- [x] 
> [!NOTE]- *filter*.`in` - Regex mode
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		in: /Chrono/,
> 	},
> })
> ```

#### date

- [x] 80s musics only
> [!NOTE]- *filter*.`release`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		release: {
> 			after: "1979-12-31",
> 			before: "1990-01-01",
> 		},
> 	}
> })
> ```

#### string

- [-] 
> [!NOTE]- *filter*.`url` - Regex mode
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		url: /soundcloud/,
> 	}
> })
> ```

- [x] 
> [!NOTE]- *filter*.`voice`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		voice: "yes"
> 	}
> })
> ```

> [!NOTE]- *filter*.`voice`.*not*
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		voice: {not: "yes"}
> 	}
> })
> ```

- [-] 
> [!NOTE]- *filter*.`misc`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		misc: `[[Memes]]`
> 	}
> })
> ```

### Lookups

- [-]  Music from Japanese artist only
> [!NOTE]- *filter*.`artist`.`country` 
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	filter: {
> 		artist: {
> 			country: `🇯🇵`
> 		},
> 	},
> })
> ```

## Sort

- [x] 
> [!NOTE]- Sort - 🎲 Random/Shuffle
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	sort: 'random'
> })
> ```

- [x] Thank you GoldenSeal 😊
> [!NOTE]- Sort - 🎲 Seeded Shuffle
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	sort: {shuffle: 123456789}
> })
> ```

- [!] Don't work as expected
> [!NOTE]- Sort - 📬 Recently added
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	sort: {recentlyAdded: true}
> })
> ```

- [!] Don't work as expected
> [!NOTE]- Sort - ⌛ Recently released
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 		sort: {recentlyReleased: false}
> })
> ```

- [-] 
> [!NOTE]- Sort - 🫳 Manual
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	sort: {manual: "scores"}
> })
> ```

scores:: [[Mangrove Cove (Underwater)]]

- [?] Does it work though?
> [!NOTE]- Sort - 🌬️ None/Filter
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	sort: "none"
> })
> ```


## Disable

- [x] 
> [!NOTE]- *disable*.`buttons`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	disable: "buttons"
> })
> ```

- [x] 
> [!NOTE]- *disable*.`filelink`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	disable: "filelink"
> })
> ```

- [x] 
> [!NOTE]- *disable*.`query`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	disable: "query"
> })
> ```

- [x] 
> [!NOTE]- *disable*.`orphans`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	disable: "orphans"
> })
> ```

- [x] 
> [!NOTE]- *disable*.`masonry`
> ```js-engine
> const path = `_js/_views/jukebox/view.js`
> const { main } = await engine.importJs(path)
>
> main({...this, path}, {
> 	disable: "masonry"
> })
> ```

## _