import {UpdateQueue} from '../../web/src'
import { describe, it, expect} from 'vitest'


describe('Test UpdateQueue', () => {

	it('Test enqueue order', async () => {
		let v = 1

		let u1 = {
			iid: 1,
			willUpdate: () => {},
			update: () => {
				expect(v).toEqual(2)
			}
		}

		let u2 = {
			iid: 0,
			willUpdate: () => {},
			update: () => {
				expect(v).toEqual(1)
				v++
			}
		}

		UpdateQueue.enqueue(u1)
		UpdateQueue.enqueue(u2)

		await UpdateQueue.untilComplete()
	})

	it('remains usable after a completion callback throws', async () => {
		let errors: unknown[] = []
		let oldConsoleError = console.error
		console.error = err => errors.push(err)

		try {
			UpdateQueue.whenComplete(() => {
				throw new Error('completion failed')
			})
			await UpdateQueue.untilComplete()

			let completed = false
			UpdateQueue.whenComplete(() => completed = true)
			await UpdateQueue.untilComplete()

			expect(completed).toBe(true)
			expect(errors).toHaveLength(1)
		}
		finally {
			console.error = oldConsoleError
		}
	})
})
