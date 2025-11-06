import {trackGet, Effector, untilAllUpdateComplete, trackSet} from '../../web/src'
import { describe, it, expect, vi} from 'vitest'


describe('Test effect', () => {

	it('Test effect', async () => {
		let a = {b: 1}
		let fn = vi.fn()

		let effect = new Effector(() => {
			trackGet(a, 'b')
			a.b
			fn()
		})
		effect.connect()
		await untilAllUpdateComplete()
		expect(fn).toHaveBeenCalledTimes(1)

		a.b = 2
		trackSet(a, 'b')
		await untilAllUpdateComplete()
		expect(fn).toHaveBeenCalledTimes(2)

		effect.disconnect()
		a.b = 3
		trackSet(a, 'b')
		await untilAllUpdateComplete()
		expect(fn).toHaveBeenCalledTimes(2)

		// Refresh after re-connected
		effect.connect()
		await untilAllUpdateComplete()
		expect(fn).toHaveBeenCalledTimes(3)

		// No need to refresh since no dependency has changed
		effect.disconnect()
		a.b = 3
		effect.connect()
		await untilAllUpdateComplete()
		expect(fn).toHaveBeenCalledTimes(3)
	})
})