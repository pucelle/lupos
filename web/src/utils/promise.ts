/** Promise and resolve, reject callbacks. */
export type PromiseWithResolves<T = void> = {
	promise: Promise<T>,
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (err?: any) => void
}


/** Returns a promise, with it's resolve and reject. */
export function promiseWithResolves<T = void>(): PromiseWithResolves<T> {
	let resolve: (value: T | PromiseLike<T>) => void
	let reject: (err: any) => void

	let promise = new Promise((res, rej) => {
		resolve = res as (value: T | PromiseLike<T>) => void
		reject = rej
	}) as Promise<T>

	return {
		promise,
		resolve: resolve!,
		reject: reject!,
	}
}


/** 
 * Normally we would suggest you use callback, and when needed,
 * you may transform callback to promise by this.
 */
export function promisify(fn: (callback: () => void) => void, scope: any = null) {
	return new Promise<void>((resolve) => {
		fn.call(scope, resolve)
	})
}