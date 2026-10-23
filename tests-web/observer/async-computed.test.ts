import {AsyncComputed, trackGet, trackSet, UpdateQueue} from '../../web/src'
import {afterEach, describe, expect, it, vi} from 'vitest'


/** An explicitly controlled request avoids timing-dependent async assertions. */
interface Deferred<V> {

	/** Pending result returned to the computer. */
	promise: Promise<V>

	/** Complete this request successfully. */
	resolve: (value: V) => void

	/** Complete this request with an error. */
	reject: (error: unknown) => void
}


/** Computers created by each test are disconnected even when an assertion fails. */
let computers: AsyncComputed[] = []


/** Create a pending request that a test can resolve in any order. */
function defer<V>(): Deferred<V> {
	let resolve!: (value: V) => void
	let reject!: (error: unknown) => void
	let promise = new Promise<V>((onResolve, onReject) => {
		resolve = onResolve
		reject = onReject
	})

	return {promise, resolve, reject}
}

/** Track request changes independently from the optional continuous-value key. */
function createComputer(options: {continuous?: boolean, keyed?: boolean} = {}) {
	let state = {version: 1, key: 'a' as string | number}
	let requests: Deferred<number>[] = []
	let getter = vi.fn(() => {
		trackGet(state, 'version')
		let request = defer<number>()
		requests.push(request)
		return request.promise
	})
	let onReset = vi.fn()
	let computer = new AsyncComputed(getter, onReset, undefined, {
		continuous: options.continuous,
		key: options.keyed ? () => {
			trackGet(state, 'key')
			return state.key
		} : undefined,
	})
	computers.push(computer)

	return {computer, state, requests, getter, onReset}
}


afterEach(async () => {
	for (let computer of computers) {
		computer.disconnect()
		computer.clear()
	}

	computers = []
	await UpdateQueue.untilComplete()
	vi.restoreAllMocks()
})


