import {promiseWithResolves} from '../utils'


/** Wait until document state becomes complete. */
function untilDocumentComplete(): Promise<void> {
	if (document.readyState === "complete") {
		return Promise.resolve()
	}

	let {promise, resolve} = promiseWithResolves()
	document.addEventListener('readystatechange', () => {
		resolve()
	})

	return promise
}


/** Promise to be resolved after first paint complete. */
let firstPaintPromise = /*#__PURE__*/(async () => {

	// Avoid error in node environment.
	if (typeof document === 'undefined') {
		return
	}

	await untilDocumentComplete()
	await new Promise(resolve => setTimeout(resolve, 0))
})()


/** 
 * Returns a promise, which will be resolved after the first time
 * update complete, and browser paint completed.
 * 
 * If a component will read dom properties and cause force re-layout
 * before first paint, you may use this to wait for paint complete.
 */
export function untilFirstPaintCompleted(): Promise<void> {
	return firstPaintPromise
}
