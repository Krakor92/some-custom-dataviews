/**
 * @file Extends the capability of dv utility (completely ignore DataArray implementation)
 * @depends on DataviewJS
 * @author Krakor <krakor.faivre@gmail.com>
 */
class DataviewJS {

	/*
	Doesn't support OR query

	If you want to do an OR, you must do two separated queries then merge their results with this
	```js
		const orPages = [...new Set(pages1.concat(pages2))]
	```
	*/
	Query = class {
		constructor(dv) {
			this.dv = dv
			this._pages = null
		}

		_warningMsg = "You forgot to call from or pages before calling this"
		_delimiter = "=-------------------------------="

		//distinct
		joinPages = (a1, a2) => {
			const joinedArray = a1.values.concat(a2.values)
			const result = [];
			const map = new Map();
			for (const page of joinedArray) {
				if (!map.has(page.file.link.path)) {
					map.set(page.file.link.path, true); // set any value to Map
					result.push({ ...page });
				}
			}
			return result
		}

		hello = () => {
			console.log("Hello")
			return this
		}

		from(source) {
			this._pages = this.dv.pages(source)
			return this
		}

		sort(fn) {
			this._pages = this._pages.sort(fn)
			return this
		}

		/**
		 * @param {function} fn - It must return an array of pages
		 */
		custom(fn) {
			this._pages = fn(this._pages)
			return this
		}

		/**
		 * @param {import("./view").Link} link 
		 */
		_convertLinkToTFile(link) {
			if (!link.path) return null
			return this.dv.page(link.path)
		}

		setLinks(links) {
			if (!Array.isArray(links)) {
				this._pages = [this._convertLinkToTFile(links)]
				return
			}

			this._pages = links.reduce((a, c) => {
				const file = this._convertLinkToTFile(c)
				if (!file) return a

				return [...a, file]
			}, [])
			return this
		}

		pages(pages) {
			this._pages = [...pages]
			return this
		}

		// Transfrom the proxy target to a regular array for easier manipulation later on
		query() {
			return [...this._pages];
		}

		filter(cb) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			this._pages = this._pages.filter(p => cb(p))
		}

		async asyncFilter(cb) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			/* from: https://stackoverflow.com/a/63932267 */
			const filterPromise = (values, fn) =>
				Promise.all(values.map(fn)).then(booleans => values.filter((_, i) => booleans[i]));

