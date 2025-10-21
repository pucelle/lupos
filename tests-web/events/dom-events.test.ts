import {DOMEvents} from '../../web/src'
import { describe, it, expect, vi} from 'vitest'


describe('Test EventFirer', () => {

	it('on & off for click', () => {
		let div = document.createElement('div')
		let fn = vi.fn()
	
		DOMEvents.on(div, 'click', fn)
		div.click()
		expect(fn).toHaveBeenCalled()
		DOMEvents.off(div, 'click', fn)

		div.click()
		expect(fn).toHaveBeenCalledTimes(1)
	})


	it('once for click', () => {
		let div = document.createElement('div')
		let fn = vi.fn()

		DOMEvents.once(div, 'click', fn)
		div.click()
		expect(fn).toHaveBeenCalled()

		div.click()
		expect(fn).toHaveBeenCalledTimes(1)
	})

	
	it('mouseenter & mouseleave', () => {
		let div = document.createElement('div')
		let fn1 = vi.fn()
		let fn2 = vi.fn()

		DOMEvents.once(div, 'mouseenter', fn1)
		DOMEvents.once(div, 'mouseleave', fn2)

		let e1 = new Event('mouseenter')
		div.dispatchEvent(e1)
		expect(fn1).toHaveBeenCalledTimes(1)

		let e2 = new Event('mouseleave')
		div.dispatchEvent(e2)
		expect(fn2).toHaveBeenCalledTimes(1)
	})
})