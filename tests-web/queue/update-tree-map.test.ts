import {describe, it, expect} from 'vitest'
import {UpdatableTreeMap} from '../../web/src/queue/update-tree-map'
import type {Updatable} from '../../web/src/types'


function mkUdp(iid: number): Updatable {
	return {
		iid,
		willUpdate: () => {},
		update: () => {},
	}
}


describe('UpdatableTreeMap', () => {
	it('resolves immediately when no children and promise requested', async () => {
		let map = new UpdatableTreeMap()
		let parent = mkUdp(1)

		map.onUpdateStart(parent)
		let promise = map.getChildCompletePromise(parent)
		map.onUpdateEnd(parent)

		await expect(promise).resolves.toBeUndefined()
	})

	it('resolves after single child ends', async () => {
		let map = new UpdatableTreeMap()
		let parent = mkUdp(1)
		let child = mkUdp(2)

		map.onUpdateStart(parent)
		map.onEnqueue(child)
		let parentDone = map.getChildCompletePromise(parent)
		map.onUpdateEnd(parent)

		let resolved = false
		parentDone.then(() => { resolved = true })

		// Not resolved before child ends
		await Promise.resolve()
		expect(resolved).toBe(false)

		map.onUpdateStart(child)
		map.onUpdateEnd(child)

		await parentDone
		expect(resolved).toBe(true)
	})

	it('resolves only after multiple children end', async () => {
		let map = new UpdatableTreeMap()
		let parent = mkUdp(1)
		let c1 = mkUdp(2)
		let c2 = mkUdp(3)

		map.onUpdateStart(parent)
		map.onEnqueue(c1)
		map.onEnqueue(c2)
		let parentDone = map.getChildCompletePromise(parent)
		map.onUpdateEnd(parent)

		let resolved = false
		parentDone.then(() => { resolved = true })

		map.onUpdateStart(c1)
		map.onUpdateEnd(c1)
		await Promise.resolve()
		expect(resolved).toBe(false)

		map.onUpdateStart(c2)
		map.onUpdateEnd(c2)
		await parentDone
		expect(resolved).toBe(true)
	})

	it('resolves recursively with nested child and grand child', async () => {
		let map = new UpdatableTreeMap()
		let parent = mkUdp(1)
		let child = mkUdp(2)
		let grand = mkUdp(3)

		// Parent starts and enqueues child
		map.onUpdateStart(parent)
		map.onEnqueue(child)
		let parentDone = map.getChildCompletePromise(parent)
		map.onUpdateEnd(parent)

		// Child starts and enqueues grandchild
		map.onUpdateStart(child)
		map.onEnqueue(grand)
		map.onUpdateEnd(child) // not resolved yet because grandchild not finished

		let resolved = false
		parentDone.then(() => { resolved = true })

		await Promise.resolve()
		expect(resolved).toBe(false)

		// Grandchild completes, should resolve child then parent recursively
		map.onUpdateStart(grand)
		map.onUpdateEnd(grand)

		await parentDone
		expect(resolved).toBe(true)
	})
})