describe('AsyncComputed', () => {
	it('starts on connection, publishes the result, and caches subsequent reads', async () => {
		let {computer, requests, getter, onReset} = createComputer()
		expect(getter).not.toHaveBeenCalled()
		computer.connect()
		await UpdateQueue.untilComplete()

		expect(computer.get()).toBeUndefined()
		expect(getter).toHaveBeenCalledTimes(1)
		expect(onReset).toHaveBeenCalledTimes(1)
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		expect(computer.get()).toBe(10)
		expect(computer.get()).toBe(10)
		expect(getter).toHaveBeenCalledTimes(1)
		expect(onReset).toHaveBeenCalledTimes(2)
	})

	it('starts lazily on first get and does not duplicate an in-flight request on connection', async () => {
		let {computer, requests, getter} = createComputer()
		expect(computer.get()).toBeUndefined()
		expect(computer.get()).toBeUndefined()
		computer.connect()
		await UpdateQueue.untilComplete()

		expect(getter).toHaveBeenCalledTimes(1)
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(10)
	})

	it('resets the old value only after a dependency update reaches the queue', async () => {
		let {computer, state, requests} = createComputer()
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		state.version++
		trackSet(state, 'version')
		expect(computer.get()).toBe(10)
		await UpdateQueue.untilComplete()

		expect(requests).toHaveLength(2)
		expect(computer.get()).toBeUndefined()
		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)
	})

	it('keeps the previous value while continuously refreshing without a key', async () => {
		let {computer, state, requests, onReset} = createComputer({continuous: true})
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		state.version++
		trackSet(state, 'version')
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(10)
		expect(onReset).toHaveBeenCalledTimes(3)

		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)
		expect(onReset).toHaveBeenCalledTimes(4)
	})

	it.each([
		['same string', 'a', 'a', 10],
		['changed string', 'a', 'b', undefined],
		['same zero', 0, 0, 10],
		['changed number', 0, 1, undefined],
		['different key types', 0, '0', undefined],
	] as [string, string | number, string | number, number | undefined][])(
		'only reuses continuous values for matching keys: %s',
		async (_name, oldKey, newKey, expected) => {
			let {computer, state, requests} = createComputer({continuous: true, keyed: true})
			state.key = oldKey
			computer.connect()
			await UpdateQueue.untilComplete()
			requests[0].resolve(10)
			await UpdateQueue.untilComplete()

			state.key = newKey
			state.version++
			trackSet(state, 'key', 'version')
			await UpdateQueue.untilComplete()
			expect(requests).toHaveLength(2)
			expect(computer.get()).toBe(expected)

			requests[1].resolve(20)
			await UpdateQueue.untilComplete()
			expect(computer.get()).toBe(20)
		},
	)

	it.each([undefined, false, true])('a key implies continuity when continuous is %s', async continuous => {
		let {computer, state, requests} = createComputer({continuous, keyed: true})
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		state.version++
		trackSet(state, 'version')
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(10)
		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)

		state.key = 'b'
		trackSet(state, 'key')
		await UpdateQueue.untilComplete()
		expect(requests).toHaveLength(3)
		expect(computer.get()).toBeUndefined()
		requests[2].resolve(30)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(30)
	})

	it('tracks key-only changes even when the getter does not read the key', async () => {
		let {computer, state, requests} = createComputer({keyed: true})
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		state.key = 'b'
		trackSet(state, 'key')
		await UpdateQueue.untilComplete()
		expect(requests).toHaveLength(2)
		expect(computer.get()).toBeUndefined()
	})

	it.each([true, false])('ignores superseded requests when newest resolves first: %s', async newestFirst => {
		let {computer, state, requests, onReset} = createComputer()
		computer.connect()
		await UpdateQueue.untilComplete()
		state.version++
		trackSet(state, 'version')
		await UpdateQueue.untilComplete()
		expect(requests).toHaveLength(2)

		let first = newestFirst ? 1 : 0
		let second = newestFirst ? 0 : 1
		requests[first].resolve(first === 1 ? 20 : 10)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(newestFirst ? 20 : undefined)
		requests[second].resolve(second === 1 ? 20 : 10)
		await UpdateQueue.untilComplete()

		expect(computer.get()).toBe(20)
		expect(onReset).toHaveBeenCalledTimes(3)
	})

	it('does not re-request when a notification leaves dependency values unchanged', async () => {
		let {computer, state, requests, getter} = createComputer()
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()
		trackSet(state, 'version')
		await UpdateQueue.untilComplete()

		expect(getter).toHaveBeenCalledTimes(1)
		expect(computer.get()).toBe(10)
	})

	it('ignores queued work after disconnect and refreshes changed dependencies on reconnect', async () => {
		let {computer, state, requests, getter} = createComputer()
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		state.version++
		trackSet(state, 'version')
		computer.disconnect()
		await UpdateQueue.untilComplete()
		expect(getter).toHaveBeenCalledTimes(1)
		expect(computer.get()).toBe(10)

		computer.connect()
		await UpdateQueue.untilComplete()
		expect(getter).toHaveBeenCalledTimes(2)
		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)
	})

	it('restores tracking on reconnect without re-requesting unchanged dependencies', async () => {
		let {computer, state, requests, getter} = createComputer()
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		computer.disconnect()
		computer.connect()
		await UpdateQueue.untilComplete()
		expect(getter).toHaveBeenCalledTimes(1)

		state.version++
		trackSet(state, 'version')
		await UpdateQueue.untilComplete()
		expect(getter).toHaveBeenCalledTimes(2)
	})

	it('logs rejected requests and recovers after a dependency change', async () => {
		let {computer, state, requests} = createComputer()
		let error = new Error('request failed')
		let log = vi.spyOn(console, 'error').mockImplementation(() => {})
		computer.connect()
		await UpdateQueue.untilComplete()
		requests[0].reject(error)
		await requests[0].promise.catch(() => {})
		await UpdateQueue.untilComplete()
		expect(log).toHaveBeenCalledWith(error)
		expect(computer.get()).toBeUndefined()

		state.version++
		trackSet(state, 'version')
		await UpdateQueue.untilComplete()
		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)
	})

	it('contains synchronous getter errors and retries changed dependencies after reconnecting', async () => {
		let error = new Error('getter failed')
		let log = vi.spyOn(console, 'error').mockImplementation(() => {})
		let state = {failed: true}
		let getter = vi.fn(() => {
			trackGet(state, 'failed')
			if (state.failed) {
				throw error
			}

			return Promise.resolve(20)
		})
		let computer = new AsyncComputed(getter)
		computers.push(computer)
		computer.connect()
		await UpdateQueue.untilComplete()
		expect(log).toHaveBeenCalledWith(error)
		expect(computer.get()).toBeUndefined()

		computer.disconnect()
		state.failed = false
		trackSet(state, 'failed')
		computer.connect()
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)
	})

	it('binds the getter and reset callback to the supplied scope', async () => {
		let scope = {value: 10, resets: 0}
		let computer = new AsyncComputed(function (this: typeof scope) {
			return Promise.resolve(this.value)
		}, function (this: typeof scope) {
			this.resets++
		}, scope)
		computers.push(computer)
		computer.connect()
		await UpdateQueue.untilComplete()

		expect(computer.get()).toBe(10)
		expect(scope.resets).toBe(2)
	})

	it('provides a lazy cached getter through the static helper', async () => {
		let scope = {value: 10}
		let request = defer<number>()
		let key = vi.fn(function (this: typeof scope) {
			return this.value
		})
		let getter = vi.fn(function (this: typeof scope) {
			expect(this).toBe(scope)
			return request.promise
		})
		let get = AsyncComputed.getter(getter, scope, {key})
		expect(getter).not.toHaveBeenCalled()
		expect(get()).toBeUndefined()
		expect(get()).toBeUndefined()
		expect(getter).toHaveBeenCalledTimes(1)
		request.resolve(10)
		await UpdateQueue.untilComplete()
		expect(get()).toBe(10)
		expect(key).toHaveBeenCalledTimes(2)
		expect(key.mock.contexts).toEqual([scope, scope])
	})

	it('calls the key callback with its scope when starting and completing each request', async () => {
		let scope = {key: 'a', version: 1}
		let requests: Deferred<number>[] = []
		let key = vi.fn(function (this: typeof scope) {
			trackGet(this, 'key')
			return this.key
		})
		let computer = new AsyncComputed(function (this: typeof scope) {
			trackGet(this, 'version')
			let request = defer<number>()
			requests.push(request)
			return request.promise
		}, undefined, scope, {key})
		computers.push(computer)
		computer.connect()
		await UpdateQueue.untilComplete()
		expect(key).toHaveBeenCalledTimes(1)
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(10)
		expect(key).toHaveBeenCalledTimes(2)

		scope.version++
		trackSet(scope, 'version')
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(10)
		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)

		scope.key = 'b'
		trackSet(scope, 'key')
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBeUndefined()
		requests[2].resolve(30)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(30)
		expect(key).toHaveBeenCalledTimes(6)
		expect(key.mock.contexts.every(context => context === scope)).toBe(true)
	})

	it('invalidates in-flight requests after a tracked key change', async () => {
		let {computer, state, requests} = createComputer({keyed: true})
		computer.connect()
		await UpdateQueue.untilComplete()
		await UpdateQueue.waitSeveralTicks()

		state.key = 'b'
		trackSet(state, 'key')
		requests[0].resolve(10)
		await UpdateQueue.untilComplete()

		expect(requests).toHaveLength(2)
		expect(computer.get()).toBeUndefined()
		requests[1].resolve(20)
		await UpdateQueue.untilComplete()
		expect(computer.get()).toBe(20)
	})
})
