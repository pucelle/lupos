import {MiniHeap} from '../../web/src'
import { describe, it, expect} from 'vitest'


describe('Test MiniHeap', () => {
	
	it('MiniHeap', () => {
		let m = new MiniHeap<number>((a, b) => a - b)
		
		for (let i = 0; i < 100; i++) {
			m.add(Math.round(Math.random() * 100))
		}

		let lastValue = -1

		while (!m.isEmpty()) {
			let v = m.popHead()!
			expect(v).toBeGreaterThanOrEqual(lastValue)
			lastValue = v
		}
	})

	// Not possible for heap struct.
	// it('MiniHeap keep add order when having same comparing value', () => {
	// 	let m = new MiniHeap<{value: number, order: number}>((a, b) => a.order - b.order)
		
	// 	for (let i = 0; i < 100; i++) {
	// 		m.add({value: i, order: 0})
	// 	}

	// 	for (let i = 0; i < 100; i++) {
	// 		let v = m.popHead()!
	// 		expect(v.value).toBe(i)
	// 	}
	// })
})