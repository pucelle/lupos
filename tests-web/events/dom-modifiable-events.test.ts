import {DOMModifiableEvents} from '../../web/src'
import {describe, expect, it, vi} from 'vitest'


describe('DOMModifiableEvents', () => {
	it('filters checked and unchecked change events', () => {
		let input = document.createElement('input')
		input.type = 'checkbox'
		let checked = vi.fn()
		let unchecked = vi.fn()

		DOMModifiableEvents.on(input, 'change', ['check'], checked)
		DOMModifiableEvents.on(input, 'change', ['uncheck'], unchecked)

		input.checked = true
		input.dispatchEvent(new Event('change'))
		expect(checked).toHaveBeenCalledTimes(1)
		expect(unchecked).not.toHaveBeenCalled()

		input.checked = false
		input.dispatchEvent(new Event('change'))
		expect(checked).toHaveBeenCalledTimes(1)
		expect(unchecked).toHaveBeenCalledTimes(1)
	})

	it('removes only the scoped once listener that matched', () => {
		let div = document.createElement('div')
		let handler = vi.fn()
		let firstScope = {name: 'first'}
		let secondScope = {name: 'second'}

		DOMModifiableEvents.on(div, 'click', ['once'], handler, firstScope)
		DOMModifiableEvents.on(div, 'click', null, handler, secondScope)

		div.click()
		div.click()

		expect(handler).toHaveBeenCalledTimes(3)
		expect(handler.mock.contexts).toEqual([firstScope, secondScope, secondScope])
	})
})