			this._pages = await filterPromise(this._pages, (async p => await cb(p)))
		}

		/**
		 * @param {string[] | string} tags 
		 */
		withTags(tags) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}
			if (!tags) return null

			if (Array.isArray(tags)) {
				tags.forEach(t => this._withTag(t))
			} else {
				this._withTag(tags)
			}
			
			return this
		}
		
		/**
		 * @param {string} tag 
		*/
		_withTag(tag) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}
			
			this._pages = this._pages.filter(p => {
				return p.file.etags.includes(tag)
			})
		}

		withExistingField(name) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			this._pages = this._pages.filter(p => {
				return !!p[name]
			})
			return this
		}

		/**
		 * Private function used inside with/outDateFieldOfValue
		 * @warn Only works for YYYY-MM-DD right now (don't support THH:mm)
		 * @private
		 * @param {object} _
		 * @param {string} _.name
		 * @param {string} _.value
		 * @param {'eq'|'lt'|'gt'} _.compare
		 * @param {boolean} _.with_ if false, it means the function does a without
		 */
		_dateFieldOfValue({ name, value, compare = "eq", with_ = true }) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			const dateValue = this.dv.date(value)
			if (dateValue.toString() === "Invalid Date") {
				console.error(`${value} isn't a valid date fromat`)
				return this
			}

			console.log(`Before filtering on ${name} with value '${with_ ? '' : '-'}${value}', we have a total number of ${this._pages.length} pages`)
			this._pages = this._pages.filter(p => {
				if (!p[name]) return !with_

				let pValue = null
				if (typeof p[name] === "number") { // that means its just a year
					pValue = this.dv.luxon.DateTime.fromObject({year: p[name]})
				} else {
					pValue = this.dv.date(p[name])
				}

				if (!pValue || pValue.toString() === "Invalid Date") {
					console.warn(`${p[name]} isn't a valid date fromat`)
					return !with_
				}

				switch (compare) {
					case 'eq': return (pValue.ts === dateValue.ts) === with_
					case 'lt': return (pValue < dateValue) === with_
					case 'gt': return (pValue > dateValue) === with_
					default: return !with_
				}
			})

			console.log(`After filtering on ${name} with value '${with_ ? '' : '-'}${value}', we have a total number of ${this._pages.length} pages`)
			return this
		}


		/**
		 * Only works with scalar type (string, boolean, number) and array of scalar type
		 * Private function used inside with/outFieldOfValue
		 * @private
		 * @param {object} _
		 * @param {string} _.name
		 * @param {string} _.value
		 * @param {boolean} _.with_ if false, it means the function does a without
		 * @param {boolean} _.fileField if true, it means the property belongs to the `file` field
		 * @param {boolean} _.acceptArray
		 * - If true, then it will return {{with_}} if {{value}} is find inside the array {{name}}.
		 * - If false, it will return !{{with_}} as soon as an array is encountered
		 */
		_fieldOfValue({ name, value, with_ = true, fileField = false, acceptArray = true }) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return this;
			}
			
			if (typeof value === "object") {
				console.error(`This function only accept scalar value`)
				return this;
			}

			console.log(`Before filtering on ${name} with value '${with_ ? '' : '-'}${value}', we have a total number of ${this._pages.length} pages`)
			this._pages = this._pages.filter(p => {

				const field = fileField ? p.file[name] : p[name]

				if (!field) return !with_

				if (Array.isArray(field)) {
					if (!acceptArray) return !with_;

					return field.some(el => {
						return el === value
					});
				}

				// Like a number or anything
				if (typeof field !== "string") {
					return (field === value) === with_
				}

				// console.log({value})

				// Alors en fait j'ai besoin de faire un XNOR et c'est comme ça que je m'y prend
				return (field.toLocaleLowerCase() === value.toLocaleLowerCase()) === with_
			})

			console.log(`After filtering on ${name} with value '${with_ ? '' : '-'}${value}', we have a total number of ${this._pages.length} pages`)
			return this
		}

		/**
		 * Only works with scalar type (string, boolean, number)
		 * To work wih file use withLinkFieldOfPath function
		 * @param {object} _
		 * @param {string} _.name
		 * @param {string} _.value
		 * @param {boolean} _.acceptArray 
		 * - If true, then it will return true if {{value}} is find inside the array {{name}}.
		 * - If false, it will return false as soon as an array is encountered
		 */
		withFieldOfValue({ name, value, acceptArray = true }) {
			return this._fieldOfValue({ name, value, acceptArray, with_: true })
		}

		withFileFieldOfValue({ name, value, acceptArray = true }) {
			return this._fieldOfValue({ name, value, fileField: true, acceptArray, with_: true })
		}

		/**
		 * Only works with scalar type (string, boolean, number)
		 * To work wih file use withLinkFieldOfPath function
		 * @param {object} _
		 * @param {string} _.name
		 * @param {string} _.value
		 * @param {boolean} _.acceptArray 
		 * - If true, then it will return false if {{value}} is find inside the array {{name}}.
		 * - If false, it will return true as soon as an array is encountered
		 */
		withoutFieldOfValue({ name, value, acceptArray = true }) {
			return this._fieldOfValue({ name, value, acceptArray, with_: false })
		}

		withoutFileFieldOfValue({ name, value, acceptArray = true }) {
			return this._fieldOfValue({ name, value, fileField: true, acceptArray, with_: false })
		}


		/**
		 * Only works with scalar type (string, boolean, number)
		 * To work wih file use withLinkFieldOfPath function
		 * @param {object} _
		 * @param {string} _.name
		 * @param {string} _.value - Must be in a valid date fromat
		 * @param {string} _.compare
		 * @param {boolean} _.acceptArray 
		 * - If true, then it will return false if {{value}} is find inside the array {{name}}.
		 * - If false, it will return true as soon as an array is encountered
		 */
		withDateFieldOfTime({ name, value, compare = 'eq' }) {
			return this._dateFieldOfValue({ name, value, compare, with_: true })
		}

		/**
		 * 
		 * @param {object} _
		 * @param {string} _.field - Name of the field to query on
		 * @param {string} _.path
		 * @param {string} _.acceptStringField - If true, it fallbacks to comparing p[field] and path if p[field] isn't a link
		 */
		withLinkFieldOfPath({ field, path, acceptStringField = false }) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			if (typeof (path) !== "string") {
				console.error(`${path} must a be a single string. Call withLinkFieldOfAnyPath instead`)
				return null
			}

			this._pages = this._pages.filter(p => {
				if (!p[field]) return false;
				
				if (Array.isArray(p[field])) {
					return p[field].some(l => {
						if (typeof (l) !== "object") {
							return acceptStringField ? l === path : false
						}
						
						return l.path === path
					});
				}

				if (typeof (p[field]) !== "object") {
					return acceptStringField ? p[field] === path : false
				}

				return p[field].path === path
			});
			return this
		}

		/**
		 * 
		 * @param {object} _
		 * @param {string} _.field - Name of the field to query on
		 * @param {string} _.path - A regex
		 * @param {string} _.acceptStringField - If true, it fallbacks to comparing p[field] and path if p[field] isn't a link
		 */
		withLinkFieldOfPathRegex({ field, path, acceptStringField = false }) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			if (typeof path !== "string" && !path instanceof RegExp ) {
				console.error(`${path} must be a regex`)
				return null
			}
			
			const regex = path instanceof RegExp ? path : new RegExp(path)
			if (!regex) {
				console.error(`${path} must be a valid regex`)
				return null
			} 

			this._pages = this._pages.filter(p => {
				if (!p[field]) return false;

				if (Array.isArray(p[field])) {
					return p[field].some(l => {
						if (typeof (l) !== "object") {
							return acceptStringField ? !!l.match(regex) : false
						}

						return !!l.path.match(regex)
					});
				}

				if (typeof (p[field]) !== "object") {
					return acceptStringField ? !!p[field].match(regex) : false
				}

				const match = p[field].path.match(regex)
				// console.log({match})
				return !!match
			});
			return this
		}

		/**
		 * 
		 * @param {object} _
		 * @param {string} _.field - Name of the field to query on
		 * @param {string[]} _.paths
		 * 
		 * @param {boolean} _.and
		 */
		withLinkFieldOfAnyPath({ field, paths }) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			if (!Array.isArray(paths)) {
				console.error(`${paths} isn't an array. Call withLinkFieldOfPath instead`)
				return null
			}

			this._pages = this._pages.filter(p => {
				if (!p[field]) return false;

				if (Array.isArray(p[field])) {
					for (const path of paths) {
						if (p[field].some(l => {
							if (typeof (l) !== "object") return false;

							return l.path === path
						})) {
							return true
						}
					}
					return false
				}

				return paths.some(path => path === p.type.path)
			});
			return this

		}


		/**
		 * For debug purposes only
		 */
		printField(name) {
			if (!this._pages) {
				console.error(this._warningMsg)
				return null;
			}

			this._pages.forEach(p => {
				if (!p[name]) return

				if (Array.isArray(p[name])) {
					console.log("Array")
					console.log(p[name])
					return
				}

				if (typeof (p[name]) === 'object') {
					console.log("Object")
					console.log({ ...p[name] })
					return
				}

				console.log("Scalar")
				console.log({ name, "typeof": typeof (p[name]), value: p[name] })
				return
			})

			console.log(this._delimiter)

			return this;
		}
	}
}