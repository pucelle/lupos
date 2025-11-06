import {beginTrack, endTrack, trackGet, trackSet} from '../../web/src'
import { describe, it, expect, vi} from 'vitest'


describe('Test DependencyTracker', () => {

	it('Test DependencyTracker APIs', () => {
		class A {
			iid = 0
			key!: {b: number, c: number[]}
			willUpdate = vi.fn()
			update = vi.fn()
		}
	
		let a = new A()
		a.key = {b: 1, c: [1]}
		a.willUpdate()

		function reCapture() {
			beginTrack(a)

			a.key.b
			trackGet(a, 'key')
			trackGet(a.key, 'b')

			a.key.c.length
			trackGet(a, 'key')
			trackGet(a.key, 'c')
			trackGet(a.key.c, '')

			endTrack()
		}

		reCapture()
		a.key.b = 2
		trackSet(a.key, 'b')
		expect(a.willUpdate).toHaveBeenCalledTimes(2)

		reCapture()
		a.key.c = [2]
		trackSet(a.key, 'c')
		expect(a.willUpdate).toHaveBeenCalledTimes(3)

		reCapture()
		a.key.c[0] = 3
		trackSet(a.key.c, '')
		expect(a.willUpdate).toHaveBeenCalledTimes(4)

		reCapture()
		a.key.c.push(3)
		trackSet(a.key.c, '')
		expect(a.willUpdate).toHaveBeenCalledTimes(5)
	})
})