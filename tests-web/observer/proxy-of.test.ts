import {beginTrack, endTrack, proxyOf} from '../../web/src'
import { describe, it, expect, vi} from 'vitest'


describe('Test proxyOf', () => {
	
	it('Test proxyOf', () => {
		let a = proxyOf({b: 1, c: [1]})

		let updatable = {
			iid: 0,
			willUpdate: vi.fn(),
			update: () => {},
		}

		function reCapture() {
			beginTrack(updatable)
			a.b
			a.c.length

			// To pass this test,
			// Must change `TwoWaySetMap` to `TwoWaySetWeakMap` at `dependency-capturer.ts`.
			// Because jest env doesn't allow symbol as weak keys.
			// Don't forget to change it back after test finished.
			endTrack()
		}

		reCapture()
		a.b = 2
		expect(updatable.willUpdate).toHaveBeenCalledTimes(1)

		reCapture()
		a.b = 2
		expect(updatable.willUpdate).toHaveBeenCalledTimes(1)

		reCapture()
		a.c = [2]
		expect(updatable.willUpdate).toHaveBeenCalledTimes(2)

		reCapture()
		a.c[0] = 3
		expect(updatable.willUpdate).toHaveBeenCalledTimes(3)

		reCapture()
		a.c.push(3)
		expect(updatable.willUpdate).toHaveBeenCalledTimes(4)
	})


	it('Test proxyOf comparsion', () => {
		let a = {}
		let b = proxyOf(a)

		expect(a === b).toEqual(false)
		expect(proxyOf(b) === b).toEqual(true)
	})
})