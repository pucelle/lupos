import {MiniHeap} from '../../web/src'
import {describe, it, expect} from 'vitest'


function expectMiniHeap(m: MiniHeap<number>) {
	m = m.clone()

	let lastValue = -Infinity

	while (!m.isEmpty()) {
		let v = m.popHead()!
		expect(v).toBeGreaterThanOrEqual(lastValue)
		lastValue = v
	}
}


describe('Test MiniHeap', () => {
	
	it('MiniHeap', () => {
		let m = new MiniHeap<number>((a, b) => a - b)
		
		for (let i = 0; i < 100; i++) {
			m.add(Math.round(Math.random() * 100))
		}

		expectMiniHeap(m)
	})

	it('MiniHeap removeAt', () => {
		let m = new MiniHeap<number>((a, b) => a - b)
		
		for (let i = 0; i < 100; i++) {
			m.add(Math.round(Math.random() * 100))
		}

		expectMiniHeap(m)

		for (let i = 0; i < 99; i++) {
			m.removeAt(Math.floor(Math.random() * m.size))
			expectMiniHeap(m)
		}
	})
})