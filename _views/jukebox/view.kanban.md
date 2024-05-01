---

kanban-plugin: board

---

## Full Embed

- [ ] ![[view]]


## Header Embed

- [ ] ![[view#_]]


## Normal

- [ ] ```js-engine
	const path = `_js/_views/jukebox/view.js`
	const { main } = await engine.importJs(path)

	main({...this, path}, {
	  debug: true,
	})
	```


## Callout

- [ ] > [!info]+ 🎧
	> ```js-engine
	> const path = `_js/_views/jukebox/view.js`
	> const { main } = await engine.importJs(path)
	>
	> main({...this, path}, {
	> 	sort: {
	> 		shuffle: true,
	> 	},
	> 	debug: true,
	> 	disable: "filelink",
	> })
	> ```




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false]}
```
%%