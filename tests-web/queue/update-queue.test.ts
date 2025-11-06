import {enqueueUpdate, untilAllUpdateComplete} from '../../web/src'
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

		enqueueUpdate(u1)
		enqueueUpdate(u2)

		await untilAllUpdateComplete()
	})
})