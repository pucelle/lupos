import {describe, it, expect} from 'vitest'
import {UpdateQueue} from '../../web/src/queue/update-queue'
import type {Updatable} from '../../web/src/types'
import {promisify} from '../../web/src'


function mkUpd(iid: number, fn: () => void | Promise<void>): Updatable {
	return {
		iid,
		willUpdate: () => {},
		update: fn,
	}
}

function delay(ms = 0) {
	return new Promise<void>(res => setTimeout(res, ms))
}


describe('UpdateQueue async and sub-process', () => {
	it('awaits async update until promise resolves', async () => {
		let logs: string[] = []

		let u1 = mkUpd(1, async () => {
			logs.push('u1-updated')
		})

		UpdateQueue.enqueue(u1)
		await UpdateQueue.untilComplete()

		expect(logs).toEqual(['u1-updated'])
	})

	it('runs updates enqueued while awaiting an async update', async () => {
		let logs: string[] = []

		let u1 = mkUpd(1, async () => {
			logs.push('u1-started')
			UpdateQueue.enqueue(u2)
			await delay(0)

			logs.push('u1-ended')
		})

		let u2 = mkUpd(2, () => {
			logs.push('u2')
		})

		UpdateQueue.enqueue(u1)
		await UpdateQueue.untilComplete()
		expect(logs.join(', ')).toBe(['u1-started', 'u2', 'u1-ended'].join(', '))
	})

	it('deduplicates an update enqueued repeatedly while awaiting', async () => {
		let logs: string[] = []

		let u1 = mkUpd(1, async () => {
			logs.push('u1-started')
			await delay(0)

			UpdateQueue.enqueue(u2)
			UpdateQueue.enqueue(u2)
			logs.push('u1-ended')
		})

		let u2 = mkUpd(2, () => {
			logs.push('u2')
		})

		UpdateQueue.enqueue(u1)
		await UpdateQueue.untilComplete()
		expect(logs.join(', ')).toBe(['u1-started', 'u1-ended', 'u2'].join(', '))
	})
})
