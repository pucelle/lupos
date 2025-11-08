import {describe, it, expect} from 'vitest'
import {UpdateQueue} from '../../web/src/queue/update-queue'
import type {Updatable} from '../../web/src/types'


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
		await UpdateQueue.untilAllComplete()

		expect(logs).toEqual(['u1-updated'])
	})

	it('runs sub-process updates enqueued during waiting', async () => {
		let logs: string[] = []

		let u1 = mkUpd(1, async () => {
			logs.push('u1-started')
			UpdateQueue.enqueue(u2)
			await delay(0)
			await UpdateQueue.untilChildComplete(u1)
			logs.push('u1-ended')
		})

		let u2 = mkUpd(2, () => {
			logs.push('u2')
		})

		UpdateQueue.enqueue(u1)
		await UpdateQueue.untilAllComplete()
		expect(logs.join(', ')).toBe(['u1-started', 'u2', 'u1-ended'].join(', '))
	})

	it('runs sub-process updates enqueued during waiting and using sync APIs', async () => {
		let logs: string[] = []

		let u1 = mkUpd(1, async () => {
			logs.push('u1-started')
			await delay(0)

			UpdateQueue.onSyncUpdateStart(u1)
			UpdateQueue.enqueue(u2)
			UpdateQueue.onSyncUpdateEnd()
			await UpdateQueue.untilChildComplete(u1)
			logs.push('u1-ended')
		})

		let u2 = mkUpd(2, () => {
			logs.push('u2')
		})

		UpdateQueue.enqueue(u1)
		await UpdateQueue.untilAllComplete()
		expect(logs.join(', ')).toBe(['u1-started', 'u2', 'u1-ended'].join(', '))
	})
})
