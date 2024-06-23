---

kanban-plugin: board

---

## Full Embed

- [ ] ![[view]]


## Header Embed

- [ ] > [!TIP] Press the top arrow to fold the list and re-opens it right after to "solve" the hidden issue
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