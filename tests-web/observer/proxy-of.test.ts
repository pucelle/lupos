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

	it('supports array pop, shift, and splice with standard semantics', () => {
		let a = proxyOf([{id: 1}, {id: 2}, {id: 3}])

		expect(a.pop()!.id).toBe(3)
		expect(a.shift()!.id).toBe(1)
		a.splice(0, 0, {id: 4}, {id: 5})

		expect(a.map(item => item.id)).toEqual([4, 5, 2])
	})

	it('notifies once for each array mutation', () => {
		let a = proxyOf([1, 2, 3])
		let updatable = {
			iid: 0,
			willUpdate: vi.fn(),
			update: () => {},
		}

		beginTrack(updatable)
		a.length
		endTrack()

		a.pop()
		a.shift()
		a.splice(0, 0, 4, 5)

		expect(updatable.willUpdate).toHaveBeenCalledTimes(3)
	})

	it('supports Map and Set methods and only notifies for mutations', () => {
		let map = proxyOf(new Map<string, {value: number}>())
		let set = proxyOf(new Set<string>())
		let updatable = {
			iid: 0,
			willUpdate: vi.fn(),
			update: () => {},
		}

		beginTrack(updatable)
		map.get('item')
		set.has('item')
		endTrack()

		map.set('item', {value: 1})
		set.add('item')
		expect(updatable.willUpdate).toHaveBeenCalledTimes(2)
		expect(map.get('item')!.value).toBe(1)
		expect(map.size).toBe(1)
		expect(set.has('item')).toBe(true)

		map.set('item', map.get('item')!)
		set.add('item')
		expect(updatable.willUpdate).toHaveBeenCalledTimes(2)

		map.delete('item')
		set.delete('item')
		expect(updatable.willUpdate).toHaveBeenCalledTimes(4)
	})

	it('tracks Map and Set iteration', () => {
		let map = proxyOf(new Map([['item', 1]]))
		let set = proxyOf(new Set(['item']))
		let updatable = {
			iid: 0,
			willUpdate: vi.fn(),
			update: () => {},
		}

		beginTrack(updatable)
		;[...map]
		;[...set]
		endTrack()

		map.set('other', 2)
		set.add('other')
		expect(updatable.willUpdate).toHaveBeenCalledTimes(2)
	})
})
