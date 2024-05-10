/*
html`<div class=${this.className} @click=${this.onClick}></div>`
=>
	global:
		let $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild
			bindEvent($e0, 'click', $c.onClick)

			return {
				getLastNode() {
					return $e0
				},
				update() {
					$e0.setAttribute('class', $c.className)
					onGet($c, 'className')
				}
			}
		})

	scoped:
		return $t0


html`<div @click.prevent=${this.onClick}></div>`
=>
	global:
		let $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild

			function $h0(e) {
				$c.onClick()
				e.preventDefault()
			}

			bindEvent($e0, 'click', $h0)

			...
		})

	scoped:
		return $t0


html`<div @click=${this.a ? this.onClick : this.onClick2}></div>`
=>
	global:
		let $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild
			let $h0

			function $h0(e) {
				$h0.call($c)
			}

			bindEvent($e0, 'click', $h0)

			return {
				update() {
					$h0 = xxx
				}
			}
		})

	scoped:
		return $t0


html`<div>${this.renderHead()}</div>`
=>
	global:
		let $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new CompiledSlot($e0, null)

			// Position must skip `<... slot="...">` element.

			return {
				getLastNode() {
					return $e0
				},
				update() {
					$s0.update(this.renderHead())
				}
			}
		})

	scoped:
		return $t0



html`${this.renderContent1()}`
=>
	global:
		let $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new CompiledContentSlot(null, $e0, null, $e0.firstChild)

			return {
				update() {
					$s0.update(this.renderContent1())
				},
				remove() {},
			}
		})

	scoped:
		return $t0


html`ABC${this.renderContent1()}`
=>
	global:
		let $t0 = new TemplateMaker('ABC', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new CompiledContentSlot(null, $e0, null, $e0.firstChild)

			return {
				update() {
					$s0.update(this.renderContent1())
				},
				remove() {},
			}
		})

	scoped:
		return $t0


html`${this.renderContent1()}${this.renderContent2()}`
=>
	global:
		let $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new CompiledContentSlot(null, $e0)
			let $s1 = new CompiledContentSlot(null, $e0, $s0)

			return {
				update() {
					$s0.update(this.renderContent1())
					$s1.update(this.renderContent2())
				},
				remove() {},
			}
		})

	scoped:
		return $t0



html`${list.map(value => html`${value}`)}`
=>
	global:
		let $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new CompiledContentSlot(null, $e0)
			let $s1 = new CompiledContentSlot(null, $e0, $s0)

			return {
				update() {
					$s0.update(this.renderContent1())
					$s1.update(this.renderContent2())
				},
				remove() {},
			}
		})

	scoped:
		return $t0


html`<div slot="abc"></div>`
=>
	global:
		const $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild
			$c.slots.abc = $e0
			onSet($c.slots, 'abc')

			return {
				update() {},
				remove() {
					delete $c.slots.abc
					onSet($c.slots, 'abc')
				},
			}
		})

	scoped:
		return $t0


html`<slot name="abc" />`
=>
	global:
		const $t0 = new TemplateMaker('<slot></slot>', function($t, $c){
			let $e0 = $t.firstChild

			// If `$c.slots.abc` is a static property, then just insert it, no need to create a slot.
			// Must ensure all the references of current component never apply `$c.slots.abc` dynamically.
			let $s0 = new CompiledContentSlot(null, $e0)

			return {
				update() {
					$s0.updateNode($c.slots.abc)
					onGet($c.slots, 'abc')
				},
				remove() {
					$s0.remove()
				},
			}
		})

	scoped:
		return $t0


html`<slot />`
=>
	global:
		const $t0 = new TemplateMaker('', function($t, $c){
			$t.append($c.slotElements.__rest__)

			return {
				update() {},
				remove() {},
			}
		})

	scoped:
		return $t0


html`<ABC>123</ABC>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $c0 = new ABC(null, $e0)
			let $t0 = new Text(123)
			let $s0 = new SlotElement()
			$s0.append($t0)
			$c0.slotElements.__rest__ = $s0
			$c0.appendTo($t)

			return {}
		})

	scoped:
		return $t0


html`${this.renderHead()}`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $s0 = new ContentSlot(null, $e0)

			// If want to track `renderHead` independently.
			// The disadvantage is `update()` manually cant update completely.
			function $u1() {
				beginTrack($eu1)
				$s0.updateTemplate(this.renderHead())
				endTrack()
			}

			function $eu1() {
				FrameQueue.enqueue($u1, null, $c.incrementalId)
			}

			return {
				update() {
					// If don't want to track `renderHead` independently.
					$s0.updateTemplate(this.renderHead())
				},
				remove() {
					untrack($eu1)
				}
			}
		})

	scoped:
		return $t0


html`<${ABC} .prop=${this.prop} slot="abc">EFG ${this.renderSomething()}</>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $c0
			
			function replaceCom(values) {
				// May removes slot elements of $c0.
				$EFG.remove()
				...

				$C0 = values[0]
				$c1 = new $C0()
				$c1.insertAfter($t.firstChild)
				$c1.prop = ...
				$c1.slotElements.xxx = xxx
				$c1.slotElements.__rest__ = $c0.__rest__

				$c.slotElements.abc = $c1

				$c0.remove()
				$c0 = $c1
			}

			return {
				update(values) {
					if (values[0] !== $C0) {
						$C0 = values[0]
						$c0New = new $C0(null, $e0)
						$c0.remove()


					}
				}
			}
		})

	scoped:
		return $t0


html`<div :binding=${value}>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $b0 = new findBinding('binding')($e0)

			return {
				update(values) {
					$b0.update(values[0])
				}
			}
		})

	scoped:
		return $t0


html`<div :ref=${this.prop}>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $b0 = new findBinding('ref')($e0)

			return {
				connected(){
					$b0.updateElement($b0)
				},
				update(values) {}
			}
		})

	scoped:
		return $t0



html`<com :ref=${this.prop}>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $b0 = new findBinding('ref')($e0)

			return {
				connected(){
					$b0.updateComponent($b0)
				},
				update(values) {}
			}
		})

	scoped:
		return $t0


	
html`<div :transition=${...}}><div :transition.global=${...}}>${...}<Com /></div></div>`
=>
	global:
		const $t0 = new TemplateMaker('<div></div>', function($t, $c){
			let $e0 = $t.firstChild
			let $b0 = new TransitionBinding($e0)
			let $e1 = $e0.firstChild
			let $b1 = new TransitionBinding($e1)
			let $s0 = new TemplateSlot(...)
			let $c0 = new Com()

			return {
				update(values) {

					// No need to update for const part.
					// If value is a computed object, what to do? nothing... but not compare yet.
					// Or compare all imported values? no
					// Otherwise always compare with old value, and update only when value changed.
					$b0.update(values[0])
					$b1.update(values[1])
					$s0.update(...)
				}

				enter(directly) {
					if (directly) {
						$b0.enter()
					}

					$b1.enter()
					$s0.enter(false)	// `true` if the slot is in the top level.
					$c0.enter(false)
				}
				leave(directly) {
					let promises = []
					if (directly) {
						promises.push($b0.leave())
					}

					promises.push($b1.leave())
					promises.push($s0.leave(false))	// `true` if the slot is in the top level.
					promises.push($c0.leave(false))	// `true` if the component is in the top level.

					return Promise.all(promises)
				}
			}
		})

	scoped:
		return $t0



html`<if ${...} cache>...</if><else>...</else>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new ContentSlot($e0)
			let $st0 = $statement0($c)

			return {
				update(values) {
					$st0.update(values)
				}
			}
		})

		let $statement0 = make_if_statement(
			function(values){if (xxx) return 0; ...},
			[new TemplateMaker(...), ...]
		)

	scoped:
		return $t0


html`<for of=${items}>${(item) => html`...`}</for>`
=>
	global:
		const $t0 = new TemplateMaker('<!---->', function($t, $c){
			let $e0 = $t.firstChild
			let $s0 = new ContentSlot($e0)

			// If this fn reference variables in parent scope, what to do?
			// Option 1: Keep there, pass fn as a parameter.
			// Option 2: Move it here, pass referenced variables as parameter.
			let $forRenderFn = function(item, index){...}

			let $forStatement = make_for_statement($forRenderFn, ...)

			return {
				update(values) {
					$forStatement(values[0])
				}
			}
		})

	scoped:
		return $t0

*/
