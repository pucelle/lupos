
/** Cache callbacks before visiting each new source file. */
const PreVisitCallbacks: (() => void)[] = []

/** Cache callbacks after visiting each new source file. */
const PostVisitCallbacks: (() => void)[] = []


/** 
 * Define a visit callback,
 * call it before visiting each new source file.
 */
export function definePreVisitCallback(callback: () => void) {
	PreVisitCallbacks.push(callback)
}


/** 
 * Define a visit callback,
 * call it after visited each new source file,
 * and before outputting.
 */
export function definePostVisitCallback(callback: () => void) {
	PostVisitCallbacks.push(callback)
}


/** Run before visiting each new source file. */
export function runPreVisitCallbacks() {
	for (let callback of PreVisitCallbacks) {
		callback()
	}
}


/** 
 * Run after visited each new source file,
 * and before outputting.
 */
export function runPostVisitCallbacks() {
	for (let callback of PostVisitCallbacks) {
		callback()
	}
}


let visitedSourceFileCallbacks: (() => void)[] = []

/** 
 * Do somethings, normally output something after visited whole source file,
 * and all normal visitors have completed outputting interpolation.
 */
export function onVisitedSourceFile(callback: () => void) {
	visitedSourceFileCallbacks.push(callback)
}

/** Do somethings, normally output something after visited whole source file. */
export function callVisitedSourceFileCallbacks() {
	for (let callback of visitedSourceFileCallbacks) {
		callback()
	}

	visitedSourceFileCallbacks = []
}